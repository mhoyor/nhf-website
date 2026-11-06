-- NHF website: news, uploaded photos and newsletter sign-ups. Load after 001 and 002.

begin;

-- Photos uploaded from the admin. Stored in the database so backups include them;
-- served from /media/<id> with a long cache, since a stored file never changes.
create table media (
  id           bigint generated always as identity primary key,
  filename     text not null,
  content_type text not null check (content_type in ('image/jpeg', 'image/png', 'image/webp')),
  bytes        bytea not null check (octet_length(bytes) <= 6 * 1024 * 1024),
  created_by   bigint references users,
  created_at   timestamptz not null default now()
);

create table news_posts (
  id             bigint generated always as identity primary key,
  slug           text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title          text not null check (length(title) between 3 and 140),
  summary        text not null default '',
  body           text not null default '',            -- paragraphs separated by a blank line
  tags           text[] not null default '{}',
  section        text not null default 'News',        -- shown on headline lists, such as Super League or U18
  published_on   date not null default current_date,
  date_text      text,                                -- shown instead of the date when only the month is known
  photo_url      text check (photo_url is null or photo_url ~ '^/(img|media)/'),
  photo_alt      text,
  photo_credit   text,
  photo_position text not null default '50% 50%',
  hero_title     text,                                -- for the home page hero; *word* is highlighted
  highlights     jsonb not null default '[]',         -- [["U18 girls · bronze match", "4–3 v Ghana"], ...]
  sources        jsonb not null default '[]',         -- [["Report title", "https://..."], ...]
  status         text not null default 'draft' check (status in ('draft', 'published')),
  featured       boolean not null default false,      -- the home page hero
  created_by     bigint references users,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index news_published_idx on news_posts (published_on desc) where status = 'published';
create unique index news_one_featured on news_posts (featured) where featured;

create trigger news_touch before update on news_posts
  for each row execute function touch_updated_at();

create table newsletter_signups (
  email      text primary key check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  source     text not null default 'website',
  created_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);

commit;
