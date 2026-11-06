// For the host's health check and for people setting up the site: is the database reachable
// and up to date? 200 when it is, 503 when not. No secrets in the answer.
import { dbStatus } from '@/lib/migrate';

export const dynamic = 'force-dynamic';

export async function GET() {
  const s = await dbStatus();
  const ready = s.ok && s.pending.length === 0;
  return Response.json(
    { ok: ready, database: s.ok ? 'connected' : 'unreachable', pending: s.pending, administrator: s.admins > 0, ...(s.ok ? {} : { problem: s.error }) },
    { status: ready ? 200 : 503, headers: { 'cache-control': 'no-store' } },
  );
}
