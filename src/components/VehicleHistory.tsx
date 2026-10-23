'use client';

import React, { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function VehicleHistory({ vehicleId }: { vehicleId?: string | null }) {
  const supabase = getSupabaseBrowserClient();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
  }, [vehicleId]);

  async function load() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLogs([]); setLoading(false); return; }
      let q = supabase.from('vehicle_logs').select('id,type,odometer_km,liters,amount_pkr,meta,created_at').eq('user_id', user.id);
      if (vehicleId) q = q.eq('vehicle_id', vehicleId);
      const { data, error } = await q.order('created_at', { ascending: false });
      if (error) throw error;
      setLogs(data ?? []);
    } catch (err) {
      setLogs([]);
    }
    setLoading(false);
  }

  return (
    <div className="mt-4">
      <h3 className="text-sm text-slate-300">Vehicle history</h3>
      {loading && <div className="text-xs text-slate-400 mt-2">Loading...</div>}
      {!loading && logs.length === 0 && <div className="text-xs text-slate-400 mt-2">No logs for this vehicle.</div>}
      <ul className="mt-2 space-y-2">
        {logs.map((l) => (
          <li key={l.id} className="p-2 bg-slate-800 rounded text-sm">
            <div className="flex justify-between">
              <div className="text-slate-200">{l.type}</div>
              <div className="text-xs text-slate-400">{new Date(l.created_at).toLocaleString()}</div>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {l.odometer_km !== null && <span>{String(l.odometer_km)} km · </span>}
              {l.liters !== null && <span>{String(l.liters)} L · </span>}
              {l.amount_pkr !== null && <span>Rs {Number(l.amount_pkr).toFixed(2)}</span>}
            </div>
            {l.meta?.note && <div className="text-xs text-slate-400 mt-1">{l.meta.note}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}
