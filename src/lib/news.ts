// News stories for the website, kept in the database and written in Admin → News.
import { sql } from './db';

export interface NewsPost {
  id: number;
  slug: string;
  title: string;
  summary: string;
  body: string;
  tags: string[];
  section: string;
  publishedOn: string;
  dateText: string | null;
  photoUrl: string | null;
  photoAlt: string | null;
  photoCredit: string | null;
  photoPosition: string;
  heroTitle: string | null;
  highlights: [string, string][];
  sources: [string, string][];
  status: 'draft' | 'published';
  featured: boolean;
  updatedAt: Date;
}

const cols = sql`
  id, slug, title, summary, body, tags, section, published_on, date_text, photo_url, photo_alt, photo_credit, photo_position,
  hero_title, highlights, sources, status, featured, updated_at`;

export async function latestNews(limit = 12, offset = 0, exceptSlug: string | null = null): Promise<NewsPost[]> {
  return sql<NewsPost[]>`
    select ${cols} from news_posts
     where status = 'published' and published_on <= current_date and (${exceptSlug}::text is null or slug <> ${exceptSlug})
     order by published_on desc, id desc limit ${limit} offset ${offset}`;
}

/** The home page hero: the featured story, or else the newest one. */
export async function featuredNews(): Promise<NewsPost | null> {
  const [n] = await sql<NewsPost[]>`
    select ${cols} from news_posts where status = 'published' and published_on <= current_date
     order by featured desc, published_on desc, id desc limit 1`;
  return n ?? null;
}

export async function newsBySlug(slug: string, includeDrafts = false): Promise<NewsPost | null> {
  const [n] = await sql<NewsPost[]>`
    select ${cols} from news_posts where slug = ${slug} and ((status = 'published' and published_on <= current_date) or ${includeDrafts})`;
  return n ?? null;
}

export async function newsById(id: number): Promise<NewsPost | null> {
  const [n] = await sql<NewsPost[]>`select ${cols} from news_posts where id = ${id}`;
  return n ?? null;
}

export async function allNewsForAdmin(): Promise<NewsPost[]> {
  return sql<NewsPost[]>`select ${cols} from news_posts order by status = 'draft' desc, published_on desc, id desc limit 500`;
}

export async function searchNews(q: string, limit = 8): Promise<{ slug: string; title: string; section: string }[]> {
  const like = `%${q.toLowerCase()}%`;
  return sql`
    select slug, title, section from news_posts
     where status = 'published' and (lower(title) like ${like} or lower(summary) like ${like} or exists (select 1 from unnest(tags) t where lower(t) like ${like}))
     order by published_on desc limit ${limit}`;
}

/** Paragraphs of a story body: separated by a blank line. */
export function paragraphs(body: string): string[] {
  return body
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.replace(/\s*\r?\n\s*/g, ' ').trim())
    .filter(Boolean);
}
