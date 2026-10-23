'use client';

// UploadForm: drop-in CNIC + selfie verification form.
// Usage: <VerificationUpload /> on any page behind auth.
// Flow: upload → insert row (pending) → AI OCR + face-match → status saved to Supabase.

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import useSelfieCapture from './useSelfieCapture';
import useVerification from './useVerification';
import AiResultBanner from './AiResultBanner';
import VerificationStatus from './VerificationStatus';

export default function VerificationUpload() {
  const t = useTranslations('Verification');
  const tc = useTranslations('Common');
  const [docType, setDocType] = useState<'cnic' | 'driving_license'>('cnic');
  const [doc, setDoc] = useState<File | null>(null);
  const [license, setLicense] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const selfie = useSelfieCapture();
  const verify = useVerification();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!doc) { setFormError(t('errors.noFile')); return; }
    if (docType === 'driving_license' && !license) { setFormError(t('errors.noFile')); return; }
    if (!selfie.file) { setFormError(t('errors.noFile')); return; }
    await verify.submit({
      doc: docType === 'cnic' ? doc : license!,
      docType,
      selfie: selfie.file,
      license: docType === 'driving_license' ? license : null,
    });
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block mb-1 font-medium">{t('fields.docType')}</label>
          <div className="flex gap-2">
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="doc" checked={docType === 'cnic'} onChange={() => setDocType('cnic')} />
              <span>{t('docTypes.cnic')}</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="doc" checked={docType === 'driving_license'} onChange={() => setDocType('driving_license')} />
              <span>{t('docTypes.drivingLicense')}</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block mb-1 font-medium">{t('fields.upload')}</label>
          <input type="file" accept="image/*" onChange={(e) => setDoc(e.target.files?.[0] ?? null)} />
        </div>

        {docType === 'driving_license' && (
          <div>
            <label className="block mb-1 font-medium">{t('fields.upload')}</label>
            <input type="file" accept="image/*" onChange={(e) => setLicense(e.target.files?.[0] ?? null)} />
          </div>
        )}

        <div>
          <label className="block mb-1 font-medium">{t('fields.selfie')}</label>
          <input type="file" accept="image/*" onChange={selfie.onChange} />
          {selfie.preview && (
            <img src={selfie.preview} alt="selfie preview" className="mt-2 w-32 h-32 object-cover rounded" />
          )}
        </div>

        {(formError || verify.error) && (
          <div className="text-sm text-red-600">{formError ?? verify.error}</div>
        )}

        <button
          type="submit"
          disabled={verify.loading}
          className="px-4 py-2 bg-sky-600 text-white rounded disabled:opacity-50"
        >
          {verify.loading ? tc('loading') : t('submit')}
        </button>
      </form>

      <AiResultBanner result={verify.result} />

      <div>
        <h2 className="text-lg font-semibold">{t('currentStatus.title')}</h2>
        <VerificationStatus />
      </div>
    </div>
  );
}