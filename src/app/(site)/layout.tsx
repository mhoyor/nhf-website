import Link from 'next/link';
import type { ReactNode } from 'react';
import { Masthead } from '@/components/Masthead';
import { SiteSearch } from '@/components/SiteSearch';
import { SiteEffects } from '@/components/SiteEffects';
import { LiveStrip } from '@/components/LiveStrip';
import { stripMatches } from '@/lib/strip';
import { FOOTER, QUICK_LINKS } from '@/content/nav';

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const strip = await stripMatches().catch(() => []);
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      {process.env.NHF_DEMO_DATA === 'true' && (
        <div className="trial-bar" role="note">
          <div className="wrap">Trial copy for review. The clubs, players and results in the Match Centre are invented.</div>
        </div>
      )}
      <div className="util">
        <div className="wrap">
          <nav className="links" aria-label="Quick links">
            {QUICK_LINKS.map(([l, h]) => (
              <Link key={h} href={h}>
                {l}
              </Link>
            ))}
            <a href="https://www.fih.hockey/" target="_blank" rel="noopener noreferrer">
              FIH
            </a>
            <a href="https://www.africahockey.org/" target="_blank" rel="noopener noreferrer">
              AfHF
            </a>
          </nav>
          <div className="tools">
            <Link href="/alerts">WhatsApp alerts</Link>
            <Link href="/admin">Staff sign-in</Link>
          </div>
        </div>
      </div>
      <Masthead />
      <LiveStrip initial={strip} />
      <main id="main">{children}</main>
      <footer className="foot">
        <div className="wrap">
          <div className="foot-top">
            <Link className="logo" href="/" aria-label="Nigeria Hockey Federation home">
              <img src="/nhf-logo.png" alt="Nigeria Hockey Federation" width={240} height={133} loading="lazy" />
            </Link>
            <p>
              The governing body for field, indoor and Hockey5s hockey in Nigeria. Member of the International Hockey Federation (FIH) and the African Hockey Federation (AfHF).
            </p>
          </div>
          <div className="fgrid">
            {FOOTER.map((c) => (
              <div key={c.title}>
                <b>{c.title}</b>
                {c.links.map(([l, h]) => (
                  <Link key={l} href={h}>
                    {l}
                  </Link>
                ))}
              </div>
            ))}
            <div>
              <b>Contact</b>
              <span>National Stadium, Package B</span>
              <span>Abuja, Nigeria</span>
              <span>Email listed by FIH: nighockey@yahoo.com</span>
            </div>
          </div>
          <p className="fnote">
            Match Centre results are entered by NHF scorers and competition managers; a result marked unconfirmed is still being checked against the scoresheet. National
            team results and FIH rankings come from FIH, AfHF and tournament records. U18 Youth Africa Cup photos: National Sports Commission.
          </p>
        </div>
      </footer>
      <SiteSearch />
      <SiteEffects />
    </>
  );
}
