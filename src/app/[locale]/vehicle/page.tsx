'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';
import BackButton from '@/components/BackButton';
import FuelChart from '@/components/FuelChart';
import VehicleCsvImport from '@/components/VehicleCsvImport';
import FuelTrackerSummary from '@/components/FuelTrackerSummary';
import VehicleManager from '@/components/VehicleManager';
import VehicleHistory from '@/components/VehicleHistory';

type Log = {
  id: string;
  type: string;
  odometer_km: number | string | null;
  liters: number | string | null;
  amount_pkr: number | string | null;
  meta: { note?: string } | null;
  created_at: string;
};

export default function VehiclePage() {
  const t = useTranslations('Vehicle');
  const tc = useTranslations('Common');
  const supabase = getSupabaseBrowserClient();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState('fuel');
  const [odometer, setOdometer] = useState('');
  const [liters, setLiters] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [vehicleId, setVehicleId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSignedOut(true);
      setLoading(false);
      return;
    }
    // live schema: vehicle_logs has `type` (not event_type) and `meta` jsonb
    const query = supabase
      .from('vehicle_logs')
      .select('id,type,event_type,odometer_km,liters,amount_pkr,meta,created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    if (vehicleId) query.eq('vehicle_id', vehicleId);
    const { data, error: dbError } = await query;
    if (dbError) {
      setError(t('loadFailed'));
      setLogs([]);
    } else {
      // normalize rows: some schemas use `event_type` instead of `type`, and some store meta differently
      const normalized = (data ?? []).map((r: any) => ({
        id: r.id,
        type: r.type ?? r.event_type ?? 'fuel',
        odometer_km: r.odometer_km ?? null,
        liters: r.liters ?? null,
        amount_pkr: r.amount_pkr ?? null,
        meta: r.meta ?? (r.note ? { note: r.note } : {}),
        created_at: r.created_at,
      }));
      setLogs(normalized as Log[]);
    }
    setLoading(false);
  }, [supabase, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addLog(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const odometerNum = odometer.trim() === '' ? null : Number(odometer);
    const litersNum = liters.trim() === '' ? null : Number(liters);
    const amountNum = amount.trim() === '' ? null : Number(amount);
    if (amountNum === null || Number.isNaN(amountNum) || amountNum < 0) {
      setError(t('amountInvalid'));
      return;
    }
    if (type === 'fuel' && (litersNum === null || Number.isNaN(litersNum) || litersNum <= 0)) {
      setError(t('litersInvalid'));
      return;
    }
    if (odometerNum !== null && (Number.isNaN(odometerNum) || odometerNum < 0)) {
      setError(t('odometerInvalid'));
      return;
    }
    setBusy(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      setError(t('loadFailed'));
      return;
    }
    const { error: dbError } = await supabase.from('vehicle_logs').insert({
      user_id: user.id,
      type,
      odometer_km: odometerNum,
      liters: litersNum,
      amount_pkr: amountNum,
      meta: note.trim() ? { note: note.trim() } : {},
    });
    setBusy(false);
    if (dbError) {
      setError(t('loadFailed'));
      return;
    }
    setType('fuel');
    setOdometer('');
    setLiters('');
    setAmount('');
    setNote('');
    void load();
  }

  // ---- fuel efficiency ----
  const fuelEntries = logs
    .filter((l) => l.type === 'fuel' && Number(l.odometer_km) > 0 && Number(l.liters) > 0)
    .map((l) => ({ ...l, odo: Number(l.odometer_km), lit: Number(l.liters) }));
  const chartData: { date: string; kmPerLiter: number }[] = [];
  for (let i = 1; i < fuelEntries.length; i++) {
    const dist = fuelEntries[i].odo - fuelEntries[i - 1].odo;
    if (dist > 0 && fuelEntries[i].lit > 0) {
      chartData.push({
        date: new Date(fuelEntries[i].created_at).toISOString().slice(0, 10),
        kmPerLiter: Math.round((dist / fuelEntries[i].lit) * 100) / 100,
      });
    }
  }
  const totalLiters = fuelEntries.reduce((s, e) => s + e.lit, 0);
  const fuelTotal = fuelEntries.reduce((s, e) => s + Number(e.amount_pkr ?? 0), 0);
  const firstOdo = fuelEntries.length > 0 ? fuelEntries[0].odo : 0;
  const lastOdo = fuelEntries.length > 0 ? fuelEntries[fuelEntries.length - 1].odo : 0;
  const totalKm = Math.max(0, lastOdo - firstOdo);
  const avgKmPerLiter = totalLiters > 0 ? Math.round((totalKm / totalLiters) * 100) / 100 : 0;
  const pkrPerKm = totalKm > 0 ? Math.round((fuelTotal / totalKm) * 100) / 100 : 0;

  // ---- parts breakdown ----
  const parts = logs.filter((l) => l.type !== 'fuel');
  const partsTotal = parts.reduce((s, e) => s + Number(e.amount_pkr ?? 0), 0);
  const byType = new Map<string, number>();
  parts.forEach((p) => {
    byType.set(p.type, (byType.get(p.type) ?? 0) + Number(p.amount_pkr ?? 0));
  });

  const inputClass =
    'w-full p-2 rounded bg-slate-900 text-white border border-slate-600 focus:border-sky-500 focus:outline-none text-sm';

  if (signedOut) {
    return (
      <main className="p-6 max-w-2xl mx-auto">
        <BackButton />
        <h1 className="mt-2 text-2xl font-semibold text-white">{t('title')}</h1>
        <div className="mt-4 text-slate-400">{t('signInRequired')}</div>
      </main>
    );
  }

  return (
    <main className="p-6 max-w-2xl mx-auto">
      <BackButton />
      <h1 className="mt-2 text-2xl font-semibold text-white">{t('title')}</h1>

      <FuelTrackerSummary totalKm={totalKm} totalLiters={totalLiters} avgKmPerLiter={avgKmPerLiter} pkrPerKm={pkrPerKm} />

      <VehicleManager onSelect={(v) => setVehicleId(v?.id ?? null)} />

      <div className="mt-4 bg-slate-800 rounded-xl ring-1 ring-slate-700 p-4">

      <div className="mt-4 bg-slate-800 rounded-xl ring-1 ring-slate-700 p-4">
        <h2 className="text-sm font-semibold text-white">{t('fuelEfficiency')}</h2>
        {chartData.length > 0 ? (
          <div className="mt-2">
            <FuelChart data={chartData} />
          </div>
        ) : (
          <div className="mt-2 text-sm text-slate-400">{t('needTwoFuelLogs')}</div>
        )}
      </div>

      <form onSubmit={addLog} className="mt-4 p-4 bg-slate-800 rounded-xl ring-1 ring-slate-700 space-y-3">
        <h2 className="text-sm font-semibold text-white">{t('addLog')}</h2>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-slate-400 mb-1" htmlFor="vl-type">{t('logType')}</label>
            <select id="vl-type" className={inputClass} value={type} onChange={(e) => setType(e.target.value)}>
              <option value="fuel">{t('typeFuel')}</option>
              <option value="spare_part">{t('typeSparePart')}</option>
              <option value="service">{t('typeService')}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1" htmlFor="vl-odo">{t('odometerKm')}</label>
            <input id="vl-odo" className={inputClass} type="number" min="0" step="1" value={odometer} onChange={(e) => setOdometer(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {type === 'fuel' && (
            <div>
              <label className="block text-xs text-slate-400 mb-1" htmlFor="vl-liters">{t('liters')}</label>
              <input id="vl-liters" className={inputClass} type="number" min="0" step="0.01" value={liters} onChange={(e) => setLiters(e.target.value)} />
            </div>
          )}
          <div>
            <label className="block text-xs text-slate-400 mb-1" htmlFor="vl-amount">{t('amountPkr')}</label>
            <input id="vl-amount" className={inputClass} type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1" htmlFor="vl-note">{t('note')}</label>
          <input id="vl-note" className={inputClass} maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        {error && <div className="text-sm text-red-400">{error}</div>}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={busy}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-50"
          >
            {busy ? tc('loading') : t('saveLog')}
          </button>
        </div>
      </form>

      <div className="mt-4 p-4 bg-slate-800 rounded-xl ring-1 ring-slate-700">
        <h2 className="text-sm font-semibold text-white">{t('partsBreakdown')}</h2>
        {parts.length === 0 ? (
          <div className="mt-2 text-sm text-slate-400">{t('noPartsYet')}</div>
        ) : (
          <div className="mt-2 space-y-2">
            {Array.from(byType.entries()).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between text-sm">
                <span className="text-slate-300">
                  {k === 'spare_part' ? t('typeSparePart') : k === 'service' ? t('typeService') : k}
                </span>
                <span className="text-white font-semibold tabular-nums">
                  {t('amountDisplay', { amount: v.toFixed(2) })}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-700">
              <span className="text-slate-300">{t('partsTotal')}</span>
              <span className="text-white font-semibold tabular-nums">
                {t('amountDisplay', { amount: partsTotal.toFixed(2) })}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">{t('allLogs')}</h2>
          <VehicleCsvImport vehicleId={vehicleId} onDone={() => void load()} />
        </div>
        <VehicleHistory vehicleId={vehicleId} />
        {loading && <div className="mt-2 text-sm text-slate-400">{tc('loading')}</div>}
        {!loading && logs.length === 0 && (
          <div className="mt-2 text-sm text-slate-400">{t('noLogsYet')}</div>
        )}
        {!loading && logs.length > 0 && (
          <ul className="mt-2 space-y-2">
            {logs.map((l) => (
              <li key={l.id} className="p-3 bg-slate-800 rounded-lg ring-1 ring-slate-700/60 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium">
                    {l.type === 'fuel' ? t('typeFuel') : l.type === 'spare_part' ? t('typeSparePart') : l.type === 'service' ? t('typeService') : l.type}
                  </span>
                  <span className="text-xs text-slate-400">{new Date(l.created_at).toLocaleString()}</span>
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  {l.odometer_km !== null && <span>{t('odometerDisplay', { km: String(l.odometer_km) })} · </span>}
                  {l.liters !== null && <span>{String(l.liters)} {t('litersShort')} · </span>}
                  {l.amount_pkr !== null && <span>{t('amountDisplay', { amount: Number(l.amount_pkr).toFixed(2) })}</span>}
                </div>
                {l.meta?.note && <div className="mt-1 text-xs text-slate-400">{l.meta.note}</div>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}