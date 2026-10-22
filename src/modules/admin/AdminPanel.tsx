'use client';
import React, { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';

export default function AdminPanel() {
  const supabase = getSupabaseBrowserClient();
  const t = useTranslations('Admin');
  const [tab, setTab] = useState<'verifications' | 'bookings' | 'wallet' | 'sos' | 'escalated'>('verifications');
  const [verifs, setVerifs] = useState<any[]>([]);
  const [sosLogs, setSosLogs] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [escalated, setEscalated] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchVerifications(), fetchBookings(), fetchWalletTransactions(), fetchSos(), fetchEscalated()])
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));

    const channel = supabase
      .channel('public:sos_logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sos_logs' }, (payload) => {
        setSosLogs((s) => [payload.new, ...s]);
      })
      .subscribe();

    // listen for escalated conversations
    const ch2 = supabase
      .channel('public:conversations')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations' }, (payload) => {
        if (payload.new && payload.new.escalated) {
          setEscalated((e) => [payload.new, ...e]);
        }
      })
      .subscribe();

    return () => { channel.unsubscribe(); ch2.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchVerifications() {
    const { data, error } = await supabase.from('verifications').select('*').order('created_at', { ascending: false }).limit(200);
    if (error) throw error;
    setVerifs(data || []);
  }

  async function fetchBookings() {
    const { data, error } = await supabase.from('bookings').select('id,learner_id,instructor_id,slot_start,status,created_at').order('created_at', { ascending: false }).limit(200);
    if (error) throw error;
    setBookings(data || []);
  }

  async function fetchEscalated() {
    const { data, error } = await supabase.from('conversations').select('id,first_user_id,second_user_id,subject,last_message_at,escalated').eq('escalated', true).order('last_message_at', { ascending: false }).limit(200);
    if (error) throw error;
    setEscalated(data || []);
  }

  async function fetchWalletTransactions() {
    const { data, error } = await supabase.from('transactions').select('id,kind,amount,created_at,wallets(id,user_id,balance)').order('created_at', { ascending: false }).limit(50);
    if (error) throw error;
    setTransactions(data || []);
  }

  async function fetchSos() {
    const { data, error } = await supabase.from('sos_logs').select('*').order('created_at', { ascending: false }).limit(200);
    if (error) throw error;
    setSosLogs(data || []);
  }

  async function act(id: string, action: 'approve' | 'reject') {
    await supabase.from('verifications').update({ status: action === 'approve' ? 'verified' : 'rejected' }).eq('id', id);
    await fetchVerifications();
  }

  return (
    <div className="mt-6">
      <div className="flex gap-2">
        <button className={`px-3 py-1 ${tab === 'verifications' ? 'bg-slate-700 text-white' : ''}`} onClick={() => setTab('verifications')}>{t('tabs.verifications')}</button>
        <button className={`px-3 py-1 ${tab === 'bookings' ? 'bg-slate-700 text-white' : ''}`} onClick={() => setTab('bookings')}>{t('tabs.bookings')}</button>
        <button className={`px-3 py-1 ${tab === 'wallet' ? 'bg-slate-700 text-white' : ''}`} onClick={() => setTab('wallet')}>{t('tabs.wallet')}</button>
        <button className={`px-3 py-1 ${tab === 'sos' ? 'bg-slate-700 text-white' : ''}`} onClick={() => setTab('sos')}>{t('tabs.sos')}</button>
        <button className={`px-3 py-1 ${tab === 'escalated' ? 'bg-slate-700 text-white' : ''}`} onClick={() => setTab('escalated')}>Escalated Chats</button>
      </div>

      {loading && <div className="mt-4 text-sm text-neutral-500">{t('loading')}</div>}
      {error && <div className="mt-4 text-sm text-red-600">{t('error')}: {error}</div>}

      {tab === 'verifications' && (
        <div className="mt-4">
          {verifs.length === 0 ? (
            <div className="text-neutral-400">{t('emptyVerifications')}</div>
          ) : (
            verifs.map((v) => (
              <div key={v.id} className="border p-3 rounded mb-2 flex justify-between items-center">
                <div>
                  <div className="text-sm text-neutral-400">{v.type} — {v.status}</div>
                  <div className="font-medium">{v.doc_url}</div>
                  {v.face_match_score !== null && v.face_match_score !== undefined && (
                    <div className="text-sm text-neutral-400">{t('colAiScore')}: {Number(v.face_match_score).toFixed(2)}</div>
                  )}
                  <div className="text-sm text-neutral-400">{new Date(v.created_at).toLocaleString()}</div>
                </div>
                <div className="flex gap-2">
                  {(v.status === 'pending' || v.status === 'needs_review') && <button onClick={() => act(v.id, 'approve')} className="px-2 py-1 bg-emerald-600 rounded text-white">{t('approve')}</button>}
                  {(v.status === 'pending' || v.status === 'needs_review') && <button onClick={() => act(v.id, 'reject')} className="px-2 py-1 bg-red-600 rounded text-white">{t('reject')}</button>}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'bookings' && (
        <div className="mt-4">
          {bookings.length === 0 ? (
            <div className="text-neutral-400">{t('emptyBookings')}</div>
          ) : (
            bookings.map((b) => (
              <div key={b.id} className="border p-3 rounded mb-2">
                <div className="text-sm text-neutral-400">{b.status} — {new Date(b.created_at).toLocaleString()}</div>
                <div className="font-medium">Booking {b.id}</div>
                <div className="text-sm">Learner: {b.learner_id} — Instructor: {b.instructor_id}</div>
                <div className="text-sm">Slot: {b.slot_start}</div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'wallet' && (
        <div className="mt-4">
          {transactions.length === 0 ? (
            <div className="text-neutral-400">{t('emptyTransactions')}</div>
          ) : (
            transactions.map((trow) => (
              <div key={trow.id} className="border p-3 rounded mb-2">
                <div className="text-sm text-neutral-400">{trow.kind} — {new Date(trow.created_at).toLocaleString()}</div>
                <div className="font-medium">{trow.amount} PKR</div>
                <div className="text-sm">Wallet: {trow.wallet?.id ?? '—'} Owner: {trow.wallet?.user_id ?? '—'}</div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'sos' && (
        <div className="mt-4">
          {sosLogs.length === 0 ? (
            <div className="text-neutral-400">{t('emptySos')}</div>
          ) : (
            sosLogs.map((s) => (
              <div key={s.id} className="border p-2 rounded mb-2">{s.user_id} — {s.note} — {new Date(s.created_at).toLocaleString()}</div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
      {tab === 'escalated' && (
        <div className="mt-4">
          {escalated.length === 0 ? (
            <div className="text-neutral-400">No escalated chats</div>
          ) : (
            escalated.map((c) => (
              <div key={c.id} className="border p-3 rounded mb-2">
                <div className="text-sm text-neutral-400">Last: {new Date(c.last_message_at).toLocaleString()}</div>
                <div className="font-medium">Conversation {c.id}</div>
                <div className="text-sm">Participants: {c.first_user_id} — {c.second_user_id}</div>
                <div className="mt-2">
                  <a className="text-sky-500" href={`/${'en'}/chat/${c.id}`}>Open</a>
                </div>
              </div>
            ))
          )}
        </div>
      )}
