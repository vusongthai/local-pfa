create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.plaid_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plaid_item_id text not null,
  encrypted_access_token text not null,
  institution_name text,
  institution_id text,
  status text default 'active',
  last_successful_sync_at timestamptz,
  last_failed_sync_at timestamptz,
  error_code text,
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, plaid_item_id)
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plaid_item_id uuid not null references public.plaid_items(id) on delete cascade,
  plaid_account_id text not null,
  name text,
  official_name text,
  type text,
  subtype text,
  mask text,
  current_balance numeric,
  available_balance numeric,
  iso_currency_code text,
  is_active boolean default true,
  last_balance_sync_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, plaid_account_id)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  plaid_transaction_id text not null,
  plaid_account_id text not null,
  date date not null,
  authorized_date date,
  name text,
  merchant_name text,
  amount numeric not null,
  category_primary text,
  category_detailed text,
  pending boolean default false,
  payment_channel text,
  iso_currency_code text,
  raw_json jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, plaid_transaction_id)
);

create table if not exists public.recurring_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  merchant_name text not null,
  account_id uuid references public.accounts(id) on delete set null,
  average_amount numeric,
  frequency text,
  last_seen_date date,
  next_expected_date date,
  confidence numeric,
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.alert_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  name text not null,
  config jsonb not null,
  enabled boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  alert_rule_id uuid references public.alert_rules(id) on delete set null,
  type text not null,
  title text not null,
  message text not null,
  severity text default 'info',
  related_transaction_id uuid references public.transactions(id) on delete set null,
  status text default 'new',
  created_at timestamptz default now(),
  dismissed_at timestamptz
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  source text,
  metadata jsonb,
  created_at timestamptz default now()
);

create index if not exists plaid_items_user_id_idx on public.plaid_items (user_id);
create index if not exists accounts_user_id_idx on public.accounts (user_id);
create index if not exists accounts_plaid_item_id_idx on public.accounts (plaid_item_id);
create index if not exists transactions_user_date_idx on public.transactions (user_id, date desc);
create index if not exists transactions_account_id_idx on public.transactions (account_id);
create index if not exists recurring_transactions_user_id_idx on public.recurring_transactions (user_id);
create index if not exists alert_rules_user_id_idx on public.alert_rules (user_id);
create index if not exists alerts_user_status_idx on public.alerts (user_id, status);
create index if not exists audit_logs_user_created_idx on public.audit_logs (user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email, updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists plaid_items_updated_at on public.plaid_items;
create trigger plaid_items_updated_at before update on public.plaid_items
for each row execute function public.set_updated_at();

drop trigger if exists accounts_updated_at on public.accounts;
create trigger accounts_updated_at before update on public.accounts
for each row execute function public.set_updated_at();

drop trigger if exists transactions_updated_at on public.transactions;
create trigger transactions_updated_at before update on public.transactions
for each row execute function public.set_updated_at();

drop trigger if exists recurring_transactions_updated_at on public.recurring_transactions;
create trigger recurring_transactions_updated_at before update on public.recurring_transactions
for each row execute function public.set_updated_at();

drop trigger if exists alert_rules_updated_at on public.alert_rules;
create trigger alert_rules_updated_at before update on public.alert_rules
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.plaid_items enable row level security;
alter table public.accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.recurring_transactions enable row level security;
alter table public.alert_rules enable row level security;
alter table public.alerts enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "profiles are user owned" on public.profiles;
create policy "profiles are user owned"
on public.profiles for all
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "plaid_items are user owned" on public.plaid_items;
create policy "plaid_items are user owned"
on public.plaid_items for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "accounts are user owned" on public.accounts;
create policy "accounts are user owned"
on public.accounts for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "transactions are user owned" on public.transactions;
create policy "transactions are user owned"
on public.transactions for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "recurring_transactions are user owned" on public.recurring_transactions;
create policy "recurring_transactions are user owned"
on public.recurring_transactions for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "alert_rules are user owned" on public.alert_rules;
create policy "alert_rules are user owned"
on public.alert_rules for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "alerts are user owned" on public.alerts;
create policy "alerts are user owned"
on public.alerts for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "audit_logs are user readable" on public.audit_logs;
create policy "audit_logs are user readable"
on public.audit_logs for select
using (user_id = auth.uid());
