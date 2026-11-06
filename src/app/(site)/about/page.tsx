import type { Metadata } from 'next';
import { SOURCES } from '@/content/national';
import { PageHead, Photo, rv } from '@/components/site';

export const metadata: Metadata = { title: 'About NHF' };

const PEOPLE: [string, string, string][] = [
  ['Engr Simon Obadiah Nkom', 'President', 'FIH member profile'],
  ['Tunde Popoola', 'Vice-President', 'Leadership, 2026'],
  ['Mamman Salisu', 'Secretary General', 'FIH member profile; Wikipedia lists Chimezie Asiegbu, so NHF to confirm'],
  ['Mercy Alexandra', 'Chair, Marketing', 'Leadership, 2026'],
  ['Farouk Yohanna', 'Board member, former international', 'Leadership, 2026'],
];

const DOCS = ['Statutes', 'Code of ethics', 'Safeguarding policy', 'Anti-doping policy', 'Annual report 2025', 'Audited accounts 2025', 'Congress minutes'];

const initials = (n: string) =>
  n
    .replace(/^Engr /, '')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('');

export default function AboutPage() {
  return (
    <div className="wrap page">
      <PageHead
        eyebrow="About NHF"
        title="Nigeria Hockey Federation"
        lede="The governing body for field, indoor and Hockey5s hockey in Nigeria, and a member of the International Hockey Federation (FIH) and the African Hockey Federation (AfHF)."
      />
      <section className="split">
        <Photo slot="about" />
        <div className="txt">
          <p className="eyebrow">The federation</p>
          <h2>National Stadium, Abuja</h2>
          <div className="facts">
            <div>
              <span>Address</span>
              <b>National Stadium, Package B, Abuja</b>
            </div>
            <div>
              <span>Member of</span>
              <b>FIH, AfHF</b>
            </div>
            <div>
              <span>Email listed by FIH</span>
              <b>nighockey@yahoo.com</b>
            </div>
          </div>
        </div>
      </section>
      <section id="board">
        <h2>Board and secretariat</h2>
        <div className="rules">
          {PEOPLE.map(([n, role, src], i) => {
            const r = rv(0.05 * i);
            return (
              <div key={n} className={`rule ${r.className}`} style={r.style}>
                <span className="mono" style={{ width: 50, height: 50, fontSize: 17 }}>
                  {initials(n)}
                </span>
                <h3>{n}</h3>
                <p>
                  <b>{role}</b>
                </p>
                <p className="small">Source: {src}</p>
              </div>
            );
          })}
        </div>
        <p className="src">
          Sources:{' '}
          <a href={SOURCES.fihMember} target="_blank" rel="noopener noreferrer">
            FIH member profile
          </a>
          ,{' '}
          <a href={SOURCES.leadership} target="_blank" rel="noopener noreferrer">
            Leadership
          </a>
        </p>
      </section>
      <section className="cols even" id="contact">
        <div className="stack">
          <h2>Documents</h2>
          <div className="panel">
            <table className="tbl">
              <tbody>
                {DOCS.map((d) => (
                  <tr key={d}>
                    <td>{d}</td>
                    <td className="r">
                      <span className="chip pend">To be uploaded</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="stack">
          <h2>Contact</h2>
          <div className="panel pad">
            <div className="facts">
              <div>
                <span>Post</span>
                <b>National Stadium, Package B, Abuja</b>
              </div>
              <div>
                <span>Email listed by FIH</span>
                <b>nighockey@yahoo.com</b>
              </div>
            </div>
            <p className="small muted" style={{ marginTop: 10 }}>
              A contact form and phone numbers will be added once NHF confirms them.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
