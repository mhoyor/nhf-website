import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { MiniHeader } from '@/components/MiniHeader';

export const metadata: Metadata = { robots: { index: false } };

export default function ScoreShell({ children }: { children: ReactNode }) {
  return (
    <>
      <MiniHeader title="Live scorer" />
      {children}
    </>
  );
}
