-- Atomic processing of a failed Stripe payment.
create or replace function public.record_failed_payment(
  p_payment_session_id uuid,
  p_amount_cents integer,
  p_payment_method text,                 -- 'card' | 'sepa'
  p_stripe_payment_intent_id text,
  p_failure_reason text
) returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_session record;
  v_payment_id uuid;
  v_existing_payment uuid;
begin
  if p_stripe_payment_intent_id is not null then
    select id into v_existing_payment
    from public.payments
    where stripe_payment_intent_id = p_stripe_payment_intent_id
      and status = 'failed'
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

  insert into public.payments (
    gym_id, member_id, subscription_id,
    amount_cents, currency, payment_method, status,
    stripe_payment_intent_id, failure_reason, paid_at,
    created_by
  ) values (
    v_session.gym_id, v_session.member_id, null,
    p_amount_cents, 'EUR', p_payment_method, 'failed',
    p_stripe_payment_intent_id, p_failure_reason, null,
    v_session.created_by
  )
  returning id into v_payment_id;

  update public.payments
     set failed_at = now()
   where id = v_payment_id;

  update public.payment_sessions
     set failure_reason = p_failure_reason
   where id = p_payment_session_id;

  return v_payment_id;
end;
$fn$;

revoke all on function public.record_failed_payment(uuid, integer, text, text, text)
  from public, anon, authenticated;
grant execute on function public.record_failed_payment(uuid, integer, text, text, text)
  to service_role;

comment on function public.record_failed_payment is
  'Phase 05: insert a failed payment row + tag the session with the reason.';
