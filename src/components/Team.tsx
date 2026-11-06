import Link from 'next/link';

/** A club's crest: the uploaded image if there is one, otherwise its code on its colour. */
export function Crest({ code, colour, size, src }: { code: string | null; colour: string | null; size?: 'sm' | 'lg' | 'xl'; src?: string | null }) {
  if (!code) return <span className={`crest tbd lt${size ? ` ${size}` : ''}`} aria-hidden="true">?</span>;
  if (src) return <img className={`crest img${size ? ` ${size}` : ''}`} src={src} alt="" aria-hidden="true" loading="lazy" decoding="async" />;
  return (
    <span className={`crest${size ? ` ${size}` : ''}`} style={{ ['--c' as string]: colour ?? 'var(--green)' }} aria-hidden="true">
      {code.slice(0, 3)}
    </span>
  );
}

export function Team({
  name,
  code,
  colour,
  clubSlug,
  placeholder,
  link = true,
  size = 'sm',
  crest,
}: {
  name: string | null;
  code: string | null;
  colour: string | null;
  clubSlug?: string | null;
  placeholder?: string;
  link?: boolean;
  size?: 'sm' | 'lg';
  crest?: string | null;
}) {
  if (!name) {
    return (
      <span className="team">
        <Crest code={null} colour={null} size={size} />
        <span className="tname slot">{placeholder ?? 'To be decided'}</span>
      </span>
    );
  }
  const inner = (
    <>
      <Crest code={code} colour={colour} size={size} src={crest} />
      <span className="tname">{name}</span>
    </>
  );
  return link && clubSlug ? (
    <Link className="team" href={`/match-centre/clubs/${clubSlug}`}>
      {inner}
    </Link>
  ) : (
    <span className="team">{inner}</span>
  );
}
