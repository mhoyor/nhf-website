-- NHF Match Centre: rules, derived statistics and the competition format engine.

begin;

-- ---------------------------------------------------------------- housekeeping
create function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

create trigger players_touch before update on players
  for each row execute function touch_updated_at();

-- Age limit for a youth category: the player must be younger than this on
-- 1 January of the season year. Confirm the cut-off with the NHF technical
-- committee before launch; change it here only.
create function category_age_limit(c team_category) returns int language sql immutable as $$
  select case when c in ('boys_u18', 'girls_u18') then 18 when c in ('boys_u21', 'girls_u21') then 21 end
$$;

-- A registration takes its category from the team, so the one-active-registration
-- rule works per category (a youth player can be in a U18 and a senior squad).
-- It also checks the player's gender and, for youth teams, age.
create function registration_category() returns trigger language plpgsql as $$
declare
  p      players;
  lim    int;
  cutoff date;
begin
  select category into new.category from teams where id = new.team_id;
  select * into p from players where id = new.player_id;
  if (new.category in ('men', 'boys_u18', 'boys_u21') and p.gender <> 'male')
     or (new.category in ('women', 'girls_u18', 'girls_u21') and p.gender <> 'female') then
    raise exception 'Player % cannot be registered with a % team', p.nhf_number, new.category using errcode = 'check_violation';
  end if;
  lim := category_age_limit(new.category);
  if lim is not null and new.status in ('pending', 'approved') then
    select make_date(extract(year from starts_on)::int, 1, 1) into cutoff from seasons where id = new.season_id;
    if p.date_of_birth is null then
      raise exception 'Player % needs a date of birth for a % team', p.nhf_number, new.category using errcode = 'check_violation';
    end if;
    if p.date_of_birth <= cutoff - make_interval(years => lim) then
      raise exception 'Player % is over the age limit for % (born %)', p.nhf_number, new.category, p.date_of_birth
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end $$;
create trigger registrations_category before insert or update of team_id, player_id, season_id, status on registrations
  for each row execute function registration_category();

-- A registration that has been used in a match cannot be closed before that match,
-- moved to another team or season, or rejected: the appearances would lose their club.
create function registration_guard() returns trigger language plpgsql as $$
declare last_day date;
begin
  select max((m.scheduled_at at time zone 'Africa/Lagos')::date) into last_day
    from match_squads s join matches m on m.id = s.match_id where s.registration_id = old.id;
  if last_day is null then return new; end if;
  if new.team_id <> old.team_id or new.season_id <> old.season_id or new.player_id <> old.player_id then
    raise exception 'This registration has appearances; record a transfer instead of changing it' using errcode = 'check_violation';
  end if;
  if new.status not in ('approved') then
    raise exception 'This registration has appearances up to %, so it cannot be %', last_day, new.status using errcode = 'check_violation';
  end if;
  if new.left_on is not null and new.left_on < last_day then
    raise exception 'The player appeared for this team on %, after the leaving date %', last_day, new.left_on using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger registrations_guard before update on registrations
  for each row execute function registration_guard();

-- Teams in a match must belong to the competition's category.
create function match_teams_check() returns trigger language plpgsql as $$
declare comp_cat team_category;
begin
  select category into comp_cat from competitions where id = new.competition_id;
  if new.home_team_id is not null and (select category from teams where id = new.home_team_id) <> comp_cat then
    raise exception 'Home team is not a % team', comp_cat using errcode = 'check_violation';
  end if;
  if new.away_team_id is not null and (select category from teams where id = new.away_team_id) <> comp_cat then
    raise exception 'Away team is not a % team', comp_cat using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger matches_teams_check before insert or update of home_team_id, away_team_id on matches
  for each row execute function match_teams_check();

-- ---------------------------------------------------------------- eligibility
-- A player can only be in a match squad with an approved registration for that
-- team, valid on the match date (Nigerian time). The registration is filled in here.
create function match_squad_check() returns trigger language plpgsql as $$
declare
  m     matches;
  season bigint;
  match_day date;
  reg   registrations;
begin
  select * into m from matches where id = new.match_id;
  if new.team_id is distinct from m.home_team_id and new.team_id is distinct from m.away_team_id then
    raise exception 'Team % is not playing in match %', new.team_id, new.match_id using errcode = 'check_violation';
  end if;
  select c.season_id into season from competitions c where c.id = m.competition_id;
  match_day := (m.scheduled_at at time zone 'Africa/Lagos')::date;
  select * into reg from registrations r
   where r.player_id = new.player_id and r.team_id = new.team_id and r.season_id = season
     and r.status = 'approved' and r.joined_on <= match_day and (r.left_on is null or r.left_on >= match_day)
   order by r.joined_on desc limit 1;
  if not found then
    raise exception 'Player % has no approved registration with team % on %', new.player_id, new.team_id, match_day
      using errcode = 'check_violation';
  end if;
  new.registration_id := reg.id;
  if new.shirt_number is null then new.shirt_number := reg.shirt_number; end if;
  return new;
end $$;
create trigger match_squads_check before insert or update on match_squads
  for each row execute function match_squad_check();

-- Goals and cards must belong to a team in the match, and a named player must be
-- in that team's match squad.
create function match_event_check() returns trigger language plpgsql as $$
declare m matches;
begin
  select * into m from matches where id = new.match_id;
  if new.kind in ('goal', 'card') then
    if new.team_id is distinct from m.home_team_id and new.team_id is distinct from m.away_team_id then
      raise exception 'Team % is not playing in match %', new.team_id, new.match_id using errcode = 'check_violation';
    end if;
    if new.player_id is not null and not exists (
      select 1 from match_squads s where s.match_id = new.match_id and s.player_id = new.player_id and s.team_id = new.team_id) then
      raise exception 'Player % is not in the match squad of team %', new.player_id, new.team_id using errcode = 'check_violation';
    end if;
  end if;
  if new.card = 'red' and new.voided_at is null and exists (
    select 1 from match_events e where e.match_id = new.match_id and e.player_id = new.player_id and e.card = 'red'
       and e.voided_at is null and e.id is distinct from new.id) then
    raise exception 'Player % already has a red card in this match', new.player_id using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger match_events_check before insert or update of team_id, player_id, card, voided_at on match_events
  for each row execute function match_event_check();

-- ---------------------------------------------------------------- scores
-- The score is never typed twice: it is the count of goal events that are not voided.
create function match_score_derive() returns trigger language plpgsql as $$
begin
  if new.status in ('scheduled', 'postponed') then
    new.home_score := null; new.away_score := null;
    new.home_shootout := null; new.away_shootout := null;
    new.period := 0; new.period_started_at := null;
  else
    select count(*) filter (where e.team_id = new.home_team_id),
           count(*) filter (where e.team_id = new.away_team_id)
      into new.home_score, new.away_score
      from match_events e
     where e.match_id = new.id and e.kind = 'goal' and e.voided_at is null;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger matches_score before update on matches
  for each row execute function match_score_derive();

create function match_events_touch() returns trigger language plpgsql as $$
begin
  update matches set updated_at = now() where id = coalesce(new.match_id, old.match_id);
  return null;
end $$;
create trigger match_events_touch after insert or update or delete on match_events
  for each row execute function match_events_touch();

-- ---------------------------------------------------------------- standings
create function group_standings(p_group bigint)
returns table (team_id bigint, played int, won int, drawn int, lost int,
               goals_for int, goals_against int, goal_diff int, points int, pos int)
language sql stable as $$
  with rules as (
    select c.points_win, c.points_draw, c.points_loss
      from competition_groups g join competitions c on c.id = g.competition_id
     where g.id = p_group
  ), res as (
    select m.home_team_id as team_id, m.home_score as gf, m.away_score as ga
      from matches m where m.group_id = p_group and m.stage <> 'classification' and m.status = 'final'
    union all
    select m.away_team_id, m.away_score, m.home_score
      from matches m where m.group_id = p_group and m.stage <> 'classification' and m.status = 'final'
  ), agg as (
    select gt.team_id,
           count(r.gf)::int as played,
           count(*) filter (where r.gf > r.ga)::int as won,
           count(*) filter (where r.gf = r.ga)::int as drawn,
           count(*) filter (where r.gf < r.ga)::int as lost,
           coalesce(sum(r.gf), 0)::int as goals_for,
           coalesce(sum(r.ga), 0)::int as goals_against
      from group_teams gt left join res r on r.team_id = gt.team_id
     where gt.group_id = p_group
     group by gt.team_id
  )
  select a.team_id, a.played, a.won, a.drawn, a.lost, a.goals_for, a.goals_against,
         a.goals_for - a.goals_against as goal_diff,
         (a.won * rules.points_win + a.drawn * rules.points_draw + a.lost * rules.points_loss)::int as points,
         row_number() over (order by (a.won * rules.points_win + a.drawn * rules.points_draw + a.lost * rules.points_loss) desc,
                                     a.goals_for - a.goals_against desc, a.goals_for desc, t.name)::int as pos
    from agg a cross join rules join teams t on t.id = a.team_id
$$;

create function group_complete(p_group bigint) returns boolean language sql stable as $$
  select count(*) > 0 and bool_and(status = 'final')
    from matches where group_id = p_group and stage <> 'classification'
$$;

-- ---------------------------------------------------------------- classification
create function match_winner(p_match bigint) returns bigint language sql stable as $$
  select case
           when m.status <> 'final' then null
           when m.home_score > m.away_score then m.home_team_id
           when m.away_score > m.home_score then m.away_team_id
           when m.home_shootout > m.away_shootout then m.home_team_id
           when m.away_shootout > m.home_shootout then m.away_team_id
         end
    from matches m where m.id = p_match
$$;

create function resolve_slot(p_comp bigint, p_slot text) returns bigint language plpgsql stable as $$
declare
  m       matches;
  winner  bigint;
  grp     bigint;
begin
  if p_slot is null then return null; end if;
  if p_slot ~ '^[WL]:' then
    select * into m from matches where competition_id = p_comp and ref = substr(p_slot, 3);
    if not found then return null; end if;
    winner := match_winner(m.id);
    if winner is null then return null; end if;
    if left(p_slot, 1) = 'W' then return winner; end if;
    return case when winner = m.home_team_id then m.away_team_id else m.home_team_id end;
  end if;
  select id into grp from competition_groups where competition_id = p_comp and code = left(p_slot, 1);
  if grp is null or not group_complete(grp) then return null; end if;
  return (select s.team_id from group_standings(grp) s where s.pos = substr(p_slot, 2)::int);
end $$;

-- Fill (or clear) the teams of classification matches that have not started.
-- Teams are locked once a match starts, so a later correction never rewrites a played match.
create function refresh_classification(p_comp bigint) returns void language plpgsql as $$
begin
  update matches m
     set home_team_id = case when m.home_slot is null then m.home_team_id else resolve_slot(p_comp, m.home_slot) end,
         away_team_id = case when m.away_slot is null then m.away_team_id else resolve_slot(p_comp, m.away_slot) end
   where m.competition_id = p_comp and m.stage = 'classification' and m.status in ('scheduled', 'postponed')
     and (m.home_slot is not null or m.away_slot is not null);
end $$;

create function matches_after_update() returns trigger language plpgsql as $$
begin
  if (old.status = 'final') is distinct from (new.status = 'final')
     or (new.status = 'final' and (old.home_score, old.away_score, old.home_shootout, old.away_shootout)
                                   is distinct from (new.home_score, new.away_score, new.home_shootout, new.away_shootout)) then
    perform refresh_classification(new.competition_id);
  end if;
  perform pg_notify('match_live', json_build_object('match', new.id, 'competition', new.competition_id, 'status', new.status)::text);
  return null;
end $$;
create trigger matches_after_update after update on matches
  for each row execute function matches_after_update();

-- ---------------------------------------------------------------- statistics
-- One line per player per final match: the building block of every tally.
create view v_match_player_lines as
select s.match_id, m.competition_id, c.season_id, m.scheduled_at, s.team_id, t.club_id, s.player_id, s.shirt_number,
       s.is_captain, s.is_goalkeeper,
       count(e.id) filter (where e.kind = 'goal')::int     as goals,
       count(e.id) filter (where e.goal_type = 'FG')::int  as fg,
       count(e.id) filter (where e.goal_type = 'PC')::int  as pc,
       count(e.id) filter (where e.goal_type = 'PS')::int  as ps,
       count(e.id) filter (where e.card = 'green')::int    as green,
       count(e.id) filter (where e.card = 'yellow')::int   as yellow,
       count(e.id) filter (where e.card = 'red')::int      as red
  from match_squads s
  join matches m      on m.id = s.match_id and m.status = 'final'
  join competitions c on c.id = m.competition_id
  join teams t        on t.id = s.team_id
  left join match_events e on e.match_id = s.match_id and e.player_id = s.player_id
                          and e.voided_at is null and e.kind in ('goal', 'card')
 group by s.match_id, m.competition_id, c.season_id, m.scheduled_at, s.team_id, t.club_id, s.player_id,
          s.shirt_number, s.is_captain, s.is_goalkeeper;

-- A player's tally per season and team.
create view v_player_team_season as
select l.player_id, l.season_id, l.team_id, l.club_id,
       count(*)::int as apps, sum(l.goals)::int as goals, sum(l.fg)::int as fg, sum(l.pc)::int as pc, sum(l.ps)::int as ps,
       sum(l.green)::int as green, sum(l.yellow)::int as yellow, sum(l.red)::int as red,
       min(l.scheduled_at) as first_match, max(l.scheduled_at) as last_match
  from v_match_player_lines l
 group by l.player_id, l.season_id, l.team_id, l.club_id;

-- Every club and season a player was registered with, with what they did there.
-- Seasons with a registration but no matches appear with zeros.
create view v_player_history as
select r.player_id, r.id as registration_id, r.season_id, se.name as season_name, se.starts_on,
       r.team_id, t.name as team_name, t.code as team_code, t.category, t.club_id, cl.slug as club_slug, cl.name as club_name,
       r.shirt_number, r.status, r.joined_on, r.left_on,
       coalesce(st.apps, 0) as apps, coalesce(st.goals, 0) as goals, coalesce(st.fg, 0) as fg, coalesce(st.pc, 0) as pc,
       coalesce(st.ps, 0) as ps, coalesce(st.green, 0) as green, coalesce(st.yellow, 0) as yellow, coalesce(st.red, 0) as red
  from registrations r
  join seasons se on se.id = r.season_id
  join teams t    on t.id = r.team_id
  join clubs cl   on cl.id = t.club_id
  left join v_player_team_season st on st.player_id = r.player_id and st.season_id = r.season_id and st.team_id = r.team_id
 where r.status = 'approved';

create view v_player_career as
select p.id as player_id,
       count(distinct h.season_id)::int as seasons,
       count(distinct h.club_id)::int   as clubs,
       coalesce(sum(h.apps), 0)::int    as apps,
       coalesce(sum(h.goals), 0)::int   as goals,
       coalesce(sum(h.pc), 0)::int      as pc_goals,
       coalesce(sum(h.green + h.yellow + h.red), 0)::int as cards
  from players p left join v_player_history h on h.player_id = p.id
 group by p.id;

create view v_competition_scorers as
select l.competition_id, l.player_id, l.team_id, count(*)::int as apps, sum(l.goals)::int as goals,
       sum(l.pc)::int as pc, sum(l.ps)::int as ps
  from v_match_player_lines l
 group by l.competition_id, l.player_id, l.team_id
having sum(l.goals) > 0;

-- Cards per player per competition, for suspension checks.
create view v_discipline as
select l.competition_id, l.player_id, l.team_id,
       sum(l.green)::int as green, sum(l.yellow)::int as yellow, sum(l.red)::int as red
  from v_match_player_lines l
 group by l.competition_id, l.player_id, l.team_id
having sum(l.green + l.yellow + l.red) > 0;

-- Admin to-do lists.
create view v_unattributed_goals as
select e.match_id, e.team_id, count(*)::int as goals
  from match_events e join matches m on m.id = e.match_id and m.status = 'final'
 where e.kind = 'goal' and e.player_id is null and e.voided_at is null
 group by e.match_id, e.team_id;

create view v_final_without_squad as
select m.id as match_id, side.team_id
  from matches m
  cross join lateral (values (m.home_team_id), (m.away_team_id)) as side(team_id)
 where m.status = 'final'
   and not exists (select 1 from match_squads s where s.match_id = m.id and s.team_id = side.team_id);

-- ---------------------------------------------------------------- search
-- Players by name or NHF number, season, club and category. One row per matching
-- registration; with no season given, every season the player was registered.
create function search_players(p_q text, p_season bigint, p_club bigint, p_category team_category,
                               p_limit int default 200, p_offset int default 0)
returns table (player_id bigint, nhf_number text, first_name text, last_name text, player_position text,
               season_id bigint, season_name text, team_id bigint, team_name text, club_id bigint, club_name text,
               category team_category, shirt_number smallint, apps int, goals int)
language sql stable as $$
  select p.id, p.nhf_number, p.first_name, p.last_name, p.position,
         h.season_id, h.season_name, h.team_id, h.team_name, h.club_id, h.club_name, h.category, h.shirt_number,
         h.apps, h.goals
    from players p
    join v_player_history h on h.player_id = p.id
   where (p_q is null or p_q = ''
          or lower(p.first_name || ' ' || p.last_name) like '%' || lower(p_q) || '%'
          or lower(p.last_name || ' ' || p.first_name) like '%' || lower(p_q) || '%'
          or upper(p.nhf_number) = upper(p_q))
     and (p_season is null or h.season_id = p_season)
     and (p_club is null or h.club_id = p_club)
     and (p_category is null or h.category = p_category)
   order by h.starts_on desc, p.last_name, p.first_name, p.id, h.joined_on
   limit p_limit offset p_offset
$$;

-- A club's squads for a season, with each player's tally for that team.
create function club_squad(p_club bigint, p_season bigint)
returns table (team_id bigint, team_name text, category team_category, player_id bigint, first_name text, last_name text,
               player_position text, shirt_number smallint, status registration_status, joined_on date, left_on date,
               apps int, goals int, cards int)
language sql stable as $$
  select t.id, t.name, t.category, p.id, p.first_name, p.last_name, p.position, r.shirt_number, r.status, r.joined_on, r.left_on,
         coalesce(st.apps, 0), coalesce(st.goals, 0), coalesce(st.green + st.yellow + st.red, 0)
    from registrations r
    join teams t   on t.id = r.team_id and t.club_id = p_club
    join players p on p.id = r.player_id
    left join v_player_team_season st on st.player_id = r.player_id and st.season_id = r.season_id and st.team_id = r.team_id
   where r.season_id = p_season and r.status in ('approved', 'pending')
   order by t.category, r.left_on nulls first, r.shirt_number nulls last, p.last_name
$$;

commit;
