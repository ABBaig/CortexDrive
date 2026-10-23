'use client';

// VerificationStatus: fetches the signed-in user's verification rows server-side
// (via Supabase with the user's session). Proves status persistence after
// sign-out/sign-in (rows live in Postgres, not in client state).

import React, { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';
import ResultBadge from './ResultBadge';

export default function VerificationStatus({ userId }: { userId?: string }) {
  const t = useTranslations('Verification');
  const tc = useTranslations('Common');
  const [rows, setRows] = useState<
    | { id: string; type: string; status: string; created_at: string }[]
    | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        let uid = userId;
        if (!uid) {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) { if (mounted) setRows([]); return; }
          uid = user.id;
        }
        const { data, error } = await supabase
          .from('verifications')
          .select('id,type,status,created_at')
          .eq('user_id', uid)
          .order('created_at', { ascending: false });
        if (error) throw error;
        if (mounted) setRows(data ?? []);
      } catch (e: unknown) {
        if (mounted) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => { mounted = false; };
  }, [userId]);

  if (error) return <div className="text-sm text-red-600">{error}</div>;
  if (rows === null) return <div className="text-sm text-neutral-500">{tc('loading')}</div>;
  if (rows.length === 0) return <div className="text-sm text-neutral-400">{t('currentStatus.empty')}</div>;

  return (
    <ul className="space-y-2 mt-2">
      {rows.map((r) => (
        <li key={r.id} className="p-3 border rounded flex justify-between items-center">
          <div>
            <div className="text-sm text-neutral-400">{new Date(r.created_at).toLocaleString()}</div>
            <div className="font-medium">{r.type}</div>
          </div>
          <ResultBadge status={r.status} />
        </li>
      ))}
    </ul>
  );
}