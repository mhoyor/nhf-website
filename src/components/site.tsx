// Building blocks of the website, ported from the v4 prototype.
import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { creditFor, PHOTOS } from '@/content/photos';

/** The hockey stick on buttons: it swings on hover (site.css). */
export function Stick() {
  return (
    <svg className="stk" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M10.6 1.4 6.1 11q-1 2.2-3.2 1.7l-.7-.2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12.4" cy="13.1" r="1.9" fill="currentColor" />
    </svg>
  );
}

export function Arrow() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function Cta({ href, children, kind = 'primary' }: { href: string; children: ReactNode; kind?: 'primary' | 'light' | 'ghost-light' | 'accent' | '' }) {
  const external = /^https?:/.test(href);
  const cls = `btn ${kind}`.trim();
  const inner = (
    <>
      <Stick />
      <span>{children}</span>
    </>
  );
  return external ? (
    <a className={cls} href={href} target="_blank" rel="noopener noreferrer">
      {inner}
    </a>
  ) : (
    <Link className={cls} href={href}>
      {inner}
    </Link>
  );
}

/** Reveal-on-scroll attributes; SiteEffects adds the motion. */
export const rv = (delay = 0): { className: string; style: CSSProperties } => ({ className: 'reveal', style: { ['--d' as string]: `${delay}s` } });

/**
 * Green pitch artwork used wherever a photo has not been supplied yet. The kind follows the
 * story (artFor): medals, a cup, rising bars, or a stick and ball, so tiles do not repeat.
 */
export function art(kind: string, seed: string): string {
  let h = 7;
  for (const ch of String(seed || kind)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => {
    h = (Math.imul(h, 1103515245) + 12345) >>> 0;
    return ((h >>> 8) % 10000) / 10000;
  };
  const W = 1600;
  const H = 1000;
  let s = `<svg class="art" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="${W}" height="${H}" fill="var(--green-900)"/>`;
  for (let i = 0; i < 10; i++) if (i % 2) s += `<rect x="${i * 160}" y="0" width="160" height="${H}" fill="var(--green-deep)" opacity=".55"/>`;
  const cx = 300 + rnd() * 1000;
  s += `<g fill="none" stroke="var(--on-dark)" stroke-opacity=".14" stroke-width="7"><circle cx="${cx}" cy="980" r="430"/><circle cx="${cx}" cy="980" r="560" stroke-dasharray="26 24"/><line x1="0" y1="${(140 + rnd() * 90).toFixed(0)}" x2="${W}" y2="${(140 + rnd() * 90).toFixed(0)}"/></g>`;
  const stick = (x: number, y: number, rot: number, sc: number, op: number, grip: string) =>
    `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${sc})" opacity="${op}"><rect x="-16" y="-560" width="32" height="600" rx="14" fill="var(--on-dark)"/><rect x="-19" y="-560" width="38" height="210" rx="16" fill="${grip}"/><path d="M-16 30 L-16 72 Q-16 152 62 152 Q132 152 132 86 Q132 56 106 56 Q82 56 82 84 Q82 104 62 104 Q22 104 16 64 L16 30 Z" fill="var(--on-dark)"/></g>`;
  const ball = (x: number, y: number, r: number) =>
    `<g><line x1="${x - r * 7}" y1="${y + r * 0.3}" x2="${x - r * 1.8}" y2="${y}" stroke="var(--on-dark)" stroke-opacity=".22" stroke-width="${r * 0.28}" stroke-linecap="round"/><circle cx="${x}" cy="${y}" r="${r}" fill="var(--on-dark)"/><circle cx="${x - r * 0.3}" cy="${y - r * 0.25}" r="${r * 0.12}" fill="var(--green-900)" opacity=".22"/><circle cx="${x + r * 0.25}" cy="${y + r * 0.1}" r="${r * 0.12}" fill="var(--green-900)" opacity=".22"/></g>`;
  const id = `a${h.toString(36)}`;
  if (kind === 'medal') {
    // Two medals on green-and-white ribbons, for results and medal stories.
    const medal = (x: number, y: number, r: number, hi: string, mid: string, lo: string, n: string) =>
      `<radialGradient id="${id}${n}" cx="34%" cy="30%"><stop offset="0" stop-color="${hi}"/><stop offset=".58" stop-color="${mid}"/><stop offset="1" stop-color="${lo}"/></radialGradient>` +
      `<path d="M${x - r * 0.55} -20 L${x - r * 0.12} ${y - r * 0.9} L${x + r * 0.12} ${y - r * 0.9} L${x - r * 0.15} -20 Z" fill="var(--green)"/>` +
      `<path d="M${x + r * 0.55} -20 L${x + r * 0.12} ${y - r * 0.9} L${x - r * 0.12} ${y - r * 0.9} L${x + r * 0.15} -20 Z" fill="var(--on-dark)" opacity=".9"/>` +
      `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${id}${n})"/><circle cx="${x}" cy="${y}" r="${r * 0.74}" fill="none" stroke="var(--green-900)" stroke-opacity=".25" stroke-width="6"/>`;
    s += medal(720, 290, 125, '#F4F6F5', '#AEB7B2', '#6C7570', 's') + medal(915, 340, 105, 'var(--bronze-hi)', 'var(--bronze)', 'var(--bronze-lo)', 'b');
  } else if (kind === 'trophy') {
    // A cup, for league titles and finals.
    s += `<g transform="translate(800 0) scale(.82) translate(-800 -40)"><g fill="var(--on-dark)" opacity=".88"><path d="M640 160 h320 v70 q0 190 -160 232 q-160 -42 -160 -232 z"/><rect x="778" y="455" width="44" height="80"/><rect x="690" y="530" width="220" height="56" rx="10"/></g>` +
      `<g fill="none" stroke="var(--on-dark)" stroke-opacity=".88" stroke-width="24"><path d="M650 200 q-100 0 -100 78 q0 88 120 112"/><path d="M950 200 q100 0 100 78 q0 88 -120 112"/></g>` +
      `<rect x="640" y="232" width="320" height="30" fill="var(--accent)"/></g>` +
      [[520, 170], [1080, 150], [1130, 380], [470, 420]].map(([x, y]) => `<path d="M${x} ${y - 26} l7 19 20 1 -16 12 6 20 -17 -12 -17 12 6 -20 -16 -12 20 -1z" fill="var(--accent)" opacity=".8"/>`).join('');
  } else if (kind === 'rank') {
    // Rising bars, for rankings stories.
    for (let i = 0; i < 7; i++) {
      const bh = 50 + i * 46;
      s += `<rect x="${470 + i * 96}" y="${470 - bh}" width="62" height="${bh}" rx="6" fill="${i === 4 ? 'var(--accent)' : 'var(--on-dark)'}" opacity="${i === 4 ? 0.95 : 0.2 + i * 0.05}"/>`;
    }
    s += `<path d="M470 400 Q760 360 1100 110" fill="none" stroke="var(--on-dark)" stroke-opacity=".5" stroke-width="8" stroke-dasharray="4 18" stroke-linecap="round"/>`;
  } else if (kind === 'campaign') s += stick(620, 560, -30, 1, 0.85, 'var(--green)') + stick(980, 560, 30, 1, 0.7, 'var(--accent)') + ball(800, 800, 42);
  else if (kind === 'coach') {
    for (let i = 0; i < 5; i++) {
      const x = 300 + i * 240;
      const y = 700 + (i % 2) * 60;
      s += `<path d="M${x} ${y} l46 -110 l46 110 z" fill="var(--accent)" opacity=".85"/>`;
    }
    s += ball(1300, 620, 36) + stick(1180, 480, -20, 0.9, 0.7, 'var(--green)');
  } else s += stick(800 + rnd() * 400, 560, -30 + rnd() * 60, 1.05, 0.8, 'var(--green)') + ball(360 + rnd() * 500, 700 + rnd() * 160, 40);
  return s + '</svg>';
}

/**
 * A photo slot: a supplied photo (by slot name from photos.ts, or a direct URL), or the
 * green artwork until one is added.
 */
export function Photo({
  slot,
  src,
  alt: altGiven,
  position,
  credit,
  className = '',
  eager,
  art: artKind = 'news',
}: {
  slot?: string;
  src?: string | null;
  alt?: string;
  position?: string | null;
  credit?: string | null;
  className?: string;
  eager?: boolean;
  art?: string;
}) {
  const fromSlot = slot ? PHOTOS[slot] : undefined;
  const url = src ?? fromSlot?.src ?? null;
  const alt = altGiven ?? fromSlot?.alt ?? '';
  const pos = position ?? fromSlot?.position ?? '50% 50%';
  const cr = credit ?? fromSlot?.credit ?? (url ? creditFor(url) : '');
  return (
    <figure className={`ph ${className}`.trim()}>
      {url ? (
        <img src={url} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" style={{ objectPosition: pos }} />
      ) : (
        <span dangerouslySetInnerHTML={{ __html: art(artKind, slot ?? alt ?? 'nhf') }} style={{ position: 'absolute', inset: 0, display: 'block' }} />
      )}
      {url && cr ? <span className="credit">{cr}</span> : null}
    </figure>
  );
}

function Lines() {
  return (
    <svg className="lines" viewBox="0 0 380 380" aria-hidden="true" fill="none" stroke="var(--on-dark)" strokeOpacity=".13" strokeWidth="3">
      <circle cx="300" cy="80" r="150" />
      <circle cx="300" cy="80" r="210" strokeDasharray="12 10" />
      <circle cx="300" cy="80" r="7" fill="var(--on-dark)" fillOpacity=".25" />
    </svg>
  );
}

/** Green page header panel, with a photo behind it when given one. */
export function PageHead({
  eyebrow,
  title,
  lede,
  photo,
  children,
  className = '',
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lede?: ReactNode;
  photo?: { slot?: string; src?: string | null; alt?: string; position?: string | null; credit?: string | null };
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`phead${photo ? ' photo' : ''} ${className}`.trim()}>
      {photo ? <Photo {...photo} eager /> : <Lines />}
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h1>{title}</h1>
      {lede ? <p className="lede">{lede}</p> : null}
      {children}
    </section>
  );
}

export function Sources({ items, label = 'Sources' }: { items: [string, string][]; label?: string }) {
  if (!items.length) return null;
  return (
    <p className="src">
      {label}:{' '}
      {items.map(([t, u], i) => (
        <span key={u + i}>
          {i > 0 ? ', ' : ''}
          <a href={u} target="_blank" rel="noopener noreferrer">
            {t}
          </a>
        </span>
      ))}
    </p>
  );
}

const ic = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
);

export const ICONS: Record<string, ReactNode> = {
  learn: ic(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.2a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .9-1 1.6v.4" />
      <circle cx="12" cy="17" r=".7" fill="currentColor" />
    </>,
  ),
  play: ic(
    <>
      <path d="M15 3 9.6 15.6q-1 2.4-3.7 1.8L5 17.2" />
      <circle cx="17.6" cy="18" r="2.2" />
    </>,
  ),
  team: ic(
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M15.8 14.2c2.4.2 4.1 1.8 4.7 4.8" />
    </>,
  ),
  whistle: ic(
    <>
      <path d="M3 12a5 5 0 1 0 9.6 2L21 10V7h-9.3A5 5 0 0 0 3 12z" />
      <circle cx="8" cy="12.3" r="1.3" />
    </>,
  ),
  school: ic(
    <>
      <path d="m3 9 9-5 9 5-9 5z" />
      <path d="M7 11.5V16c2.8 2 7.2 2 10 0v-4.5" />
    </>,
  ),
  hand: ic(<path d="M12 21c-4 0-7-3-7-7v-3a1.5 1.5 0 0 1 3 0V6.5a1.5 1.5 0 0 1 3 0V5a1.5 1.5 0 0 1 3 0v1.5a1.5 1.5 0 0 1 3 0V14c0 4-3 7-5 7z" />),
};

/** Which artwork suits a story without a photo. */
export function artFor(n: { title: string; section: string; tags: string[] }): string {
  const t = `${n.title} ${n.section} ${n.tags.join(' ')}`;
  if (/rank/i.test(t)) return 'rank';
  if (/bronze|silver|gold|medal/i.test(t)) return 'medal';
  if (/title|champion|final|league|cup/i.test(t)) return 'trophy';
  return 'news';
}

/** Relative date for news, as on hockey.nl: Today, Yesterday, 3 days ago, 8 August. */
export function relDate(iso: string, dateText?: string | null, now = new Date()): string {
  if (dateText) return dateText;
  const d = new Date(`${iso}T12:00:00+01:00`);
  const today = new Date(new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' }).format(now) + 'T12:00:00+01:00');
  const days = Math.round((today.getTime() - d.getTime()) / 864e5);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days > 1 && days < 7) return `${days} days ago`;
  const sameYear = d.getUTCFullYear() === today.getUTCFullYear();
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'Africa/Lagos', ...(sameYear ? {} : { year: 'numeric' }) });
}

/** "Double *bronze* in Nairobi" → Double <em>bronze</em> in Nairobi */
export function Highlighted({ text }: { text: string }) {
  const parts = text.split(/\*([^*]+)\*/);
  return (
    <>
      {parts.map((p, i) => (i % 2 ? <em key={i}>{p}</em> : <span key={i}>{p}</span>))}
    </>
  );
}
