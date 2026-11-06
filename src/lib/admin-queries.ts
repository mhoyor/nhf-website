// Queries only the admin uses: to-do lists, rosters for result entry, registrations.
import { sql } from './db';

export interface TodoMatch {
  matchId: number;
  label: string;
  competitionName: string;
  scheduledAt: Date;
  homeName: string | null;
  awayName: string | null;
  detail: string;
}

export async function dashboard() {
  const [counts] = await sql<{ pending: number; unattributed: number; noSquad: number; unconfirmed: number; overdue: number }[]>`
    select (select count(*) from registrations where status = 'pending') as pending,
           (select coalesce(sum(goals), 0) from v_unattributed_goals) as unattributed,
           (select count(*) from v_final_without_squad) as no_squad,
           (select count(*) from matches where status = 'final' and confirmed_at is null) as unconfirmed,
           (select count(*) from matches where status in ('scheduled', 'live', 'break', 'shootout') and scheduled_at < now() - interval '3 hours') as overdue`;

  const base = sql`
    select m.id as match_id, m.label, c.name as competition_name, m.scheduled_at, th.name as home_name, ta.name as away_name`;
  const from = sql`
    from matches m join competitions c on c.id = m.competition_id
    left join teams th on th.id = m.home_team_id left join teams ta on ta.id = m.away_team_id`;

  const [overdue, unconfirmed, unattributed, noSquad] = await Promise.all([
    sql<TodoMatch[]>`${base}, m.status::text as detail ${from}
      where m.status in ('scheduled', 'live', 'break', 'shootout') and m.scheduled_at < now() - interval '3 hours'
      order by m.scheduled_at limit 20`,
    sql<TodoMatch[]>`${base}, (m.home_score || '–' || m.away_score) as detail ${from}
      where m.status = 'final' and m.confirmed_at is null order by m.scheduled_at desc limit 20`,
    sql<TodoMatch[]>`${base}, (u.goals || ' for ' || t.code) as detail ${from}
      join v_unattributed_goals u on u.match_id = m.id join teams t on t.id = u.team_id
      order by m.scheduled_at desc limit 20`,
    sql<TodoMatch[]>`${base}, ('no team sheet for ' || t.code) as detail ${from}
      join v_final_without_squad f on f.match_id = m.id join teams t on t.id = f.team_id
      order by m.scheduled_at desc limit 20`,
  ]);
  return { counts, overdue, unconfirmed, unattributed, noSquad };
}

export interface RosterRow {
  playerId: number;
  teamId: number;
  shirt: number | null;
  firstName: string;
  lastName: string;
  position: string | null;
}

/** Players eligible on the match date for either team, plus anyone already in the squad. */
export async function matchRoster(matchId: number): Promise<RosterRow[]> {
  return sql<RosterRow[]>`
    with m as (
      select m.*, c.season_id, (m.scheduled_at at time zone 'Africa/Lagos')::date as match_day
        from matches m join competitions c on c.id = m.competition_id where m.id = ${matchId}
    ), eligible as (
      select distinct on (r.player_id, r.team_id) r.player_id, r.team_id, r.shirt_number as shirt
        from m cross join lateral (values (m.home_team_id), (m.away_team_id)) side(team_id)
        join registrations r on r.team_id = side.team_id and r.season_id = m.season_id and r.status = 'approved'
         and r.joined_on <= m.match_day and (r.left_on is null or r.left_on >= m.match_day)
       order by r.player_id, r.team_id, r.joined_on desc
    ), listed as (
      select s.player_id, s.team_id, s.shirt_number as shirt from match_squads s where s.match_id = ${matchId}
    )
    select x.player_id, x.team_id, x.shirt, p.first_name, p.last_name, p.position
      from (select * from eligible union select * from listed) x
      join players p on p.id = x.player_id
      cross join m
     order by (x.team_id = m.home_team_id) desc, x.shirt nulls last, p.last_name`;
}

export interface StoredSquad {
  playerId: number;
  teamId: number;
  shirt: number | null;
  captain: boolean;
  goalkeeper: boolean;
}

export async function storedSquads(matchId: number): Promise<StoredSquad[]> {
  return sql<StoredSquad[]>`
    select player_id, team_id, shirt_number as shirt, is_captain as captain, is_goalkeeper as goalkeeper
      from match_squads where match_id = ${matchId}`;
}

export interface StoredEvent {
  id: number;
  teamId: number;
  playerId: number | null;
  kind: 'goal' | 'card';
  goalType: 'FG' | 'PC' | 'PS' | null;
  card: 'green' | 'yellow' | 'red' | null;
}

export async function storedEvents(matchId: number): Promise<StoredEvent[]> {
  return sql<StoredEvent[]>`
    select id, team_id, player_id, kind::text as kind, goal_type::text as goal_type, card::text as card
      from match_events where match_id = ${matchId} and voided_at is null and kind in ('goal', 'card')`;
}

export interface RegistrationRow {
  id: number;
  playerId: number;
  nhfNumber: string;
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string | null;
  teamId: number;
  teamName: string;
  teamCode: string;
  clubName: string;
  category: string;
  seasonId: number;
  seasonName: string;
  shirtNumber: number | null;
  status: string;
  joinedOn: string;
  leftOn: string | null;
  note: string | null;
  apps: number;
  createdAt: Date;
}

const regCols = sql`
  r.id, r.player_id, p.nhf_number, p.first_name, p.last_name, p.gender, p.date_of_birth, r.team_id, t.name as team_name, t.code as team_code,
  cl.name as club_name, r.category::text as category, r.season_id, se.name as season_name, r.shirt_number, r.status::text as status,
  r.joined_on, r.left_on, r.note, r.created_at,
  (select count(*) from match_squads s where s.registration_id = r.id) as apps`;
const regFrom = sql`
  registrations r join players p on p.id = r.player_id join teams t on t.id = r.team_id
  join clubs cl on cl.id = t.club_id join seasons se on se.id = r.season_id`;

export async function pendingRegistrations(limit = 200): Promise<RegistrationRow[]> {
  return sql<RegistrationRow[]>`select ${regCols} from ${regFrom} where r.status = 'pending' order by r.created_at limit ${limit}`;
}

export async function playerRegistrations(playerId: number): Promise<RegistrationRow[]> {
  return sql<RegistrationRow[]>`select ${regCols} from ${regFrom} where r.player_id = ${playerId} order by se.starts_on desc, r.joined_on desc`;
}

export interface AdminPlayerRow {
  id: number;
  nhfNumber: string;
  firstName: string;
  lastName: string;
  gender: string;
  position: string | null;
  dateOfBirth: string | null;
  current: string | null;
}

export async function adminFindPlayers(q: string, limit = 100): Promise<AdminPlayerRow[]> {
  const like = `%${q.toLowerCase()}%`;
  return sql<AdminPlayerRow[]>`
    select p.id, p.nhf_number, p.first_name, p.last_name, p.gender, p.position, p.date_of_birth,
           (select t.name || ' · ' || se.name from registrations r join teams t on t.id = r.team_id join seasons se on se.id = r.season_id
             where r.player_id = p.id and r.status in ('approved', 'pending') order by se.starts_on desc, r.left_on nulls first, r.joined_on desc limit 1) as current
      from players p
     where ${q} = '' or lower(p.first_name || ' ' || p.last_name) like ${like} or lower(p.last_name || ' ' || p.first_name) like ${like}
           or upper(p.nhf_number) = upper(${q})
     order by (case when ${q} = '' then -p.id end), p.last_name, p.first_name
     limit ${limit}`;
}

export interface UserRow {
  id: number;
  email: string;
  name: string;
  roles: string[];
  isActive: boolean;
  lastLogin: Date | null;
}

export async function users(): Promise<UserRow[]> {
  return sql<UserRow[]>`
    select u.id, u.email, u.name, u.roles::text[] as roles, u.is_active,
           (select max(at) from audit_log a where a.user_id = u.id and a.action = 'login') as last_login
      from users u order by u.is_active desc, u.name`;
}

// ------------------------------------------------------------------ seasons and venues

export interface SeasonAdminRow {
  id: number;
  name: string;
  startsOn: string;
  endsOn: string;
  isCurrent: boolean;
  competitions: number;
  registrations: number;
}

export async function seasonsForAdmin(): Promise<SeasonAdminRow[]> {
  return sql<SeasonAdminRow[]>`
    select s.id, s.name, s.starts_on, s.ends_on, s.is_current,
           (select count(*) from competitions c where c.season_id = s.id) as competitions,
           (select count(*) from registrations r where r.season_id = s.id) as registrations
      from seasons s order by s.starts_on desc`;
}

export interface VenueAdminRow {
  id: number;
  name: string;
  city: string | null;
  state: string | null;
  surface: string | null;
  matches: number;
  homeTeams: number;
}

export async function venuesForAdmin(): Promise<VenueAdminRow[]> {
  return sql<VenueAdminRow[]>`
    select v.id, v.name, v.city, v.state, v.surface,
           (select count(*) from matches m where m.venue_id = v.id) as matches,
           (select count(*) from teams t where t.home_venue_id = v.id) as home_teams
      from venues v order by v.name`;
}

/** How far a new site is from being ready: shown on the dashboard until every step is done. */
export async function setupProgress(): Promise<{ currentSeason: boolean; venues: number; clubs: number; staff: number; competitions: number }> {
  const [r] = await sql<{ currentSeason: boolean; venues: number; clubs: number; staff: number; competitions: number }[]>`
    select exists (select 1 from seasons where is_current) as current_season,
           (select count(*) from venues) as venues, (select count(*) from clubs) as clubs,
           (select count(*) from users where is_active) as staff, (select count(*) from competitions) as competitions`;
  return { ...r, venues: Number(r.venues), clubs: Number(r.clubs), staff: Number(r.staff), competitions: Number(r.competitions) };
}
