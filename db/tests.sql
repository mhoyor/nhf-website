-- NHF Match Centre: database tests. Run against a database loaded with
-- 001_schema.sql, 002_logic.sql and 003_demo_seed.sql:
--   psql -d nhf -v ON_ERROR_STOP=1 -f db/tests.sql
-- Everything runs inside one transaction that is rolled back, so the demo data is left as it was.
-- Each check prints "ok - ..."; the first failure stops the run with an error.

\set ON_ERROR_STOP 1
\set QUIET 1
set client_min_messages = notice;
\o /dev/null
begin;

create function pg_temp.ok(cond boolean, label text) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'FAILED - %', label; end if;
  raise notice 'ok - %', label;
end $$;

-- Run a statement that must fail with a message containing needle.
create function pg_temp.fails(stmt text, needle text, label text) returns void language plpgsql as $$
declare msg text;
begin
  begin
    execute stmt;
  exception when others then
    msg := sqlerrm;
  end;
  if msg is null then raise exception 'FAILED - % (statement succeeded: %)', label, stmt; end if;
  if position(lower(needle) in lower(msg)) = 0 then
    raise exception 'FAILED - % (expected "%", got "%")', label, needle, msg;
  end if;
  raise notice 'ok - % (refused: %)', label, msg;
end $$;

create function pg_temp.season(n text) returns bigint language sql as $$ select id from seasons where name = n $$;
create function pg_temp.comp(s text) returns bigint language sql as $$ select id from competitions where slug = s $$;
create function pg_temp.team(c text) returns bigint language sql as $$ select id from teams where code = c $$;
create function pg_temp.match_ref(c text, r text) returns matches language sql as $$
  select * from matches where competition_id = pg_temp.comp(c) and ref = r $$;

-- Put every eligible player of both teams into a match squad.
create function pg_temp.fill_squads(p_match bigint) returns int language plpgsql as $$
declare n int;
begin
  insert into match_squads (match_id, team_id, player_id, registration_id)
  select m.id, side.team_id, r.player_id, r.id
    from matches m
    join competitions c on c.id = m.competition_id
    cross join lateral (values (m.home_team_id), (m.away_team_id)) side(team_id)
    join registrations r on r.team_id = side.team_id and r.season_id = c.season_id and r.status = 'approved'
     and r.joined_on <= (m.scheduled_at at time zone 'Africa/Lagos')::date
     and (r.left_on is null or r.left_on >= (m.scheduled_at at time zone 'Africa/Lagos')::date)
   where m.id = p_match
  on conflict do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

-- A squad player of a team in a match (the n-th outfield player by shirt number).
create function pg_temp.squad_player(p_match bigint, p_team bigint, n int default 1) returns bigint language sql as $$
  select s.player_id from match_squads s join players p on p.id = s.player_id
   where s.match_id = p_match and s.team_id = p_team and p.position <> 'GK'
   order by s.shirt_number nulls last, s.player_id offset n - 1 limit 1 $$;

create function pg_temp.goal(p_match bigint, p_team bigint, p_player bigint, t goal_type default 'FG') returns bigint language sql as $$
  insert into match_events (match_id, team_id, player_id, kind, goal_type, period, match_second)
  values (p_match, p_team, p_player, 'goal', t, 2, 600) returning id $$;

\echo '--- demo data and derived totals'

select pg_temp.ok((select count(*) from players) = 168, '168 demo players');
select pg_temp.ok((select count(*) from matches where status = 'final') = 48, '48 final matches');

select pg_temp.ok(not exists (
  select 1 from matches m
   cross join lateral (
       select count(*) filter (where e.team_id = m.home_team_id) as h, count(*) filter (where e.team_id = m.away_team_id) as a
         from match_events e where e.match_id = m.id and e.kind = 'goal' and e.voided_at is null) ev
   where m.status = 'final' and (m.home_score <> ev.h or m.away_score <> ev.a)),
  'every final score equals its goal events');

with ev as (
  select e.player_id, count(*)::int as g
    from match_events e join matches m on m.id = e.match_id and m.status = 'final'
   where e.kind = 'goal' and e.voided_at is null and e.player_id is not null
   group by e.player_id)
select pg_temp.ok(not exists (
  select 1 from v_player_career c left join ev on ev.player_id = c.player_id where c.goals <> coalesce(ev.g, 0)),
  'each player''s career goals equal their goal events');

with sq as (
  select s.player_id, count(*)::int as n from match_squads s join matches m on m.id = s.match_id and m.status = 'final'
   group by s.player_id)
select pg_temp.ok(not exists (
  select 1 from v_player_career c left join sq on sq.player_id = c.player_id where c.apps <> coalesce(sq.n, 0)),
  'each player''s career appearances equal their match squad rows');

select pg_temp.ok(
  (select sum(goals) from v_player_career) + coalesce((select sum(goals) from v_unattributed_goals), 0)
  = (select sum(home_score + away_score) from matches where status = 'final'),
  'player goals plus unattributed goals equal all goals scored');

select pg_temp.ok(not exists (
  select 1 from competition_groups g join competitions c on c.id = g.competition_id
   cross join lateral group_standings(g.id) s
   where c.slug = 'demo-mens-league-2025' and s.played <> 10),
  'double round robin of six teams: every team played 10 league matches');

select pg_temp.ok((
  select sum(s.goals_for) = sum(s.goals_against) and sum(s.won) = sum(s.lost)
    from competition_groups g cross join lateral group_standings(g.id) s
   where g.competition_id = pg_temp.comp('demo-mens-league-2025')),
  'league table balances: goals for = goals against, wins = losses');

\echo '--- players moving between clubs'

select pg_temp.ok((select count(*) from v_player_career c where c.player_id % 7 = 3 and c.clubs = 2) = 24,
  'the 24 players who moved before 2026 show two clubs in their career');

select pg_temp.ok((
  select count(distinct h.club_id) = 2 and count(*) = 2
    from v_player_history h where h.player_id = 10 ),
  'player 10 (2025 transfer): one history row per club');

-- The mid-season mover: player 11 left club 1 on 20 September 2026 and joined club 3 on 21 September.
select pg_temp.ok((
  select count(*) = 2 and count(distinct club_id) = 2 and bool_or(left_on = '2026-09-20') and bool_or(joined_on = '2026-09-21')
    from v_player_history where player_id = 11 and season_id = pg_temp.season('2026')),
  'mid-season mover: two 2026 registrations with two clubs');

select pg_temp.ok((
  select sum(h.goals) = c.goals and sum(h.apps) = c.apps
    from v_player_history h join v_player_career c on c.player_id = h.player_id
   where h.player_id = 11 group by c.goals, c.apps),
  'mid-season mover: goals and appearances add up across clubs');

select pg_temp.ok(not exists (
  select 1 from match_squads s join matches m on m.id = s.match_id
   where s.player_id = 11 and s.team_id = pg_temp.team('HIGM') and m.scheduled_at >= '2026-09-21'),
  'mid-season mover: no appearances for the old club after leaving');

\echo '--- eligibility'

do $$
declare
  m_old matches; m_new matches; m_early matches;
begin
  -- a scheduled match of the old club (Highlanders men) after the move
  select * into m_old from matches where competition_id = pg_temp.comp('demo-mens-league-2026') and status = 'scheduled'
     and pg_temp.team('HIGM') in (home_team_id, away_team_id) order by scheduled_at limit 1;
  perform pg_temp.fails(format('insert into match_squads (match_id, team_id, player_id, registration_id) values (%s, %s, 11, 0)',
                               m_old.id, pg_temp.team('HIGM')),
                        'no approved registration', 'a player cannot play for a club after leaving it');

  -- a match of the new club (Falcons men) before he joined
  select * into m_early from matches where competition_id = pg_temp.comp('demo-mens-league-2026')
     and pg_temp.team('FALM') in (home_team_id, away_team_id) and scheduled_at < '2026-09-21' order by scheduled_at limit 1;
  perform pg_temp.fails(format('insert into match_squads (match_id, team_id, player_id, registration_id) values (%s, %s, 11, 0)',
                               m_early.id, pg_temp.team('FALM')),
                        'no approved registration', 'a player cannot play for a new club before joining it');

  -- a match of the new club after he joined: allowed, and the registration is filled in by the database
  select * into m_new from matches where competition_id = pg_temp.comp('demo-mens-league-2026') and status = 'scheduled'
     and pg_temp.team('FALM') in (home_team_id, away_team_id) order by scheduled_at limit 1;
  insert into match_squads (match_id, team_id, player_id, registration_id) values (m_new.id, pg_temp.team('FALM'), 11, 0);
  perform pg_temp.ok((select s.registration_id = r.id and s.shirt_number = 77
                        from match_squads s join registrations r on r.player_id = 11 and r.team_id = pg_temp.team('FALM')
                       where s.match_id = m_new.id and s.player_id = 11),
                     'a player can play for the new club; registration and shirt 77 filled in');

  perform pg_temp.fails(format('insert into match_squads (match_id, team_id, player_id, registration_id) values (%s, %s, 1, 0)',
                               m_new.id, (select id from teams where category = 'men' and id not in (m_new.home_team_id, m_new.away_team_id) limit 1)),
                        'is not playing', 'a squad must belong to a team in the match');

  perform pg_temp.fails(format('insert into match_squads (match_id, team_id, player_id, registration_id) values (%s, %s, %s, 0)',
                               m_new.id, m_new.home_team_id,
                               (select r.player_id from registrations r where r.season_id = pg_temp.season('2026') and r.status = 'approved'
                                   and r.left_on is null and r.category = 'men' and r.team_id not in (m_new.home_team_id, m_new.away_team_id) limit 1)),
                        'no approved registration', 'a player registered elsewhere cannot be added to a squad');
end $$;

do $$
declare m matches; a bigint; b bigint;
begin
  select * into m from matches where status = 'final' order by id limit 1;
  select s.player_id into a from match_squads s where s.match_id = m.id and s.team_id = m.home_team_id limit 1;
  select r.player_id into b from registrations r
   where r.team_id = m.home_team_id and r.status = 'approved'
     and not exists (select 1 from match_squads s where s.match_id = m.id and s.player_id = r.player_id) limit 1;
  perform pg_temp.fails(format('insert into match_events (match_id, team_id, player_id, kind, goal_type) values (%s, %s, %s, ''goal'', ''FG'')',
                               m.id, m.away_team_id, a),
                        'not in the match squad', 'a goal cannot be credited to a player of the other team');
  if b is not null then
    perform pg_temp.fails(format('insert into match_events (match_id, team_id, player_id, kind, goal_type) values (%s, %s, %s, ''goal'', ''FG'')',
                                 m.id, m.home_team_id, b),
                          'not in the match squad', 'a goal cannot be credited to a registered player who did not play');
  end if;
  perform pg_temp.fails(format('insert into match_events (match_id, team_id, player_id, kind, card) values (%s, %s, %s, ''card'', ''red''); '
                               || 'insert into match_events (match_id, team_id, player_id, kind, card) values (%1$s, %2$s, %3$s, ''card'', ''red'')',
                               m.id, m.home_team_id, a),
                        'already has a red card', 'a player can only be shown one red card in a match');
  perform pg_temp.fails(format('update match_squads set shirt_number = (select shirt_number from match_squads where match_id = %s and team_id = %s and player_id <> %s and shirt_number is not null limit 1) where match_id = %1$s and player_id = %3$s',
                               m.id, m.home_team_id, a),
                        'match_squads_shirt', 'two players in a team cannot wear the same shirt in a match');
end $$;

\echo '--- registrations'

do $$
declare np bigint; nw bigint; u18 bigint; y bigint; num text;
begin
  perform pg_temp.fails(format('insert into registrations (player_id, team_id, season_id, status) values (1, %s, %s, ''approved'')',
                               pg_temp.team('LAGM'), pg_temp.season('2026')),
                        'registrations_one_active', 'a player cannot hold two active registrations in one category and season');

  insert into players (nhf_number, first_name, last_name, gender, position, date_of_birth)
  values ('NHF-99001', 'Test', 'Newcomer', 'male', 'MF', '2001-05-05') returning id into np;
  perform pg_temp.fails(format('insert into registrations (player_id, team_id, season_id, shirt_number, status) values (%s, %s, %s, 1, ''pending'')',
                               np, pg_temp.team('HIGM'), pg_temp.season('2026')),
                        'registrations_shirt_unique', 'a shirt number is unique within a team and season');
  insert into registrations (player_id, team_id, season_id, shirt_number, status, joined_on)
  values (np, pg_temp.team('HIGM'), pg_temp.season('2026'), 99, 'pending', '2026-09-01');

  perform pg_temp.fails(format('insert into match_squads (match_id, team_id, player_id, registration_id) select id, %s, %s, 0 from matches where status = ''scheduled'' and %1$s in (home_team_id, away_team_id) limit 1',
                               pg_temp.team('HIGM'), np),
                        'no approved registration', 'a pending registration is not eligible to play');

  insert into players (nhf_number, first_name, last_name, gender, position, date_of_birth)
  values ('NHF-99002', 'Test', 'Woman', 'female', 'DF', '2000-02-02') returning id into nw;
  perform pg_temp.fails(format('insert into registrations (player_id, team_id, season_id, status) values (%s, %s, %s, ''pending'')',
                               nw, pg_temp.team('HIGM'), pg_temp.season('2026')),
                        'cannot be registered with a men team', 'a female player cannot join a men''s team');

  insert into teams (club_id, category, name, code) values (1, 'boys_u18', 'Highlanders U18', 'HIGB') returning id into u18;
  perform pg_temp.fails(format('insert into registrations (player_id, team_id, season_id, status) values (%s, %s, %s, ''pending'')',
                               np, u18, pg_temp.season('2026')),
                        'over the age limit', 'a 25-year-old cannot join a U18 team');
  insert into players (nhf_number, first_name, last_name, gender, position, date_of_birth)
  values ('NHF-99003', 'Test', 'Junior', 'male', 'FW', '2009-03-03') returning id into y;
  insert into registrations (player_id, team_id, season_id, status) values (y, u18, pg_temp.season('2026'), 'pending');
  insert into registrations (player_id, team_id, season_id, shirt_number, status) values (y, pg_temp.team('HIGM'), pg_temp.season('2026'), 98, 'pending');
  perform pg_temp.ok((select count(*) = 2 from registrations where player_id = y),
                     'a youth player can be registered with a U18 and a senior team at once');

  -- Registration 1 (player 1, 2025, Highlanders men) has appearances through the 2025 season.
  perform pg_temp.fails('update registrations set left_on = ''2025-03-02'' where player_id = 1 and season_id = pg_temp.season(''2025'')',
                        'after the leaving date', 'a leaving date before a played match is refused');
  perform pg_temp.fails('update registrations set status = ''rejected'' where player_id = 1 and season_id = pg_temp.season(''2025'')',
                        'has appearances', 'a registration with appearances cannot be rejected');
  perform pg_temp.fails(format('update registrations set team_id = %s where player_id = 1 and season_id = pg_temp.season(''2025'')', pg_temp.team('LAGM')),
                        'record a transfer', 'a registration with appearances cannot be moved to another team');
  update registrations set left_on = '2025-12-31' where player_id = 1 and season_id = pg_temp.season('2025');
  perform pg_temp.ok(true, 'a leaving date after the last match is accepted');
  insert into players (first_name, last_name, gender) values ('Auto', 'Number', 'male') returning nhf_number into num;
  perform pg_temp.ok(num ~ '^NHF-3[0-9]{4,7}$', 'a new player without a number gets the next NHF number (' || num || ')');
end $$;

\echo '--- live scoring'

do $$
declare m matches; h1 bigint; h2 bigint; a1 bigint; g bigint;
begin
  select * into m from matches where competition_id = pg_temp.comp('demo-mens-league-2026') and status = 'scheduled'
   order by scheduled_at, id limit 1;
  update matches set status = 'live', period = 1, period_started_at = now(), result_source = 'live' where id = m.id;
  perform pg_temp.ok(pg_temp.fill_squads(m.id) >= 22, 'squads filled for a live match');
  h1 := pg_temp.squad_player(m.id, m.home_team_id, 1);
  h2 := pg_temp.squad_player(m.id, m.home_team_id, 2);
  a1 := pg_temp.squad_player(m.id, m.away_team_id, 1);
  g := pg_temp.goal(m.id, m.home_team_id, h1, 'FG');
  perform pg_temp.goal(m.id, m.home_team_id, h2, 'PC');
  perform pg_temp.goal(m.id, m.away_team_id, a1, 'PS');
  perform pg_temp.goal(m.id, m.away_team_id, null, 'FG');
  perform pg_temp.ok((select home_score = 2 and away_score = 2 from matches where id = m.id), 'the score follows goal events: 2-2');
  update match_events set voided_at = now(), void_reason = 'test' where id = g;
  perform pg_temp.ok((select home_score = 1 and away_score = 2 from matches where id = m.id), 'voiding a goal corrects the score: 1-2');
  update matches set home_score = 9 where id = m.id;
  perform pg_temp.ok((select home_score = 1 from matches where id = m.id), 'a typed score is replaced by the count of goal events');
  update matches set status = 'final', period = 4 where id = m.id;
  perform pg_temp.ok((select goals = 1 from v_unattributed_goals where match_id = m.id and team_id = m.away_team_id),
                     'a goal without a scorer is listed for the admin to attribute');
  perform pg_temp.ok((select c.goals = (select count(*) from match_events e join matches x on x.id = e.match_id and x.status = 'final'
                                         where e.player_id = h2 and e.kind = 'goal' and e.voided_at is null)
                        from v_player_career c where c.player_id = h2),
                     'the scorer''s career total includes the new goal');
  perform pg_temp.ok((select pc = 1 from v_match_player_lines where match_id = m.id and player_id = h2), 'goal types are kept (PC)');
  update matches set status = 'scheduled' where id = m.id;
  perform pg_temp.ok((select home_score is null and away_score is null and period = 0 from matches where id = m.id),
                     'resetting a match to scheduled clears its score');
end $$;

\echo '--- groups and classification'

do $$
declare
  c bigint := pg_temp.comp('demo-womens-championship-2026');
  ga bigint; gb bigint; sf1 matches; sf2 matches; f matches; p3 matches; p5 matches; gm matches;
begin
  select id into ga from competition_groups where competition_id = c and code = 'A';
  select id into gb from competition_groups where competition_id = c and code = 'B';
  sf1 := pg_temp.match_ref('demo-womens-championship-2026', 'SF1');
  sf2 := pg_temp.match_ref('demo-womens-championship-2026', 'SF2');
  p5  := pg_temp.match_ref('demo-womens-championship-2026', 'P5');
  perform pg_temp.ok(sf1.home_team_id = (select team_id from group_standings(ga) where pos = 1)
                     and sf1.away_team_id = (select team_id from group_standings(gb) where pos = 2),
                     'SF1 is A1 v B2 from the final group tables');
  perform pg_temp.ok(sf2.home_team_id = (select team_id from group_standings(gb) where pos = 1)
                     and sf2.away_team_id = (select team_id from group_standings(ga) where pos = 2),
                     'SF2 is B1 v A2');
  perform pg_temp.ok(p5.home_team_id = (select team_id from group_standings(ga) where pos = 3)
                     and p5.away_team_id = (select team_id from group_standings(gb) where pos = 3),
                     '5th-6th place is A3 v B3');
  perform pg_temp.ok((select home_team_id is null and away_team_id is null from matches where id = (pg_temp.match_ref('demo-womens-championship-2026', 'F')).id),
                     'the final waits for the semi-finals');

  -- Reopening a group match empties the slots that depend on it; closing it fills them again.
  select * into gm from matches where group_id = ga and status = 'final' limit 1;
  update matches set status = 'live' where id = gm.id;
  perform pg_temp.ok((select home_team_id is null from matches where id = sf1.id), 'reopening a group A match clears A1 in SF1');
  perform pg_temp.ok((select away_team_id is null from matches where id = sf2.id), 'and clears A2 in SF2');
  update matches set status = 'final' where id = gm.id;
  perform pg_temp.ok((select home_team_id = sf1.home_team_id from matches where id = sf1.id), 'closing it fills SF1 again');

  -- SF1: home team wins 1-0.
  update matches set status = 'live', period = 1 where id = sf1.id;
  perform pg_temp.fill_squads(sf1.id);
  perform pg_temp.goal(sf1.id, sf1.home_team_id, pg_temp.squad_player(sf1.id, sf1.home_team_id));
  update matches set status = 'final', period = 4 where id = sf1.id;

  -- SF2: 1-1, a final without a shoot-out is refused, then the away team wins the shoot-out 4-3.
  update matches set status = 'live', period = 1 where id = sf2.id;
  perform pg_temp.fill_squads(sf2.id);
  perform pg_temp.goal(sf2.id, sf2.home_team_id, pg_temp.squad_player(sf2.id, sf2.home_team_id));
  perform pg_temp.goal(sf2.id, sf2.away_team_id, pg_temp.squad_player(sf2.id, sf2.away_team_id));
  perform pg_temp.fails(format('update matches set status = ''final'' where id = %s', sf2.id),
                        'violates check constraint', 'a drawn knockout match cannot be final without a shoot-out');
  perform pg_temp.fails(format('update matches set status = ''final'', home_shootout = 3, away_shootout = 3 where id = %s', sf2.id),
                        'violates check constraint', 'a shoot-out cannot end level');
  update matches set status = 'final', period = 4, home_shootout = 3, away_shootout = 4 where id = sf2.id;

  f  := pg_temp.match_ref('demo-womens-championship-2026', 'F');
  p3 := pg_temp.match_ref('demo-womens-championship-2026', 'P3');
  perform pg_temp.ok(f.home_team_id = sf1.home_team_id and f.away_team_id = sf2.away_team_id,
                     'the final is the SF1 winner v the SF2 shoot-out winner');
  perform pg_temp.ok(p3.home_team_id = sf1.away_team_id and p3.away_team_id = sf2.home_team_id,
                     'the 3rd-place match is the two semi-final losers');

  perform pg_temp.fails(format('update match_events set voided_at = now() where match_id = %s and kind = ''goal''', sf1.id),
                        'violates check constraint', 'voiding the only goal of a final knockout match is refused (it would need a shoot-out)');

  -- Once the final starts, a correction to a semi-final does not rewrite it.
  update matches set status = 'live' where id = f.id;
  update matches set status = 'live' where id = sf1.id;
  perform pg_temp.ok((select home_team_id = sf1.home_team_id from matches where id = f.id),
                     'a started match keeps its teams when an earlier result is reopened');
end $$;

\echo '--- search by season and club'

do $$
declare n_search int; n_regs int;
begin
  select count(*) into n_search from search_players(null, pg_temp.season('2026'), 1, null);
  select count(*) into n_regs from registrations r join teams t on t.id = r.team_id
   where t.club_id = 1 and r.season_id = pg_temp.season('2026') and r.status = 'approved';
  perform pg_temp.ok(n_search = n_regs and n_search > 0, format('search by season and club finds every 2026 registration of club 1 (%s)', n_search));

  perform pg_temp.ok((select count(*) = 2 from search_players(null, null, null, null, 1000) where player_id = 10),
                     'with no season, a player shows once per season registered');
  perform pg_temp.ok((select bool_and(lower(first_name || ' ' || last_name) like '%okafor%') and count(*) > 0
                        from search_players('okafor', null, null, null)), 'search by name');
  perform pg_temp.ok((select count(*) = 2 and bool_and(nhf_number = 'NHF-24010') from search_players('nhf-24010', null, null, null)),
                     'search by NHF number, any case');
  perform pg_temp.ok((select count(*) = 0 from search_players(null, pg_temp.season('2026'), 1, 'women') where category <> 'women'),
                     'search by category');

  perform pg_temp.ok((select count(*) > 0 and bool_or(player_id = 11 and left_on = '2026-09-20')
                        from club_squad(1, pg_temp.season('2026'))),
                     'club squad lists a player who left mid-season, with his leaving date');
  perform pg_temp.ok((select bool_or(player_id = 11) from club_squad(3, pg_temp.season('2026'))),
                     'and the club he joined lists him too');
  perform pg_temp.ok((select sum(apps) from club_squad(1, pg_temp.season('2025')))
                     = (select count(*) from match_squads s join matches m on m.id = s.match_id and m.status = 'final'
                          join teams t on t.id = s.team_id join competitions c on c.id = m.competition_id
                         where t.club_id = 1 and c.season_id = pg_temp.season('2025')),
                     'club squad appearances add up to the club''s match squad rows');
end $$;

rollback;
\o

\echo '--- live notifications'
listen match_live;
update matches set updated_at = now() where id = (select min(id) from matches where status = 'final');
\echo 'ok - expect one asynchronous notification "match_live" above or below this line'
unlisten match_live;
\echo 'all tests passed'
