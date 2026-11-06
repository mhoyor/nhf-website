import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { nationalTeam } from '@/content/national';
import { PageHead } from '@/components/site';
import { Honours, ResultsTable } from '@/components/national';

type Props = { params: Promise<{ team: string }> };

const SLOT: Record<string, string> = { men: 'team-men', women: 'team-women', u18: 'team-u18' };
const title = (name: string) => `Nigeria ${name.toLowerCase().replace('u18', 'U18')}`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = nationalTeam((await params).team);
  return { title: t ? title(t.name) : 'National team' };
}

export default async function TeamPage({ params }: Props) {
  const t = nationalTeam((await params).team);
  if (!t) notFound();
  return (
    <div className="wrap page">
      <PageHead
        eyebrow={
          <Link href="/national-teams" style={{ color: 'inherit' }}>
            National teams
          </Link>
        }
        title={title(t.name)}
        lede={t.honours[0]}
        photo={{ slot: SLOT[t.slug] }}
      />
      <div className="tiles">
        {t.rank ? (
          <>
            <div className="tile">
              <b>{t.rank}</b>
              <span>FIH world ranking</span>
            </div>
            <div className="tile">
              <b>{t.points}</b>
              <span>Ranking points</span>
            </div>
            <div className="tile">
              <b style={{ fontSize: 24 }}>{t.note}</b>
            </div>
          </>
        ) : (
          <>
            <div className="tile">
              <b>3rd</b>
              <span>Girls, Youth Africa Cup 2026</span>
            </div>
            <div className="tile">
              <b>3rd</b>
              <span>Boys, Youth Africa Cup 2026</span>
            </div>
          </>
        )}
      </div>
      <section className="cols">
        <div className="stack">
          <h2>Recent results</h2>
          <ResultsTable team={t} />
        </div>
        <div className="stack">
          <h2>Honours and records</h2>
          <Honours items={t.honours} />
          <h2>Squad</h2>
          <div className="empty">The current squad, staff and call-ups will appear here once NHF publishes them.</div>
        </div>
      </section>
    </div>
  );
}
