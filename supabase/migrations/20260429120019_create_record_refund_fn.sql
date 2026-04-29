-- Mark a payment as refunded and the related subscription as cancelled.
create or replace function public.record_refund(
  p_stripe_payment_intent_id text,
  p_amount_refunded_cents integer
) returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_payment record;
begin
  select * into v_payment
  from public.payments
  where stripe_payment_intent_id = p_stripe_payment_intent_id
  for update;

  if not found then
    return null;
  end if;

  if v_payment.status = 'refunded' then
    return v_payment.id;
  end if;

  update public.payments
     set status = 'refunded',
         updated_at = now(),
         notes = coalesce(notes, '') || format(
           'Rimborso Stripe: %s €%s', to_char(now(), 'YYYY-MM-DD HH24:MI'),
           (p_amount_refunded_cents::numeric / 100)::text
         )
   where id = v_payment.id;

  if v_payment.subscription_id is not null then
    update public.subscriptions
       set status = 'cancelled',
           cancelled_at = now(),
           cancelled_reason = 'rimborso',
           updated_at = now()
     where id = v_payment.subscription_id;
  end if;

  return v_payment.id;
end;
$fn$;

revoke all on function public.record_refund(text, integer) from public, anon, authenticated;
grant execute on function public.record_refund(text, integer) to service_role;

comment on function public.record_refund is
  'Phase 05: mark a payment refunded and cancel the linked subscription.';
