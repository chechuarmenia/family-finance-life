create table public.family_members (
 email text primary key check (email = lower(email))
);
alter table public.family_members enable row level security;
revoke all on public.family_members from anon, authenticated;
grant select on public.family_members to authenticated;
create policy "See own membership" on public.family_members for select to authenticated
 using (email = lower((select auth.jwt()->>'email')));
create table public.family_state (
 id text primary key check (id = 'family'),
 data jsonb not null check (jsonb_typeof(data->'accounts') = 'array' and jsonb_typeof(data->'transactions') = 'array'),
 version bigint not null default 1,
 updated_at timestamptz not null default now()
);
alter table public.family_state enable row level security;
revoke all on public.family_state from anon, authenticated;
grant select, update on public.family_state to authenticated;
create policy "Household reads" on public.family_state for select to authenticated using
 (exists (select 1 from public.family_members where email = lower((select auth.jwt()->>'email'))));
create policy "Household writes" on public.family_state for update to authenticated using
 (exists (select 1 from public.family_members where email = lower((select auth.jwt()->>'email')))) with check
 (exists (select 1 from public.family_members where email = lower((select auth.jwt()->>'email'))));
create function public.save_family_state(expected_version bigint, next_data jsonb)
 returns setof public.family_state language sql security invoker set search_path = '' as $$
 update public.family_state set data=next_data,version=version+1,updated_at=now()
 where id='family' and version=expected_version returning *;
$$;
revoke all on function public.save_family_state(bigint,jsonb) from public, anon;
grant execute on function public.save_family_state(bigint,jsonb) to authenticated;
