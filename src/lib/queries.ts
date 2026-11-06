// Read queries for the public Match Centre and the admin. Statistics come from the
// views in db/002_logic.sql, so every page adds up the same way.
import { sql } from './db';

export interface Season {
  id: number;
  name: string;
  startsOn: string;
  endsOn: string;
  isCurrent: boolean;
}

export interface MatchRow {
  id: number;
  competitionId: number;
  competitionSlug: string;
  competitionName: string;
  category: string;
  published: boolean;
  stage: 'league' | 'group' | 'classification';
  groupCode: string | null;
  round: number | null;
  ref: string | null;
  label: string;
  scheduledAt: Date;
  venueName: string | null;
  homeTeamId: number | null;
  awayTeamId: number | null;
  homeName: string | null;
  awayName: string | null;
  homeCode: string | null;
  awayCode: string | null;
  homeColour: string | null;
  awayColour: string | null;
  homeClubSlug: string | null;
  awayClubSlug: string | null;
  homeCrest: string | null;
  awayCrest: string | null;
  homeSlot: string | null;
  awaySlot: string | null;
  status: string;
  period: number;
  periodStartedAt: Date | null;
  homeScore: number | null;
  awayScore: number | null;
  homeShootout: number | null;
  awayShootout: number | null;
  knockout: boolean;
  confirmedAt: Date | null;
  placeWinner: number | null;
  placeLoser: number | null;
}

const matchCols = sql`
  m.id, m.competition_id, c.slug as competition_slug, c.name as competition_name, c.category::text as category, c.published,
  m.stage::text as stage, g.code as group_code, m.round, m.ref, m.label, m.scheduled_at, v.name as venue_name,
  m.home_team_id, m.away_team_id, th.name as home_name, ta.name as away_name, th.code as home_code, ta.code as away_code,
  th.colour as home_colour, ta.colour as away_colour, ch.slug as home_club_slug, ca.slug as away_club_slug,
  ch.crest_url as home_crest, ca.crest_url as away_crest,
  m.home_slot, m.away_slot, m.status::text as status, m.period, m.period_started_at,
  m.home_score, m.away_score, m.home_shootout, m.away_shootout, m.knockout, m.confirmed_at, m.place_winner, m.place_loser`;

const matchFrom = sql`
  matches m
  join competitions c on c.id = m.competition_id
  left join competition_groups g on g.id = m.group_id
  left join venues v on v.id = m.venue_id
  left join teams th on th.id = m.home_team_id left join clubs ch on ch.id = th.club_id
  left join teams ta on ta.id = m.away_team_id left join clubs ca on ca.id = ta.club_id`;

// ------------------------------------------------------------------ seasons

export async function seasons(): Promise<Season[]> {
  return sql<Season[]>`select id, name, starts_on, ends_on, is_current from seasons order by starts_on desc`;
}

export async function currentSeason(): Promise<Season | null> {
  const [s] = await sql<Season[]>`select id, name, starts_on, ends_on, is_current from seasons order by is_current desc, starts_on desc limit 1`;
  return s ?? null;
}

export async function seasonByName(name: string): Promise<Season | null> {
  const [s] = await sql<Season[]>`select id, name, starts_on, ends_on, is_current from seasons where name = ${name}`;
  return s ?? null;
}

// ------------------------------------------------------------------ home

export async function liveAndToday(): Promise<MatchRow[]> {
  return sql<MatchRow[]>`
    select ${matchCols} from ${matchFrom}
     where c.published
       and (m.status in ('live', 'break', 'shootout') or (m.scheduled_at at time zone 'Africa/Lagos')::date = current_date)
     order by m.status in ('live', 'break', 'shootout') desc, m.scheduled_at`;
}

export async function latestResults(limit = 8): Promise<MatchRow[]> {
  return sql<MatchRow[]>`
    select ${matchCols} from ${matchFrom}
     where c.published and m.status = 'final'
     order by m.scheduled_at desc limit ${limit}`;
}

export async function upcoming(limit = 8, withinDays: number | null = null): Promise<MatchRow[]> {
  return sql<MatchRow[]>`
    select ${matchCols} from ${matchFrom}
     where c.published and m.status in ('scheduled', 'postponed') and m.scheduled_at > now()
       and (${withinDays}::int is null or m.scheduled_at < now() + make_interval(days => ${withinDays}::int))
     order by m.scheduled_at limit ${limit}`;
}

export interface SeasonScorerRow {
  playerId: number;
  firstName: string;
  lastName: string;
  isMinor: boolean;
  teamName: string;
  teamCode: string;
  colour: string | null;
  clubSlug: string;
  category: string;
  apps: number;
  goals: number;
  pc: number;
  ps: number;
}

/** Leading scorers in a season across every published competition, with the team they scored most for. */
export async function seasonScorers(seasonId: number, limit = 10, category: string | null = null): Promise<SeasonScorerRow[]> {
  return sql<SeasonScorerRow[]>`
    with lines as (
      select l.player_id, l.team_id, count(*)::int as apps, sum(l.goals)::int as goals, sum(l.pc)::int as pc, sum(l.ps)::int as ps
        from v_match_player_lines l join competitions c on c.id = l.competition_id and c.published
       where l.season_id = ${seasonId} and (${category}::team_category is null or c.category = ${category}::team_category)
       group by l.player_id, l.team_id
    ), per_player as (
      select player_id, sum(apps)::int as apps, sum(goals)::int as goals, sum(pc)::int as pc, sum(ps)::int as ps,
             (array_agg(team_id order by goals desc, apps desc))[1] as team_id
        from lines group by player_id having sum(goals) > 0
    )
    select pp.player_id, p.first_name, p.last_name, coalesce(p.date_of_birth > current_date - interval '18 years', false) as is_minor,
           t.name as team_name, t.code as team_code, t.colour, cl.slug as club_slug, t.category::text as category, pp.apps, pp.goals, pp.pc, pp.ps
      from per_player pp join players p on p.id = pp.player_id join teams t on t.id = pp.team_id join clubs cl on cl.id = t.club_id
     order by pp.goals desc, pp.apps, p.last_name
     limit ${limit}`;
}

export async function competitionsNamed(pattern: string): Promise<CompetitionRow[]> {
  return sql<CompetitionRow[]>`
    select ${compCols} from competitions c join seasons s on s.id = c.season_id
     where c.published and c.name ilike ${pattern}
     order by s.starts_on desc, c.category`;
}

// ------------------------------------------------------------------ competitions

export interface CompetitionRow {
  id: number;
  slug: string;
  name: string;
  category: string;
  format: 'league' | 'groups';
  legs: number;
  published: boolean;
  seasonId: number;
  seasonName: string;
  matches: number;
  played: number;
  firstMatch: Date | null;
  lastMatch: Date | null;
}

const compCols = sql`
  c.id, c.slug, c.name, c.category::text as category, c.format::text as format, c.legs, c.published, c.season_id, s.name as season_name,
  (select count(*) from matches m where m.competition_id = c.id) as matches,
  (select count(*) from matches m where m.competition_id = c.id and m.status = 'final') as played,
  (select min(scheduled_at) from matches m where m.competition_id = c.id) as first_match,
  (select max(scheduled_at) from matches m where m.competition_id = c.id) as last_match`;

export async function competitions(seasonId: number | null, includeUnpublished = false): Promise<CompetitionRow[]> {
  return sql<CompetitionRow[]>`
    select ${compCols} from competitions c join seasons s on s.id = c.season_id
     where (${seasonId}::bigint is null or c.season_id = ${seasonId}) and (c.published or ${includeUnpublished})
     order by s.starts_on desc, c.category, c.name`;
}

export async function competitionBySlug(slug: string, includeUnpublished = false): Promise<CompetitionRow | null> {
  const [c] = await sql<CompetitionRow[]>`
    select ${compCols} from competitions c join seasons s on s.id = c.season_id
     where c.slug = ${slug} and (c.published or ${includeUnpublished})`;
  return c ?? null;
}

export async function competitionById(id: number): Promise<CompetitionRow | null> {
  const [c] = await sql<CompetitionRow[]>`
    select ${compCols} from competitions c join seasons s on s.id = c.season_id where c.id = ${id}`;
  return c ?? null;
}

export interface StandingRow {
  groupId: number;
  groupCode: string;
  teamId: number;
  teamName: string;
  teamCode: string;
  colour: string | null;
  clubSlug: string;
  crestUrl: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  pos: number;
  complete: boolean;
}

export async function standings(competitionId: number): Promise<StandingRow[]> {
  return sql<StandingRow[]>`
    select g.id as group_id, g.code as group_code, s.team_id, t.name as team_name, t.code as team_code, t.colour, cl.slug as club_slug, cl.crest_url,
           s.played, s.won, s.drawn, s.lost, s.goals_for, s.goals_against, s.goal_diff, s.points, s.pos,
           group_complete(g.id) as complete
      from competition_groups g
      cross join lateral group_standings(g.id) s
      join teams t on t.id = s.team_id join clubs cl on cl.id = t.club_id
     where g.competition_id = ${competitionId}
     order by g.code, s.pos`;
}

export async function competitionMatches(competitionId: number): Promise<MatchRow[]> {
  return sql<MatchRow[]>`
    select ${matchCols} from ${matchFrom}
     where m.competition_id = ${competitionId}
     order by m.scheduled_at, m.id`;
}

export interface ScorerRow {
  playerId: number;
  firstName: string;
  lastName: string;
  isMinor: boolean;
  teamName: string;
  teamCode: string;
  clubSlug: string;
  apps: number;
  goals: number;
  pc: number;
  ps: number;
}

export async function topScorers(competitionId: number, limit = 20): Promise<ScorerRow[]> {
  return sql<ScorerRow[]>`
    select s.player_id, p.first_name, p.last_name, coalesce(p.date_of_birth > current_date - interval '18 years', false) as is_minor,
           t.name as team_name, t.code as team_code, cl.slug as club_slug, s.apps, s.goals, s.pc, s.ps
      from v_competition_scorers s
      join players p on p.id = s.player_id
      join teams t on t.id = s.team_id join clubs cl on cl.id = t.club_id
     where s.competition_id = ${competitionId}
     order by s.goals desc, s.apps, p.last_name
     limit ${limit}`;
}

export interface DisciplineRow {
  playerId: number;
  firstName: string;
  lastName: string;
  isMinor: boolean;
  teamCode: string;
  green: number;
  yellow: number;
  red: number;
}

export async function discipline(competitionId: number): Promise<DisciplineRow[]> {
  return sql<DisciplineRow[]>`
    select d.player_id, p.first_name, p.last_name, coalesce(p.date_of_birth > current_date - interval '18 years', false) as is_minor,
           t.code as team_code, d.green, d.yellow, d.red
      from v_discipline d join players p on p.id = d.player_id join teams t on t.id = d.team_id
     where d.competition_id = ${competitionId}
     order by d.red desc, d.yellow desc, d.green desc, p.last_name`;
}

// ------------------------------------------------------------------ matches

export async function matchById(id: number): Promise<MatchRow | null> {
  const [m] = await sql<MatchRow[]>`select ${matchCols} from ${matchFrom} where m.id = ${id}`;
  return m ?? null;
}

export interface LineupRow {
  teamId: number;
  playerId: number;
  firstName: string;
  lastName: string;
  isMinor: boolean;
  position: string | null;
  shirtNumber: number | null;
  isCaptain: boolean;
  isGoalkeeper: boolean;
  goals: number;
  green: number;
  yellow: number;
  red: number;
}

export async function lineups(matchId: number): Promise<LineupRow[]> {
  return sql<LineupRow[]>`
    select s.team_id, s.player_id, p.first_name, p.last_name, coalesce(p.date_of_birth > current_date - interval '18 years', false) as is_minor,
           p.position, s.shirt_number, s.is_captain, s.is_goalkeeper,
           count(e.id) filter (where e.kind = 'goal')::int as goals,
           count(e.id) filter (where e.card = 'green')::int as green,
           count(e.id) filter (where e.card = 'yellow')::int as yellow,
           count(e.id) filter (where e.card = 'red')::int as red
      from match_squads s
      join players p on p.id = s.player_id
      left join match_events e on e.match_id = s.match_id and e.player_id = s.player_id and e.voided_at is null
     where s.match_id = ${matchId}
     group by s.team_id, s.player_id, p.first_name, p.last_name, p.date_of_birth, p.position, s.shirt_number, s.is_captain, s.is_goalkeeper
     order by s.team_id, s.is_goalkeeper desc, s.shirt_number nulls last, p.last_name`;
}

export interface EventView {
  id: number;
  teamId: number | null;
  playerId: number | null;
  firstName: string | null;
  lastName: string | null;
  isMinor: boolean;
  shirtNumber: number | null;
  kind: 'goal' | 'card' | 'period_start' | 'period_end';
  goalType: 'FG' | 'PC' | 'PS' | null;
  card: 'green' | 'yellow' | 'red' | null;
  period: number | null;
  matchSecond: number | null;
  clientRef: string | null;
  enteredAt: Date;
}

export async function matchEvents(matchId: number): Promise<EventView[]> {
  return sql<EventView[]>`
    select e.id, e.team_id, e.player_id, p.first_name, p.last_name, coalesce(p.date_of_birth > current_date - interval '18 years', false) as is_minor,
           s.shirt_number, e.kind::text as kind, e.goal_type::text as goal_type, e.card::text as card, e.period, e.match_second,
           e.client_ref, e.entered_at
      from match_events e
      left join players p on p.id = e.player_id
      left join match_squads s on s.match_id = e.match_id and s.player_id = e.player_id
     where e.match_id = ${matchId} and e.voided_at is null
     order by e.period nulls last, e.match_second nulls last, e.id`;
}

/** What the live score page needs; sent again over server-sent events on every change. */
export interface LiveSnapshot {
  id: number;
  status: string;
  period: number;
  periodStartedAt: string | null;
  homeScore: number | null;
  awayScore: number | null;
  homeShootout: number | null;
  awayShootout: number | null;
  confirmed: boolean;
  events: { id: number; teamId: number | null; playerId: number | null; name: string | null; shirt: number | null; kind: string; goalType: string | null; card: string | null; period: number | null; matchSecond: number | null }[];
}

export async function liveSnapshot(matchId: number, nameOf: (e: EventView) => string | null): Promise<LiveSnapshot | null> {
  const m = await matchById(matchId);
  if (!m || !m.published) return null;
  const events = await matchEvents(matchId);
  return {
    id: m.id,
    status: m.status,
    period: m.period,
    periodStartedAt: m.periodStartedAt ? new Date(m.periodStartedAt).toISOString() : null,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    homeShootout: m.homeShootout,
    awayShootout: m.awayShootout,
    confirmed: !!m.confirmedAt,
    events: events
      .filter((e) => e.kind === 'goal' || e.kind === 'card')
      .map((e) => ({ id: e.id, teamId: e.teamId, playerId: e.playerId, name: nameOf(e), shirt: e.shirtNumber, kind: e.kind, goalType: e.goalType, card: e.card, period: e.period, matchSecond: e.matchSecond })),
  };
}

// ------------------------------------------------------------------ clubs

export interface ClubRow {
  id: number;
  slug: string;
  name: string;
  shortName: string | null;
  state: string | null;
  city: string | null;
  foundedYear: number | null;
  crestUrl: string | null;
  website: string | null;
  teams: { id: number; name: string; code: string; category: string; colour: string | null }[];
}

const clubCols = sql`
  c.id, c.slug, c.name, c.short_name, c.state, c.city, c.founded_year, c.crest_url, c.website,
  coalesce((select json_agg(json_build_object('id', t.id, 'name', t.name, 'code', t.code, 'category', t.category, 'colour', t.colour)
                     order by t.category, t.name)
              from teams t where t.club_id = c.id), '[]') as teams`;

export async function clubs(): Promise<ClubRow[]> {
  return sql<ClubRow[]>`select ${clubCols} from clubs c order by c.name`;
}

export async function clubBySlug(slug: string): Promise<ClubRow | null> {
  const [c] = await sql<ClubRow[]>`select ${clubCols} from clubs c where c.slug = ${slug}`;
  return c ?? null;
}

export async function clubById(id: number): Promise<ClubRow | null> {
  const [c] = await sql<ClubRow[]>`select ${clubCols} from clubs c where c.id = ${id}`;
  return c ?? null;
}

export interface SquadRow {
  teamId: number;
  teamName: string;
  category: string;
  playerId: number;
  firstName: string;
  lastName: string;
  isMinor: boolean;
  playerPosition: string | null;
  shirtNumber: number | null;
  status: string;
  joinedOn: string;
  leftOn: string | null;
  apps: number;
  goals: number;
  cards: number;
  movedIn: boolean; // joined during the season from another team in the same category
  photoUrl: string | null; // public headshot, if any
}

export async function clubSquad(clubId: number, seasonId: number): Promise<SquadRow[]> {
  return sql<SquadRow[]>`
    select q.*, coalesce(p.date_of_birth > current_date - interval '18 years', false) as is_minor, public_photo(p) as photo_url,
           exists (select 1 from registrations o
                    where o.player_id = q.player_id and o.season_id = ${seasonId} and o.category = q.category
                      and o.status = 'approved' and o.left_on is not null and o.left_on < q.joined_on) as moved_in
      from club_squad(${clubId}, ${seasonId}) q join players p on p.id = q.player_id`;
}

export interface AlumniRow {
  playerId: number;
  firstName: string;
  lastName: string;
  isMinor: boolean;
  firstSeason: string;
  lastSeason: string;
  seasons: number;
  apps: number;
  goals: number;
  stillHere: boolean;
}

/** Everyone who has been registered with the club, with what they did for it. */
export async function clubPlayersOverTheYears(clubId: number, currentSeasonId: number | null): Promise<AlumniRow[]> {
  return sql<AlumniRow[]>`
    select h.player_id, p.first_name, p.last_name, coalesce(p.date_of_birth > current_date - interval '18 years', false) as is_minor,
           min(h.season_name) as first_season, max(h.season_name) as last_season, count(distinct h.season_id)::int as seasons,
           sum(h.apps)::int as apps, sum(h.goals)::int as goals,
           bool_or(h.season_id = ${currentSeasonId} and h.left_on is null) as still_here
      from v_player_history h join players p on p.id = h.player_id
     where h.club_id = ${clubId}
     group by h.player_id, p.first_name, p.last_name, p.date_of_birth
     order by sum(h.goals) desc, sum(h.apps) desc, p.last_name
     limit 300`;
}

export async function clubResults(clubId: number, seasonId: number): Promise<MatchRow[]> {
  return sql<MatchRow[]>`
    select ${matchCols} from ${matchFrom}
     where c.season_id = ${seasonId} and c.published and (th.club_id = ${clubId} or ta.club_id = ${clubId})
     order by m.scheduled_at`;
}

// ------------------------------------------------------------------ players

export interface PlayerSearchRow {
  playerId: number;
  nhfNumber: string;
  firstName: string;
  lastName: string;
  isMinor: boolean;
  playerPosition: string | null;
  seasonId: number;
  seasonName: string;
  teamId: number;
  teamName: string;
  clubId: number;
  clubName: string;
  category: string;
  shirtNumber: number | null;
  apps: number;
  goals: number;
}

export async function searchPlayers(f: { q: string; seasonId: number | null; clubId: number | null; category: string | null; limit: number; offset: number }): Promise<PlayerSearchRow[]> {
  return sql<PlayerSearchRow[]>`
    select r.*, coalesce(p.date_of_birth > current_date - interval '18 years', false) as is_minor
      from search_players(${f.q || null}, ${f.seasonId}, ${f.clubId}, ${f.category}::team_category, ${f.limit}, ${f.offset}) r
      join players p on p.id = r.player_id`;
}

export interface PlayerRow {
  id: number;
  nhfNumber: string;
  firstName: string;
  lastName: string;
  otherNames: string | null;
  gender: string;
  position: string | null;
  photoUrl: string | null; // admin only: public pages use publicPhotoUrl
  publicPhotoUrl: string | null; // none for an under-18 without a guardian's consent date
  nationality: string;
  isMinor: boolean;
  dateOfBirth: string | null; // admin only: never sent to public pages
  guardianConsentOn: string | null;
}

export async function playerById(id: number): Promise<PlayerRow | null> {
  const [p] = await sql<PlayerRow[]>`
    select p.id, p.nhf_number, p.first_name, p.last_name, p.other_names, p.gender, p.position, p.photo_url, public_photo(p) as public_photo_url, p.nationality,
           coalesce(p.date_of_birth > current_date - interval '18 years', false) as is_minor, p.date_of_birth, p.guardian_consent_on
      from players p where p.id = ${id}`;
  return p ?? null;
}

export interface HistoryRow {
  registrationId: number;
  seasonId: number;
  seasonName: string;
  teamId: number;
  teamName: string;
  teamCode: string;
  category: string;
  clubId: number;
  clubSlug: string;
  clubName: string;
  shirtNumber: number | null;
  joinedOn: string;
  leftOn: string | null;
  apps: number;
  goals: number;
  fg: number;
  pc: number;
  ps: number;
  green: number;
  yellow: number;
  red: number;
}

export async function playerHistory(playerId: number): Promise<HistoryRow[]> {
  return sql<HistoryRow[]>`
    select registration_id, season_id, season_name, team_id, team_name, team_code, category::text as category, club_id, club_slug, club_name,
           shirt_number, joined_on, left_on, apps, goals, fg, pc, ps, green, yellow, red
      from v_player_history where player_id = ${playerId}
     order by starts_on desc, joined_on desc`;
}

export interface CareerRow {
  seasons: number;
  clubs: number;
  apps: number;
  goals: number;
  pcGoals: number;
  cards: number;
}

export async function playerCareer(playerId: number): Promise<CareerRow> {
  const [c] = await sql<CareerRow[]>`select seasons, clubs, apps, goals, pc_goals, cards from v_player_career where player_id = ${playerId}`;
  return c ?? { seasons: 0, clubs: 0, apps: 0, goals: 0, pcGoals: 0, cards: 0 };
}

export interface MatchLogRow {
  matchId: number;
  scheduledAt: Date;
  competitionSlug: string;
  competitionName: string;
  label: string;
  teamCode: string;
  opponentName: string;
  opponentCode: string;
  home: boolean;
  forScore: number;
  againstScore: number;
  shootoutFor: number | null;
  shootoutAgainst: number | null;
  goals: number;
  pc: number;
  ps: number;
  green: number;
  yellow: number;
  red: number;
}

export async function playerMatchLog(playerId: number, limit = 60): Promise<MatchLogRow[]> {
  return sql<MatchLogRow[]>`
    select l.match_id, m.scheduled_at, c.slug as competition_slug, c.name as competition_name, m.label, t.code as team_code,
           o.name as opponent_name, o.code as opponent_code, (m.home_team_id = l.team_id) as home,
           case when m.home_team_id = l.team_id then m.home_score else m.away_score end as for_score,
           case when m.home_team_id = l.team_id then m.away_score else m.home_score end as against_score,
           case when m.home_team_id = l.team_id then m.home_shootout else m.away_shootout end as shootout_for,
           case when m.home_team_id = l.team_id then m.away_shootout else m.home_shootout end as shootout_against,
           l.goals, l.pc, l.ps, l.green, l.yellow, l.red
      from v_match_player_lines l
      join matches m on m.id = l.match_id
      join competitions c on c.id = m.competition_id and c.published
      join teams t on t.id = l.team_id
      join teams o on o.id = case when m.home_team_id = l.team_id then m.away_team_id else m.home_team_id end
     where l.player_id = ${playerId}
     order by m.scheduled_at desc
     limit ${limit}`;
}

// ------------------------------------------------------------------ lists for forms

export interface TeamOption {
  id: number;
  name: string;
  code: string;
  category: string;
  clubId: number;
  clubName: string;
}

export async function teamOptions(category?: string | null): Promise<TeamOption[]> {
  return sql<TeamOption[]>`
    select t.id, t.name, t.code, t.category::text as category, t.club_id, c.name as club_name
      from teams t join clubs c on c.id = t.club_id
     where (${category ?? null}::team_category is null or t.category = ${category ?? null}::team_category)
     order by c.name, t.category, t.name`;
}

export async function clubOptions(): Promise<{ id: number; name: string; slug: string }[]> {
  return sql`select id, name, slug from clubs order by name`;
}

export async function venueOptions(): Promise<{ id: number; name: string }[]> {
  return sql`select id, name from venues order by name`;
}
