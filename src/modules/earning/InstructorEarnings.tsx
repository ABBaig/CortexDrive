import { getTranslations } from 'next-intl/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

const formatPKR = (n: number) =>
  new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(n);

export default async function InstructorEarnings({
  instructorId,
  locale,
}: {
  instructorId: string;
  locale: string;
}) {
  const t = await getTranslations({ locale, namespace: 'Earnings' });

  // Single read-only query: rates by status. Sums are computed in JS to avoid
  // PostgREST aggregate-alias pitfalls ("sum:col" is an alias, not a SUM).
  const { data: rows, error: bErr } = await getSupabaseServerClient()
    .from('bookings')
    .select('instructor_rate, status')
    .eq('instructor_id', instructorId)
    .in('status', ['booked', 'completed']);

  if (bErr) {
    return (
      <section className="mt-6 p-4 bg-slate-700 rounded text-red-300">
        {t('error')}
      </section>
    );
  }

  const list = rows ?? [];
  const pending = list.filter((b) => b.status === 'booked');
  const released = list.filter((b) => b.status === 'completed');

  if (pending.length === 0 && released.length === 0) {
    return (
      <section className="mt-6 p-4 bg-slate-700 rounded text-neutral-300">
        {t('empty')}
      </section>
    );
  }

  // platform_settings is a key-value table (key = 'platform_fee_percent')
  const { data: feeRow } = await getSupabaseServerClient()
    .from('platform_settings')
    .select('value')
    .eq('key', 'platform_fee_percent')
    .maybeSingle();
  const feePercent = feeRow?.value != null ? Number(feeRow.value) || 0 : 0;

  const pendingGross = pending.reduce((s, b) => s + Number(b.instructor_rate ?? 0), 0);
  const releasedGross = released.reduce((s, b) => s + Number(b.instructor_rate ?? 0), 0);
  const pendingNet = pendingGross - (pendingGross * feePercent) / 100;
  const releasedNet = releasedGross - (releasedGross * feePercent) / 100;

  return (
    <section className="mt-6 p-4 bg-slate-700 rounded text-white">
      <h2 className="text-lg font-semibold">{t('title')}</h2>
      <div className="mt-3 grid grid-cols-2 gap-4">
        <div className="p-3 bg-slate-800 rounded">
          <div className="text-sm text-neutral-300">{t('pending')}</div>
          <div className="mt-2 text-2xl">{formatPKR(pendingGross)}</div>
          <div className="text-sm text-neutral-400">{t('gross')} · {t('net')}: {formatPKR(pendingNet)}</div>
          <div className="text-xs text-neutral-500 mt-1">{pending.length} {t('bookingsCount')}</div>
        </div>
        <div className="p-3 bg-slate-800 rounded">
          <div className="text-sm text-neutral-300">{t('released')}</div>
          <div className="mt-2 text-2xl">{formatPKR(releasedGross)}</div>
          <div className="text-sm text-neutral-400">{t('gross')} · {t('net')}: {formatPKR(releasedNet)}</div>
          <div className="text-xs text-neutral-500 mt-1">{released.length} {t('bookingsCount')}</div>
        </div>
      </div>
      <div className="mt-3 text-xs text-neutral-400">{t('fee')}: {feePercent}%</div>
    </section>
  );
}