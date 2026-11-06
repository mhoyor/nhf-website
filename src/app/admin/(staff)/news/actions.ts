'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { sql, dbMessage } from '@/lib/db';
import { audit, requireUser } from '@/lib/auth';
import { slugify } from '@/lib/format';
import { bool, date, fail, id, text, type FormState } from '@/lib/forms';
import { readImage } from '@/lib/images';

/** "Label | value" or "Title | https://…" lines into pairs. */
function pairs(raw: string, urls = false): [string, string][] | string {
  const out: [string, string][] = [];
  for (const line of raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)) {
    const [a, ...rest] = line.split('|');
    const b = rest.join('|').trim();
    if (!a.trim() || !b) return `“${line}” needs a | between the two parts.`;
    if (urls && !/^https?:\/\/\S+$/.test(b)) return `“${b}” should be a web address starting with https://`;
    out.push([a.trim().slice(0, 120), b.slice(0, 400)]);
  }
  return out;
}

export async function saveNews(postId: number | null, _prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser(['media']);
  const title = text(form, 'title', 140);
  const slug = slugify(text(form, 'slug', 80) || title);
  const summary = text(form, 'summary', 400);
  const body = String(form.get('body') ?? '').trim().slice(0, 30000);
  const tags = text(form, 'tags', 200).split(',').map((t) => t.trim()).filter(Boolean).slice(0, 6);
  const section = text(form, 'section', 40) || tags[0] || 'News';
  const publishedOn = date(form, 'publishedOn');
  const status = text(form, 'status', 10) === 'published' ? 'published' : 'draft';
  const highlights = pairs(String(form.get('highlights') ?? ''));
  const sources = pairs(String(form.get('sources') ?? ''), true);
  const errors: string[] = [];
  if (title.length < 3) errors.push('Give the story a headline.');
  if (!slug) errors.push('Give the story a web address.');
  if (!publishedOn) errors.push('Enter the date as YYYY-MM-DD.');
  if (status === 'published' && !summary) errors.push('A published story needs a summary: it shows on the news tiles.');
  if (typeof highlights === 'string') errors.push(`Highlights: ${highlights}`);
  if (typeof sources === 'string') errors.push(`Sources: ${sources}`);

  // A new photo, if one was chosen.
  let photoUrl: string | null | undefined;
  const picked = await readImage(form, 'photo', 6, 'The photo');
  if (typeof picked === 'string') errors.push(picked);
  const upload = picked && typeof picked === 'object' ? picked : null;
  if (bool(form, 'removePhoto')) photoUrl = null;
  if (errors.length) return { errors };

  let savedId = postId;
  try {
    await sql.begin(async (tx) => {
      if (upload) {
        const [m] = await tx<{ id: number }[]>`
          insert into media (filename, content_type, bytes, created_by) values (${upload.name}, ${upload.type}, ${upload.bytes}, ${user.id}) returning id`;
        photoUrl = `/media/${m.id}`;
      }
      const featured = bool(form, 'featured');
      if (featured) await tx`update news_posts set featured = false where featured and id is distinct from ${postId}`;
      const values: Record<string, unknown> = {
        slug,
        title,
        summary,
        body,
        tags,
        section,
        publishedOn,
        dateText: text(form, 'dateText', 40) || null,
        photoAlt: text(form, 'photoAlt', 200) || null,
        photoCredit: text(form, 'photoCredit', 120) || null,
        photoPosition: /^\d{1,3}% \d{1,3}%$/.test(text(form, 'photoPosition', 9)) ? text(form, 'photoPosition', 9) : '50% 50%',
        heroTitle: text(form, 'heroTitle', 80) || null,
        highlights: JSON.stringify(highlights),
        sources: JSON.stringify(sources),
        status,
        featured,
      };
      if (photoUrl !== undefined) values.photoUrl = photoUrl;
      if (postId) {
        await tx`update news_posts set ${tx(values)} where id = ${postId}`;
      } else {
        const [row] = await tx<{ id: number }[]>`insert into news_posts ${tx({ ...values, createdBy: user.id })} returning id`;
        savedId = row.id;
      }
    });
  } catch (e) {
    const msg = (e as { constraint_name?: string }).constraint_name === 'news_posts_slug_key' ? 'Another story already uses that web address.' : dbMessage(e);
    return fail(msg);
  }
  await audit(user.id, postId ? 'news_updated' : 'news_created', 'news', savedId, { slug, status });
  revalidatePath('/');
  revalidatePath('/news');
  revalidatePath(`/news/${slug}`);
  if (!postId) redirect(`/admin/news/${savedId}?created=1`);
  return { ok: status === 'published' ? 'Saved and published.' : 'Saved as a draft. Only staff can see it.' };
}

export async function deleteNews(form: FormData): Promise<void> {
  const user = await requireUser(['media']);
  const postId = id(form, 'post');
  if (!postId || text(form, 'confirm', 10) !== 'delete') return;
  await sql`delete from news_posts where id = ${postId}`;
  await audit(user.id, 'news_deleted', 'news', postId);
  revalidatePath('/news');
  redirect('/admin/news');
}
