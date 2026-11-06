import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Anton, Barlow } from 'next/font/google';
import './site.css';
import './mc.css';

const anton = Anton({ subsets: ['latin'], weight: '400', variable: '--font-anton', display: 'swap' });
const barlow = Barlow({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-barlow', display: 'swap' });

// Scores change during matches, so every page reads the database when it is requested.
export const dynamic = 'force-dynamic';

/** The site's public address: SITE_URL once the domain is set, else the address Render gives it. */
function siteUrl(): URL {
  for (const u of [process.env.SITE_URL, process.env.RENDER_EXTERNAL_URL]) {
    try {
      if (u) return new URL(u.includes('://') ? u : `https://${u}`);
    } catch {
      // not a valid address: try the next one
    }
  }
  return new URL('http://localhost:3000');
}

/** A trial copy (NHF_DEMO_DATA=true) is kept out of search engines. */
const trial = process.env.NHF_DEMO_DATA === 'true';

export const metadata: Metadata = {
  title: { default: 'Nigeria Hockey Federation', template: '%s · Nigeria Hockey Federation' },
  description: 'The Nigeria Hockey Federation: news, national teams, the Super League, and the Match Centre with live scores, tables, clubs and player statistics.',
  metadataBase: siteUrl(),
  ...(trial ? { robots: { index: false, follow: false } } : {}),
  icons: { icon: '/nhf-logo.png' },
  openGraph: { siteName: 'Nigeria Hockey Federation', type: 'website', locale: 'en_NG' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#00341F',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-NG" className={`${anton.variable} ${barlow.variable}`}>
      <body>{children}</body>
    </html>
  );
}
