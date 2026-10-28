-- LLM Label Lab: class mode tables and security rules.
-- Before you run this, change TRAINER-PIN-HERE below to the PIN you want to use.

create table if not exists public.progress (
  id        text primary key,
  name      text not null check (char_length(name) between 1 and 40),
  idx       int  default 0,
  touched   int  default 0,
  q         int  default 0,
  score     int  default 0,
  areas     jsonb default '{}'::jsonb,
  help      boolean default false,
  help_at   bigint,
  joined_at bigint,
  updated   bigint
);

create table if not exists public.class_state (
  id       int primary key default 1 check (id = 1),
  paused   boolean default false,
  msg      text default '',
  focus    int,
  focus_at bigint default 0
);
insert into public.class_state (id) values (1) on conflict do nothing;

create table if not exists public.class_secret (
  id  int primary key default 1 check (id = 1),
  pin text not null
);
insert into public.class_secret (id, pin) values (1, 'TRAINER-PIN-HERE')
  on conflict (id) do update set pin = excluded.pin;

alter table public.progress     enable row level security;
alter table public.class_state  enable row level security;
alter table public.class_secret enable row level security;   -- no policies: nobody can read the PIN

drop policy if exists "progress read"   on public.progress;
drop policy if exists "progress join"   on public.progress;
drop policy if exists "progress update" on public.progress;
drop policy if exists "progress leave"  on public.progress;
drop policy if exists "state read"      on public.class_state;

create policy "progress read"   on public.progress    for select to anon using (true);
create policy "progress join"   on public.progress    for insert to anon with check (true);
create policy "progress update" on public.progress    for update to anon using (true) with check (true);
create policy "progress leave"  on public.progress    for delete to anon using (true);
create policy "state read"      on public.class_state for select to anon using (true);

grant select, insert, update, delete on public.progress    to anon;
grant select                          on public.class_state to anon;

-- Trainer actions run through functions that check the PIN.
create or replace function public.check_pin(p_pin text) returns boolean
language sql security definer set search_path = public as
$$ select exists (select 1 from public.class_secret where pin = p_pin) $$;

create or replace function public.set_class_state(p_pin text, p_paused boolean, p_msg text, p_focus int, p_focus_at bigint)
returns void language plpgsql security definer set search_path = public as
$$ begin
  if not public.check_pin(p_pin) then raise exception 'bad pin'; end if;
  update public.class_state set paused = p_paused, msg = left(coalesce(p_msg,''), 200), focus = p_focus, focus_at = p_focus_at where id = 1;
end $$;

create or replace function public.clear_help(p_pin text, p_id text)
returns void language plpgsql security definer set search_path = public as
$$ begin
  if not public.check_pin(p_pin) then raise exception 'bad pin'; end if;
  update public.progress set help = false where id = p_id;
end $$;

create or replace function public.wipe_all(p_pin text)
returns void language plpgsql security definer set search_path = public as
$$ begin
  if not public.check_pin(p_pin) then raise exception 'bad pin'; end if;
  delete from public.progress where true;
end $$;

revoke all on function public.check_pin(text), public.set_class_state(text,boolean,text,int,bigint),
  public.clear_help(text,text), public.wipe_all(text) from public;
grant execute on function public.check_pin(text), public.set_class_state(text,boolean,text,int,bigint),
  public.clear_help(text,text), public.wipe_all(text) to anon;
