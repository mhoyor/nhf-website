import Link from 'next/link';
import type { Metadata } from 'next';
import { Cta, PageHead, Photo, rv } from '@/components/site';

export const metadata: Metadata = { title: 'National teams' };

const TILES: [string, string, string][] = [
  ['team-men', 'Senior men', '/national-teams/men'],
  ['team-women', 'Senior women', '/national-teams/women'],
  ['team-u18g', 'U18 girls', '/national-teams/u18'],
  ['team-u18b', 'U18 boys', '/national-teams/u18'],
];

export default function NationalTeams() {
  return (
    <div className="wrap page">
      <PageHead eyebrow="National teams" title="Team Nigeria" lede="Squads, results and records for each national team. Rankings are in Stats and records." photo={{ slot: 'stats-hero' }} />
      <div className="teams4">
        {TILES.map(([slot, label, href], i) => {
          const r = rv(0.06 * i);
          return (
            <Link key={slot} className={`ttile ${r.className}`} style={r.style} href={href}>
              <Photo slot={slot} alt={label} />
              <div className="cap">
                <h3>{label}</h3>
                <span className="go">Results and squad</span>
              </div>
            </Link>
          );
        })}
      </div>
      <div className="btnrow">
        <Cta href="/stats">FIH rankings and records</Cta>
        <Cta href="/u21" kind="">
          Junior U21
        </Cta>
        <Cta href="/selection" kind="">
          Selection and call-ups
        </Cta>
      </div>
    </div>
  );
}
