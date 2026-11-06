import Link from 'next/link';

export function MiniHeader({ title, back = '/' }: { title: string; back?: string }) {
  return (
    <header className="mini">
      <div className="wrap">
        <Link className="logo" href="/" aria-label="Nigeria Hockey Federation home">
          <img src="/nhf-logo.png" alt="" width={65} height={36} style={{ background: '#fff', borderRadius: 4, padding: 2 }} />
        </Link>
        <b>{title}</b>
        <nav className="right" aria-label="Site">
          <Link href={back}>Website</Link>
          <Link href="/match-centre">Match Centre</Link>
        </nav>
      </div>
    </header>
  );
}
