import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import BackButton from '@/components/BackButton';
import SOSButtonClientWrapper from '@/modules/safety/SOSButtonClientWrapper';
import InstructorEarnings from '@/modules/earning/InstructorEarnings';

const STAGES = ['Sign up & onboarding', 'CNIC verified', 'Book first lesson', 'Practical lessons', 'Road test ready'];

export default async function DashboardPage({ params }: { params: { locale: string } }) {
  const supabase = await getSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect(`/${params.locale}/signin`);
  const user = session.user;

  const { data: profile } = await supabase
    .from('users')
    .select('full_name,city,role,hourly_rate')
    .eq('id', user.id)
    .maybeSingle();

  // license progress (for learners)
  const { data: lp } = await supabase
    .from('license_progress')
    .select('stage,notes,updated_at')
    .eq('user_id', user.id)
    .maybeSingle();
  const stage = Math.min(Math.max(Number(lp?.stage ?? 1), 1), STAGES.length);
  const progressPercent = Math.round(((stage - 1) / (STAGES.length - 1)) * 100);

  // bookings counts for learner
  const { data: myBookings } = await supabase
    .from('bookings')
    .select('id,status')
    .eq('learner_id', user.id);
  const completed = myBookings?.filter((b: any) => b?.status === 'completed').length ?? 0;
  const upcoming = myBookings?.filter((b: any) => b?.status === 'booked').length ?? 0;

  // wallet balance (single fallback to 0)
  let balance = 0;
  const { data: wallet } = await supabase
    .from('wallets')
    .select('id,balance')
    .eq('user_id', user.id)
    .maybeSingle();
  if (wallet?.balance !== undefined && wallet.balance !== null) balance = wallet.balance;
  const safeBalance: number = Number(balance ?? 0);

  // verification status
  const { data: ver } = await supabase
    .from('verifications')
    .select('status')
    .eq('user_id', user.id)
    .maybeSingle();
  const verificationStatus = ver?.status ?? 'unverified';

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto bg-slate-800 p-6 rounded">
        <BackButton />
        <h1 className="text-2xl text-white">Dashboard</h1>

        <div className="mt-4 text-white">
          <div><strong>Name:</strong> {profile?.full_name || user.email}</div>
          <div><strong>City:</strong> {profile?.city || '—'}</div>
          <div><strong>Role:</strong> {profile?.role || '—'}</div>
          <div>
            <strong>Verified:</strong>{' '}
            {verificationStatus === 'verified' ? 'Yes' : 'No'} ({verificationStatus})
          </div>
          <div className="mt-4"><strong>Wallet:</strong> PKR {safeBalance.toFixed(2)}</div>
        </div>

        {profile?.role === 'instructor' && InstructorEarnings ? (
          <InstructorEarnings instructorId={user.id} locale={params.locale} />
        ) : null}

        {profile?.role === 'learner' ? (
          <div className="mt-4 p-4 bg-slate-700 rounded text-white">
            <h2 className="text-lg font-semibold">Progress</h2>

            <ol className="mt-3 space-y-2">
              {STAGES.map((s, idx) => {
                const i = idx + 1;
                const done = i < stage;
                const active = i === stage;
                return (
                  <li key={s} className="flex items-center gap-3">
                    <div
                      className={`h-8 w-8 flex items-center justify-center rounded-full text-sm font-semibold ${
                        done ? 'bg-emerald-600 text-white' : active ? 'bg-sky-600 text-white' : 'bg-slate-900 text-slate-400'
                      }`}
                    >
                      {done ? '✓' : i}
                    </div>
                    <div className={`text-sm ${active ? 'font-semibold' : 'text-slate-200'}`}>{s}</div>
                  </li>
                );
              })}
            </ol>

            <div className="mt-4">
              <div className="h-3 w-full bg-slate-900 rounded overflow-hidden">
                <div className="h-3 bg-sky-600" style={{ width: `${progressPercent}%` }} />
              </div>
              <div className="mt-2 text-sm text-slate-200">Stage {stage} of {STAGES.length} ({progressPercent}%)</div>
              {lp?.notes ? (
                <div className="mt-2 text-sm text-slate-300"><strong>Notes:</strong> {lp?.notes}</div>
              ) : null}

              <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                <div className="p-2 bg-slate-800 rounded text-center">
                  <div className="text-slate-400">Completed</div>
                  <div className="text-white font-semibold">{completed}</div>
                </div>
                <div className="p-2 bg-slate-800 rounded text-center">
                  <div className="text-slate-400">Upcoming</div>
                  <div className="text-white font-semibold">{upcoming}</div>
                </div>
                <div className="p-2 bg-slate-800 rounded text-center">
                  <div className="text-slate-400">Wallet</div>
                  <div className="text-white font-semibold">PKR {safeBalance.toFixed(2)}</div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <nav className="mt-6 grid grid-cols-2 gap-2">
          <a href={`/${params.locale}/verification`} className="p-2 bg-slate-700 rounded text-white">Verification</a>
          <a href={`/${params.locale}/marketplace`} className="p-2 bg-slate-700 rounded text-white">Marketplace</a>
          <a href={`/${params.locale}/wallet`} className="p-2 bg-slate-700 rounded text-white">Wallet</a>
          <a href={`/${params.locale}/ai-tutor`} className="p-2 bg-slate-700 rounded text-white">AI Tutor</a>
          <a href={`/${params.locale}/sos`} className="p-2 bg-slate-700 rounded text-white">SOS</a>
          <a href={`/${params.locale}/security`} className="p-2 bg-slate-700 rounded text-white">Security</a>

          <div className="col-span-2 mt-4">
            <SOSButtonClientWrapper />
          </div>
        </nav>
      </div>
    </AppShell>
  );
}
