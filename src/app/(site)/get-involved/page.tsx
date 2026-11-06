import type { Metadata } from 'next';
import { Cta, ICONS, Photo, rv } from '@/components/site';

export const metadata: Metadata = { title: 'Get started' };

const ITEMS: [string, string, string, string, string][] = [
  ['play', 'Start playing', 'Try a session at a club, school or university team.', '/match-centre/clubs', 'Find a club'],
  ['school', 'Schools programme', 'Equipment and coaching support for schools.', '/schools', 'Read more'],
  ['team', 'Girls in hockey', 'Programmes that bring more girls into the game.', '/girls', 'Read more'],
  ['whistle', 'Umpiring', 'Courses, grades and the national panel.', '/umpiring', 'Read more'],
  ['learn', 'Coaching courses', 'Course dates, grades and the FIH Academy.', '/coaching', 'Read more'],
  ['hand', 'Partner with NHF', 'Packages for the national teams and the Super League.', '/sponsorship', 'Read more'],
];

export default function GetInvolved() {
  return (
    <div className="wrap page">
      <section className="campaign" style={{ minHeight: 420 }}>
        <Photo slot="campaign" art="campaign" />
        <div className="camp-in">
          <p className="eyebrow">Play hockey</p>
          <h1 style={{ fontSize: 'clamp(52px,8vw,110px)', lineHeight: 0.85 }}>Pick up a stick</h1>
          <p>New to hockey? See how the game works, then find a club near you.</p>
          <div className="btnrow">
            <Cta href="/how-hockey-works" kind="light">
              How hockey works
            </Cta>
            <Cta href="/match-centre/clubs" kind="ghost-light">
              Find a club
            </Cta>
          </div>
        </div>
      </section>
      <div className="rules">
        {ITEMS.map(([icon, t, d, href, label], k) => {
          const r = rv(0.05 * (k % 3));
          return (
            <div key={t} className={`rule ${r.className}`} style={r.style}>
              <span className="ic">{ICONS[icon]}</span>
              <h3>{t}</h3>
              <p>{d}</p>
              <div>
                <Cta href={href} kind="">
                  {label}
                </Cta>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
