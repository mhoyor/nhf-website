// Pages on the website roadmap, at /coaching, /umpiring, /regulations and so on.
// Each one says what it will hold until its content is written.
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { PLANNED } from '@/content/pages';
import { Cta, PageHead } from '@/components/site';

type Props = { params: Promise<{ page: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = PLANNED[(await params).page];
  return { title: p?.title ?? 'Page', robots: { index: false } };
}

export default async function PlannedPage({ params }: Props) {
  const p = PLANNED[(await params).page];
  if (!p) notFound();
  return (
    <div className="wrap page">
      <PageHead eyebrow={`${p.group} · coming soon`} title={p.title} lede={`This page is in phase ${p.phase} of the NHF website. Here is what it will hold.`} />
      <div className="info-list">
        {p.items.map((x) => (
          <div key={x}>{x}</div>
        ))}
      </div>
      <div className="btnrow">
        <Cta href="/" kind="">
          Back to home
        </Cta>
        <Cta href="/how-hockey-works" kind="">
          How hockey works
        </Cta>
      </div>
    </div>
  );
}
