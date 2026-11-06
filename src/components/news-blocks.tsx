import Link from 'next/link';
import type { NewsPost } from '@/lib/news';
import { artFor, Photo, relDate, rv } from './site';

export function NewsTile({ n, big, delay = 0 }: { n: NewsPost; big?: boolean; delay?: number }) {
  const r = rv(delay);
  return (
    <Link className={`ptile${big ? ' big' : ''} ${r.className}`} style={r.style} href={`/news/${n.slug}`}>
      <Photo src={n.photoUrl} alt={n.photoAlt ?? undefined} position={n.photoPosition} credit={n.photoCredit} art={artFor(n)} slot={n.photoUrl ? undefined : `news-${n.slug}`} />
      <span className="date">{relDate(n.publishedOn, n.dateText)}</span>
      <div className="cap">
        <div className="tags">
          {(n.tags.length ? n.tags : [n.section]).map((t) => (
            <span key={t} className="tagp">
              {t}
            </span>
          ))}
        </div>
        <h3>{n.title}</h3>
        {big && <p>{n.summary}</p>}
      </div>
    </Link>
  );
}

export function Headline({ n }: { n: NewsPost }) {
  return (
    <Link className="hl" href={`/news/${n.slug}`}>
      <Photo src={n.photoUrl} alt="" position={n.photoPosition} credit="" art={artFor(n)} slot={n.photoUrl ? undefined : `news-${n.slug}`} />
      <span>
        <span>
          {relDate(n.publishedOn, n.dateText)} · {n.section}
        </span>
        <b>{n.title}</b>
      </span>
    </Link>
  );
}
