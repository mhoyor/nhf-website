import Link from 'next/link';
import type { Metadata } from 'next';
import { latestNews } from '@/lib/news';
import { NewsTile } from '@/components/news-blocks';
import { PageHead } from '@/components/site';
import { intParam } from '@/lib/format';

export const metadata: Metadata = { title: 'News' };

const PAGE = 18;

export default async function NewsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const page = intParam((await searchParams).page) ?? 1;
  const list = await latestNews(PAGE + 1, (page - 1) * PAGE);
  const shown = list.slice(0, PAGE);
  return (
    <div className="wrap page">
      <PageHead eyebrow="News and media" title="News" lede="Match reports, call-ups and stories from Nigerian hockey." />
      {shown.length ? (
        <div className="ngrid">
          {shown.map((n, i) => (
            <NewsTile key={n.slug} n={n} big={page === 1 && i === 0} delay={0.05 * (i % 3)} />
          ))}
        </div>
      ) : (
        <div className="empty">No stories yet.</div>
      )}
      {(page > 1 || list.length > PAGE) && (
        <div className="pager">
          {page > 1 ? <Link href={`/news?page=${page - 1}`}>Newer stories</Link> : <span />}
          <span className="small muted">Page {page}</span>
          {list.length > PAGE ? <Link href={`/news?page=${page + 1}`}>Older stories</Link> : <span />}
        </div>
      )}
    </div>
  );
}
