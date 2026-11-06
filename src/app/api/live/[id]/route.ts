// Live score feed for one match, as server-sent events. ?poll=1 returns one JSON
// snapshot instead, for hosts where long-lived connections are cut.
import { liveSnapshot, type EventView } from '@/lib/queries';
import { subscribe } from '@/lib/live';
import { publicName } from '@/lib/format';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const nameOf = (e: EventView) => (e.firstName && e.lastName ? publicName({ firstName: e.firstName, lastName: e.lastName, isMinor: e.isMinor }) : null);

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const matchId = Number(id);
  if (!Number.isInteger(matchId) || matchId <= 0) return new Response('Not found', { status: 404 });
  const first = await liveSnapshot(matchId, nameOf);
  if (!first) return new Response('Not found', { status: 404 });

  if (new URL(req.url).searchParams.has('poll')) {
    return Response.json(first, { headers: { 'Cache-Control': 'no-store' } });
  }

  const enc = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let open = true;
      const write = (chunk: string) => {
        if (!open) return;
        try {
          controller.enqueue(enc.encode(chunk));
        } catch {
          open = false;
        }
      };
      const send = (data: unknown) => write(`event: snapshot\ndata: ${JSON.stringify(data)}\n\n`);
      write('retry: 5000\n\n');
      send(first);

      // Several changes can arrive close together; fetch once more after the last one.
      let busy = false;
      let again = false;
      const refresh = async () => {
        if (busy) {
          again = true;
          return;
        }
        busy = true;
        try {
          do {
            again = false;
            const s = await liveSnapshot(matchId, nameOf);
            if (s) send(s);
          } while (again && open);
        } catch (e) {
          console.error('live snapshot failed', e);
        } finally {
          busy = false;
        }
      };
      const unsubscribe = subscribe((n) => {
        if (n.match === matchId) void refresh();
      });
      const beat = setInterval(() => write(': ping\n\n'), 25_000);
      cleanup = () => {
        open = false;
        unsubscribe();
        clearInterval(beat);
      };
      req.signal.addEventListener('abort', () => {
        cleanup();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
