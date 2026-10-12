-- Planorama: sign in with a 4-digit PIN.
-- Paste into Supabase > SQL Editor > New query, then click Run. Safe to run more than once.
--
-- How it works: setting a PIN gives your account a long random password that
-- nobody types. The PIN unlocks that password. After 5 wrong PINs in a row,
-- PIN sign-in is locked until you sign in with an email link and set a new PIN.

create extension if not exists pgcrypto with schema extensions;

-- Private table: no policies, and the app's roles can't touch it directly.
create table if not exists public.pin_logins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  pin_hash text not null,
  secret text not null,
  failed_attempts int not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.pin_logins enable row level security;
revoke all on public.pin_logins from anon, authenticated;

-- Save (or replace) the PIN for the signed-in user.
create or replace function public.set_pin(p_pin text, p_secret text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  if p_pin !~ '^[0-9]{4}$' then
    raise exception 'PIN must be 4 digits';
  end if;
  if length(p_secret) < 32 then
    raise exception 'Secret too short';
  end if;
  insert into public.pin_logins (user_id, pin_hash, secret, failed_attempts, updated_at)
  values (auth.uid(), extensions.crypt(p_pin, extensions.gen_salt('bf')), p_secret, 0, now())
  on conflict (user_id) do update
    set pin_hash = excluded.pin_hash,
        secret = excluded.secret,
        failed_attempts = 0,
        updated_at = now();
end;
$$;

-- Check a PIN. Returns {"status": "ok", "secret": ...}, {"status": "wrong", "tries_left": n},
-- or {"status": "locked"}. Unknown emails look the same as a wrong PIN.
create or replace function public.pin_login(p_email text, p_pin text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  rec public.pin_logins%rowtype;
begin
  select pl.* into rec
  from public.pin_logins pl
  join auth.users u on u.id = pl.user_id
  where lower(u.email) = lower(trim(p_email));

  if not found then
    return json_build_object('status', 'wrong', 'tries_left', 4);
  end if;

  if rec.failed_attempts >= 5 then
    return json_build_object('status', 'locked');
  end if;

  if rec.pin_hash = extensions.crypt(coalesce(p_pin, ''), rec.pin_hash) then
    update public.pin_logins set failed_attempts = 0 where user_id = rec.user_id;
    return json_build_object('status', 'ok', 'secret', rec.secret);
  end if;

  update public.pin_logins set failed_attempts = failed_attempts + 1 where user_id = rec.user_id;
  if rec.failed_attempts + 1 >= 5 then
    return json_build_object('status', 'locked');
  end if;
  return json_build_object('status', 'wrong', 'tries_left', 5 - (rec.failed_attempts + 1));
end;
$$;

-- Does the signed-in user have a PIN? (Used by the Account page.)
create or replace function public.has_pin()
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (select 1 from public.pin_logins where user_id = auth.uid());
$$;

revoke all on function public.set_pin(text, text) from public, anon;
revoke all on function public.has_pin() from public, anon;
revoke all on function public.pin_login(text, text) from public;
grant execute on function public.set_pin(text, text) to authenticated;
grant execute on function public.has_pin() to authenticated;
grant execute on function public.pin_login(text, text) to anon, authenticated;
