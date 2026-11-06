-- First-time setup: settings the site keeps for itself, such as the hash of the
-- one-time setup code that lets the first administrator create their account.
begin;

create table if not exists app_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

commit;
