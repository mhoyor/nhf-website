// Display helpers. All times are shown in Nigerian time (WAT, UTC+1).

export const TZ = 'Africa/Lagos';

const dayFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' });
const dayYearFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });
const isoDayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });

export const fmtDay = (d: Date | string) => dayFmt.format(new Date(d));
export const fmtDate = (d: Date | string) => dayYearFmt.format(new Date(typeof d === 'string' && d.length === 10 ? `${d}T12:00:00Z` : d));
export const fmtTime = (d: Date | string) => timeFmt.format(new Date(d));
/** 'YYYY-MM-DD' of a moment in Nigeria. */
export const lagosDay = (d: Date | string = new Date()) => isoDayFmt.format(new Date(d));

export const CATEGORY_LABELS: Record<string, string> = {
  men: 'Men',
  women: 'Women',
  boys_u18: 'Boys U18',
  girls_u18: 'Girls U18',
  boys_u21: 'Boys U21',
  girls_u21: 'Girls U21',
};
export const CATEGORIES = Object.keys(CATEGORY_LABELS);

export const POSITION_LABELS: Record<string, string> = { GK: 'Goalkeeper', DF: 'Defender', MF: 'Midfielder', FW: 'Forward' };

export const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Scheduled',
  live: 'Live',
  break: 'Break',
  shootout: 'Shoot-out',
  final: 'Full time',
  postponed: 'Postponed',
  abandoned: 'Abandoned',
};

export const GOAL_LABELS: Record<string, string> = { FG: 'Field goal', PC: 'Penalty corner', PS: 'Penalty stroke' };

export function isLive(status: string): boolean {
  return status === 'live' || status === 'break' || status === 'shootout';
}

/** Quarter and minute for a live match: hockey is four quarters of 15 minutes. */
export function matchClock(status: string, period: number, periodStartedAt: Date | string | null, now = Date.now()): string {
  if (status === 'break') return period >= 4 ? 'Full time' : period === 2 ? 'Half time' : `End of Q${period}`;
  if (status === 'shootout') return 'Shoot-out';
  if (status !== 'live' || period < 1) return STATUS_LABELS[status] ?? status;
  if (!periodStartedAt) return `Q${period}`;
  const mins = Math.max(0, Math.floor((now - new Date(periodStartedAt).getTime()) / 60000));
  return `Q${period} · ${Math.min(15, mins + 1)}′`;
}

export function eventMinute(matchSecond: number | null): string {
  if (matchSecond === null || matchSecond === undefined) return '';
  return `${Math.floor(matchSecond / 60) + 1}′`;
}

const showFullYouthNames = process.env.PUBLIC_FULL_NAMES_UNDER_18 === 'true';

/** Public name: under-18s appear as first name and last initial unless the federation turns this off. */
export function publicName(p: { firstName: string; lastName: string; dateOfBirth?: string | null; isMinor?: boolean | null }): string {
  const minor = p.isMinor ?? (p.dateOfBirth ? ageOn(p.dateOfBirth, lagosDay()) < 18 : false);
  if (minor && !showFullYouthNames) return `${p.firstName} ${p.lastName.charAt(0)}.`;
  return `${p.firstName} ${p.lastName}`;
}

export function ageOn(dob: string, day: string): number {
  const [y, m, d] = dob.split('-').map(Number);
  const [y2, m2, d2] = day.split('-').map(Number);
  return y2 - y - (m2 < m || (m2 === m && d2 < d) ? 1 : 0);
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function slugify(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** First value of a search parameter. */
export function param(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? '';
}

export function intParam(v: string | string[] | undefined): number | null {
  const n = Number(param(v));
  return Number.isInteger(n) && n > 0 ? n : null;
}
