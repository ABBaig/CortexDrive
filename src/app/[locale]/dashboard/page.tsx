import { getSupabaseServerClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';

export default async function DashboardPage({ params }:{ params:any }){
  const supabase = createServerSupabaseClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session) return new Response(null,{ status:302, headers:{ Location:`/${params.locale}/signin`} });
  const user = data.session.user;
  // fetch profile
  const { data: profile } = await supabase.from('users').select('full_name,city,role').eq('id', user.id).single().maybeSingle();
  // wallet balance
  let balance: number | null = null;
  const { data: wallet } = await supabase.from('wallets').select('balance').eq('user_id', user.id).single().maybeSingle();
  if (wallet?.balance !== undefined) balance = wallet.balance;
  if (balance === null){
    const { data: agg } = await supabase.from('transactions').select('amount').eq('user_id', user.id);
    if (agg) balance = agg.reduce((s:any,row:any)=>s+Number(row.amount||0),0);
  }
  if (balance === null) balance = 0;

  // verification badge
  const { data: ver } = await supabase.from('verifications').select('status').eq('user_id', user.id).single().maybeSingle();
  const verified = ver?.status === 'verified';

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto bg-slate-800 p-6 rounded">
        <h1 className="text-2xl" style={{color:'var(--cd-primary)'}}>Dashboard</h1>
        <div className="mt-4">
          <div><strong>Name:</strong> {profile?.full_name || user.email}</div>
          <div><strong>City:</strong> {profile?.city || '—'}</div>
          <div><strong>Role:</strong> {profile?.role || '—'}</div>
          <div><strong>Verified:</strong> {verified ? 'Yes' : 'No'}</div>
          <div className="mt-4"><strong>Wallet:</strong> PKR {balance.toFixed(2)}</div>
        </div>
        <nav className="mt-6 grid grid-cols-2 gap-2">
          <a href={`/${params.locale}/verification`} className="p-2 bg-slate-700 rounded">Verification</a>
          <a href={`/${params.locale}/marketplace`} className="p-2 bg-slate-700 rounded">Marketplace</a>
          <a href={`/${params.locale}/wallet`} className="p-2 bg-slate-700 rounded">Wallet</a>
          <a href={`/${params.locale}/ai-tutor`} className="p-2 bg-slate-700 rounded">AI Tutor</a>
          <a href={`/${params.locale}/vehicle`} className="p-2 bg-slate-700 rounded">Vehicle</a>
          <a href={`/${params.locale}/sos`} className="p-2 bg-slate-700 rounded">SOS</a>
          <a href={`/${params.locale}/security`} className="p-2 bg-slate-700 rounded">Security</a>
        </nav>
      </div>
    </AppShell>
  );
}
