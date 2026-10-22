'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';

export default function BackButton() {
  const router = useRouter();
  const locale = useLocale();

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    try {
      if (typeof window !== 'undefined' && window.history && window.history.length > 1) {
        router.back();
      } else {
        router.push(`/${locale}/dashboard`);
      }
    } catch (err) {
      // fallback
      router.push(`/${locale}/dashboard`);
    }
  }

  return (
    <button
      onClick={handleClick}
      aria-label="Back"
      className="inline-flex items-center gap-2 px-2 py-1 rounded hover:bg-neutral-700"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      <span className="text-sm">Back</span>
    </button>
  );
}