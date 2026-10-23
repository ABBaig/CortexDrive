'use client';

// Verification page — now a thin wrapper around the drop-in kit components
// (UploadForm handles upload + AI verify + status persistence).

import React from 'react';
import { useTranslations } from 'next-intl';
import UploadForm from '@/modules/verification/UploadForm';

export default function VerificationPage() {
  const t = useTranslations('Verification');
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2">{t('title')}</h1>
      <p className="text-neutral-400 mb-4">{t('subtitle')}</p>
      <UploadForm />
    </div>
  );
}