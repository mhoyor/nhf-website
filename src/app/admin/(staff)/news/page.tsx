import Link from 'next/link';
import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { allNewsForAdmin } from '@/lib/news';
import { sql } from '@/lib/db';

export const metadata: Metadata = { title: 'News' };

export default async function AdminNews() {
  await requireUser(['media'], '/admin/news');
  const [list, [{ signups }]] = await Promise.all([
    allNewsForAdmin(),
    sql<{ signups: number }[]>`select count(*) as signups from newsletter_signups where unsubscribed_at is null`,
  ]);
  return (
    <div className="stack">
      <div className="row between">
        <h1>News</h1>
        <Link className="btn primary" href="/admin/news/new">
          <span>Write a story</span>
        </Link>
      </div>
      <p className="muted">
        Published stories appear on the home page and in News straight away. The lead story is the one marked for the home page, or else the newest. {signups} people have
        signed up for the newsletter.
      </p>
      <div className="panel scroll">
        <table className="tbl">
          <thead>
            <tr>
              <th></th>
              <th>Story</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {list.map((n) => (
              <tr key={n.id}>
                <td style={{ width: 80 }}>{n.photoUrl ? <img className="thumb" style={{ width: 64 }} src={n.photoUrl} alt="" /> : null}</td>
                <td>
                  <Link href={`/admin/news/${n.id}`}>{n.title}</Link>
                  <div className="small muted">
                    {n.section}
                    {n.featured ? ' · home page lead' : ''}
                  </div>
                </td>
                <td className="small" style={{ whiteSpace: 'nowrap' }}>
                  {n.dateText ?? n.publishedOn}
                </td>
                <td>{n.status === 'published' ? <span className="badge">Published</span> : <span className="badge warn">Draft</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
