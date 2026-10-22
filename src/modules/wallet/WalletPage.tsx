'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

// This very small wrapper component exists because the project previously used
// @supabase/auth-helpers-nextjs in this file. To avoid adding that dependency
// we now use the shared helper getSupabaseBrowserClient which internally calls
// createBrowserClient (from @supabase/ssr) which is already in dependencies.

export default function WalletPage() {
  const supabase = getSupabaseBrowserClient();
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();

  const [wallet, setWallet] = React.useState<any | null>(null);
  const [transactions, setTransactions] = React.useState<any[]>([]);
  const [topupAmount, setTopupAmount] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const mountedRef = React.useRef(true);
  const realtimeChannelRef = React.useRef<any | null>(null);

  React.useEffect(() => {
    mountedRef.current = true;
    fetchData();
    return () => { mountedRef.current = false; unsubscribeRealtime(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return void router.push(`/${locale}/auth/signin`);

      const { data: w, error: wErr } = await supabase.from('wallets').select('*').eq('user_id', user.id).limit(1).single();
      if (wErr && wErr.code !== 'PGRST116') {
        setError(wErr.message);
        setWallet(null);
        setTransactions([]);
        setLoading(false);
        return;
      }

      setWallet(w ?? null);

      if (w && w.id) {
        const { data: tx, error: txErr } = await supabase.from('transactions').select('*').eq('wallet_id', w.id).order('created_at', { ascending: false });
        if (txErr) {
          setError(txErr.message);
          setTransactions([]);
        } else {
          setTransactions(tx || []);
        }

        // subscribe to realtime INSERTs for transactions
        subscribeRealtime(w.id);
      } else {
        // No wallet row — empty state
        setTransactions([]);
      }
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  function formatPKR(n: number | string | null) {
    const num = Number(n || 0);
    return num.toLocaleString('en-PK', { style: 'currency', currency: 'PKR' });
  }

  async function handleTopUp(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(topupAmount);
    if (!amt || amt <= 0) return;
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return void router.push(`/${locale}/auth/signin`);
      const { data: w } = await supabase.from('wallets').select('*').eq('user_id', user.id).limit(1).single();
      const newBalance = Number(w.balance) + amt;
      // existing sandbox top-up behavior (pre-existing) — keep intact
      const { error: err } = await supabase.from('transactions').insert([{ wallet_id: w.id, kind: 'topup', amount: amt, balance_after: newBalance, meta: { source: 'demo' } }]);
      if (err) { alert('Failed: ' + err.message); setLoading(false); return; }
      await supabase.from('wallets').update({ balance: newBalance }).eq('id', w.id);
      setTopupAmount('');
      await fetchData();
    } catch (e: any) {
      setError(String(e?.message ?? e));
      setLoading(false);
    }
  }

  function subscribeRealtime(walletId: number) {
    try {
      if (realtimeChannelRef.current) return; // already subscribed
      const channel = supabase.channel(`public:transactions:wallet_${walletId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, (payload: any) => {
          const newRow = payload.new;
          if (!newRow) return;
          if (newRow.wallet_id !== walletId) return;
          setTransactions((prev) => [newRow, ...prev]);
        })
        .subscribe((status) => {
          // status could be SUBSCRIBED / etc. we don't act on it here
        });
      realtimeChannelRef.current = channel;
    } catch (e) {
      console.warn('Realtime subscription failed', e);
    }
  }

  function unsubscribeRealtime() {
    try {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    } catch (e) {
      // noop
    }
  }

  if (loading) return <div className="p-4">{t('Common.loading') ?? 'Loading...'}</div>;
  if (error) return <div className="p-4 text-red-400">{t('Common.error')}: {error}</div>;

  // wallet null = empty state (no wallet row)
  if (!wallet) return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">{t('Wallet.title') ?? 'Wallet'}</h1>
      <p className="mt-3 text-neutral-400">{t('Wallet.noWallet') ?? 'No wallet found for your account.'}</p>
    </div>
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">{t('Wallet.title') ?? 'Wallet'}</h1>
      <p className="mt-2 text-sm text-neutral-400">{t('Wallet.balance') ?? 'Balance'}: <span className="font-mono ml-2">{formatPKR(wallet.balance)}</span></p>

      <form onSubmit={handleTopUp} className="mt-4 flex items-center gap-3">
        <label className="flex items-center gap-2">
          <span className="text-sm text-neutral-400">{t('Wallet.topupLabel') ?? 'Top Up (sandbox):'}</span>
          <input className="rounded-md bg-neutral-900 px-2 py-1 text-sm" value={topupAmount} onChange={e => setTopupAmount(e.target.value)} />
        </label>
        <button type="submit" disabled={loading} className="rounded bg-cyan-400 px-3 py-1.5 text-sm font-semibold text-slate-900 disabled:opacity-50">{t('Wallet.topupButton') ?? 'Top Up'}</button>
      </form>

      <h2 className="mt-6 text-lg font-medium">{t('Wallet.transactions') ?? 'Transactions'}</h2>

      {transactions.length === 0 ? (
        <div className="mt-4 text-neutral-500">{t('Wallet.noTransactions') ?? 'No transactions yet.'}</div>
      ) : (
        <table className="mt-4 w-full table-auto text-sm">
          <thead>
            <tr className="text-left text-neutral-400">
              <th>When</th>
              <th>Kind</th>
              <th>Amount</th>
              <th>Balance After</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((trow: any) => (
              <tr key={trow.id} className="border-t border-neutral-800">
                <td className="py-2 align-top">{new Date(trow.created_at).toLocaleString()}</td>
                <td className="py-2"><span className="rounded px-2 py-0.5 bg-neutral-800 text-xs">{trow.kind}</span></td>
                <td className="py-2">{formatPKR(trow.amount)}</td>
                <td className="py-2">{formatPKR(trow.balance_after)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
