'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

interface Hit {
  t: string;
  h: string;
  k: string;
}

const POPULAR: Hit[] = [
  { t: 'How hockey works', h: '/how-hockey-works', k: 'Popular' },
  { t: 'Match Centre', h: '/match-centre', k: 'Popular' },
  { t: 'Super League', h: '/super-league', k: 'Popular' },
  { t: 'FIH rankings', h: '/stats', k: 'Popular' },
];

/** The search overlay and the floating "What are you looking for?" bar, after KNHB. */
export function SiteSearch() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [hideBar, setHideBar] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const show = () => {
      setOpen(true);
      setQ('');
      setHits(null);
      setTimeout(() => input.current?.focus(), 30);
    };
    addEventListener('nhf:search', show);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key === '/' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        show();
      }
    };
    addEventListener('keydown', onKey);
    return () => {
      removeEventListener('nhf:search', show);
      removeEventListener('keydown', onKey);
    };
  }, []);

  useEffect(() => setOpen(false), [path]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setHits(null);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        if (r.ok) setHits((await r.json()) as Hit[]);
      } catch {
        /* typing on, or offline */
      }
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  // The floating bar hides while scrolling down, near the footer, and whenever it would
  // sit on top of a table, a form or a list of matches. It is not shown at all in the
  // Match Centre, where pages are mostly tables (the masthead search button stays).
  const barOff = (path ?? '').startsWith('/match-centre');
  useEffect(() => {
    if (barOff) return;
    let last = scrollY;
    let frame = 0;
    const BUSY = 'table,.panel,form,.board,.round,.tlist,.mc3,.newsletter,.frow,.prose,.lede';
    const overContent = () =>
      document.elementsFromPoint(innerWidth / 2, innerHeight - 40).some((el) => !el.closest('.findbar') && el.closest(BUSY));
    const check = () => {
      frame = 0;
      const y = scrollY;
      const nearEnd = document.documentElement.scrollHeight - innerHeight - y < 160;
      if (nearEnd || overContent() || (y > last + 6 && y > 240)) setHideBar(true);
      else if (y < last - 6 || y < 240) setHideBar(false);
      last = y;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    check();
    addEventListener('scroll', onScroll, { passive: true });
    return () => {
      removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [barOff, path]);

  const list = hits ?? (q.trim().length < 2 ? POPULAR : []);
  return (
    <>
      <button className={`findbar${barOff ? ' off' : hideBar ? ' hide' : ''}`} type="button" aria-hidden={barOff || undefined} tabIndex={barOff ? -1 : undefined} onClick={() => dispatchEvent(new Event('nhf:search'))}>
        <span>What are you looking for?</span>
        <i>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4-4" />
          </svg>
        </i>
      </button>
      <div className="search" hidden={!open} onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
        <div className="search-box" role="dialog" aria-modal="true" aria-label="Search the site">
          <div className="top">
            <input ref={input} type="search" placeholder="Search news, clubs, players, pages" autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} />
            <button className="btn sm" type="button" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
          <div className="search-res">
            {q.trim().length < 2 && <p>Try “Super League”, “penalty corner”, “U18”, a club or a player.</p>}
            {list.map((r) => (
              <a key={r.h + r.t} href={r.h}>
                {r.t}
                <span>{r.k}</span>
              </a>
            ))}
            {hits && !hits.length && <p>No results for “{q.trim()}”. Try fewer words.</p>}
          </div>
        </div>
      </div>
    </>
  );
}
