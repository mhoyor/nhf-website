-- Demo data for development only. Clubs, players and results are invented.
-- Replace with real NHF registrations before launch. Sign in as admin@example.org
-- with the password change-me-now, then change it.

begin;
select setseed(0.2026);

insert into users (email, name, password_hash, roles) values
  ('admin@example.org', 'Demo administrator',
   'scrypt$16384$8$1$VPIqpZFKHt6JK5iTktreWw==$/vl2RS/ZqSsCUOzHYE+V87g+z5hofqN7P0aheYhkEMXon9q4dZ2u7h2SOCxa+IHzLrwXinuDgMZjD0/Q2wk58A==',
   '{admin}');

insert into venues (name, city, state, surface) values
  ('National hockey pitch, Moshood Abiola National Stadium', 'Abuja', 'FCT', 'Artificial turf'),
  ('Teslim Balogun Stadium hockey pitch', 'Lagos', 'Lagos', 'Artificial turf');

insert into seasons (name, starts_on, ends_on, is_current) values
  ('2025', '2025-01-01', '2025-12-31', false),
  ('2026', '2026-01-01', '2026-12-31', true);

insert into clubs (slug, name, short_name, state, city) values
  ('abuja-highlanders', 'Abuja Highlanders', 'Highlanders', 'FCT', 'Abuja'),
  ('lagos-lagoon', 'Lagos Lagoon HC', 'Lagoon', 'Lagos', 'Lagos'),
  ('kaduna-falcons', 'Kaduna Falcons', 'Falcons', 'Kaduna', 'Kaduna'),
  ('enugu-hilltop', 'Enugu Hilltop HC', 'Hilltop', 'Enugu', 'Enugu'),
  ('port-harcourt-tide', 'Port Harcourt Tide', 'Tide', 'Rivers', 'Port Harcourt'),
  ('jos-plateau-stars', 'Jos Plateau Stars', 'Plateau Stars', 'Plateau', 'Jos');

-- Each club has a men's and a women's team with names of their own.
insert into teams (club_id, category, name, code, colour, home_venue_id)
select c.id, cat.category, c.short_name || cat.suffix, upper(left(replace(c.short_name, ' ', ''), 3)) || cat.code_suffix,
       (array['#0B6E4F','#1E5AA8','#6F3A9A','#A3412A','#0E6F7A','#76601A'])[c.id], 1
  from clubs c
 cross join (values ('men'::team_category, ' Men', 'M'), ('women'::team_category, ' Women', 'W')) as cat(category, suffix, code_suffix);

-- 14 players per team, numbered NHF-24001 upwards.
with names as (
  select array['Chinedu','Emeka','Tunde','Ibrahim','Musa','Sani','Kelechi','Obinna','Ifeanyi','Yusuf','Segun','Femi','Uche','Nnamdi','Aliyu','Bashir','Kunle','Tobi','Gbenga','Ikenna','Danladi','Haruna','Kabiru','Olumide'] as men,
         array['Ngozi','Amaka','Funmilayo','Aisha','Zainab','Halima','Chioma','Adaeze','Yetunde','Bisola','Blessing','Esther','Mercy','Grace','Hadiza','Fatima','Kemi','Ebere','Nneka','Ifeoma','Jumoke','Rahma','Hauwa','Joy'] as women,
         array['Okafor','Adeyemi','Bello','Okonkwo','Eze','Abubakar','Adebayo','Olawale','Nwosu','Chukwu','Danjuma','Ogunleye','Balogun','Obi','Garba','Ojo','Akande','Usman','Umar','Okeke','Anyanwu','Lawal','Sule','Bassey','Etim','Akpan','Ekpo','Onyeka','Ude','Ogbu','Agbo','Tanko'] as last
), slots as (
  select t.id as team_id, t.category, n as slot,
         row_number() over (order by t.id, n) as k
    from teams t cross join generate_series(1, 14) n
), ins as (
  insert into players (nhf_number, first_name, last_name, gender, position, date_of_birth)
  select 'NHF-' || (24000 + s.k),
         case when s.category = 'men' then names.men[1 + (s.k * 7) % 24] else names.women[1 + (s.k * 5) % 24] end,
         names.last[1 + (s.k * 11) % 32],
         case when s.category = 'men' then 'male' else 'female' end,
         case when s.slot <= 2 then 'GK' when s.slot <= 6 then 'DF' when s.slot <= 10 then 'MF' else 'FW' end,
         date '1996-01-01' + (s.k * 97 % 3000)::int
    from slots s cross join names
  returning id, nhf_number
)
select count(*) from ins;

-- 2025 registrations: every player with the team they were created for.
insert into registrations (player_id, team_id, season_id, shirt_number, status, joined_on, approved_at)
select p.id, t.id, (select id from seasons where name = '2025'),
       case when ((p.id - 1) % 14) = 0 then 1 when ((p.id - 1) % 14) = 1 then 21 else ((p.id - 1) % 14) + 1 end,
       'approved', '2025-01-15', now()
  from players p
  join teams t on t.id = ((p.id - 1) / 14) + 1;

-- 2026: most players stay; every seventh outfield player moves to the next club's team
-- in the same category before the season starts.
insert into registrations (player_id, team_id, season_id, shirt_number, status, joined_on, approved_at)
select r.player_id,
       case when r.player_id % 7 = 3
            then (select t2.id from teams t2 join teams t1 on t1.id = r.team_id
                   where t2.category = t1.category and t2.club_id = (t1.club_id % 6) + 1)
            else r.team_id end,
       (select id from seasons where name = '2026'),
       case when r.player_id % 7 = 3 then 30 + (r.player_id % 40) else r.shirt_number end,
       'approved', '2026-01-10', now()
  from registrations r
 where r.season_id = (select id from seasons where name = '2025');

-- ------------------------------------------------------------ competitions
insert into competitions (season_id, slug, name, category, format, legs, published)
values ((select id from seasons where name = '2025'), 'demo-mens-league-2025', 'Demo Men''s League 2025', 'men', 'league', 2, true),
       ((select id from seasons where name = '2026'), 'demo-mens-league-2026', 'Demo Men''s League 2026', 'men', 'league', 2, true),
       ((select id from seasons where name = '2026'), 'demo-womens-championship-2026', 'Demo Women''s Championship 2026', 'women', 'groups', 1, true);

insert into competition_groups (competition_id, code)
select id, 'L' from competitions where format = 'league';
insert into competition_groups (competition_id, code)
select id, g from competitions cross join (values ('A'), ('B')) v(g) where slug = 'demo-womens-championship-2026';

insert into group_teams (group_id, team_id)
select g.id, t.id from competition_groups g join competitions c on c.id = g.competition_id
  join teams t on t.category = c.category
 where c.format = 'league';
insert into group_teams (group_id, team_id)
select g.id, t.id from competition_groups g join competitions c on c.id = g.competition_id
  join teams t on t.category = 'women' and ((g.code = 'A' and t.club_id in (1, 3, 5)) or (g.code = 'B' and t.club_id in (2, 4, 6)))
 where c.slug = 'demo-womens-championship-2026';

-- League fixtures: every ordered pair once (home and away), three matches per match day.
insert into matches (competition_id, stage, group_id, round, label, scheduled_at, venue_id, home_team_id, away_team_id)
select c.id, 'league', g.id, ((rn - 1) / 3) + 1, 'Matchday ' || (((rn - 1) / 3) + 1),
       c_start + (((rn - 1) / 3) * interval '7 days') + (((rn - 1) % 3) * interval '150 minutes'),
       1, h, a
  from (select c.id as cid, h.team_id as h, a.team_id as a,
               row_number() over (partition by c.id order by ((h.team_id + a.team_id * 3) % 7), h.team_id, a.team_id) as rn
          from competitions c
          join competition_groups g on g.competition_id = c.id
          join group_teams h on h.group_id = g.id
          join group_teams a on a.group_id = g.id and a.team_id <> h.team_id
         where c.format = 'league') f
  join competitions c on c.id = f.cid
  join competition_groups g on g.competition_id = c.id
  cross join lateral (select case when c.slug like '%2025' then timestamptz '2025-03-01 11:00+01' else timestamptz '2026-09-12 11:00+01' end as c_start) s;

-- Women's championship: round robin in each group of three, then classification by slot.
insert into matches (competition_id, stage, group_id, round, label, scheduled_at, venue_id, home_team_id, away_team_id)
select c.id, 'group', g.id, x.rnd, 'Group ' || g.code, timestamptz '2026-10-01 10:00+01' + (x.rnd - 1) * interval '1 day' + (case g.code when 'A' then 0 else 3 end) * interval '1 hour', 1, x.h, x.a
  from competitions c join competition_groups g on g.competition_id = c.id
  cross join lateral (
    select t[1] as h, t[2] as a, 1 as rnd from (select array_agg(team_id order by team_id) t from group_teams where group_id = g.id) q
    union all select t[3], t[1], 2 from (select array_agg(team_id order by team_id) t from group_teams where group_id = g.id) q
    union all select t[2], t[3], 3 from (select array_agg(team_id order by team_id) t from group_teams where group_id = g.id) q
  ) x
 where c.slug = 'demo-womens-championship-2026';

insert into matches (competition_id, stage, ref, label, scheduled_at, venue_id, home_slot, away_slot, knockout, place_winner, place_loser)
select c.id, 'classification', v.ref, v.label, v.at, 1, v.hs, v.aw, true, v.pw, v.pl
  from competitions c cross join (values
    ('SF1', 'Semi-final 1', timestamptz '2026-10-04 12:00+01', 'A1', 'B2', null::int, null::int),
    ('SF2', 'Semi-final 2', timestamptz '2026-10-04 14:30+01', 'B1', 'A2', null, null),
    ('P5',  '5th-6th place', timestamptz '2026-10-04 09:30+01', 'A3', 'B3', 5, 6),
    ('P3',  '3rd place',     timestamptz '2026-10-05 10:00+01', 'L:SF1', 'L:SF2', 3, 4),
    ('F',   'Final',         timestamptz '2026-10-05 13:00+01', 'W:SF1', 'W:SF2', 1, 2)
  ) v(ref, label, at, hs, aw, pw, pl)
 where c.slug = 'demo-womens-championship-2026';

-- One mid-season move in 2026: a player leaves after matchday 2 and joins another club.
with mover as (
  select r.id, r.player_id, r.team_id from registrations r
    join teams t on t.id = r.team_id and t.category = 'men'
    join players p on p.id = r.player_id and p.position = 'FW'
   where r.season_id = (select id from seasons where name = '2026')
   order by r.player_id limit 1
), closed as (
  update registrations set left_on = '2026-09-20' where id = (select id from mover) returning player_id, team_id
)
insert into registrations (player_id, team_id, season_id, shirt_number, status, joined_on, approved_at, note)
select c.player_id,
       (select t2.id from teams t2 join teams t1 on t1.id = c.team_id where t2.category = 'men' and t2.club_id = ((t1.club_id + 1) % 6) + 1),
       (select id from seasons where name = '2026'), 77, 'approved', '2026-09-21', now(), 'Mid-season transfer (demo)'
  from closed c;


-- ------------------------------------------------------------ played matches
create temporary table played as
select m.id from matches m join competitions c on c.id = m.competition_id
 where m.stage <> 'classification'
   and (c.slug = 'demo-mens-league-2025' or c.slug = 'demo-womens-championship-2026'
        or (c.slug = 'demo-mens-league-2026' and m.round <= 4));

-- Match squads: up to 12 registered players per side (one random outfield player rests).
insert into match_squads (match_id, team_id, player_id, registration_id, is_goalkeeper)
select m.id, side.team_id, r.player_id, r.id, p.position = 'GK' and r.shirt_number = 1
  from matches m
  join played on played.id = m.id
  join competitions c on c.id = m.competition_id
  cross join lateral (values (m.home_team_id), (m.away_team_id)) side(team_id)
  join registrations r on r.team_id = side.team_id and r.season_id = c.season_id and r.status = 'approved'
  join players p on p.id = r.player_id
   and r.joined_on <= (m.scheduled_at at time zone 'Africa/Lagos')::date
   and (r.left_on is null or r.left_on >= (m.scheduled_at at time zone 'Africa/Lagos')::date)
 where (r.player_id + m.id) % 13 <> 0 and not (p.position = 'GK' and r.shirt_number <> 1);

-- Goals, weighted to forwards and midfielders.
insert into match_events (match_id, team_id, player_id, kind, goal_type, period, match_second)
select m.id, side.team_id, pick.player_id, 'goal',
       (array['FG','FG','FG','FG','PC','PC','PS'])[1 + floor(random() * 7)::int]::goal_type,
       1 + floor(random() * 4)::int, floor(random() * 900)::int
  from matches m
  join played on played.id = m.id
  cross join lateral (values (m.home_team_id), (m.away_team_id)) side(team_id)
  -- (m.id - m.id) ties the count to each match, so it is drawn again for every side of every match
  cross join lateral generate_series(1, floor(random() * 5 + (m.id - m.id) + (side.team_id - side.team_id))::int) g
  cross join lateral (
    select s.player_id from match_squads s join players p on p.id = s.player_id
     where s.match_id = m.id and s.team_id = side.team_id and p.position <> 'GK'
     order by random() * (case p.position when 'FW' then 1 when 'MF' then 2 else 5 end), g limit 1) pick;

-- A few cards.
insert into match_events (match_id, team_id, player_id, kind, card, period, match_second)
select m.id, s.team_id, s.player_id, 'card', (array['green','green','yellow','red'])[1 + floor(random() * 4)::int]::card_colour,
       1 + floor(random() * 4)::int, floor(random() * 900)::int
  from matches m join played on played.id = m.id
  join match_squads s on s.match_id = m.id
 where random() < 0.025;

update matches set status = 'final', result_source = 'manual', period = 4
 where id in (select id from played);

commit;
