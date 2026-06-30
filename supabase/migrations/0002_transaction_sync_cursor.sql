alter table public.plaid_items
add column if not exists transactions_cursor text;

create index if not exists transactions_user_plaid_account_idx
on public.transactions (user_id, plaid_account_id);
