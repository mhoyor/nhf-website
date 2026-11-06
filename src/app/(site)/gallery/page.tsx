import type { Metadata } from 'next';
import { GALLERY, creditFor } from '@/content/photos';
import { latestNews } from '@/lib/news';
import { PageHead } from '@/components/site';
import { Gallery } from '@/components/interactive';

export const metadata: Metadata = { title: 'Photo gallery' };

export default async function GalleryPage() {
  // Photos uploaded with news stories join the gallery automatically.
  const news = await latestNews(30);
  const seen = new Set(GALLERY.map((g) => g.src));
  const fromNews = news
    .filter((n) => n.photoUrl && !seen.has(n.photoUrl))
    .map((n) => ({ src: n.photoUrl!, caption: n.photoAlt || n.title, credit: n.photoCredit ?? '' }));
  const items = [...fromNews, ...GALLERY.map((g) => ({ ...g, credit: creditFor(g.src) }))];
  return (
    <div className="wrap page">
      <PageHead eyebrow="News and media" title="Photo gallery" lede="Photos from Nigerian hockey. Tap a photo to see it full size." photo={{ slot: 'gallery-hero' }} />
      <Gallery items={items} />
      <p className="src">U18 photos: National Sports Commission. Other credits are shown on each photo.</p>
    </div>
  );
}
