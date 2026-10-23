"use client";

// useVerification: uploads CNIC + selfie to private storage, inserts the
// verifications row, then triggers the AI check via /api/verification.

import { useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { AiResult } from './types';

export type DocType = 'cnic' | 'driving_license';

async function uploadToStorage(
  file: File,
  userId: string,
  namePrefix: string
): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  const ts = Date.now();
  // Path INSIDE the bucket (no bucket name prefix) — matches the Edge Function download path.
  const path = `${userId}/${namePrefix}-${ts}-${file.name}`;
  const { data, error } = await supabase.storage
    .from('verifications')
    .upload(path, file, { upsert: false });
  if (error) throw new Error(error.message);
  return data.path;
}

export default function useVerification() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(opts: {
    doc: File;
    docType: DocType;
    selfie: File;
    license?: File | null;
  }) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('You must be signed in');

      // 1) Upload images to private storage (owner-scoped paths)
      const docPath = await uploadToStorage(opts.doc, user.id, opts.docType);
      const selfiePath = await uploadToStorage(opts.selfie, user.id, 'selfie');

      // 2) Insert the verification row (status pending)
      const payload: Record<string, unknown> = {
        user_id: user.id,
        type: opts.docType,
        doc_url: docPath,
        selfie_url: selfiePath,
        status: 'pending',
      };
      const { data: row, error: insertError } = await supabase
        .from('verifications')
        .insert(payload)
        .select('id')
        .single();
      if (insertError) throw new Error(insertError.message);

      // 3) Trigger AI verification via the owner-checked server route
      try {
        const res = await fetch('/api/verification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            verification_id: row.id,
            doc_url: docPath,
            selfie_url: selfiePath,
          }),
        });
        const json = await res.json();
        if (json.ai_unavailable) {
          setResult({ ai_unavailable: true, status: 'unavailable' });
        } else {
          setResult(json as AiResult);
        }
      } catch {
        // AI step failure must not fail the submission — the row stays 'pending'.
        setResult({ ai_unavailable: true, status: 'unavailable' });
      }

      return { id: row.id, doc_url: docPath, selfie_url: selfiePath };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { submit, loading, result, error, reset: () => { setResult(null); setError(null); } } as const;
}