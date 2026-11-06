// Reading form fields in server actions, and the state the forms show back.

export interface FormState {
  ok?: string;
  errors?: string[];
  warnings?: string[];
  /** Anything a form wants back, such as a preview of fixtures. */
  data?: unknown;
}

export function text(f: FormData, k: string, max = 200): string {
  return String(f.get(k) ?? '').trim().slice(0, max);
}

export function optText(f: FormData, k: string, max = 200): string | null {
  return text(f, k, max) || null;
}

/** A whole number, null when empty, NaN when not a whole number. */
export function int(f: FormData, k: string): number | null {
  const v = text(f, k, 20);
  if (!v) return null;
  const n = Number(v);
  return Number.isInteger(n) ? n : Number.NaN;
}

export function id(f: FormData, k: string): number | null {
  const n = int(f, k);
  return n !== null && n > 0 ? n : null;
}

export function bool(f: FormData, k: string): boolean {
  const v = f.get(k);
  return v === 'on' || v === 'true' || v === '1';
}

export function date(f: FormData, k: string): string | null {
  const v = text(f, k, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

export function oneOf<T extends string>(f: FormData, k: string, allowed: readonly T[]): T | null {
  const v = text(f, k, 40) as T;
  return allowed.includes(v) ? v : null;
}

export const fail = (...errors: string[]): FormState => ({ errors });
