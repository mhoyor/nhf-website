'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { MENU } from '@/content/nav';
import { Stick } from './site';

export const openSearch = () => window.dispatchEvent(new Event('nhf:search'));

function groupFor(path: string): string | null {
  for (const g of MENU) for (const c of g.columns) for (const [, href] of c.links) if (href !== '/' && path.startsWith(href.split('#')[0])) return g.key;
  if (path.startsWith('/match-centre') || path.startsWith('/super-league')) return 'matches';
  if (path.startsWith('/national-teams') || path.startsWith('/stats')) return 'teams';
  if (path.startsWith('/news') || path.startsWith('/gallery')) return 'news';
  return null;
}

/** White masthead with full-width mega menus; a ball dribbles along its bottom edge as you scroll. */
export function Masthead() {
  const path = usePathname() ?? '/';
  const [menuOpen, setMenuOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const mast = useRef<HTMLElement>(null);
  const current = groupFor(path);

  useEffect(() => {
    setMenuOpen(false);
    setOpenGroup(null);
  }, [path]);

  useEffect(() => {
    const el = mast.current;
    if (!el) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
      el.style.setProperty('--p', `${(p * 100).toFixed(2)}%`);
      el.style.setProperty('--pn', p.toFixed(4));
      el.style.setProperty('--rot', `${(scrollY * 0.9).toFixed(0)}deg`);
      el.style.setProperty('--po', scrollY > 40 ? '1' : '0');
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    return () => {
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [path]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenGroup(null);
        setMenuOpen(false);
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);

  return (
    <header className={`mast${menuOpen ? ' open' : ''}`} ref={mast}>
      <div className="wrap mast-in">
        <Link className="logo" href="/" aria-label="Nigeria Hockey Federation home">
          <img src="/nhf-logo.png" alt="Nigeria Hockey Federation" width={240} height={133} />
        </Link>
        <nav className="nav" id="nav" aria-label="Main">
          {MENU.map((g) => (
            <div
              key={g.key}
              className={`nav-item${openGroup === g.key ? ' open' : ''}`}
              onMouseLeave={() => {
                if (openGroup === g.key && window.matchMedia('(min-width: 1101px)').matches) setOpenGroup(null);
              }}
            >
              <button
                className="nav-top"
                type="button"
                aria-expanded={openGroup === g.key}
                aria-current={current === g.key ? 'page' : undefined}
                onClick={() => setOpenGroup(openGroup === g.key ? null : g.key)}
              >
                {g.label}
                <svg viewBox="0 0 10 10" aria-hidden="true">
                  <path d="M1.5 3.5 5 7l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
                </svg>
              </button>
              <div className="mega">
                <div className="wrap mega-in">
                  <div className="mega-lead">
                    <b>{g.lead}</b>
                    <p>{g.text}</p>
                  </div>
                  <div className="mega-cols">
                    {g.columns.map((c) => (
                      <div className="mega-col" key={c.title}>
                        <h4>{c.title}</h4>
                        {c.links.map(([label, href]) => (
                          <Link key={label} href={href} onClick={() => setOpenGroup(null)}>
                            {label}
                          </Link>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </nav>
        <div className="mast-cta">
          <button className="icon-btn" type="button" aria-label="Search the site" onClick={openSearch}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>
          </button>
          <Link className="btn primary mc-btn" href="/match-centre">
            <Stick />
            <span>Match Centre</span>
          </Link>
          <button className="menu-btn" type="button" aria-expanded={menuOpen} aria-controls="nav" onClick={() => setMenuOpen(!menuOpen)}>
            <i />
            Menu
          </button>
        </div>
      </div>
      <div className="progress" aria-hidden="true">
        <i />
        <b />
      </div>
    </header>
  );
}
