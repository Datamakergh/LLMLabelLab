-- LLM Label Lab, step 2: Trainee-001 to Trainee-040 accounts.
-- Run this after setup.sql. It is safe to run again (it keeps existing codes).

create table if not exists public.trainees (
  id   text primary key,
  code text not null
);
create table if not exists public.sessions (
  token   text primary key,
  trainee text not null references public.trainees(id) on delete cascade,
  created timestamptz default now()
);
alter table public.trainees enable row level security;   -- no policies: codes are not readable
alter table public.sessions enable row level security;   -- no policies: tokens are not readable

insert into public.trainees (id, code)
select 'Trainee-' || lpad(g::text, 3, '0'), substr(md5(random()::text || g::text || clock_timestamp()::text), 1, 5)
from generate_series(1, 40) g
on conflict (id) do nothing;

insert into public.progress (id, name)
select id, id from public.trainees
on conflict (id) do nothing;

-- Trainees can no longer write progress directly; they go through the functions below.
drop policy if exists "progress join"   on public.progress;
drop policy if exists "progress update" on public.progress;
drop policy if exists "progress leave"  on public.progress;
revoke insert, update, delete on public.progress from anon;

create or replace function public.now_ms() returns bigint
language sql stable as $$ select (extract(epoch from clock_timestamp()) * 1000)::bigint $$;

create or replace function public.login(p_user text, p_code text) returns text
language plpgsql security definer set search_path = public as
$$
declare t text;
begin
  if not exists (select 1 from public.trainees where id = p_user and code = lower(trim(p_code))) then
    return null;
  end if;
  t := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into public.sessions (token, trainee) values (t, p_user);
  insert into public.progress (id, name) values (p_user, p_user) on conflict (id) do nothing;
  update public.progress set joined_at = coalesce(joined_at, public.now_ms()), updated = public.now_ms() where id = p_user;
  return t;
end $$;

create or replace function public.my_session(p_token text) returns text
language sql security definer set search_path = public as
$$ select trainee from public.sessions where token = p_token $$;

create or replace function public.logout(p_token text) returns void
language sql security definer set search_path = public as
$$ delete from public.sessions where token = p_token $$;

create or replace function public.save_progress(
  p_token text, p_idx int default null, p_touched int default null, p_q int default null,
  p_score int default null, p_areas jsonb default null, p_help boolean default null)
returns void language plpgsql security definer set search_path = public as
$$
declare u text;
begin
  select trainee into u from public.sessions where token = p_token;
  if u is null then raise exception 'not signed in'; end if;
  update public.progress set
    idx = coalesce(p_idx, idx), touched = coalesce(p_touched, touched), q = coalesce(p_q, q),
    score = coalesce(p_score, score), areas = coalesce(p_areas, areas), help = coalesce(p_help, help),
    help_at = case when p_help is true then public.now_ms() else help_at end,
    updated = public.now_ms()
  where id = u;
end $$;

-- Trainer functions (need the trainer PIN).
create or replace function public.list_codes(p_pin text) returns table (id text, code text)
language plpgsql security definer set search_path = public as
$$ begin
  if not public.check_pin(p_pin) then raise exception 'bad pin'; end if;
  return query select t.id, t.code from public.trainees t order by t.id;
end $$;

create or replace function public.reset_code(p_pin text, p_user text) returns void
language plpgsql security definer set search_path = public as
$$ begin
  if not public.check_pin(p_pin) then raise exception 'bad pin'; end if;
  update public.trainees set code = substr(md5(random()::text || clock_timestamp()::text), 1, 5) where id = p_user;
  delete from public.sessions where trainee = p_user;
end $$;

create or replace function public.reset_all(p_pin text) returns void
language plpgsql security definer set search_path = public as
$$ begin
  if not public.check_pin(p_pin) then raise exception 'bad pin'; end if;
  update public.progress set idx = 0, touched = 0, q = 0, score = 0, areas = '{}'::jsonb,
    help = false, help_at = null, joined_at = null, updated = null;
  delete from public.sessions;
end $$;

revoke all on function
  public.login(text,text), public.my_session(text), public.logout(text),
  public.save_progress(text,int,int,int,int,jsonb,boolean),
  public.list_codes(text), public.reset_code(text,text), public.reset_all(text) from public;
grant execute on function
  public.login(text,text), public.my_session(text), public.logout(text),
  public.save_progress(text,int,int,int,int,jsonb,boolean),
  public.list_codes(text), public.reset_code(text,text), public.reset_all(text) to anon;
