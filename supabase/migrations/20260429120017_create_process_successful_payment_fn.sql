-- Atomic processing of a successful Stripe payment.
-- Called by the webhook handler from `payment_intent.succeeded`.
-- Returns the created payment id (uuid) on success, or the existing payment id
-- if this stripe_payment_intent_id was already processed (idempotent).
create or replace function public.process_successful_payment(
  p_payment_session_id uuid,
  p_amount_cents integer,
  p_payment_method text,                  -- 'card' | 'sepa'
  p_stripe_payment_intent_id text,
  p_stripe_charge_id text,
  p_auto_renew boolean
) returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_session record;
  v_plan record;
  v_existing_active record;
  v_subscription_id uuid;
  v_payment_id uuid;
  v_receipt_number text;
  v_today date := current_date;
  v_new_end_date date;
  v_existing_payment uuid;
begin
  if p_stripe_payment_intent_id is not null then
    select id into v_existing_payment
    from public.payments
    where stripe_payment_intent_id = p_stripe_payment_intent_id
    limit 1;
    if v_existing_payment is not null then
      return v_existing_payment;
    end if;
  end if;

  select * into v_session
  from public.payment_sessions
  where id = p_payment_session_id
  for update;

  if not found then
    raise exception 'payment_session % not found', p_payment_session_id;
  end if;

  select * into v_plan
  from public.subscription_plans
  where id = v_session.plan_id;

  if not found then
    raise exception 'subscription_plan % not found', v_session.plan_id;
  end if;

  select * into v_existing_active
  from public.subscriptions
  where member_id = v_session.member_id
    and gym_id    = v_session.gym_id
    and status    = 'active'
  order by end_date desc
  limit 1;

  if found then
    v_new_end_date := greatest(v_existing_active.end_date, v_today)
                      + v_plan.duration_days;
    update public.subscriptions
       set end_date = v_new_end_date,
           original_end_date = v_new_end_date,
           plan_id = v_plan.id,
           payment_method = p_payment_method,
           auto_renew = case
             when p_payment_method = 'sepa' then p_auto_renew
             else v_existing_active.auto_renew
           end,
           updated_at = now()
     where id = v_existing_active.id
     returning id into v_subscription_id;
  else
    v_new_end_date := v_today + v_plan.duration_days;
    insert into public.subscriptions (
      gym_id, member_id, plan_id, start_date, end_date, original_end_date,
      status, payment_method, auto_renew
    ) values (
      v_session.gym_id, v_session.member_id, v_plan.id, v_today, v_new_end_date, v_new_end_date,
      'active', p_payment_method,
      case when p_payment_method = 'sepa' then p_auto_renew else false end
    )
    returning id into v_subscription_id;
  end if;

  v_receipt_number := public.generate_receipt_number(v_session.gym_id);

  insert into public.payments (
    gym_id, member_id, subscription_id,
    amount_cents, currency, payment_method, status,
    stripe_payment_intent_id, stripe_charge_id,
    receipt_number, paid_at, created_by
  ) values (
    v_session.gym_id, v_session.member_id, v_subscription_id,
    p_amount_cents, 'EUR', p_payment_method, 'succeeded',
    p_stripe_payment_intent_id, p_stripe_charge_id,
    v_receipt_number, now(), v_session.created_by
  )
  returning id into v_payment_id;

  update public.payment_sessions
     set status = 'completed',
         completed_at = now(),
         stripe_payment_intent_id = coalesce(stripe_payment_intent_id, p_stripe_payment_intent_id),
         payment_method = coalesce(payment_method, p_payment_method)
   where id = p_payment_session_id;

  return v_payment_id;
end;
$fn$;

revoke all on function public.process_successful_payment(uuid, integer, text, text, text, boolean)
  from public, anon, authenticated;
grant execute on function public.process_successful_payment(uuid, integer, text, text, text, boolean)
  to service_role;

comment on function public.process_successful_payment is
  'Phase 05: idempotent atomic write of subscription + payment + session-complete on payment_intent.succeeded.';
