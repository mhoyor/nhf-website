import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tallyFromRows, tallyToEvents, validateTally, type TallyInput, type TallyLine } from '../src/lib/tally';

const line = (playerId: number, teamId: number, extra: Partial<TallyLine> = {}): TallyLine => ({
  playerId, teamId, played: true, shirt: playerId, captain: false, goalkeeper: false,
  fg: 0, pc: 0, ps: 0, green: 0, yellow: 0, red: 0, ...extra,
});

function squad(teamId: number, from: number): TallyLine[] {
  return Array.from({ length: 11 }, (_, i) => line(from + i, teamId, { goalkeeper: i === 0, captain: i === 1 }));
}

const base = (): TallyInput => ({
  homeTeamId: 1, awayTeamId: 2, knockout: false, homeScore: 3, awayScore: 1, homeShootout: null, awayShootout: null,
  lines: [...squad(1, 1), ...squad(2, 21)],
});

test('a complete tally passes', () => {
  const t = base();
  t.lines[5].fg = 2;
  t.lines[6].pc = 1;
  t.lines[15].ps = 1;
  const c = validateTally(t);
  assert.deepEqual(c.errors, []);
  assert.deepEqual(c.warnings, []);
  assert.deepEqual(c.unattributed, { home: 0, away: 0 });
});

test('goals not credited to anyone are allowed and reported', () => {
  const t = base();
  t.lines[5].fg = 1;
  const c = validateTally(t);
  assert.deepEqual(c.errors, []);
  assert.deepEqual(c.unattributed, { home: 2, away: 1 });
  assert.match(c.warnings.join(' '), /3 goals will be saved without a scorer/);
  const { events, squads } = tallyToEvents(t);
  assert.equal(squads.length, 22);
  assert.equal(events.filter((e) => e.kind === 'goal').length, 4);
  assert.equal(events.filter((e) => e.kind === 'goal' && e.playerId === null).length, 3);
});

test('more goals credited than scored is an error', () => {
  const t = base();
  t.lines[5].fg = 3;
  t.lines[6].pc = 1;
  assert.match(validateTally(t).errors.join(' '), /credited with 4 goals but the team scored 3/);
});

test('goals or cards for a player not ticked as playing', () => {
  const t = base();
  t.lines[3].played = false;
  t.lines[3].yellow = 1;
  assert.match(validateTally(t, (id) => `#${id}`).errors.join(' '), /#4 has goals or cards but is not ticked/);
});

test('shirts, captains, red cards and squad size', () => {
  const t = base();
  t.lines[2].shirt = 2;
  t.lines[3].captain = true;
  t.lines[4].red = 2;
  t.lines[7].green = 2;
  for (let i = 0; i < 8; i++) t.lines.push(line(100 + i, 2));
  const c = validateTally(t);
  const all = c.errors.join(' ');
  assert.match(all, /both wear 2/);
  assert.match(all, /only one captain/);
  assert.match(all, /one red card/);
  assert.match(all, /19 players ticked/);
  assert.match(c.warnings.join(' '), /second green card/);
});

test('knockout results need a shoot-out when level, and only then', () => {
  const level: TallyInput = { ...base(), knockout: true, homeScore: 1, awayScore: 1 };
  assert.match(validateTally(level).errors.join(' '), /needs a shoot-out/);
  assert.deepEqual(validateTally({ ...level, homeShootout: 4, awayShootout: 3 }).errors, []);
  assert.match(validateTally({ ...level, homeShootout: 3, awayShootout: 3 }).errors.join(' '), /cannot end level/);
  assert.match(validateTally({ ...base(), homeShootout: 4, awayShootout: 3 }).errors.join(' '), /Only knockout/);
  assert.match(validateTally({ ...level, homeScore: 2, homeShootout: 4, awayShootout: 3 }).errors.join(' '), /only played when the score is level/);
});

test('a saved tally can be rebuilt for editing', () => {
  const t = base();
  t.lines[5].fg = 2;
  t.lines[6].pc = 1;
  t.lines[15].ps = 1;
  t.lines[15].green = 1;
  t.lines[13].played = false;
  const { squads, events } = tallyToEvents(t);
  const roster = t.lines.map((l) => ({ playerId: l.playerId, teamId: l.teamId, shirt: l.shirt }));
  const rebuilt = tallyFromRows(roster, squads, events);
  assert.deepEqual(rebuilt, t.lines);
});
