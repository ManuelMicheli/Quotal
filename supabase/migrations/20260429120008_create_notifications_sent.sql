-- Idempotency log for outbound notifications (email / sms / push).
-- One row per (subscription, type) combo prevents duplicate sends.
create table public.notifications_sent (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete cascade,
  type text not null check (type in (
    'expiry_7d', 'expiry_3d', 'expiry_today',
    'post_expiry_3d',
    'sepa_failed', 'sepa_succeeded',
    'welcome', 'receipt', 'subscription_renewed',
    'subscription_suspended', 'subscription_resumed'
  )),
  channel text not null default 'email' check (channel in ('email', 'sms', 'push')),
  resend_message_id text,
  sent_at timestamptz not null default now(),
  metadata jsonb default '{}'::jsonb
);

-- Idempotency: same subscription, same type, only once
create unique index notifications_sent_unique_idx on public.notifications_sent(subscription_id, type) where subscription_id is not null;
create index notifications_sent_member_idx on public.notifications_sent(member_id, sent_at desc);
