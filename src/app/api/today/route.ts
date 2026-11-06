import { stripMatches } from '@/lib/strip';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json(await stripMatches(), { headers: { 'Cache-Control': 'no-store' } });
}
