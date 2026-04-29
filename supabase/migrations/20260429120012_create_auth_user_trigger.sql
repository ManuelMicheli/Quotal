-- When a new auth.users row is inserted, automatically create a profile.
-- gym_id and role are read from raw_user_meta_data; if gym_id is missing we
-- fall back to the first gym (single-tenant MVP convenience).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gym_id uuid;
  v_role text;
begin
  v_gym_id := (new.raw_user_meta_data->>'gym_id')::uuid;
  v_role := coalesce(new.raw_user_meta_data->>'role', 'member');

  if v_gym_id is null then
    select id into v_gym_id from public.gyms limit 1;
  end if;

  insert into public.profiles (id, gym_id, role, full_name, email, phone)
  values (
    new.id,
    v_gym_id,
    v_role,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'phone'
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
