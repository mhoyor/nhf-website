import Link from 'next/link';
import type { ReactNode } from 'react';

const ITEMS: [string, string, string][] = [
  ['live', 'Live and today', '/match-centre'],
  ['competitions', 'Competitions', '/match-centre/competitions'],
  ['clubs', 'Clubs', '/match-centre/clubs'],
  ['players', 'Players', '/match-centre/players'],
];

function Lines() {
  return (
    <svg className="lines" viewBox="0 0 380 380" aria-hidden="true" fill="none" stroke="var(--on-dark)" strokeOpacity=".13" strokeWidth="3">
      <circle cx="300" cy="80" r="150" />
      <circle cx="300" cy="80" r="210" strokeDasharray="12 10" />
      <circle cx="300" cy="80" r="7" fill="var(--on-dark)" fillOpacity=".25" />
    </svg>
  );
}

/** Green Match Centre header with its own section menu. */
export function McHead({ active, eyebrow, title, extra, children }: { active: string; eyebrow?: ReactNode; title: ReactNode; extra?: ReactNode; children?: ReactNode }) {
  return (
    <section className="phead mc-head">
      <Lines />
      <p className="eyebrow">
        Match Centre{eyebrow ? <> · {eyebrow}</> : null}
      </p>
      <div className="sec-head">
        <h1>{title}</h1>
        {extra}
      </div>
      {children}
      <nav className="subnav" aria-label="Match Centre">
        {ITEMS.map(([k, label, href]) => (
          <Link key={k} href={href} aria-current={k === active ? 'page' : undefined}>
            {label}
          </Link>
        ))}
      </nav>
    </section>
  );
}
