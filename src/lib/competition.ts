// Fixture generation for leagues and group tournaments with classification matches.
// Pure functions: no database, no framework. The output is written to the database by
// src/app/admin/competitions/actions.ts and checked again there by the SQL constraints.

export type Stage = 'league' | 'group' | 'classification';
export type ClassificationPlan = 'none' | 'semis' | 'places';

/** Where a classification team comes from until it is known. */
export type Slot =
  | { kind: 'pos'; group: string; pos: number } // A1 = winner of group A, L3 = 3rd in the league
  | { kind: 'win' | 'lose'; ref: string }; // W:SF1 = winner of match SF1

export interface FixtureDraft {
  stage: Stage;
  group: string | null; // 'A'..'H' for groups, 'L' for a league, null for classification
  round: number | null;
  ref: string | null; // short code other matches can refer to (SF1, F, P5)
  label: string;
  date: string; // YYYY-MM-DD, Nigerian time
  time: string; // HH:MM, Nigerian time
  home: number | null; // team id
  away: number | null;
  homeSlot: string | null; // A1, L3, W:SF1
  awaySlot: string | null;
  knockout: boolean;
  placeWinner: number | null;
  placeLoser: number | null;
}

export interface GroupInput {
  code: string; // 'L' for a league, 'A'..'H' for groups
  teams: number[];
}

export interface BuilderInput {
  format: 'league' | 'groups';
  groups: GroupInput[];
  legs: 1 | 2;
  classification: ClassificationPlan;
  firstDay: string; // YYYY-MM-DD
  daysBetween: number; // between match days
  kickoffs: string[]; // HH:MM, used in turn on each match day
}

export type BuildResult = { ok: true; fixtures: FixtureDraft[] } | { ok: false; errors: string[] };

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const REF_RE = /^[A-Za-z0-9]{1,8}$/;
export const MAX_FIXTURES = 300;

// ------------------------------------------------------------------ slots

export function parseSlot(raw: string): Slot | null {
  const s = raw.trim();
  let m = /^([A-H])([1-9])$/i.exec(s);
  if (m) return { kind: 'pos', group: m[1].toUpperCase(), pos: Number(m[2]) };
  m = /^L([1-9][0-9]?)$/i.exec(s);
  if (m) return { kind: 'pos', group: 'L', pos: Number(m[1]) };
  m = /^([WL]):([A-Za-z0-9]{1,8})$/i.exec(s);
  if (m) return { kind: m[1].toUpperCase() === 'W' ? 'win' : 'lose', ref: m[2] };
  return null;
}

export function formatSlot(slot: Slot): string {
  if (slot.kind === 'pos') return `${slot.group}${slot.pos}`;
  return `${slot.kind === 'win' ? 'W' : 'L'}:${slot.ref}`;
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** Plain words for a slot, for fixtures whose teams are not known yet. */
export function describeSlot(raw: string | null, labelForRef: (ref: string) => string | undefined = () => undefined): string {
  if (!raw) return 'To be decided';
  const slot = parseSlot(raw);
  if (!slot) return raw;
  if (slot.kind === 'pos') {
    if (slot.group === 'L') return `${ordinal(slot.pos)} in the league`;
    if (slot.pos === 1) return `Winner Group ${slot.group}`;
    if (slot.pos === 2) return `Runner-up Group ${slot.group}`;
    return `${ordinal(slot.pos)} Group ${slot.group}`;
  }
  const label = labelForRef(slot.ref) ?? slot.ref;
  return `${slot.kind === 'win' ? 'Winner' : 'Loser'} ${label}`;
}

// ------------------------------------------------------------------ dates

export function isIsoDate(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function isTime(s: string): boolean {
  return TIME_RE.test(s);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Nigeria is on West Africa Time (UTC+1) all year, with no daylight saving. */
export function lagosTimestamp(date: string, time: string): string {
  return `${date}T${time}:00+01:00`;
}

// ------------------------------------------------------------------ round robin

/**
 * Circle method: every team meets every other team once. With an odd number of
 * teams one team rests each round. Home and away alternate by round so no team
 * is at home in every round.
 */
export function roundRobin<T>(teams: T[]): [T, T][][] {
  const t: (T | null)[] = teams.slice();
  if (t.length % 2) t.push(null);
  const n = t.length;
  const rounds: [T, T][][] = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs: [T, T][] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = t[i];
      const b = t[n - 1 - i];
      if (a !== null && b !== null) pairs.push(r % 2 === 1 ? [b, a] : [a, b]);
    }
    rounds.push(pairs);
    t.splice(1, 0, t.pop() as T | null);
  }
  return rounds;
}

// ------------------------------------------------------------------ builder

interface ClassSpec {
  ref: string;
  label: string;
  home: string;
  away: string;
  dayOffset: number;
  places: [number, number] | null;
}

function placeMatch(k: number, home: string, away: string, dayOffset = 0): ClassSpec {
  return {
    ref: k === 1 ? 'F' : `P${k}`,
    label: k === 1 ? 'Final' : `${ordinal(k)}–${ordinal(k + 1)} place`,
    home,
    away,
    dayOffset,
    places: [k, k + 1],
  };
}

function semis(h1: string, a1: string, h2: string, a2: string): ClassSpec[] {
  return [
    { ref: 'SF1', label: 'Semi-final 1', home: h1, away: a1, dayOffset: 0, places: null },
    { ref: 'SF2', label: 'Semi-final 2', home: h2, away: a2, dayOffset: 0, places: null },
    { ref: 'P3', label: '3rd place', home: 'L:SF1', away: 'L:SF2', dayOffset: 1, places: [3, 4] },
    { ref: 'F', label: 'Final', home: 'W:SF1', away: 'W:SF2', dayOffset: 1, places: [1, 2] },
  ];
}

/** The classification matches for a plan, as slot references. */
export function classificationSpecs(format: 'league' | 'groups', groups: GroupInput[], plan: ClassificationPlan): ClassSpec[] | string {
  if (plan === 'none') return [];
  if (format === 'groups') {
    if (groups.length !== 2) return 'Automatic classification needs exactly two groups. For other formats, upload the fixtures as a CSV file.';
    const [a, b] = groups;
    const n = Math.min(a.teams.length, b.teams.length);
    const out: ClassSpec[] = [];
    if (plan === 'semis') {
      if (n < 2) return 'Semi-finals need at least two teams in each group.';
      out.push(...semis(`${a.code}1`, `${b.code}2`, `${b.code}1`, `${a.code}2`));
      for (let k = 3; k <= n; k++) out.push(placeMatch(2 * k - 1, `${a.code}${k}`, `${b.code}${k}`));
    } else {
      for (let k = 1; k <= n; k++) out.push(placeMatch(2 * k - 1, `${a.code}${k}`, `${b.code}${k}`));
    }
    return out;
  }
  const n = groups[0]?.teams.length ?? 0;
  if (n > 99) return 'A league can have at most 99 teams.';
  const out: ClassSpec[] = [];
  if (plan === 'semis') {
    if (n < 4) return 'Semi-finals after a league need at least four teams.';
    out.push(...semis('L1', 'L4', 'L2', 'L3'));
    for (let k = 5; k + 1 <= n; k += 2) out.push(placeMatch(k, `L${k}`, `L${k + 1}`));
  } else {
    for (let k = 1; k + 1 <= n; k += 2) out.push(placeMatch(k, `L${k}`, `L${k + 1}`));
  }
  return out;
}

export function generateFixtures(input: BuilderInput): BuildResult {
  const errors: string[] = [];
  const kickoffs = input.kickoffs.map((t) => t.trim()).filter(Boolean);
  if (!isIsoDate(input.firstDay)) errors.push('Enter the first match day as a date (YYYY-MM-DD).');
  if (!kickoffs.length || kickoffs.some((t) => !isTime(t)))
    errors.push('Enter kick-off times as HH:MM separated by commas, for example 09:30, 12:00.');
  if (!Number.isInteger(input.daysBetween) || input.daysBetween < 1 || input.daysBetween > 28)
    errors.push('Days between match days must be a whole number from 1 to 28.');
  if (input.legs !== 1 && input.legs !== 2) errors.push('Choose one or two legs.');

  const groups = input.format === 'league' ? input.groups.slice(0, 1).map((g) => ({ ...g, code: 'L' })) : input.groups;
  if (!groups.length) errors.push('Add the teams taking part.');
  if (input.format === 'groups') {
    if (groups.length < 2 || groups.length > 8) errors.push('A group stage needs two to eight groups.');
    const codes = groups.map((g) => g.code);
    if (codes.some((c) => !/^[A-H]$/.test(c)) || new Set(codes).size !== codes.length)
      errors.push('Groups must be lettered A to H, each letter once.');
    if (groups.some((g) => g.teams.length < 2)) errors.push('Each group needs at least two teams.');
  } else if ((groups[0]?.teams.length ?? 0) < 3) {
    errors.push('A league needs at least three teams.');
  }
  const all = groups.flatMap((g) => g.teams);
  if (new Set(all).size !== all.length) errors.push('A team can only be in one group.');

  const specs = classificationSpecs(input.format, groups, input.classification);
  if (typeof specs === 'string') errors.push(specs);
  if (errors.length) return { ok: false, errors };

  const fixtures: FixtureDraft[] = [];
  const roundsBy = groups.map((g) => {
    const first = roundRobin(g.teams);
    return input.legs === 2 ? first.concat(first.map((r) => r.map(([h, a]) => [a, h] as [number, number]))) : first;
  });
  const nRounds = Math.max(...roundsBy.map((r) => r.length));
  let day = 0;
  for (let r = 0; r < nRounds; r++) {
    const date = addDays(input.firstDay, day * input.daysBetween);
    let slot = 0;
    groups.forEach((g, gi) => {
      for (const [home, away] of roundsBy[gi][r] ?? []) {
        fixtures.push({
          stage: g.code === 'L' ? 'league' : 'group',
          group: g.code,
          round: r + 1,
          ref: null,
          label: g.code === 'L' ? `Matchday ${r + 1}` : `Group ${g.code}`,
          date,
          time: kickoffs[slot % kickoffs.length],
          home,
          away,
          homeSlot: null,
          awaySlot: null,
          knockout: false,
          placeWinner: null,
          placeLoser: null,
        });
        slot++;
      }
    });
    day++;
  }

  const perDay = new Map<string, number>();
  for (const c of specs as ClassSpec[]) {
    const date = addDays(input.firstDay, (day + c.dayOffset) * input.daysBetween);
    const n = perDay.get(date) ?? 0;
    perDay.set(date, n + 1);
    fixtures.push({
      stage: 'classification',
      group: null,
      round: null,
      ref: c.ref,
      label: c.label,
      date,
      time: kickoffs[n % kickoffs.length],
      home: null,
      away: null,
      homeSlot: c.home,
      awaySlot: c.away,
      knockout: true,
      placeWinner: c.places ? c.places[0] : null,
      placeLoser: c.places ? c.places[1] : null,
    });
  }
  if (fixtures.length > MAX_FIXTURES) return { ok: false, errors: [`That makes ${fixtures.length} fixtures; the limit is ${MAX_FIXTURES}.`] };
  return { ok: true, fixtures };
}

/**
 * Checks that slot references make sense: groups exist and are big enough,
 * referenced matches exist, and no chain of W:/L: references loops back on itself.
 * Used for both the builder output and CSV imports.
 */
export function checkSlots(fixtures: FixtureDraft[], groupSizes: Map<string, number>, lineOf: (i: number) => string = (i) => `Fixture ${i + 1}`): string[] {
  const errors: string[] = [];
  const byRef = new Map<string, number>();
  fixtures.forEach((f, i) => {
    if (f.ref) byRef.set(f.ref.toUpperCase(), i);
  });
  fixtures.forEach((f, i) => {
    for (const [side, raw] of [['home', f.homeSlot], ['away', f.awaySlot]] as const) {
      if (!raw) continue;
      const slot = parseSlot(raw);
      if (!slot) {
        errors.push(`${lineOf(i)}: ${side} placeholder “${raw}” is not like A1, L3 or W:SF1.`);
        continue;
      }
      if (slot.kind === 'pos') {
        const size = groupSizes.get(slot.group);
        if (size === undefined) errors.push(`${lineOf(i)}: ${slot.group === 'L' ? 'there is no league stage' : `there is no Group ${slot.group}`} to take the ${side} team from.`);
        else if (slot.pos > size) errors.push(`${lineOf(i)}: ${slot.group === 'L' ? 'the league' : `Group ${slot.group}`} has only ${size} teams.`);
      } else {
        const target = byRef.get(slot.ref.toUpperCase());
        if (target === undefined) errors.push(`${lineOf(i)}: no match has ref ${slot.ref}.`);
        else if (target === i) errors.push(`${lineOf(i)}: a match cannot depend on its own result.`);
        else if (fixtures[target].stage !== 'classification') errors.push(`${lineOf(i)}: ${slot.ref} is not a knockout match, so it may have no winner.`);
      }
    }
  });
  // Cycle check over W:/L: references.
  const deps = (i: number): number[] =>
    [fixtures[i].homeSlot, fixtures[i].awaySlot]
      .map((raw) => (raw ? parseSlot(raw) : null))
      .filter((s): s is Extract<Slot, { kind: 'win' | 'lose' }> => !!s && s.kind !== 'pos')
      .map((s) => byRef.get(s.ref.toUpperCase()))
      .filter((t): t is number => t !== undefined && t !== i);
  const state = new Map<number, 1 | 2>();
  let loop: number | null = null;
  const visit = (i: number) => {
    if (loop !== null || state.get(i) === 2) return;
    if (state.get(i) === 1) {
      loop = i;
      return;
    }
    state.set(i, 1);
    deps(i).forEach(visit);
    state.set(i, 2);
  };
  fixtures.forEach((_, i) => visit(i));
  if (loop !== null) errors.push(`Match ${fixtures[loop].ref ?? lineOf(loop)} depends on its own result through a chain of winner or loser references.`);
  // Two matches must not both claim the same places.
  const claimed = new Map<number, string>();
  fixtures.forEach((f, i) => {
    for (const p of [f.placeWinner, f.placeLoser]) {
      if (p === null) continue;
      const prev = claimed.get(p);
      if (prev) errors.push(`${lineOf(i)}: ${ordinal(p)} place is already decided by ${prev}.`);
      else claimed.set(p, f.ref ?? lineOf(i));
    }
  });
  return errors;
}
