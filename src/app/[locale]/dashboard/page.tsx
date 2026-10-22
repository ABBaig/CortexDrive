// "use server" - server component
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import BackButton from '@/components/BackButton';

export default async function DashboardPage({ params }: { params: { locale: string } }) {
  const supabase = getSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect(`/${params.locale}/signin`);
  const user = session.user;

  // fetch profile
  const { data: profile } = await supabase
    .from('users')
    .select('full_name,city,role')
    .eq('id', user.id)
    .maybeSingle();

  // wallet balance
  let balance: number | null = null;
  const { data: wallet } = await supabase
    .from('wallets')
    .select('id,balance')
    .eq('user_id', user.id)
    .maybeSingle();

  if (wallet?.balance !== undefined && wallet?.balance !== null) balance = wallet.balance;
  if (balance === null) {
    // fallback to transactions sum for this user
    const { data: txs } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', user.id);
    if (txs) balance = (txs as any[]).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
  }
  if (balance === null) balance = 0;
  const safeBalance: number = balance ?? 0;

  // verification badge
  const { data: ver } = await supabase
    .from('verifications')
    .select('status')
    .eq('user_id', user.id)
    .maybeSingle();
  const verified = ver?.status === 'verified';

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto bg-slate-800 p-6 rounded">
        <BackButton />
        <h1 className="text-2xl text-white">Dashboard</h1>
        <div className="mt-4 text-white">
          <div><strong>Name:</strong> {profile?.full_name || user.email}</div>
          <div><strong>City:</strong> {profile?.city || '—'}</div>
          <div><strong>Role:</strong> {profile?.role || '—'}</div>
          <div><strong>Verified:</strong> {verified ? 'Yes' : 'No'}</div>
          <div className="mt-4"><strong>Wallet:</strong> PKR {safeBalance.toFixed(2)}</div>
        </div>

        <nav className="mt-6 grid grid-cols-2 gap-2">
          <a href={`/${params.locale}/verification`} className="p-2 bg-slate-700 rounded text-white">Verification</a>
          <a href={`/${params.locale}/marketplace`} className="p-2 bg-slate-700 rounded text-white">Marketplace</a>
          <a href={`/${params.locale}/wallet`} className="p-2 bg-slate-700 rounded text-white">Wallet</a>
          <a href={`/${params.locale}/ai-tutor`} className="p-2 bg-slate-700 rounded text-white">AI Tutor</a>
          <a href={`/${params.locale}/vehicle`} className="p-2 bg-slate-700 rounded text-white">Vehicle</a>
          <a href={`/${params.locale}/sos`} className="p-2 bg-slate-700 rounded text-white">SOS</a>

          <div className="col-span-2 mt-4">
            {/* Mount client SOSButton via the existing client wrapper */}
            <div id="sos-button-root" />
            <script
              dangerouslySetInnerHTML={{
                __html: `(function(){try{const root=document.getElementById('sos-button-root'); if(!root) return; const s=document.createElement('script'); s.type='module'; s.innerHTML="import React from 'react';import { createRoot } from 'react-dom/client';import Wrapper from '/src/modules/safety/SOSButtonClientWrapper';const container=document.getElementById('sos-button-root'); if(container) { const root2=createRoot(container); root2.render(React.createElement(Wrapper)); }"; document.body.appendChild(s);}catch(e){console.error(e)}})();`,
              }}
            />
          </div>

          <a href={`/${params.locale}/security`} className="p-2 bg-slate-700 rounded text-white">Security</a>
        </nav>
      </div>
    </AppShell>
  );
}
