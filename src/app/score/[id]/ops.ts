// What the scorer app sends. Each operation carries a ref made on the device, so a
// resend after a dropped connection is recognised and not applied twice.

export type GoalType = 'FG' | 'PC' | 'PS';
export type Card = 'green' | 'yellow' | 'red';

export type Op =
  | { ref: string; type: 'squad'; teamId: number; players: { playerId: number; shirt: number | null; gk: boolean; captain: boolean }[] }
  | { ref: string; type: 'start'; period: number; at: string }
  | { ref: string; type: 'end'; period: number; at: string }
  | { ref: string; type: 'goal'; teamId: number; playerId: number | null; goalType: GoalType; period: number; second: number }
  | { ref: string; type: 'card'; teamId: number; playerId: number; card: Card; period: number; second: number }
  | { ref: string; type: 'void'; target: string }
  | { ref: string; type: 'shootout'; home: number; away: number }
  | { ref: string; type: 'finish' };

export interface ScorerEvent {
  ref: string;
  teamId: number;
  playerId: number | null;
  kind: 'goal' | 'card';
  goalType: GoalType | null;
  card: Card | null;
  period: number | null;
  second: number | null;
}

export interface ScorerState {
  status: string;
  period: number;
  periodStartedAt: string | null;
  homeScore: number;
  awayScore: number;
  homeShootout: number | null;
  awayShootout: number | null;
  events: ScorerEvent[];
  squads: Record<number, number[]>; // teamId -> playerIds
}

export type SyncResult =
  | { ok: true; applied: string[]; rejected: { ref: string; message: string }[]; state: ScorerState }
  | { ok: false; locked: string };

export const REF_RE = /^[A-Za-z0-9-]{8,64}$/;
