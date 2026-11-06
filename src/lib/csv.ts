// CSV uploads for the admin: fixtures for a competition, and players with their
// registrations. Everything is validated here and reported by row number, before
// anything is written. The database checks the same rules again on insert.

import {
  checkSlots,
  formatSlot,
  isIsoDate,
  isTime,
  MAX_FIXTURES,
  parseSlot,
  REF_RE,
  type FixtureDraft,
  type Stage,
} from './competition';

/** RFC 4180 parser: quoted fields, doubled quotes, commas and line breaks inside quotes. */
export function parseCSV(text: string): string[][] {
  const src = text.replace(/^﻿/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

/** Quote a value for CSV output (exports and templates). */
export function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  // A leading = + - @ would run as a formula when opened in a spreadsheet.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCSV(rows: unknown[][]): string {
  return rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

function headerIndex(head: string[], need: readonly string[]): { col: (n: string) => number; missing: string[] } {
  const h = head.map((x) => x.trim().toLowerCase());
  return { col: (n) => h.indexOf(n), missing: need.filter((n) => !h.includes(n)) };
}

// ------------------------------------------------------------------ fixtures

export const FIXTURE_COLUMNS = ['ref', 'date', 'time', 'stage', 'group', 'label', 'home', 'away', 'venue', 'places'] as const;

export const FIXTURE_TEMPLATE = toCSV([
  [...FIXTURE_COLUMNS],
  ['', '2026-10-01', '10:00', 'group', 'A', '', 'HIGW', 'FALW', '', ''],
  ['', '2026-10-01', '12:30', 'group', 'B', '', 'LAGW', 'HILW', '', ''],
  ['SF1', '2026-10-04', '12:00', 'class', '', 'Semi-final 1', 'A1', 'B2', '', ''],
  ['SF2', '2026-10-04', '14:30', 'class', '', 'Semi-final 2', 'B1', 'A2', '', ''],
  ['P3', '2026-10-05', '10:00', 'class', '', '3rd place', 'L:SF1', 'L:SF2', '', '3-4'],
  ['F', '2026-10-05', '13:00', 'class', '', 'Final', 'W:SF1', 'W:SF2', '', '1-2'],
]);

export interface TeamRef {
  id: number;
  code: string;
  category: string;
}

export interface FixtureImport {
  fixtures: (FixtureDraft & { venue: string | null })[];
  groups: { code: string; teams: number[] }[];
  format: 'league' | 'groups';
}

export type ImportResult<T> = { ok: true; value: T } | { ok: false; errors: string[] };

export function importFixtures(text: string, teams: TeamRef[], category: string): ImportResult<FixtureImport> {
  const errors: string[] = [];
  const rows = parseCSV(text ?? '');
  if (rows.length < 2) return { ok: false, errors: ['Paste the header row and at least one fixture row.'] };
  if (rows.length > MAX_FIXTURES + 1) return { ok: false, errors: [`A competition can have at most ${MAX_FIXTURES} fixtures.`] };
  const { col, missing } = headerIndex(rows[0], FIXTURE_COLUMNS);
  if (missing.length) return { ok: false, errors: [`The header row is missing: ${missing.join(', ')}. Copy the first row of the template.`] };

  const byCode = new Map(teams.map((t) => [t.code.toUpperCase(), t]));
  const refs = new Set<string>();
  const groupTeams = new Map<string, Set<number>>();
  const teamGroup = new Map<number, string>();
  const fixtures: FixtureImport['fixtures'] = [];
  const lines: number[] = [];

  rows.slice(1).forEach((r, i) => {
    const line = i + 2;
    const v = (n: string) => (r[col(n)] ?? '').trim();
    const stageRaw = v('stage').toLowerCase();
    const stage: Stage | null =
      stageRaw === 'league' ? 'league' : stageRaw === 'group' ? 'group' : stageRaw === 'class' || stageRaw === 'classification' ? 'classification' : null;
    if (!stage) {
      errors.push(`Row ${line}: stage must be league, group or class.`);
      return;
    }
    const ref = v('ref').toUpperCase() || null;
    const date = v('date');
    const time = v('time');
    if (!isIsoDate(date)) errors.push(`Row ${line}: date “${date}” is not YYYY-MM-DD.`);
    if (!isTime(time)) errors.push(`Row ${line}: time “${time}” is not HH:MM.`);
    if (ref) {
      if (!REF_RE.test(ref)) errors.push(`Row ${line}: ref “${ref}” must be up to 8 letters or digits.`);
      else if (refs.has(ref)) errors.push(`Row ${line}: ref ${ref} is used twice.`);
      else refs.add(ref);
    }
    let group: string | null = v('group').toUpperCase() || null;
    if (stage === 'group' && !/^[A-H]$/.test(group ?? '')) errors.push(`Row ${line}: group rows need a group letter from A to H.`);
    if (stage === 'league') group = 'L';
    if (stage === 'classification') group = null;

    const side = (raw: string, which: 'home' | 'away'): { team?: number; slot?: string } | null => {
      const t = byCode.get(raw.toUpperCase());
      if (t) {
        if (t.category !== category) errors.push(`Row ${line}: ${which} team ${t.code} is not a ${category} team.`);
        return { team: t.id };
      }
      if (stage === 'classification') {
        const s = parseSlot(raw);
        if (s) return { slot: formatSlot(s.kind === 'pos' ? s : { ...s, ref: s.ref.toUpperCase() }) };
      }
      errors.push(
        `Row ${line}: ${which} team “${raw}” is not a team code${stage === 'classification' ? ' or a placeholder such as A1, L1 or W:SF1' : ''}.`,
      );
      return null;
    };
    const h = side(v('home'), 'home');
    const a = side(v('away'), 'away');
    if (h?.team && a?.team && h.team === a.team) errors.push(`Row ${line}: a team cannot play itself.`);

    if (stage !== 'classification' && group && h?.team && a?.team) {
      for (const t of [h.team, a.team]) {
        const prev = teamGroup.get(t);
        if (prev && prev !== group) errors.push(`Row ${line}: a team cannot play in Group ${prev} and Group ${group}.`);
        teamGroup.set(t, group);
        if (!groupTeams.has(group)) groupTeams.set(group, new Set());
        groupTeams.get(group)!.add(t);
      }
    }

    let placeWinner: number | null = null;
    let placeLoser: number | null = null;
    const places = v('places');
    if (places) {
      const m = /^(\d{1,2})\s*[-–]\s*(\d{1,2})$/.exec(places);
      if (stage !== 'classification') errors.push(`Row ${line}: only class rows can decide places.`);
      else if (m && Number(m[2]) === Number(m[1]) + 1 && Number(m[1]) >= 1) {
        placeWinner = Number(m[1]);
        placeLoser = Number(m[2]);
      } else errors.push(`Row ${line}: places should look like 1-2 or 5-6.`);
    }
    const label = v('label').slice(0, 40) || (stage === 'league' ? '' : stage === 'group' ? `Group ${group}` : 'Classification');
    lines.push(line);
    fixtures.push({
      stage,
      group,
      round: null,
      ref,
      label,
      date,
      time,
      home: h?.team ?? null,
      away: a?.team ?? null,
      homeSlot: h?.slot ?? null,
      awaySlot: a?.slot ?? null,
      knockout: stage === 'classification',
      placeWinner,
      placeLoser,
      venue: v('venue').slice(0, 80) || null,
    });
  });

  const hasLeague = fixtures.some((f) => f.stage === 'league');
  const hasGroup = fixtures.some((f) => f.stage === 'group');
  if (hasLeague && hasGroup) errors.push('Use either league rows or group rows in one competition, not both.');
  if (!hasLeague && !hasGroup) errors.push('Add the league or group matches as well as the classification matches.');

  const sizes = new Map([...groupTeams].map(([g, s]) => [g, s.size]));
  errors.push(...checkSlots(fixtures, sizes, (i) => `Row ${lines[i]}`));

  // League rounds follow the match dates.
  const leagueDates = [...new Set(fixtures.filter((f) => f.stage === 'league').map((f) => f.date))].sort();
  const groupDates = new Map<string, string[]>();
  for (const f of fixtures) {
    if (f.stage === 'league') {
      f.round = leagueDates.indexOf(f.date) + 1;
      if (!f.label) f.label = `Matchday ${f.round}`;
    } else if (f.stage === 'group' && f.group) {
      const ds = groupDates.get(f.group) ?? [];
      if (!ds.includes(f.date)) ds.push(f.date);
      groupDates.set(f.group, ds);
    }
  }
  for (const f of fixtures) {
    if (f.stage === 'group' && f.group) f.round = [...(groupDates.get(f.group) ?? [])].sort().indexOf(f.date) + 1;
  }

  if (errors.length) return { ok: false, errors };
  const groups = [...groupTeams].sort(([a], [b]) => a.localeCompare(b)).map(([code, s]) => ({ code, teams: [...s] }));
  return { ok: true, value: { fixtures, groups, format: hasGroup ? 'groups' : 'league' } };
}

// ------------------------------------------------------------------ players

export const PLAYER_COLUMNS = ['nhf_number', 'first_name', 'last_name', 'gender', 'date_of_birth', 'position', 'team', 'shirt'] as const;

export const PLAYER_TEMPLATE = toCSV([
  [...PLAYER_COLUMNS],
  ['NHF-26001', 'Ngozi', 'Okafor', 'female', '2004-03-14', 'MF', 'HIGW', '8'],
  ['', 'Chinedu', 'Bello', 'male', '2001-11-02', 'GK', 'HIGM', '1'],
]);

export interface PlayerRow {
  line: number;
  nhfNumber: string | null; // null: a new player, the number is issued on import
  firstName: string;
  lastName: string;
  gender: 'female' | 'male';
  dateOfBirth: string | null;
  position: 'GK' | 'DF' | 'MF' | 'FW' | null;
  teamId: number;
  shirt: number | null;
}

/**
 * A club's list of players for a season. New players get an NHF number on import;
 * existing players are matched by NHF number, so a returning player keeps their history.
 */
export function importPlayers(text: string, teams: TeamRef[]): ImportResult<PlayerRow[]> {
  const errors: string[] = [];
  const rows = parseCSV(text ?? '');
  if (rows.length < 2) return { ok: false, errors: ['Paste the header row and at least one player row.'] };
  if (rows.length > 1001) return { ok: false, errors: ['Upload at most 1,000 players at a time.'] };
  const { col, missing } = headerIndex(rows[0], PLAYER_COLUMNS);
  if (missing.length) return { ok: false, errors: [`The header row is missing: ${missing.join(', ')}. Copy the first row of the template.`] };
  const byCode = new Map(teams.map((t) => [t.code.toUpperCase(), t]));
  const out: PlayerRow[] = [];
  const seenNumbers = new Map<string, number>();
  const seenShirts = new Map<string, number>();

  rows.slice(1).forEach((r, i) => {
    const line = i + 2;
    const v = (n: string) => (r[col(n)] ?? '').trim();
    const nhf = v('nhf_number').toUpperCase() || null;
    if (nhf && !/^NHF-[0-9]{4,8}$/.test(nhf)) errors.push(`Row ${line}: NHF number “${nhf}” should look like NHF-26001.`);
    if (nhf) {
      const prev = seenNumbers.get(nhf);
      if (prev) errors.push(`Row ${line}: ${nhf} is also on row ${prev}.`);
      else seenNumbers.set(nhf, line);
    }
    const firstName = v('first_name').slice(0, 60);
    const lastName = v('last_name').slice(0, 60);
    if (!firstName || !lastName) errors.push(`Row ${line}: first and last name are both needed.`);
    const g = v('gender').toLowerCase();
    const gender = g === 'f' || g === 'female' ? 'female' : g === 'm' || g === 'male' ? 'male' : null;
    if (!gender) errors.push(`Row ${line}: gender should be female or male.`);
    const dob = v('date_of_birth') || null;
    if (dob && !isIsoDate(dob)) errors.push(`Row ${line}: date of birth “${dob}” is not YYYY-MM-DD.`);
    const posRaw = v('position').toUpperCase();
    const position = (['GK', 'DF', 'MF', 'FW'] as const).find((p) => p === posRaw) ?? null;
    if (posRaw && !position) errors.push(`Row ${line}: position should be GK, DF, MF or FW.`);
    const team = byCode.get(v('team').toUpperCase());
    if (!team) errors.push(`Row ${line}: team “${v('team')}” is not a team code.`);
    if (team && gender) {
      const female = /^(women|girls)/.test(team.category);
      if (female !== (gender === 'female')) errors.push(`Row ${line}: a ${gender} player cannot join ${team.code}.`);
    }
    const shirtRaw = v('shirt');
    const shirt = shirtRaw ? Number(shirtRaw) : null;
    if (shirt !== null && !(Number.isInteger(shirt) && shirt >= 1 && shirt <= 99)) errors.push(`Row ${line}: shirt should be a number from 1 to 99.`);
    if (team && shirt !== null) {
      const key = `${team.id}:${shirt}`;
      const prev = seenShirts.get(key);
      if (prev) errors.push(`Row ${line}: shirt ${shirt} for ${team.code} is also on row ${prev}.`);
      else seenShirts.set(key, line);
    }
    if (team && gender) {
      out.push({ line, nhfNumber: nhf, firstName, lastName, gender, dateOfBirth: dob, position, teamId: team.id, shirt });
    }
  });
  if (errors.length) return { ok: false, errors };
  return { ok: true, value: out };
}
