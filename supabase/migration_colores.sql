
alter table participants
  add column if not exists tiempo_basico numeric null,
  add column if not exists participante_origen_id uuid null
    references participants(id) on delete set null;

alter table participants
  alter column series_id drop not null;

comment on column participants.tiempo_basico is
  'Tiempo de referencia importado por Excel, usado solo para armar los grupos de color. No es un resultado de carrera.';
comment on column participants.participante_origen_id is
  'Si este participante es una copia para una serie final, apunta al participante original de la serie preliminar.';


alter table series
  add column if not exists tipo text not null default 'normal'
    check (tipo in ('normal', 'preliminar', 'final')),
  add column if not exists color text null
    check (color in ('rojo', 'amarillo', 'verde'));

alter table series
  add constraint series_color_coherente
  check (
    (tipo = 'normal' and color is null)
    or (tipo in ('preliminar', 'final') and color is not null)
  );

comment on column series.tipo is
  'normal = flujo original de la app. preliminar = heat por color/año armado desde tiempo_basico. final = top 5 por color/año.';

alter table series
  add constraint series_number_unico_por_tipo
  unique (competition_id, year_number, tipo, series_number);


create table if not exists umbrales_color (
  year_number int primary key check (year_number between 1 and 6),
  corte_rojo_amarillo numeric not null,
  corte_amarillo_verde numeric not null,
  updated_at timestamptz not null default now(),
  check (corte_rojo_amarillo < corte_amarillo_verde)
);

comment on table umbrales_color is
  'Tiempos de corte por año: tiempo > corte_rojo_amarillo => rojo; entre ambos => amarillo; <= corte_amarillo_verde => verde.';


alter table umbrales_color enable row level security;

create policy "umbrales_color_all" on umbrales_color
  for all using (true) with check (true);

create index if not exists idx_series_tipo_color_year
  on series (competition_id, year_number, tipo, color);

create index if not exists idx_participants_tiempo_basico
  on participants (competition_id, series_id)
  where tiempo_basico is not null;
