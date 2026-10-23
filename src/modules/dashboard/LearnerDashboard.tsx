import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import AppShell from '@/components/AppShell';
import { Icons } from '@/modules/dashboard/DashboardIcons';
import BackButton from '@/components/BackButton';
import SOSButtonClientWrapper from '@/modules/safety/SOSButtonClientWrapper';
import { getSupabaseServerClient } from '@/lib/supabase/server';

type Props = {
  locale: string;
  userId: string;
  fullName: string;
  city: string;
};

const STAGE_KEYS = ['learner_permit', 'test_scheduled', 'test_passed', 'provisional', 'permanent'];

export default async function LearnerDashboard({ locale, userId, fullName, city }: Props) {
  const t = await getTranslations({ locale, namespace: 'Dashboard' });
  const supabase = await getSupabaseServerClient();

  // Wallet balance (best-effort)
  let walletBalance: number | null = null;
  try {
    const { data: wallet, error: werr } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', userId)
      .maybeSingle();
    if (!werr && wallet && wallet.balance !== null && wallet.balance !== undefined) {
      walletBalance = Number(wallet.balance);
    }
  } catch {
    walletBalance = null;
  }
  const formattedBalance =
    walletBalance !== null
      ? walletBalance.toLocaleString('en-PK', { style: 'currency', currency: 'PKR' })
      : null;

  // License progress: text stages; tolerate legacy numeric stage values (1-5)
  let currentStageKey: string | null = null;
  let legacyNumericStage: number | null = null;
  try {
    const { data: lp } = await supabase
      .from('license_progress')
      .select('stage,updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const st = lp?.stage ?? null;
    if (typeof st === 'number') {
      const n = Number(st);
      if (!Number.isNaN(n) && n >= 1 && n <= STAGE_KEYS.length) {
        currentStageKey = STAGE_KEYS[n - 1];
        legacyNumericStage = n;
      }
    } else if (typeof st === 'string' && STAGE_KEYS.includes(st)) {
      currentStageKey = st;
    }
  } catch {
    currentStageKey = null;
    legacyNumericStage = null;
  }
  const stageIndex = currentStageKey !== null ? STAGE_KEYS.indexOf(currentStageKey) : -1;

  // Lesson counts
  let upcoming = 0;
  let completed = 0;
  try {
    const { data: myBookings, error: berr } = await supabase
      .from('bookings')
      .select('id,status')
      .eq('learner_id', userId);
    if (!berr && Array.isArray(myBookings)) {
      upcoming = myBookings.filter((b: any) => b?.status === 'booked').length;
      completed = myBookings.filter((b: any) => b?.status === 'completed').length;
    }
  } catch {
    upcoming = 0;
    completed = 0;
  }

  // Latest verification status
  let verificationStatus = 'unverified';
  try {
    const { data: ver } = await supabase
      .from('verifications')
      .select('status,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (ver?.status && ['verified', 'needs_review', 'pending', 'rejected'].includes(ver.status)) {
      verificationStatus = ver.status;
    }
  } catch {
    verificationStatus = 'unverified';
  }

  const badgeClass =
    verificationStatus === 'verified'
      ? 'bg-emerald-600 text-white'
      : verificationStatus === 'needs_review'
        ? 'bg-amber-500 text-white'
        : verificationStatus === 'pending'
          ? 'bg-sky-600 text-white'
          : verificationStatus === 'rejected'
            ? 'bg-red-600 text-white'
            : 'bg-slate-600 text-slate-100';

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto bg-slate-800 p-6 rounded">
        <BackButton />
        <h1 className="text-2xl text-white">{t('greeting', { name: fullName || '—' })}</h1>
        <div className="text-sm text-slate-400">{city || '—'}</div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="p-3 bg-slate-700 rounded">
            <div className="text-sm text-slate-400">{t('wallet')}</div>
            <div className="text-lg text-white font-semibold">
              {formattedBalance !== null ? formattedBalance : t('walletUnavailable')}
            </div>
          </div>
          <div className="p-3 bg-slate-700 rounded flex items-center gap-3">
            <div className="flex-shrink-0 text-slate-300"><svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2l2.5 1.8L18 2l1.2 2.8L22 6l-1.8 2.2L22 11l-2.8.8L18 14l-3.5-1.8L11 16l-2.5-3.8L5 14l-1.2-2.8L2 11l1.8-2.2L2 6l2.8-.2L7 2l3 2z" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" /><path d="M9.5 12.5l1.5 1.5L15 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
            <div>
              <div className="text-sm text-slate-400">{t('verification')}</div>
              <div className="mt-1">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${badgeClass}`}>
                  {t(`verificationStatus.${verificationStatus}`)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 p-4 bg-slate-700 rounded">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white">{t('licenseProgress')}</h2>
            <Link href={`/${locale}/license`} className="text-sm text-sky-400">
              {t('licenseManage')}
            </Link>
          </div>
          <ol className="mt-3 space-y-2">
            {STAGE_KEYS.map((stageKey, idx) => {
              const done = stageIndex > idx;
              const active = stageIndex === idx;
              return (
                <li key={stageKey} className="flex items-center gap-3">
                  <div
                    className={`h-7 w-7 flex items-center justify-center rounded-full text-xs font-semibold ${
                      done ? 'bg-emerald-600 text-white' : active ? 'bg-sky-600 text-white' : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    {done ? '✓' : idx + 1}
                  </div>
                  <div className={`text-sm ${active ? 'text-white font-semibold' : 'text-slate-300'}`}>
                    {t(`stages.${stageKey}`)}
                  </div>
                </li>
              );
            })}
          </ol>
          {legacyNumericStage !== null && (
            <div className="mt-2 text-xs text-amber-300">
              {t('licenseLegacyNote', { num: legacyNumericStage })}
            </div>
          )}
        </div>

        <div className="mt-4 p-4 bg-slate-700 rounded">
          <h2 className="text-lg font-semibold text-white">{t('lessonsTitle')}</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="p-2 bg-slate-800 rounded text-center">
              <div className="text-slate-400">{t('lessonsUpcoming')}</div>
              <div className="text-white font-semibold">{upcoming}</div>
            </div>
            <div className="p-2 bg-slate-800 rounded text-center">
              <div className="text-slate-400">{t('lessonsCompleted')}</div>
              <div className="text-white font-semibold">{completed}</div>
            </div>
          </div>
        </div>

        <nav className="mt-6 grid grid-cols-2 gap-2">
          <Link href={`/${locale}/bookings`} className="p-2 bg-slate-700 rounded text-white flex items-center gap-2">
            <span className="text-sky-300"><Icons.VerificationIcon className="h-5 w-5" /></span>
            <span>{t('myBookings')}</span>
          </Link>
          <Link href={`/${locale}/marketplace`} className="p-2 bg-slate-700 rounded text-white flex items-center gap-2">
            <span className="text-amber-300"><Icons.VerificationIcon className="h-5 w-5" /></span>
            <span>{t('findInstructor')}</span>
          </Link>
          <Link href={`/${locale}/services`} className="p-2 bg-slate-700 rounded text-white flex items-center gap-2">
            <span className="text-emerald-300"><Icons.VerificationIcon className="h-5 w-5" /></span>
            <span>{t('browseServicesCard')}</span>
          </Link>
          <Link href={`/${locale}/service-bookings`} className="p-2 bg-slate-700 rounded text-white flex items-center gap-2">
            <span className="text-sky-300"><Icons.VerificationIcon className="h-5 w-5" /></span>
            <span>{t('myServiceBookings')}</span>
          </Link>
          <Link href={`/${locale}/verification`} className="p-2 bg-slate-700 rounded text-white flex items-center gap-2">
            <span className="text-amber-300"><Icons.VerificationIcon className="h-5 w-5" /></span>
            <span>{t('verificationManage')}</span>
          </Link>
          <Link href={`/${locale}/vehicle`} className="p-2 bg-slate-700 rounded text-white flex items-center gap-2">
            <span className="text-sky-300"><Icons.FuelIcon className="h-5 w-5" /></span>
            <span>{t('vehicleCard')}</span>
          </Link>
          <Link href={`/${locale}/sos`} className="p-2 bg-slate-700 rounded text-white flex items-center gap-2">
            <span className="text-rose-300"><Icons.SOSIcon className="h-5 w-5" /></span>
            <span>{t('sosCard')}</span>
          </Link>
          <Link href={`/${locale}/security`} className="p-2 bg-slate-700 rounded text-white flex items-center gap-2">
            <span className="text-slate-300"><Icons.VerificationIcon className="h-5 w-5" /></span>
            <span>{t('securityCard')}</span>
          </Link>
          <Link href={`/${locale}/ai-tutor`} className="p-2 bg-slate-700 rounded text-white flex items-center gap-2">
            <span className="text-emerald-300"><Icons.VerificationIcon className="h-5 w-5" /></span>
            <span>{t('aiTutorCard')}</span>
          </Link>
          <Link href={`/${locale}/marketplace`} className="p-2 bg-slate-700 rounded text-white flex items-center gap-2">
            <span className="text-sky-300"><Icons.WalletIcon className="h-5 w-5" /></span>
            <span>{t('chatCardAction')}</span>
          </Link>
        </nav>
        <div className="mt-2 text-xs text-slate-400">{t('chatCardBody')}</div>

        <div className="mt-4">
          <SOSButtonClientWrapper />
        </div>
      </div>
    </AppShell>
  );
}