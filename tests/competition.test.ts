import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkSlots, classificationSpecs, describeSlot, generateFixtures, parseSlot, roundRobin, formatSlot, type BuilderInput } from '../src/lib/competition';

test('round robin: every pair meets exactly once, nobody plays twice in a round', () => {
  for (const n of [3, 4, 5, 6, 7, 8, 12]) {
    const teams = Array.from({ length: n }, (_, i) => i + 1);
    const rounds = roundRobin(teams);
    assert.equal(rounds.length, n % 2 ? n : n - 1);
    const pairs = new Set<string>();
    for (const r of rounds) {
      const inRound = r.flat();
      assert.equal(new Set(inRound).size, inRound.length, `n=${n}: a team plays twice in one round`);
      for (const [h, a] of r) pairs.add([h, a].sort((x, y) => x - y).join('-'));
    }
    assert.equal(pairs.size, (n * (n - 1)) / 2, `n=${n}: every pair once`);
  }
});

test('round robin: home and away are roughly balanced', () => {
  const rounds = roundRobin([1, 2, 3, 4, 5, 6]);
  const home = new Map<number, number>();
  for (const r of rounds) for (const [h] of r) home.set(h, (home.get(h) ?? 0) + 1);
  for (const t of [1, 2, 3, 4, 5, 6]) assert.ok((home.get(t) ?? 0) >= 1 && (home.get(t) ?? 0) <= 4, `team ${t} home ${home.get(t)}`);
});

test('slots parse and format both ways', () => {
  for (const s of ['A1', 'H9', 'L1', 'L12', 'W:SF1', 'L:SF2', 'W:F']) assert.equal(formatSlot(parseSlot(s)!), s);
  assert.deepEqual(parseSlot('l:sf1'), { kind: 'lose', ref: 'sf1' });
  assert.deepEqual(parseSlot('L3'), { kind: 'pos', group: 'L', pos: 3 });
  assert.equal(parseSlot('I1'), null);
  assert.equal(parseSlot('A0'), null);
  assert.equal(parseSlot('W:'), null);
  assert.equal(describeSlot('A1'), 'Winner Group A');
  assert.equal(describeSlot('B2'), 'Runner-up Group B');
  assert.equal(describeSlot('L3'), '3rd in the league');
  assert.equal(describeSlot('W:SF1', (r) => (r === 'SF1' ? 'Semi-final 1' : undefined)), 'Winner Semi-final 1');
});

const base: BuilderInput = {
  format: 'league',
  groups: [{ code: 'L', teams: [1, 2, 3, 4, 5, 6] }],
  legs: 2,
  classification: 'none',
  firstDay: '2026-09-12',
  daysBetween: 7,
  kickoffs: ['11:00', '13:30', '16:00'],
};

test('league, two legs: 30 matches over 10 weekly match days, each pair home and away', () => {
  const r = generateFixtures(base);
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.fixtures.length, 30);
  const dates = [...new Set(r.fixtures.map((f) => f.date))];
  assert.equal(dates.length, 10);
  assert.equal(dates[0], '2026-09-12');
  assert.equal(dates[9], '2026-11-14');
  const ordered = new Set(r.fixtures.map((f) => `${f.home}-${f.away}`));
  assert.equal(ordered.size, 30, 'every ordered pair once');
  assert.deepEqual([...new Set(r.fixtures.filter((f) => f.date === dates[0]).map((f) => f.time))], ['11:00', '13:30', '16:00']);
  assert.ok(r.fixtures.every((f) => f.stage === 'league' && f.group === 'L' && !f.knockout));
});

test('groups with semi-finals: the demo championship shape', () => {
  const r = generateFixtures({
    ...base,
    format: 'groups',
    legs: 1,
    groups: [
      { code: 'A', teams: [2, 6, 10] },
      { code: 'B', teams: [4, 8, 12] },
    ],
    classification: 'semis',
    daysBetween: 1,
    firstDay: '2026-10-01',
  });
  assert.ok(r.ok);
  if (!r.ok) return;
  const cls = r.fixtures.filter((f) => f.stage === 'classification');
  assert.deepEqual(
    cls.map((f) => [f.ref, f.homeSlot, f.awaySlot, f.placeWinner]),
    [
      ['SF1', 'A1', 'B2', null],
      ['SF2', 'B1', 'A2', null],
      ['P3', 'L:SF1', 'L:SF2', 3],
      ['F', 'W:SF1', 'W:SF2', 1],
      ['P5', 'A3', 'B3', 5],
    ],
  );
  assert.equal(r.fixtures.filter((f) => f.stage === 'group').length, 6);
  // semis and 5th place on the day after the group stage, 3rd place and final the day after
  assert.equal(cls.find((f) => f.ref === 'SF1')!.date, '2026-10-04');
  assert.equal(cls.find((f) => f.ref === 'F')!.date, '2026-10-05');
  assert.deepEqual(checkSlots(r.fixtures, new Map([['A', 3], ['B', 3]])), []);
});

test('league with places: 1v2, 3v4, 5v6', () => {
  const specs = classificationSpecs('league', [{ code: 'L', teams: [1, 2, 3, 4, 5, 6] }], 'places');
  assert.ok(Array.isArray(specs));
  if (!Array.isArray(specs)) return;
  assert.deepEqual(specs.map((s) => [s.ref, s.home, s.away]), [['F', 'L1', 'L2'], ['P3', 'L3', 'L4'], ['P5', 'L5', 'L6']]);
});

test('builder refuses bad input with plain messages', () => {
  const bad = generateFixtures({ ...base, groups: [{ code: 'L', teams: [1, 2] }], kickoffs: ['9am'], firstDay: '2026-02-30', daysBetween: 0 });
  assert.equal(bad.ok, false);
  if (bad.ok) return;
  assert.ok(bad.errors.some((e) => e.includes('first match day')));
  assert.ok(bad.errors.some((e) => e.includes('HH:MM')));
  assert.ok(bad.errors.some((e) => e.includes('at least three teams')));
  assert.ok(bad.errors.some((e) => e.includes('Days between')));
  const dup = generateFixtures({ ...base, format: 'groups', legs: 1, groups: [{ code: 'A', teams: [1, 2] }, { code: 'B', teams: [2, 3] }] });
  assert.equal(dup.ok, false);
  const three = generateFixtures({ ...base, format: 'groups', legs: 1, classification: 'semis', groups: [{ code: 'A', teams: [1, 2] }, { code: 'B', teams: [3, 4] }, { code: 'C', teams: [5, 6] }] });
  assert.equal(three.ok, false);
  if (!three.ok) assert.match(three.errors.join(' '), /exactly two groups/);
});

test('slot checks find missing groups, missing refs and loops', () => {
  const f = (ref: string, home: string, away: string) => ({
    stage: 'classification' as const, group: null, round: null, ref, label: ref, date: '2026-10-05', time: '10:00',
    home: null, away: null, homeSlot: home, awaySlot: away, knockout: true, placeWinner: null, placeLoser: null,
  });
  const errs = checkSlots([f('X', 'C1', 'A4'), f('Y', 'W:Z', 'W:Q'), f('Z', 'W:Y', 'A1')], new Map([['A', 3]]));
  assert.ok(errs.some((e) => e.includes('no Group C')));
  assert.ok(errs.some((e) => e.includes('only 3 teams')));
  assert.ok(errs.some((e) => e.includes('no match has ref Q')));
  assert.ok(errs.some((e) => e.includes('chain of winner or loser')));
});
