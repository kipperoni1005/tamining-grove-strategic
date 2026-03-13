create extension if not exists "pgcrypto";

create table if not exists settings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  standard_moisture numeric not null default 13.5,
  currency text not null default 'KES',
  company_name text not null default 'Tamining Grove Limited'
);

create table if not exists fields (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null unique,
  size_acres numeric not null default 0
);

create table if not exists varieties (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null unique
);

create table if not exists stores (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null unique,
  location text
);

create table if not exists field_cost_entries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  cost_date date not null,
  field_id uuid not null references fields(id) on delete cascade,
  category text not null, -- seed | fertilizer | chemicals | labor | fuel | other
  description text,
  amount_kes numeric not null,
  reference_no text
);

create table if not exists batches (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  batch_code text not null unique,
  harvest_date date not null,
  field_id uuid references fields(id) on delete set null,
  variety_id uuid references varieties(id) on delete set null,
  store_id uuid references stores(id) on delete set null,

  weight_harvested_kg numeric,
  moisture_pct numeric not null,
  weight_stored_kg numeric not null,

  dry_matter_kg numeric not null default 0,
  stored_std_kg numeric not null default 0
);

create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  sale_date date not null,
  batch_id uuid not null references batches(id) on delete cascade,

  buyer text,
  buyer_type text not null default 'Broker', -- Miller | Broker | Direct
  invoice_no text,

  amount_sold_kg numeric not null,
  unit_price_kes numeric not null,

  sale_value_kes numeric not null default 0,

  transport_cost_kes numeric not null default 0,
  storage_cost_kes numeric not null default 0,
  other_costs_kes numeric not null default 0,

  total_costs_kes numeric not null default 0,
  gross_margin_kes numeric not null default 0,

  payment_terms_days integer not null default 0,
  expected_payment_date date,
  amount_paid_kes numeric not null default 0,
  payment_status text not null default 'Unpaid'
);

-- Helpful view: receivables
drop view if exists v_receivables;

create or replace view v_receivables as
select
  s.id,
  s.sale_date,
  s.buyer,
  s.buyer_type,
  s.invoice_no,
  s.sale_value_kes,
  s.amount_paid_kes,
  (s.sale_value_kes - s.amount_paid_kes) as outstanding_kes,
  s.payment_status,
  s.payment_terms_days,
  coalesce(s.expected_payment_date, s.sale_date + (s.payment_terms_days || ' days')::interval) as expected_payment_date_calc
from sales s;

-- RLS
alter table settings enable row level security;
alter table fields enable row level security;
alter table varieties enable row level security;
alter table stores enable row level security;
alter table field_cost_entries enable row level security;
alter table batches enable row level security;
alter table sales enable row level security;

create policy "auth read settings" on settings for select to authenticated using (true);
create policy "auth write settings" on settings for insert to authenticated with check (true);
create policy "auth update settings" on settings for update to authenticated using (true);

create policy "auth read fields" on fields for select to authenticated using (true);
create policy "auth write fields" on fields for insert to authenticated with check (true);
create policy "auth update fields" on fields for update to authenticated using (true);
create policy "auth delete fields" on fields for delete to authenticated using (true);

create policy "auth read varieties" on varieties for select to authenticated using (true);
create policy "auth write varieties" on varieties for insert to authenticated with check (true);
create policy "auth update varieties" on varieties for update to authenticated using (true);
create policy "auth delete varieties" on varieties for delete to authenticated using (true);

create policy "auth read stores" on stores for select to authenticated using (true);
create policy "auth write stores" on stores for insert to authenticated with check (true);
create policy "auth update stores" on stores for update to authenticated using (true);
create policy "auth delete stores" on stores for delete to authenticated using (true);

create policy "auth read costs" on field_cost_entries for select to authenticated using (true);
create policy "auth write costs" on field_cost_entries for insert to authenticated with check (true);
create policy "auth update costs" on field_cost_entries for update to authenticated using (true);
create policy "auth delete costs" on field_cost_entries for delete to authenticated using (true);

create policy "auth read batches" on batches for select to authenticated using (true);
create policy "auth write batches" on batches for insert to authenticated with check (true);
create policy "auth update batches" on batches for update to authenticated using (true);
create policy "auth delete batches" on batches for delete to authenticated using (true);

create policy "auth read sales" on sales for select to authenticated using (true);
create policy "auth write sales" on sales for insert to authenticated with check (true);
create policy "auth update sales" on sales for update to authenticated using (true);
create policy "auth delete sales" on sales for delete to authenticated using (true);

-- Allow authenticated to read receivables view (views use underlying table perms; keep policies above)
