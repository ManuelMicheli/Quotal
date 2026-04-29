-- Phase 06: atomic cash/bank-transfer payment registration.
-- Reserves the next receipt number, creates or extends the subscription, and
-- inserts the payment row in a single transaction. Race-safe at MVP volume
-- (the unique index on (gym_id, receipt_number) is the safety net).

create or replace function public.generate_invoice_number(p_gym_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year text := to_char(now(), 'YYYY');
  v_count integer;
begin
  select count(*) + 1 into v_count
  from public.payments
  where gym_id = p_gym_id
    and invoice_number like v_year || '/%';

  return v_year || '/' || lpad(v_count::text, 4, '0');
end;
$$;

revoke all on function public.generate_invoice_number(uuid) from public, anon, authenticated;
grant execute on function public.generate_invoice_number(uuid) to service_role;

create or replace function public.register_cash_payment(
  p_gym_id uuid,
  p_member_id uuid,
  p_plan_id uuid,
  p_start_date date,
  p_amount_cents integer,
  p_payment_method text,           -- 'cash' | 'bank_transfer'
  p_created_by uuid,
  p_notes text default null,
  p_emit_invoice boolean default false,
  p_invoice_fiscal_code text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_plan record;
  v_existing_active record;
  v_subscription_id uuid;
  v_payment_id uuid;
  v_receipt_number text;
  v_invoice_number text := null;
  v_today date := current_date;
  v_new_end_date date;
  v_start date := coalesce(p_start_date, v_today);
begin
  if p_payment_method not in ('cash', 'bank_transfer') then
    raise exception 'invalid payment_method % (expected cash|bank_transfer)', p_payment_method;
  end if;

  select * into v_plan
  from public.subscription_plans
  where id = p_plan_id and gym_id = p_gym_id;

  if not found then
    raise exception 'subscription_plan % not found in gym %', p_plan_id, p_gym_id;
  end if;

  -- Find a currently-active subscription to extend.
  select * into v_existing_active
  from public.subscriptions
  where member_id = p_member_id
    and gym_id    = p_gym_id
    and status    = 'active'
  order by end_date desc
  limit 1
  for update;

  if found then
    -- Extend: stack the new period onto the existing end_date (or today if
    -- the existing subscription has already lapsed past today, defensive).
    v_new_end_date := greatest(v_existing_active.end_date, v_today)
                      + v_plan.duration_days;
    update public.subscriptions
       set end_date          = v_new_end_date,
           original_end_date = v_new_end_date,
           plan_id           = v_plan.id,
           payment_method    = p_payment_method,
           updated_at        = now()
     where id = v_existing_active.id
     returning id into v_subscription_id;
  else
    v_new_end_date := v_start + v_plan.duration_days;
    insert into public.subscriptions (
      gym_id, member_id, plan_id, start_date, end_date, original_end_date,
      status, payment_method, auto_renew
    ) values (
      p_gym_id, p_member_id, v_plan.id, v_start, v_new_end_date, v_new_end_date,
      'active', p_payment_method, false
    )
    returning id into v_subscription_id;
  end if;

  -- Reserve a fresh receipt number atomically.
  v_receipt_number := public.generate_receipt_number(p_gym_id);

  if p_emit_invoice then
    if p_invoice_fiscal_code is null or length(trim(p_invoice_fiscal_code)) = 0 then
      raise exception 'fiscal_code required when emit_invoice is true';
    end if;
    v_invoice_number := public.generate_invoice_number(p_gym_id);

    update public.profiles
       set fiscal_code = upper(trim(p_invoice_fiscal_code))
     where id = p_member_id
       and (fiscal_code is null or length(trim(fiscal_code)) = 0);
  end if;

  insert into public.payments (
    gym_id, member_id, subscription_id,
    amount_cents, currency, payment_method, status,
    receipt_number, invoice_number, notes, paid_at, created_by
  ) values (
    p_gym_id, p_member_id, v_subscription_id,
    p_amount_cents, 'EUR', p_payment_method, 'succeeded',
    v_receipt_number, v_invoice_number, p_notes, now(), p_created_by
  )
  returning id into v_payment_id;

  return jsonb_build_object(
    'payment_id', v_payment_id,
    'subscription_id', v_subscription_id,
    'receipt_number', v_receipt_number,
    'invoice_number', v_invoice_number
  );
end;
$fn$;

revoke all on function public.register_cash_payment(uuid, uuid, uuid, date, integer, text, uuid, text, boolean, text)
  from public, anon, authenticated;
grant execute on function public.register_cash_payment(uuid, uuid, uuid, date, integer, text, uuid, text, boolean, text)
  to service_role;

comment on function public.register_cash_payment is
  'Phase 06: atomic cash/bank-transfer payment registration with receipt-number reservation.';
comment on function public.generate_invoice_number is
  'Phase 06: progressive YYYY/NNNN invoice numbering, per gym.';
