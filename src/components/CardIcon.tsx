// A green, yellow or red card. Each card carries its letter (G, Y, R) and an outline,
// so it reads without relying on colour (site.css .cd).
const NAMES: Record<string, string> = { green: 'Green card', yellow: 'Yellow card', red: 'Red card' };

export function CardIcon({ c, label, decorative }: { c: string; label?: string; decorative?: boolean }) {
  if (decorative) return <span className={`cd ${c}`} aria-hidden="true" />;
  const name = label ?? NAMES[c] ?? 'Card';
  return <span className={`cd ${c}`} role="img" aria-label={name} title={name} />;
}
