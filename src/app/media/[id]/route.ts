// Photos uploaded in the admin. A stored file never changes, so it can be cached for a year.
import { sql } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) return new Response('Not found', { status: 404 });
  const [row] = await sql<{ contentType: string; bytes: Uint8Array }[]>`select content_type, bytes from media where id = ${id}`;
  if (!row) return new Response('Not found', { status: 404 });
  return new Response(row.bytes as unknown as BodyInit, {
    headers: {
      'Content-Type': row.contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
