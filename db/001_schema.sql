-- NHF Match Centre: core schema (PostgreSQL 15+)
-- Clubs and players are separate entities. A player joins a club's team for a season
-- through a registration; a transfer closes one registration and opens another.
-- Match squads record who played each match (appearances); match events record
-- goals and cards. Every statistic is derived from those two tables.

begin;

create type team_category as enum ('men', 'women', 'boys_u18', 'girls_u18', 'boys_u21', 'girls_u21');
create type registration_status as enum ('pending', 'approved', 'rejected', 'withdrawn');
create type competition_format as enum ('league', 'groups');
create type match_stage as enum ('league', 'group', 'classification');
create type match_status as enum ('scheduled', 'live', 'break', 'shootout', 'final', 'postponed', 'abandoned');
create type event_kind as enum ('goal', 'card', 'period_start', 'period_end');
create type goal_type as enum ('FG', 'PC', 'PS');
create type card_colour as enum ('green', 'yellow', 'red');
create type user_role as enum ('admin', 'competition_manager', 'registrar', 'scorer', 'media');

-- People who sign in to the admin. Passwords are scrypt hashes made by the app.
create table users (
  id            bigint generated always as identity primary key,
  email         text not null unique check (email = lower(email) and email like '%@%'),
  name          text not null,
  password_hash text not null,
  roles         user_role[] not null default '{}',
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

create table sessions (
  token_hash text primary key,
  user_id    bigint not null references users on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table audit_log (
  id        bigint generated always as identity primary key,
  user_id   bigint references users,
  action    text not null,
  entity    text not null,
  entity_id bigint,
  data      jsonb,
  at        timestamptz not null default now()
);

create table venues (
  id      bigint generated always as identity primary key,
  name    text not null,
  city    text,
  state   text,
  surface text
);

-- A club is the organisation; its teams are what play (Kada Stars and Kada Queens
-- can belong to one club, Police Machine and IGP Babes to another).
create table clubs (
  id           bigint generated always as identity primary key,
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name         text not null,
  short_name   text,
  state        text,
  city         text,
  founded_year int check (founded_year between 1900 and 2100),
  crest_url    text,
  website      text,
  created_at   timestamptz not null default now()
);

create table teams (
  id            bigint generated always as identity primary key,
  club_id       bigint not null references clubs on delete restrict,
  category      team_category not null,
  name          text not null,
  code          text not null unique check (code ~ '^[A-Z0-9]{2,5}$'),
  colour        text check (colour ~ '^#[0-9A-Fa-f]{6}$'),
  home_venue_id bigint references venues,
  unique (club_id, category, name)
);
create index teams_club_idx on teams (club_id);

create table seasons (
  id         bigint generated always as identity primary key,
  name       text not null unique,
  starts_on  date not null,
  ends_on    date not null,
  is_current boolean not null default false,
  check (ends_on > starts_on)
);
create unique index seasons_one_current on seasons (is_current) where is_current;

-- New players get the next NHF number automatically; imported players can keep theirs.
create sequence nhf_number_seq start 30001;

create table players (
  id                  bigint generated always as identity primary key,
  nhf_number          text not null unique default ('NHF-' || nextval('nhf_number_seq')) check (nhf_number ~ '^NHF-[0-9]{4,8}$'),
  first_name          text not null,
  last_name           text not null,
  other_names         text,
  date_of_birth       date,
  gender              text not null check (gender in ('female', 'male')),
  nationality         text not null default 'Nigerian',
  position            text check (position in ('GK', 'DF', 'MF', 'FW')),
  photo_url           text,
  guardian_consent_on date,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index players_name_idx on players (lower(last_name), lower(first_name));

-- One row per player per team per season. category is copied from the team so
-- the database can stop a player holding two active registrations in one category.
create table registrations (
  id           bigint generated always as identity primary key,
  player_id    bigint not null references players on delete restrict,
  team_id      bigint not null references teams on delete restrict,
  season_id    bigint not null references seasons on delete restrict,
  category     team_category not null,
  shirt_number smallint check (shirt_number between 1 and 99),
  status       registration_status not null default 'pending',
  joined_on    date not null default current_date,
  left_on      date,
  approved_by  bigint references users,
  approved_at  timestamptz,
  note         text,
  created_at   timestamptz not null default now(),
  check (left_on is null or left_on >= joined_on)
);
create unique index registrations_one_active
  on registrations (player_id, season_id, category)
  where status in ('pending', 'approved') and left_on is null;
create unique index registrations_shirt_unique
  on registrations (team_id, season_id, shirt_number)
  where status in ('pending', 'approved') and left_on is null and shirt_number is not null;
create index registrations_team_season_idx on registrations (team_id, season_id);

create table competitions (
  id          bigint generated always as identity primary key,
  season_id   bigint not null references seasons on delete restrict,
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name        text not null,
  category    team_category not null,
  format      competition_format not null,
  legs        smallint not null default 1 check (legs in (1, 2)),
  points_win  smallint not null default 3,
  points_draw smallint not null default 1,
  points_loss smallint not null default 0,
  published   boolean not null default false,
  created_by  bigint references users,
  created_at  timestamptz not null default now()
);

-- A straight league is a competition with one group, code L.
create table competition_groups (
  id             bigint generated always as identity primary key,
  competition_id bigint not null references competitions on delete cascade,
  code           text not null check (code ~ '^([A-H]|L)$'),
  unique (competition_id, code)
);

create table group_teams (
  group_id bigint not null references competition_groups on delete cascade,
  team_id  bigint not null references teams on delete restrict,
  primary key (group_id, team_id)
);

-- Classification matches name their teams by slot until they are known:
-- A1 = winner of group A, L3 = 3rd in the league, W:SF1 / L:SF1 = winner / loser of match SF1.
create table matches (
  id                bigint generated always as identity primary key,
  competition_id    bigint not null references competitions on delete cascade,
  stage             match_stage not null,
  group_id          bigint references competition_groups on delete cascade,
  round             smallint,
  ref               text check (ref ~ '^[A-Za-z0-9]{1,8}$'),
  label             text not null,
  scheduled_at      timestamptz not null,
  venue_id          bigint references venues,
  home_team_id      bigint references teams,
  away_team_id      bigint references teams,
  home_slot         text check (home_slot ~ '^([A-H][1-9]|L[1-9][0-9]?|[WL]:[A-Za-z0-9]{1,8})$'),
  away_slot         text check (away_slot ~ '^([A-H][1-9]|L[1-9][0-9]?|[WL]:[A-Za-z0-9]{1,8})$'),
  place_winner      smallint check (place_winner between 1 and 40),
  place_loser       smallint check (place_loser between 1 and 40),
  knockout          boolean not null default false,
  status            match_status not null default 'scheduled',
  period            smallint not null default 0 check (period between 0 and 4),
  period_started_at timestamptz,
  home_score        smallint check (home_score >= 0),
  away_score        smallint check (away_score >= 0),
  home_shootout     smallint check (home_shootout >= 0),
  away_shootout     smallint check (away_shootout >= 0),
  result_source     text check (result_source in ('live', 'manual')),
  confirmed_by      bigint references users,
  confirmed_at      timestamptz,
  updated_at        timestamptz not null default now(),
  unique (competition_id, ref),
  check (home_team_id is null or away_team_id is null or home_team_id <> away_team_id),
  check (stage <> 'classification' or knockout),
  check (stage = 'classification' or (home_team_id is not null and away_team_id is not null)),
  check (stage = 'classification' or group_id is not null),
  check (status in ('scheduled', 'postponed') or (home_team_id is not null and away_team_id is not null)),
  check (status <> 'final' or (home_score is not null and away_score is not null)),
  check ((home_shootout is null) = (away_shootout is null)),
  check (home_shootout is null or (knockout and home_score = away_score and home_shootout <> away_shootout)),
  check (status <> 'final' or not knockout or home_score <> away_score or home_shootout is not null)
);
create index matches_competition_idx on matches (competition_id, scheduled_at);
create index matches_day_idx on matches (scheduled_at);
create index matches_team_idx on matches (home_team_id, away_team_id);

-- The players tally: one row per player who took part in a match.
create table match_squads (
  match_id        bigint not null references matches on delete cascade,
  team_id         bigint not null references teams,
  player_id       bigint not null references players,
  registration_id bigint not null references registrations,
  shirt_number    smallint check (shirt_number between 1 and 99),
  is_captain      boolean not null default false,
  is_goalkeeper   boolean not null default false,
  primary key (match_id, player_id)
);
create unique index match_squads_shirt on match_squads (match_id, team_id, shirt_number) where shirt_number is not null;
create index match_squads_player_idx on match_squads (player_id);

-- Goals and cards, append-only: a correction voids an event instead of deleting it.
-- A goal with no player is a goal whose scorer was not recorded.
create table match_events (
  id           bigint generated always as identity primary key,
  match_id     bigint not null references matches on delete cascade,
  team_id      bigint references teams,
  player_id    bigint references players,
  kind         event_kind not null,
  goal_type    goal_type,
  card         card_colour,
  period       smallint check (period between 1 and 4),
  match_second int check (match_second between 0 and 3600),
  client_ref   text unique check (client_ref ~ '^[A-Za-z0-9-]{8,64}$'), -- set by the scorer app so a resend is ignored
  entered_by   bigint references users,
  entered_at   timestamptz not null default now(),
  voided_at    timestamptz,
  voided_by    bigint references users,
  void_reason  text,
  check ((kind = 'goal') = (goal_type is not null)),
  check ((kind = 'card') = (card is not null)),
  check ((kind in ('goal', 'card')) = (team_id is not null)),
  check (kind in ('goal', 'card') or player_id is null),
  check (kind <> 'card' or player_id is not null)
);
create index match_events_match_idx on match_events (match_id) where voided_at is null;
create index match_events_player_idx on match_events (player_id) where voided_at is null;

-- One scorer device per match; the lease is renewed while the scorer screen is open.
create table scorer_locks (
  match_id   bigint primary key references matches on delete cascade,
  user_id    bigint not null references users,
  device     text not null,
  expires_at timestamptz not null
);

create table scorer_assignments (
  match_id bigint not null references matches on delete cascade,
  user_id  bigint not null references users on delete cascade,
  primary key (match_id, user_id)
);

commit;
