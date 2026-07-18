-- Voer dit uit in de SQL Editor van je Supabase-project.

create table if not exists public.dashboards (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.dashboards enable row level security;

-- Iedereen ziet en bewerkt alleen zijn eigen rij.
create policy "eigen dashboard lezen"
  on public.dashboards for select
  using (auth.uid() = user_id);

create policy "eigen dashboard toevoegen"
  on public.dashboards for insert
  with check (auth.uid() = user_id);

create policy "eigen dashboard bijwerken"
  on public.dashboards for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
