'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export interface StripMatch {
  id: number;
  home: string;
  away: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  time: string; // kick-off, Nigerian time
  clock: string; // Q2 · 7′, Half time, FT
}

/** Today's matches under the masthead. While any match is live it refreshes every 30 seconds. */
export function LiveStrip({ initial }: { initial: StripMatch[] }) {
  const [list, setList] = useState(initial);
  const anyLive = list.some((m) => m.status === 'live' || m.status === 'break' || m.status === 'shootout');
  useEffect(() => {
    if (!anyLive) return;
    const t = setInterval(async () => {
      try {
        const r = await fetch('/api/today', { cache: 'no-store' });
        if (r.ok) setList((await r.json()) as StripMatch[]);
      } catch {
        /* keep the last scores */
      }
    }, 30_000);
    return () => clearInterval(t);
  }, [anyLive]);
  if (!list.length) return null;
  return (
    <div className="strip" aria-label="Today’s matches">
      <div className="wrap">
        <span className="lbl">{anyLive ? 'Live and today' : 'Today'}</span>
        {list.map((m) => {
          const live = m.status === 'live' || m.status === 'shootout';
          const started = m.status !== 'scheduled' && m.status !== 'postponed';
          return (
            <Link key={m.id} className={`pill${live ? ' is-live' : ''}`} href={`/match-centre/matches/${m.id}`}>
              {m.home} {started ? <b>{m.homeScore ?? 0}–{m.awayScore ?? 0}</b> : <span>v</span>} {m.away}
              <em>{started ? m.clock : m.time}</em>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
