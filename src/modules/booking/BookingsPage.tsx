'use client';

import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import BackButton from '@/components/BackButton';

export default function BookingsPage() {
  const supabase = getSupabaseBrowserClient();
  const t = useTranslations('Booking');
  const tc = useTranslations('Common');
  const locale = useLocale();
  const router = useRouter();

  const [bookings, setBookings] = React.useState<any[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmingId, setConfirmingId] = React.useState<number | null>(null);
  const mountedRef = React.useRef(true);

  React.useEffect(() => {
    mountedRef.current = true;
    fetchData();
    return () => { mountedRef.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return void router.push(`/${locale}/auth/signin`);

      const { data: rows, error: bErr } = await supabase.from('bookings').select('*').eq('learner_id', user.id).order('created_at', { ascending: false });
      if (bErr) {
        setError(bErr.message);
        setBookings([]);
        return;
      }

      // If there are bookings but they do not include an amount column, stop.
      if (rows && rows.length > 0) {
        const sample = rows[0];
        const hasAmount = Object.prototype.hasOwnProperty.call(sample, 'amount') || Object.prototype.hasOwnProperty.call(sample, 'price');
        if (!hasAmount) {
          setError(t('missingAmountColumn'));
          setBookings(rows);
          return;
        }
      }

      setBookings(rows || []);
    } catch (e: any) {
      setError(String(e?.message ?? e));
      setBookings([]);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  function formatPKR(n: number | string | null) {
    const num = Number(n || 0);
    return num.toLocaleString('en-PK', { style: 'currency', currency: 'PKR' });
  }

  async function handleCancel(booking: any) {
    if (!booking) return;
    setError(null);
    setConfirmingId(booking.id);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return void router.push(`/${locale}/auth/signin`);

      // Defensive ownership check for rendering logic
      if (booking.learner_id !== user.id) {
        setError(t('cancelFailed'));
        setConfirmingId(null);
        return;
      }

      // Read platform fee
      const { data: ps, error: psErr } = await supabase.from('platform_settings').select('*').maybeSingle();
      let feePercent = 0;
      if (psErr) {
        // treat missing as 0 (do not crash)
        feePercent = 0;
      } else if (ps && (ps.platform_fee_percent || ps.fee_percent || ps.fee)) {
        feePercent = Number(ps.platform_fee_percent ?? ps.fee_percent ?? ps.fee ?? 0);
      }

      const amount = booking.amount ?? booking.price ?? null;
      if (amount == null) {
        setError(t('cancelFailed') + ': ' + t('missingAmountColumn'));
        setConfirmingId(null);
        return;
      }

      const fee = Math.round((Number(amount) * feePercent) / 100);
      const refund = Number(amount) - fee;

      // Begin cancellation: update booking status
      const { error: updErr } = await supabase.from('bookings').update({ status: 'refunded' }).eq('id', booking.id).eq('learner_id', user.id);
      if (updErr) {
        setError(t('cancelFailed') + ': ' + updErr.message);
        setConfirmingId(null);
        return;
      }

      // Find learner's wallet
      const { data: w } = await supabase.from('wallets').select('*').eq('user_id', user.id).limit(1).single();
      if (!w || !w.id) {
        // revert booking status
        await supabase.from('bookings').update({ status: 'booked' }).eq('id', booking.id).eq('learner_id', user.id);
        setError(t('cancelFailed') + ': ' + t('noWallet'));
        setConfirmingId(null);
        return;
      }

      // compute new balance
      const newBalance = Number(w.balance) + Number(refund);

      // insert transaction
      const { error: txErr } = await supabase.from('transactions').insert([{ wallet_id: w.id, kind: 'refund', amount: refund, balance_after: newBalance, meta: { booking_id: booking.id } }]);
      if (txErr) {
        // revert booking
        await supabase.from('bookings').update({ status: 'booked' }).eq('id', booking.id).eq('learner_id', user.id);
        setError(t('cancelFailed') + ': ' + txErr.message);
        setConfirmingId(null);
        return;
      }

      // update wallet balance
      const { error: wbErr } = await supabase.from('wallets').update({ balance: newBalance }).eq('id', w.id);
      if (wbErr) {
        // best-effort: we don't attempt complex rollback here, but surface error
        setError(t('cancelFailed') + ': ' + wbErr.message);
        setConfirmingId(null);
        return;
      }

      setConfirmingId(null);
      // refresh list
      await fetchData();
      // success message could be shown via toast; for now we'll reuse text
      setError(null);
      alert(t('cancelSuccess'));
    } catch (e: any) {
      setError(String(e?.message ?? e));
      setConfirmingId(null);
    }
  }

  if (loading) return <div className="p-4">{tc('loading')}</div>;
  if (error) return <div className="p-4 text-red-400">{tc('error')}: {error}</div>;

  if (!bookings || bookings.length === 0) return (
    <div className="p-6">
      <BackButton />
      <h1 className="text-2xl font-semibold">{t('title')}</h1>
      <p className="mt-3 text-neutral-400">{t('empty')}</p>
    </div>
  );

  return (
    <div className="p-6">
      <BackButton />
      <h1 className="text-2xl font-semibold">{t('title')}</h1>

      <table className="mt-4 w-full table-auto text-sm">
        <thead>
          <tr className="text-left text-neutral-400">
            <th>{t('colWhen')}</th>
            <th>{t('colInstructor')}</th>
            <th>{t('colStatus')}</th>
            <th>{t('colAmount')}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((b: any) => (
            <tr key={b.id} className="border-t border-neutral-800 align-top">
              <td className="py-3 align-top">{new Date(b.created_at).toLocaleString()}</td>
              <td className="py-3">{b.instructor_name ?? b.instructor_id ?? t('unknownInstructor')}</td>
              <td className="py-3">{b.status === 'booked' ? t('statusBooked') : b.status === 'refunded' ? t('statusRefunded') : b.status}</td>
              <td className="py-3">{formatPKR(b.amount ?? b.price ?? null)}</td>
              <td className="py-3 text-right">
                {b.status === 'booked' && b.learner_id === (supabase.auth.getUser().then(d => d.data.user?.id).catch(() => null)) ? (
                  confirmingId === b.id ? (
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleCancel(b)} className="rounded bg-cyan-400 px-3 py-1.5 text-sm font-semibold text-slate-900">{t('confirmCancel')}</button>
                      <button onClick={() => setConfirmingId(null)} className="text-sm text-neutral-400">{tc('Common.cancel') ?? 'Cancel'}</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmingId(b.id)} className="rounded border border-neutral-700 px-3 py-1.5 text-sm">{t('cancel')}</button>
                  )
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
