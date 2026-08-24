
create extension if not exists "pgcrypto";



create table if not exists competitions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  event text not null default '25 m Crol',
  date date not null,
  created_at timestamptz not null default now()
);

create table if not exists series (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references competitions(id) on delete cascade,
  year_number int not null check (year_number between 1 and 6),
  series_number int not null check (series_number > 0),
  created_at timestamptz not null default now(),
  unique (competition_id, year_number, series_number)
);

create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references competitions(id) on delete cascade,
  series_id uuid not null references series(id) on delete cascade,
  name text not null,
  es_colegio_visitante boolean not null default false,
  participa boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_participants_series on participants(series_id);
create index if not exists idx_participants_competition on participants(competition_id);

create table if not exists results (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null unique references participants(id) on delete cascade,
  time numeric(5, 2) not null check (time > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_results_participant on results(participant_id);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_results_updated_at on results;
create trigger trg_results_updated_at
  before update on results
  for each row execute function set_updated_at();


alter table competitions enable row level security;
alter table series enable row level security;
alter table participants enable row level security;
alter table results enable row level security;

drop policy if exists "public read competitions" on competitions;
create policy "public read competitions" on competitions
  for select using (true);

drop policy if exists "public all series" on series;
create policy "public all series" on series
  for all using (true) with check (true);

drop policy if exists "public all participants" on participants;
create policy "public all participants" on participants
  for all using (true) with check (true);

drop policy if exists "public all results" on results;
create policy "public all results" on results
  for all using (true) with check (true);
