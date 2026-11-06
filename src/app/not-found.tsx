import Link from 'next/link';
import { MiniHeader } from '@/components/MiniHeader';

export default function NotFound() {
  return (
    <>
      <MiniHeader title="Not found" />
      <div className="wrap page" style={{ maxWidth: 720 }}>
        <section className="phead">
          <p className="eyebrow">404</p>
          <h1>Page not found</h1>
          <p className="lede">That page does not exist, or it is not published yet.</p>
        </section>
        <div className="btnrow">
          <Link className="btn primary" href="/">
            <span>Home</span>
          </Link>
          <Link className="btn" href="/match-centre">
            <span>Match Centre</span>
          </Link>
          <Link className="btn" href="/news">
            <span>News</span>
          </Link>
        </div>
      </div>
    </>
  );
}
