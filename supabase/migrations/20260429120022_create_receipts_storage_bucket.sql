-- Phase 06: private bucket holding ricevute, fatture, and daily-close reports.
-- Path layout:
--   <gym_id>/receipts/<receipt_number>.pdf
--   <gym_id>/invoices/<invoice_number_safe>.pdf
--   <gym_id>/daily-reports/<YYYY-MM-DD>.pdf
-- All access goes through signed URLs minted server-side. No public reads.

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

-- RLS policies on storage.objects.
-- The first path segment is the gym_id; we authorize via that.

drop policy if exists "owners read own receipts" on storage.objects;
create policy "owners read own receipts"
  on storage.objects for select
  using (
    bucket_id = 'receipts'
    and public.is_owner_or_staff()
    and (storage.foldername(name))[1] = public.current_gym_id()::text
  );

drop policy if exists "owners write own receipts" on storage.objects;
create policy "owners write own receipts"
  on storage.objects for insert
  with check (
    bucket_id = 'receipts'
    and public.is_owner_or_staff()
    and (storage.foldername(name))[1] = public.current_gym_id()::text
  );

drop policy if exists "owners update own receipts" on storage.objects;
create policy "owners update own receipts"
  on storage.objects for update
  using (
    bucket_id = 'receipts'
    and public.is_owner_or_staff()
    and (storage.foldername(name))[1] = public.current_gym_id()::text
  )
  with check (
    bucket_id = 'receipts'
    and public.is_owner_or_staff()
    and (storage.foldername(name))[1] = public.current_gym_id()::text
  );

drop policy if exists "owners delete own receipts" on storage.objects;
create policy "owners delete own receipts"
  on storage.objects for delete
  using (
    bucket_id = 'receipts'
    and public.is_owner_or_staff()
    and (storage.foldername(name))[1] = public.current_gym_id()::text
  );

-- Members can read their own receipt PDF when the path matches a payment row
-- of theirs. Storage paths have the shape <gym_id>/receipts/<receipt_number>.pdf
-- so we resolve the receipt_number from the file name and check ownership.
drop policy if exists "members read own receipts" on storage.objects;
create policy "members read own receipts"
  on storage.objects for select
  using (
    bucket_id = 'receipts'
    and exists (
      select 1
      from public.payments p
      where p.member_id = auth.uid()
        and p.gym_id::text = (storage.foldername(name))[1]
        and (
          p.receipt_pdf_path = name
          or p.invoice_pdf_path = name
        )
    )
  );
