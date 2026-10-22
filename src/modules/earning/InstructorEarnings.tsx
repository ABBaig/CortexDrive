import { getLocale } from 'next-intl/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export default async function InstructorEarnings({ instructorId }: { instructorId: string }) {
  const supabase = getSupabaseServerClient();
  // sum pending (booked) and released (completed)
  const { data: pendingAgg } = await supabase
    .from('bookings')
    .select('sum:instructor_rate', { count: 'exact' })
    .eq('instructor_id', instructorId)
    .eq('status', 'booked');

  const { data: releasedAgg } = await supabase
    .from('bookings')
    .select('sum:instructor_rate', { count: 'exact' })
    .eq('instructor_id', instructorId)
    .eq('status', 'completed');

  // counts
  const { count: pendingCountRaw, data: pendingRows } = await supabase
    .from('bookings')
    .select('id', { count: 'exact' })
    .eq('instructor_id', instructorId)
    .eq('status', 'booked');
  const pendingCount = pendingCountRaw ?? 0;
  const { count: releasedCountRaw } = await supabase
    .from('bookings')
    .select('id', { count: 'exact' })
    .eq('instructor_id', instructorId)
    .eq('status', 'completed');
  const releasedCount = releasedCountRaw ?? 0;

  const pendingGross = pendingAgg?.[0]?.sum ?? 0;
  const releasedGross = releasedAgg?.[0]?.sum ?? 0;

  // platform fee percent
  const { data: feeRow } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', 'platform_fee_percent')
    .maybeSingle();
  const feePercent = feeRow?.value ? Number(feeRow.value) : 0;
  const pendingNet = pendingGross - (pendingGross * feePercent) / 100;
  const releasedNet = releasedGross - (releasedGross * feePercent) / 100;

  return (
    <section className="mt-6 p-4 bg-slate-700 rounded text-white">
      <h2 className="text-lg font-semibold">Earnings</h2>
      <div className="mt-3 grid grid-cols-2 gap-4">
        <div className="p-3 bg-slate-800 rounded">
          <div className="text-sm text-neutral-300">Pending (in escrow)</div>
          <div className="mt-2 text-2xl">PKR {Number(pendingGross).toFixed(2)}</div>
          <div className="text-sm text-neutral-400">Net: PKR {Number(pendingNet).toFixed(2)}</div>
          <div className="text-xs text-neutral-500 mt-1">{pendingCount} pending bookings</div>
        </div>
        <div className="p-3 bg-slate-800 rounded">
          <div className="text-sm text-neutral-300">Released</div>
          <div className="mt-2 text-2xl">PKR {Number(releasedGross).toFixed(2)}</div>
          <div className="text-sm text-neutral-400">Net: PKR {Number(releasedNet).toFixed(2)}</div>
          <div className="text-xs text-neutral-500 mt-1">{releasedCount} completed bookings</div>
        </div>
      </div>
      <div className="mt-3 text-xs text-neutral-400">Platform fee: {feePercent}%</div>
    </section>
  );
}
