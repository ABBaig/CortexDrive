'use client';
import React, { useState, useRef } from 'react';
import { parseCSV } from '@/lib/csv';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function VehicleCsvImport({ onDone, vehicleId }: { onDone?: () => void; vehicleId?: string | null }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  function sampleCSV() {
    return `type,odometer_km,liters,amount_pkr,note\n` +
      `fuel,12000,40,11000,Fill up at Shell\n` +
      `fuel,12300,38,10500,Next fill\n` +
      `service,12400,,2500,Oil change`;
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    const rows = parseCSV(text);
    await importRows(rows);
  }

  async function importRows(rows: any[]) {
    setBusy(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('Not signed in'); setBusy(false); return; }
      // validate and transform
      const batch: any[] = [];
      for (const r of rows) {
        const t = (r.type || 'fuel').toLowerCase();
        const od = r.odometer_km ? Number(r.odometer_km) : null;
        const li = r.liters ? Number(r.liters) : null;
        const am = r.amount_pkr ? Number(r.amount_pkr) : null;
        if (r.type && !['fuel','service','spare_part','spare part','sparepart'].includes(t)) {
          setError('Unknown type in CSV: ' + r.type);
          setBusy(false);
          return;
        }
        if (t === 'fuel' && (li === null || Number.isNaN(li) || li <= 0)) {
          setError('Fuel entry missing liters in CSV');
          setBusy(false);
          return;
        }
        if (am === null || Number.isNaN(am) || am < 0) {
          setError('Missing or invalid amount in CSV');
          setBusy(false);
          return;
        }
        batch.push({ user_id: user.id, vehicle_id: vehicleId ?? null, type: t === 'spare part' ? 'spare_part' : t === 'sparepart' ? 'spare_part' : t, odometer_km: od, liters: li, amount_pkr: am, meta: r.note ? { note: r.note } : {} });
      }
      if (batch.length === 0) { setError('No valid rows found'); setBusy(false); return; }
      // insert in chunks of 50
      for (let i = 0; i < batch.length; i += 50) {
        const chunk = batch.slice(i, i + 50);
        const { error: dbError } = await supabase.from('vehicle_logs').insert(chunk);
        if (dbError) { setError(dbError.message); setBusy(false); return; }
      }
      setBusy(false);
      setError(null);
      if (onDone) onDone();
    } catch (err: any) {
      setError(err?.message || String(err));
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 p-3 bg-slate-800 rounded">
      <div className="text-sm text-slate-300">Import logs from CSV</div>
      <div className="mt-2 flex gap-2">
        <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} className="text-sm text-slate-200" />
        <button type="button" className="px-3 py-1 rounded bg-sky-600 text-white" onClick={() => {
          // trigger download sample
          const blob = new Blob([sampleCSV()], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = 'vehicle_template.csv'; a.click();
          URL.revokeObjectURL(url);
        }}>Download template</button>
      </div>
      {error && <div className="mt-2 text-sm text-red-400">{error}</div>}
      {busy && <div className="mt-2 text-sm text-slate-400">Importing...</div>}
    </div>
  );
}
