import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FIXTURE_TEMPLATE, importFixtures, importPlayers, parseCSV, PLAYER_TEMPLATE, toCSV } from '../src/lib/csv';

const teams = [
  { id: 2, code: 'HIGW', category: 'women' },
  { id: 4, code: 'LAGW', category: 'women' },
  { id: 6, code: 'FALW', category: 'women' },
  { id: 8, code: 'HILW', category: 'women' },
  { id: 1, code: 'HIGM', category: 'men' },
];

test('parser: quotes, doubled quotes, commas and line breaks in a field, BOM, blank lines', () => {
  const rows = parseCSV('﻿a,b,c\r\n"x, y","say ""hi""","two\nlines"\n\n,,\n1,2,3');
  assert.deepEqual(rows, [['a', 'b', 'c'], ['x, y', 'say "hi"', 'two\nlines'], ['1', '2', '3']]);
});

test('export: values round-trip and formulas are neutralised', () => {
  const csv = toCSV([['name', 'note'], ['Okafor, N', '=HYPERLINK("x")'], ['A "quote"', '']]);
  assert.deepEqual(parseCSV(csv), [['name', 'note'], ['Okafor, N', `'=HYPERLINK("x")`], ['A "quote"', '']]);
});

test('the fixture template imports cleanly', () => {
  const r = importFixtures(FIXTURE_TEMPLATE, teams, 'women');
  assert.ok(r.ok, r.ok ? '' : r.errors.join('\n'));
  if (!r.ok) return;
  assert.equal(r.value.format, 'groups');
  assert.deepEqual(r.value.groups.map((g) => g.code), ['A', 'B']);
  const f = r.value.fixtures.find((x) => x.ref === 'F')!;
  assert.deepEqual([f.homeSlot, f.awaySlot, f.placeWinner, f.placeLoser, f.knockout], ['W:SF1', 'W:SF2', 1, 2, true]);
});

test('refs and placeholders are normalised to upper case', () => {
  const csv = 'ref,date,time,stage,group,label,home,away,venue,places\n,2026-10-01,10:00,group,a,,higw,falw,,\n,2026-10-01,12:00,group,b,,lagw,hilw,,\nsf1,2026-10-04,12:00,class,,,a1,b1,,1-2';
  const r = importFixtures(csv, teams, 'women');
  assert.ok(r.ok, r.ok ? '' : r.errors.join('\n'));
  if (!r.ok) return;
  const sf = r.value.fixtures[2];
  assert.deepEqual([sf.ref, sf.homeSlot, sf.awaySlot], ['SF1', 'A1', 'B1']);
});

test('every row problem is reported with its row number', () => {
  const csv = [
    'ref,date,time,stage,group,label,home,away,venue,places',
    ',2026-13-01,25:00,group,A,,HIGW,HIGW,,',
    ',2026-10-01,10:00,group,,,HIGW,LAGW,,',
    ',2026-10-01,10:00,group,B,,HIGW,FALW,,',
    ',2026-10-01,10:00,group,A,,HIGM,FALW,,',
    'SF1,2026-10-04,12:00,class,,,A1,C2,,',
    'SF1,2026-10-04,12:00,class,,,W:XX,B9,,2-1',
    ',2026-10-04,12:00,friendly,,,A1,B1,,',
  ].join('\n');
  const r = importFixtures(csv, teams, 'women');
  assert.equal(r.ok, false);
  if (r.ok) return;
  const all = r.errors.join('\n');
  for (const needle of [
    'Row 2: date', 'Row 2: time', 'Row 2: a team cannot play itself', 'Row 3: group rows need a group letter',
    'Group A and Group B', 'Row 5: home team HIGM is not a women team', 'there is no Group C', 'ref SF1 is used twice',
    'no match has ref XX', 'Group B has only', 'places should look like', 'Row 8: stage must be',
  ]) assert.ok(all.includes(needle), `missing: ${needle}\n${all}`);
});

test('a header without the right columns is refused at once', () => {
  const r = importFixtures('date,home,away\n2026-10-01,HIGW,LAGW', teams, 'women');
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.errors[0], /missing: ref, time, stage, group, label, venue, places/);
});

test('league rows get rounds from their dates', () => {
  const csv = 'ref,date,time,stage,group,label,home,away,venue,places\n,2026-09-19,10:00,league,,,HIGW,LAGW,,\n,2026-09-12,10:00,league,,,FALW,HILW,,\n,2026-09-19,12:00,league,,,FALW,HIGW,,';
  const r = importFixtures(csv, teams, 'women');
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.deepEqual(r.value.fixtures.map((f) => [f.round, f.label]), [[2, 'Matchday 2'], [1, 'Matchday 1'], [2, 'Matchday 2']]);
});

test('player template imports; problems are listed by row', () => {
  const ok = importPlayers(PLAYER_TEMPLATE, teams);
  assert.ok(ok.ok, ok.ok ? '' : ok.errors.join('\n'));
  if (ok.ok) {
    assert.equal(ok.value.length, 2);
    assert.equal(ok.value[1].nhfNumber, null);
  }
  const bad = importPlayers(
    'nhf_number,first_name,last_name,gender,date_of_birth,position,team,shirt\nNHF-1,Ada,,x,2001-02-30,ST,NOPE,100\nNHF-26001,Ngozi,Eze,f,,MF,HIGM,8\nNHF-26002,Amaka,Obi,female,,DF,HIGW,5\nNHF-26002,Joy,Ude,female,,DF,HIGW,5',
    teams,
  );
  assert.equal(bad.ok, false);
  if (bad.ok) return;
  const all = bad.errors.join('\n');
  for (const needle of ['should look like NHF-26001', 'first and last name', 'gender should be', 'date of birth', 'position should be', 'not a team code', 'shirt should be', 'female player cannot join HIGM', 'also on row 4', 'shirt 5 for HIGW is also on row 4'])
    assert.ok(all.includes(needle), `missing: ${needle}\n${all}`);
});
