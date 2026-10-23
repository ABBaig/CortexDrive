'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import BackButton from '@/components/BackButton';

type ConversationRow = {
  conversation_id: string;
  other_name: string | null;
  last_message_at: string | null;
};

// Chat inbox: lists every conversation the signed-in user participates in,
// most recently active first. Each row links to the existing chat page.
export default function ChatInboxPage() {
  const supabase = getSupabaseBrowserClient();
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('Chat');
  const tc = useTranslations('Common');
  const [rows, setRows] = useState<ConversationRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;
        if (!user) {
          router.push(`/${locale}/signin`);
          return;
        }

        // 1) my conversation memberships
        const { data: mine, error: mErr } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', user.id);
        if (mErr) throw new Error(mErr.message);
        const ids = (mine ?? []).map((r: any) => r.conversation_id);
        if (ids.length === 0) {
          if (mounted) setRows([]);
          return;
        }

        // 2) the other participant + conversation metadata for each
        const { data: others, error: oErr } = await supabase
          .from('conversation_participants')
          .select('conversation_id, users(full_name), conversations(last_message_at)')
          .in('conversation_id', ids)
          .neq('user_id', user.id);
        if (oErr) throw new Error(oErr.message);

        const list: ConversationRow[] = (others ?? []).map((r: any) => ({
          conversation_id: r.conversation_id as string,
          other_name: r.users?.full_name ?? null,
          last_message_at: r.conversations?.last_message_at ?? null,
        }));
        list.sort((a, b) =>
          (b.last_message_at ?? '').localeCompare(a.last_message_at ?? '')
        );
        if (mounted) setRows(list);
      } catch (e: any) {
        if (mounted) {
          setError(String(e?.message ?? e));
          setRows([]);
        }
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (rows === null) return <div className="p-6">{tc('loading')}</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <BackButton />
      <h1 className="text-2xl font-semibold mb-4">{t('inbox')}</h1>

      {error && (
        <div className="mb-3 text-red-400 text-sm">{tc('error')}: {error}</div>
      )}

      {rows.length === 0 ? (
        <p className="text-neutral-400">{t('empty')}</p>
      ) : (
        <ul className="divide-y divide-neutral-800">
          {rows.map((r) => (
            <li key={r.conversation_id} className="py-3">
              <Link
                href={`/${locale}/chat/${r.conversation_id}`}
                className="flex items-center justify-between group"
              >
                <span className="font-medium group-hover:text-sky-400">
                  {r.other_name ?? t('title')}
                </span>
                <span className="text-xs text-neutral-500">
                  {r.last_message_at
                    ? new Date(r.last_message_at).toLocaleString()
                    : ''}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}