import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { ActionForm } from '@/components/ActionForm';
import { saveNews } from '../actions';
import { NewsFields } from '../NewsFields';

export const metadata: Metadata = { title: 'Write a story' };

export default async function NewStory() {
  await requireUser(['media'], '/admin/news/new');
  return (
    <div className="stack">
      <h1>Write a story</h1>
      <div className="panel">
        <ActionForm action={saveNews.bind(null, null)} submit="Save story">
          <NewsFields />
        </ActionForm>
      </div>
    </div>
  );
}
