import React, { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function WalletPage() {
  const supabase = getSupabaseBrowserClient();
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [topupAmount, setTopupAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push(`/${user?.locale ?? 'en'}/signin`);
    const { data: w } = await supabase.from('wallets').select('*').eq('user_id', user.id).limit(1).maybeSingle();
    setWallet(w);
    const { data: tx } = await supabase.from('transactions').select('*').eq('wallet_id', w?.id ?? null).order('created_at', { ascending: false });
    setTransactions(tx || []);
    setLoading(false);
  }

  function formatPKR(n: number|string) {
    const num = Number(n || 0);
    return num.toLocaleString('en-PK', { style: 'currency', currency: 'PKR' });
  }

  async function handleTopUp(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(topupAmount);
    if (!amt || amt <= 0) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: w } = await supabase.from('wallets').select('*').eq('user_id', user.id).limit(1).single();
    const newBalance = Number(w.balance) + amt;
    // Insert transaction and update wallet
    const { error: err } = await supabase.from('transactions').insert([{ wallet_id: w.id, kind: 'topup', amount: amt, balance_after: newBalance, meta: { source: 'demo' } }]);
    if (err) { alert('Failed: '+err.message); setLoading(false); return; }
    await supabase.from('wallets').update({ balance: newBalance }).eq('id', w.id);
    setTopupAmount('');
    await fetchData();
  }

  if (!wallet) return <div>Loading...</div>;

  return (
    <div>
      <h1>Wallet</h1>
      <p>Balance: {formatPKR(wallet.balance)}</p>
      <form onSubmit={handleTopUp}>
        <label>Top Up (sandbox): <input value={topupAmount} onChange={e=>setTopupAmount(e.target.value)} /></label>
        <button type="submit" disabled={loading}>Top Up</button>
      </form>
      <h2>Transactions</h2>
      <table>
        <thead><tr><th>When</th><th>Kind</th><th>Amount</th><th>Balance After</th></tr></thead>
        <tbody>
          {transactions.map(t=> (
            <tr key={t.id}>
              <td>{new Date(t.created_at).toLocaleString()}</td>
              <td><span style={{padding:4,background:'#eee',borderRadius:4}}>{t.kind}</span></td>
              <td>{formatPKR(t.amount)}</td>
              <td>{formatPKR(t.balance_after)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
