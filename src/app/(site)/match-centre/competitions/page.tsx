import Link from 'next/link';
import type { Metadata } from 'next';
import { competitions, currentSeason, seasonByName, seasons } from '@/lib/queries';
import { McHead } from '@/components/McHead';
import { CompetitionCards } from '@/components/mc-blocks';
import { param } from '@/lib/format';

export const metadata: Metadata = { title: 'Competitions' };

export default async function CompetitionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const all = await seasons();
  const chosen = (param(sp.season) && (await seasonByName(param(sp.season)))) || (await currentSeason());
  const list = await competitions(chosen?.id ?? null);
  return (
    <div className="wrap page">
      <McHead
        active="competitions"
        title="Competitions"
        extra={
          <div className="seg" role="group" aria-label="Season">
            {all.map((s) => (
              <Link key={s.id} href={`/match-centre/competitions?season=${s.name}`} aria-current={s.id === chosen?.id ? 'true' : undefined}>
                {s.name}
              </Link>
            ))}
          </div>
        }
      />
      <section>
        <h2>{chosen?.name ?? 'All seasons'}</h2>
        <CompetitionCards list={list} empty={`No competitions published for ${chosen?.name ?? 'this season'}.`} />
      </section>
    </div>
  );
}
