import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { newsById } from '@/lib/news';
import { param } from '@/lib/format';
import { ActionForm } from '@/components/ActionForm';
import { deleteNews, saveNews } from '../actions';
import { NewsFields } from '../NewsFields';

export const metadata: Metadata = { title: 'Edit story' };

export default async function EditStory({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const postId = Number((await params).id);
  await requireUser(['media'], `/admin/news/${postId}`);
  if (!Number.isInteger(postId) || postId <= 0) notFound();
  const n = await newsById(postId);
  if (!n) notFound();
  const created = param((await searchParams).created);
  return (
    <div className="stack">
      <div className="row between">
        <h1>Edit story</h1>
        <Link href={`/news/${n.slug}`}>{n.status === 'published' ? 'View on the site' : 'Preview'}</Link>
      </div>
      {created && <div className="note ok">Story saved.</div>}
      <div className="panel">
        <ActionForm action={saveNews.bind(null, n.id)} submit="Save changes">
          <NewsFields n={n} />
        </ActionForm>
      </div>
      <form action={deleteNews} className="panel row between">
        <input type="hidden" name="post" value={n.id} />
        <label className="field">
          Type delete to remove this story for good
          <input name="confirm" autoComplete="off" />
        </label>
        <button className="btn danger" type="submit">
          <span>Delete story</span>
        </button>
      </form>
    </div>
  );
}
