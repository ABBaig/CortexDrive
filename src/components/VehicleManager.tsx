'use client';

import React, { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type Vehicle = {
  id: string;
  name?: string | null;
  registration?: string | null;
  make?: string | null;
  model?: string | null;
};

export default function VehicleManager({ onSelect }: { onSelect?: (v: Vehicle | null) => void }) {
  const supabase = getSupabaseBrowserClient();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [registration, setRegistration] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setVehicles([]);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('vehicles')
        .select('id,name,registration,make,model')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setVehicles(data ?? []);
      // preserve previous selection if possible
      if (selectedId) {
        const found = (data ?? []).find((v: any) => v.id === selectedId);
        if (!found) setSelectedId(null);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load vehicles');
    }
    setLoading(false);
  }

  async function addVehicle(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    if (!name.trim()) { setError('Name is required'); return; }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('Not signed in'); return; }
      const { error } = await supabase.from('vehicles').insert({ user_id: user.id, name: name.trim(), registration: registration.trim() || null, make: make.trim() || null, model: model.trim() || null });
      if (error) throw error;
      setName(''); setRegistration(''); setMake(''); setModel(''); setShowForm(false);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Could not add vehicle');
    }
  }

  function handleSelect(id: string | null) {
    setSelectedId(id);
    const v = vehicles.find((x) => x.id === id) ?? null;
    if (onSelect) onSelect(v ?? null);
  }

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2">
        <label className="text-sm text-slate-300">Select vehicle</label>
        <select
          className="p-2 bg-slate-900 text-white rounded border border-slate-700 text-sm"
          value={selectedId ?? ''}
          onChange={(e) => handleSelect(e.target.value || null)}
        >
          <option value="">All vehicles</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>{v.name || v.registration || `${v.make ?? ''} ${v.model ?? ''}`}</option>
          ))}
        </select>
        <button type="button" className="ml-auto px-3 py-1.5 rounded bg-sky-600 text-white text-sm" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Close' : 'Add vehicle'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={addVehicle} className="mt-3 p-3 bg-slate-800 rounded text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-slate-400">Name</label>
              <input className="w-full p-2 rounded bg-slate-900 text-white border border-slate-700" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-slate-400">Registration</label>
              <input className="w-full p-2 rounded bg-slate-900 text-white border border-slate-700" value={registration} onChange={(e) => setRegistration(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <label className="block text-xs text-slate-400">Make</label>
              <input className="w-full p-2 rounded bg-slate-900 text-white border border-slate-700" value={make} onChange={(e) => setMake(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-slate-400">Model</label>
              <input className="w-full p-2 rounded bg-slate-900 text-white border border-slate-700" value={model} onChange={(e) => setModel(e.target.value)} />
            </div>
          </div>
          {error && <div className="mt-2 text-xs text-red-400">{error}</div>}
          <div className="mt-3 text-right">
            <button type="submit" className="px-3 py-1.5 rounded bg-emerald-600 text-white text-sm">Save</button>
          </div>
        </form>
      )}

      {loading && <div className="mt-2 text-xs text-slate-400">Loading vehicles...</div>}
      {!loading && vehicles.length === 0 && (
        <div className="mt-2 text-xs text-slate-400">You have no vehicles yet.</div>
      )}

    </div>
  );
}
