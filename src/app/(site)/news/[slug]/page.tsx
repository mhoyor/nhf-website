import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { latestNews, newsBySlug, paragraphs } from '@/lib/news';
import { can, currentUser } from '@/lib/auth';
import { NewsTile } from '@/components/news-blocks';
import { Photo } from '@/components/site';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const n = await newsBySlug((await params).slug);
  if (!n) return { title: 'News' };
  return {
    title: n.title,
    description: n.summary,
    openGraph: { title: n.title, description: n.summary, type: 'article', images: n.photoUrl ? [{ url: n.photoUrl }] : undefined },
  };
}

export default async function Article({ params }: Props) {
  const { slug } = await params;
  const user = await currentUser();
  const n = await newsBySlug(slug, can(user, 'media'));
  if (!n) notFound();
  const more = await latestNews(3, 0, n.slug);
  const date = n.dateText ?? new Date(`${n.publishedOn}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <div className="wrap page">
      <section className="phead photo sentence" style={{ minHeight: 440 }}>
        <Photo src={n.photoUrl} slot={n.photoUrl ? undefined : `news-${n.slug}`} alt={n.photoAlt ?? ''} position={n.photoPosition} credit={n.photoCredit} eager />
        <div className="crumbs">
          <Link href="/news">News</Link>
          <span>/</span>
          <span>{n.section}</span>
        </div>
        <div className="tags">
          {n.tags.map((t) => (
            <span key={t} className="tagp">
              {t}
            </span>
          ))}
        </div>
        <h1>{n.title}</h1>
        <p className="eyebrow">
          {date}
          {n.status === 'draft' && ' · draft, only staff can see this'}
        </p>
      </section>
      <section>
        <p className="lede" style={{ fontSize: 21, color: 'var(--ink)', fontWeight: 600 }}>
          {n.summary}
        </p>
        <div className="prose">
          {paragraphs(n.body).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        {n.sources.length > 0 && (
          <div className="stack" style={{ gap: 6 }}>
            <h3>Sources</h3>
            {n.sources.map(([t, u]) => (
              <a key={u} className="small" href={u} target="_blank" rel="noopener noreferrer">
                {t}
              </a>
            ))}
          </div>
        )}
        {can(user, 'media') && (
          <p className="small">
            <Link href={`/admin/news/${n.id}`}>Edit this story</Link>
          </p>
        )}
      </section>
      {more.length > 0 && (
        <section>
          <h2>More news</h2>
          <div className="ngrid">
            {more.map((x) => (
              <NewsTile key={x.slug} n={x} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
