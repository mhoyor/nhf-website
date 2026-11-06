// Live updates. The database sends NOTIFY match_live whenever a match row changes
// (db/002_logic.sql, matches_after_update). One LISTEN connection per server process
// fans the notifications out to every open live page.
//
// This needs a long-running Node server (next start on a VPS, Render, Railway, Fly).
// On serverless hosts the live page falls back to polling; see LiveScore.tsx.
import { sql } from './db';

export interface LiveNotice {
  match: number;
  competition: number;
  status: string;
}

type Listener = (n: LiveNotice) => void;

const g = globalThis as unknown as { __nhfLive?: { listeners: Set<Listener>; started: Promise<unknown> | null } };
const state = (g.__nhfLive ??= { listeners: new Set<Listener>(), started: null });

function start() {
  state.started = sql
    .listen('match_live', (payload: string) => {
      let n: LiveNotice;
      try {
        n = JSON.parse(payload) as LiveNotice;
      } catch {
        return;
      }
      for (const l of state.listeners) {
        try {
          l(n);
        } catch (e) {
          console.error('live listener failed', e);
        }
      }
    })
    .catch((e: unknown) => {
      console.error('LISTEN match_live failed; live pages will poll', e);
      state.started = null;
    });
}

export function subscribe(fn: Listener): () => void {
  state.listeners.add(fn);
  if (!state.started) start();
  return () => {
    state.listeners.delete(fn);
  };
}
