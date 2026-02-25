create extension if not exists "pgcrypto";

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  codigo text not null unique,
  nome text not null,
  modelo text not null,
  fabricante text,
  categoria text,
  preco numeric(12,2) not null default 0,
  estoque integer not null default 0,
  descricao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products
  add column if not exists owner_id uuid references auth.users (id) on delete cascade;

alter table public.products
  alter column owner_id set default auth.uid();

create index if not exists products_nome_idx on public.products (nome);
create index if not exists products_modelo_idx on public.products (modelo);
create index if not exists products_owner_id_idx on public.products (owner_id);

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
before update on public.products
for each row
execute function public.update_updated_at_column();

alter table public.products enable row level security;

drop policy if exists "products_public_read" on public.products;
create policy "products_public_read"
on public.products
for select
to anon, authenticated
using (true);

drop policy if exists "products_owner_insert" on public.products;
create policy "products_owner_insert"
on public.products
for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "products_owner_update" on public.products;
create policy "products_owner_update"
on public.products
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "products_owner_delete" on public.products;
create policy "products_owner_delete"
on public.products
for delete
to authenticated
using (owner_id = auth.uid());
