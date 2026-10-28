-- LLM Label Lab, step 3: practice points, streaks, badges, leaderboard and timed challenges.
-- Run this after setup.sql and setup2.sql. It is safe to run again.

alter table public.progress
  add column if not exists tasks jsonb default '{}'::jsonb,
  add column if not exists pts int default 0,
  add column if not exists streak int default 0,
  add column if not exists best_streak int default 0,
  add column if not exists day_streak int default 0,
  add column if not exists last_day text,
  add column if not exists badges jsonb default '[]'::jsonb,
  add column if not exists ch_id int default 0,
  add column if not exists ch_pts int default 0;

alter table public.class_state
  add column if not exists lb boolean default true,
  add column if not exists ch_end bigint default 0,
  add column if not exists ch_id int default 0;

drop function if exists public.save_progress(text,int,int,int,int,jsonb,boolean);

create or replace function public.save_progress(
  p_token text, p_idx int default null, p_touched int default null, p_q int default null,
  p_score int default null, p_areas jsonb default null, p_help boolean default null,
  p_tasks jsonb default null, p_pts int default null, p_streak int default null,
  p_best_streak int default null, p_day_streak int default null, p_last_day text default null,
  p_badges jsonb default null, p_ch_id int default null, p_ch_pts int default null)
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
    tasks = coalesce(p_tasks, tasks),
    pts = coalesce(greatest(0, least(p_pts, 1300)), pts),
    streak = coalesce(greatest(0, least(p_streak, 50)), streak),
    best_streak = coalesce(greatest(0, least(p_best_streak, 50)), best_streak),
    day_streak = coalesce(greatest(0, least(p_day_streak, 400)), day_streak),
    last_day = coalesce(left(p_last_day, 10), last_day),
    badges = coalesce(p_badges, badges),
    ch_id = coalesce(p_ch_id, ch_id),
    ch_pts = coalesce(greatest(0, least(p_ch_pts, 1000)), ch_pts),
    updated = public.now_ms()
  where id = u;
end $$;

create or replace function public.set_extras(p_pin text, p_lb boolean, p_ch_end bigint, p_ch_id int)
returns void language plpgsql security definer set search_path = public as
$$ begin
  if not public.check_pin(p_pin) then raise exception 'bad pin'; end if;
  update public.class_state set lb = p_lb, ch_end = coalesce(p_ch_end, 0), ch_id = coalesce(p_ch_id, 0) where id = 1;
end $$;

create or replace function public.reset_all(p_pin text) returns void
language plpgsql security definer set search_path = public as
$$ begin
  if not public.check_pin(p_pin) then raise exception 'bad pin'; end if;
  update public.progress set idx = 0, touched = 0, q = 0, score = 0, areas = '{}'::jsonb,
    help = false, help_at = null, joined_at = null, updated = null,
    tasks = '{}'::jsonb, pts = 0, streak = 0, best_streak = 0, day_streak = 0, last_day = null,
    badges = '[]'::jsonb, ch_id = 0, ch_pts = 0;
  update public.class_state set ch_end = 0, ch_id = 0 where id = 1;
  delete from public.sessions;
end $$;

revoke all on function
  public.save_progress(text,int,int,int,int,jsonb,boolean,jsonb,int,int,int,int,text,jsonb,int,int),
  public.set_extras(text,boolean,bigint,int), public.reset_all(text) from public;
grant execute on function
  public.save_progress(text,int,int,int,int,jsonb,boolean,jsonb,int,int,int,int,text,jsonb,int,int),
  public.set_extras(text,boolean,bigint,int), public.reset_all(text) to anon;
