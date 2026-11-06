// The players tally for one match: who played, and each player's goals and cards.
// The admin result form and the live scorer both reduce to this shape. validateTally
// says what is wrong before anything is saved; tallyToEvents turns it into the rows
// the database stores (match_squads and match_events).

export type GoalType = 'FG' | 'PC' | 'PS';
export type CardColour = 'green' | 'yellow' | 'red';

export interface TallyLine {
  playerId: number;
  teamId: number;
  played: boolean;
  shirt: number | null;
  captain: boolean;
  goalkeeper: boolean;
  fg: number; // field goals
  pc: number; // penalty-corner goals
  ps: number; // penalty-stroke goals
  green: number;
  yellow: number;
  red: number;
}

export interface TallyInput {
  homeTeamId: number;
  awayTeamId: number;
  knockout: boolean;
  homeScore: number;
  awayScore: number;
  homeShootout: number | null;
  awayShootout: number | null;
  lines: TallyLine[];
  /** Players a side may field. Hockey5s uses a smaller squad; FIH events allow 16 at 11-a-side. */
  maxSquad?: number;
  minSquad?: number;
}

export interface TallyCheck {
  errors: string[];
  warnings: string[];
  unattributed: { home: number; away: number };
}

const isCount = (n: unknown, max = 30): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= max;

export function goalsOf(l: TallyLine): number {
  return l.fg + l.pc + l.ps;
}

export function validateTally(t: TallyInput, names: (playerId: number) => string = (id) => `Player ${id}`): TallyCheck {
  const errors: string[] = [];
  const warnings: string[] = [];
  const maxSquad = t.maxSquad ?? 18;
  const minSquad = t.minSquad ?? 7;

  if (!isCount(t.homeScore) || !isCount(t.awayScore)) errors.push('Scores must be whole numbers from 0 to 30.');
  const shootout = t.homeShootout !== null || t.awayShootout !== null;
  if (shootout) {
    if (!t.knockout) errors.push('Only knockout matches have a shoot-out.');
    else if (t.homeScore !== t.awayScore) errors.push('A shoot-out is only played when the score is level.');
    if (!isCount(t.homeShootout, 50) || !isCount(t.awayShootout, 50)) errors.push('Enter both shoot-out scores.');
    else if (t.homeShootout === t.awayShootout) errors.push('A shoot-out cannot end level.');
  } else if (t.knockout && t.homeScore === t.awayScore) {
    errors.push('This knockout match is level, so it needs a shoot-out result.');
  }

  const seen = new Set<number>();
  for (const side of [
    { team: t.homeTeamId, score: t.homeScore, name: 'Home' },
    { team: t.awayTeamId, score: t.awayScore, name: 'Away' },
  ]) {
    const lines = t.lines.filter((l) => l.teamId === side.team);
    const played = lines.filter((l) => l.played);
    const shirts = new Map<number, number>();
    for (const l of lines) {
      const who = names(l.playerId);
      if (seen.has(l.playerId)) errors.push(`${who} is listed twice.`);
      seen.add(l.playerId);
      for (const [k, v] of Object.entries({ fg: l.fg, pc: l.pc, ps: l.ps, green: l.green, yellow: l.yellow, red: l.red })) {
        if (!isCount(v)) errors.push(`${who}: ${k} must be a whole number from 0 to 30.`);
      }
      const involved = goalsOf(l) + l.green + l.yellow + l.red > 0;
      if (involved && !l.played) errors.push(`${who} has goals or cards but is not ticked as playing.`);
      if (l.red > 1) errors.push(`${who} can only be shown one red card.`);
      if (l.green > 1) warnings.push(`${who} has ${l.green} green cards; a second green card for the same player is usually a yellow.`);
      if (l.yellow > 2) warnings.push(`${who} has ${l.yellow} yellow cards; check the scoresheet.`);
      if (l.played && l.shirt !== null) {
        if (!(Number.isInteger(l.shirt) && l.shirt >= 1 && l.shirt <= 99)) errors.push(`${who}: shirt must be from 1 to 99.`);
        const prev = shirts.get(l.shirt);
        if (prev !== undefined) errors.push(`${side.name} team: ${who} and ${names(prev)} both wear ${l.shirt}.`);
        else shirts.set(l.shirt, l.playerId);
      }
    }
    const attributed = played.reduce((s, l) => s + goalsOf(l), 0);
    if (isCount(side.score) && attributed > side.score)
      errors.push(`${side.name} team: players are credited with ${attributed} goals but the team scored ${side.score}.`);
    if (played.length && played.length < minSquad) warnings.push(`${side.name} team: only ${played.length} players are ticked as playing.`);
    if (played.length > maxSquad) errors.push(`${side.name} team: ${played.length} players ticked; a match squad has at most ${maxSquad}.`);
    if (!played.length) warnings.push(`${side.name} team: no players are ticked, so nobody gets an appearance.`);
    const captains = played.filter((l) => l.captain).length;
    if (captains > 1) errors.push(`${side.name} team: only one captain.`);
    if (played.length && !played.some((l) => l.goalkeeper)) warnings.push(`${side.name} team: no goalkeeper is marked.`);
  }
  const unattributed = {
    home: Math.max(0, t.homeScore - t.lines.filter((l) => l.played && l.teamId === t.homeTeamId).reduce((s, l) => s + goalsOf(l), 0)),
    away: Math.max(0, t.awayScore - t.lines.filter((l) => l.played && l.teamId === t.awayTeamId).reduce((s, l) => s + goalsOf(l), 0)),
  };
  if (unattributed.home + unattributed.away > 0)
    warnings.push(
      `${unattributed.home + unattributed.away} goal${unattributed.home + unattributed.away === 1 ? '' : 's'} will be saved without a scorer and listed on the admin dashboard until someone fills them in.`,
    );
  if (t.lines.some((l) => l.teamId !== t.homeTeamId && l.teamId !== t.awayTeamId)) errors.push('A tally line belongs to a team that is not in this match.');
  return { errors, warnings, unattributed };
}

export interface SquadRow {
  playerId: number;
  teamId: number;
  shirt: number | null;
  captain: boolean;
  goalkeeper: boolean;
}

export interface EventRow {
  teamId: number;
  playerId: number | null;
  kind: 'goal' | 'card';
  goalType: GoalType | null;
  card: CardColour | null;
}

/** Rows to store for a validated tally. Unattributed goals become goals with no player. */
export function tallyToEvents(t: TallyInput): { squads: SquadRow[]; events: EventRow[] } {
  const squads: SquadRow[] = [];
  const events: EventRow[] = [];
  const goal = (teamId: number, playerId: number | null, goalType: GoalType) => events.push({ teamId, playerId, kind: 'goal', goalType, card: null });
  const card = (teamId: number, playerId: number, c: CardColour) => events.push({ teamId, playerId, kind: 'card', goalType: null, card: c });
  for (const l of t.lines) {
    if (!l.played) continue;
    squads.push({ playerId: l.playerId, teamId: l.teamId, shirt: l.shirt, captain: l.captain, goalkeeper: l.goalkeeper });
    for (let i = 0; i < l.fg; i++) goal(l.teamId, l.playerId, 'FG');
    for (let i = 0; i < l.pc; i++) goal(l.teamId, l.playerId, 'PC');
    for (let i = 0; i < l.ps; i++) goal(l.teamId, l.playerId, 'PS');
    for (let i = 0; i < l.green; i++) card(l.teamId, l.playerId, 'green');
    for (let i = 0; i < l.yellow; i++) card(l.teamId, l.playerId, 'yellow');
    for (let i = 0; i < l.red; i++) card(l.teamId, l.playerId, 'red');
  }
  const { unattributed } = validateTally(t);
  for (let i = 0; i < unattributed.home; i++) goal(t.homeTeamId, null, 'FG');
  for (let i = 0; i < unattributed.away; i++) goal(t.awayTeamId, null, 'FG');
  return { squads, events };
}

/** Rebuild a tally from stored rows, for editing a result that was saved before. */
export function tallyFromRows(
  roster: { playerId: number; teamId: number; shirt: number | null }[],
  squads: SquadRow[],
  events: EventRow[],
): TallyLine[] {
  const inSquad = new Map(squads.map((s) => [s.playerId, s]));
  return roster.map((r) => {
    const s = inSquad.get(r.playerId);
    const mine = events.filter((e) => e.playerId === r.playerId);
    const n = (f: (e: EventRow) => boolean) => mine.filter(f).length;
    return {
      playerId: r.playerId,
      teamId: r.teamId,
      played: !!s,
      shirt: s ? s.shirt : r.shirt,
      captain: s?.captain ?? false,
      goalkeeper: s?.goalkeeper ?? false,
      fg: n((e) => e.goalType === 'FG'),
      pc: n((e) => e.goalType === 'PC'),
      ps: n((e) => e.goalType === 'PS'),
      green: n((e) => e.card === 'green'),
      yellow: n((e) => e.card === 'yellow'),
      red: n((e) => e.card === 'red'),
    };
  });
}

/** Read the result form. Field names: score.home, score.away, so.home, so.away, and p.<playerId>.<field>. */
export function tallyFromForm(form: FormData, base: Omit<TallyInput, 'homeScore' | 'awayScore' | 'homeShootout' | 'awayShootout' | 'lines'>, roster: { playerId: number; teamId: number }[]): TallyInput {
  const num = (k: string): number => {
    const v = String(form.get(k) ?? '').trim();
    return v === '' ? 0 : Number(v);
  };
  const opt = (k: string): number | null => {
    const v = String(form.get(k) ?? '').trim();
    return v === '' ? null : Number(v);
  };
  return {
    ...base,
    homeScore: num('score.home'),
    awayScore: num('score.away'),
    homeShootout: opt('so.home'),
    awayShootout: opt('so.away'),
    lines: roster.map((r) => {
      const k = (f: string) => `p.${r.playerId}.${f}`;
      return {
        playerId: r.playerId,
        teamId: r.teamId,
        played: form.get(k('played')) === 'on',
        shirt: opt(k('shirt')),
        captain: form.get(k('captain')) === 'on',
        goalkeeper: form.get(k('gk')) === 'on',
        fg: num(k('fg')),
        pc: num(k('pc')),
        ps: num(k('ps')),
        green: num(k('green')),
        yellow: num(k('yellow')),
        red: num(k('red')),
      };
    }),
  };
}
