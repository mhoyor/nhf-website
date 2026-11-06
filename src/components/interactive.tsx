'use client';

import { useEffect, useState } from 'react';

/** A card that turns over when tapped (the three cards on How hockey works). */
export function FlipCard({ tone, front, frontText, back, backText }: { tone: 'g' | 'y' | 'r'; front: string; frontText: string; back: string; backText: string }) {
  const [on, setOn] = useState(false);
  return (
    <button className={`flip ${tone}`} type="button" aria-pressed={on} onClick={() => setOn(!on)}>
      <span className="flip-in">
        <span className="face front">
          <b>{front}</b>
          <span>{frontText}</span>
        </span>
        <span className="face back">
          <b>{back}</b>
          <span>{backText}</span>
        </span>
      </span>
    </button>
  );
}

/** Photo gallery with a full-size view; arrow keys move between photos. */
export function Gallery({ items }: { items: { src: string; caption: string; credit: string }[] }) {
  const [i, setI] = useState<number | null>(null);
  useEffect(() => {
    if (i === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setI(null);
      if (e.key === 'ArrowRight') setI((x) => (x === null ? x : (x + 1) % items.length));
      if (e.key === 'ArrowLeft') setI((x) => (x === null ? x : (x - 1 + items.length) % items.length));
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [i, items.length]);
  const cur = i === null ? null : items[i];
  return (
    <>
      <div className="gallery">
        {items.map((g, k) => (
          <button key={g.src + k} type="button" className="reveal" style={{ ['--d' as string]: `${0.04 * (k % 3)}s` }} onClick={() => setI(k)}>
            <img src={g.src} alt={g.caption} loading="lazy" />
            <figcaption>{g.caption}</figcaption>
          </button>
        ))}
      </div>
      <div className="lightbox" hidden={!cur} role="dialog" aria-modal="true" aria-label="Photo" onClick={(e) => e.target === e.currentTarget && setI(null)}>
        {cur && (
          <>
            <img src={cur.src} alt={cur.caption} />
            <p>
              {cur.caption}
              {cur.credit ? ` · ${cur.credit}` : ''}
            </p>
            <div className="lb-bar">
              <button className="btn light sm" type="button" onClick={() => setI(((i ?? 0) - 1 + items.length) % items.length)}>
                Previous
              </button>
              <button className="btn light sm" type="button" onClick={() => setI(null)}>
                Close
              </button>
              <button className="btn light sm" type="button" onClick={() => setI(((i ?? 0) + 1) % items.length)}>
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
