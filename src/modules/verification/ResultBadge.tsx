'use client';

// ResultBadge: reusable verification status badge (pending / verified /
// needs_review / rejected). Drop-in component for any page.

import React from 'react';
import { useTranslations } from 'next-intl';

export type VerificationStatusValue =
  | 'pending' | 'verified' | 'needs_review' | 'rejected' | 'unavailable';

const CLS: Record<VerificationStatusValue, string> = {
  pending: 'bg-neutral-100 text-neutral-800 border-neutral-300',
  verified: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  needs_review: 'bg-amber-100 text-amber-800 border-amber-300',
  rejected: 'bg-red-100 text-red-800 border-red-300',
  unavailable: 'bg-slate-100 text-slate-800 border-slate-300',
};

export default function ResultBadge({
  status,
  size = 'md',
}: {
  status: string | null | undefined;
  size?: 'sm' | 'md';
}) {
  const t = useTranslations('Verification.status');
  if (!status) return null;
  const key = (['pending','verified','needs_review','rejected','unavailable'] as const)
    .includes(status as VerificationStatusValue)
    ? (status as VerificationStatusValue)
    : 'pending';
  const pad = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';
  const label =
    key === 'pending' ? t('pending') :
    key === 'verified' ? t('verified') :
    key === 'needs_review' ? t('needsReview') :
    key === 'rejected' ? t('rejected') :
    key === 'unavailable' ? t('needsReview') : status;
  return (
    <span className={`inline-block border rounded-full font-semibold ${pad} ${CLS[key]}`}>
      {label}
    </span>
  );
}