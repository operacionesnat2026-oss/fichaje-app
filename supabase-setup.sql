-- Ejecutar esto en Supabase: panel del proyecto -> SQL Editor -> New query -> pegar y correr

create extension if not exists "pgcrypto";

create table employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  pin text not null,
  created_at timestamptz default now()
);

create table records (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id) on delete set null,
  type text not null check (type in ('entrada','salida')),
  timestamp timestamptz not null default now()
);

create table settings (
  key text primary key,
  value text not null
);

insert into settings (key, value) values ('admin_pin', '0000');

-- Habilitar acceso desde la app (clave anónima) a estas tablas.
-- Nota de seguridad: esto permite leer y escribir a cualquiera que tenga
-- la URL y la clave anon del proyecto (que quedan visibles en el código
-- del frontend, es normal en Supabase). Para esta escala de uso interno
-- está bien: la protección real es el PIN de 4 dígitos, no la base de datos.
-- Si más adelante querés blindarlo mejor, se reemplaza esto por Supabase Auth.

alter table employees enable row level security;
alter table records enable row level security;
alter table settings enable row level security;

create policy "allow all employees" on employees for all using (true) with check (true);
create policy "allow all records" on records for all using (true) with check (true);
create policy "allow all settings" on settings for all using (true) with check (true);
