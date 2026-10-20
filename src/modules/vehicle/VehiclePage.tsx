import React, { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import dynamic from 'next/dynamic';
const Line = dynamic(() => import('recharts').then(m=>m.LineChart), { ssr: false });

export default function VehiclePage(){
  const supabase = createClientComponentClient();
  const [logs, setLogs] = useState<any[]>([]);
  const [type, setType] = useState('fuel');
  const [odometer, setOdometer] = useState('');
  const [liters, setLiters] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(()=>{ fetch(); }, []);
  async function fetch(){
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('vehicle_logs').select('*').order('created_at', { ascending: true });
    setLogs(data || []);
  }

  async function add(e:React.FormEvent){
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    const payload:any = { user_id: user.id, type, odometer_km: odometer||null, liters: liters||null, amount_pkr: amount||null };
    const { error } = await supabase.from('vehicle_logs').insert([payload]);
    if (error) return alert(error.message);
    setOdometer(''); setLiters(''); setAmount('');
    fetch();
  }

  return (
    <div>
      <h1>Vehicle Companion</h1>
      <form onSubmit={add}>
        <label>Type: <select value={type} onChange={e=>setType(e.target.value)}><option value="fuel">Fuel</option><option value="service">Service/Parts</option></select></label>
        <div>
          <label>Odometer km: <input value={odometer} onChange={e=>setOdometer(e.target.value)} /></label>
          <label>Liters: <input value={liters} onChange={e=>setLiters(e.target.value)} /></label>
          <label>Amount PKR: <input value={amount} onChange={e=>setAmount(e.target.value)} /></label>
        </div>
        <button type="submit">Add Log</button>
      </form>
      <h2>Logs</h2>
      <ul>
        {logs.map(l=> <li key={l.id}>{l.type} - {l.odometer_km||''}km - {l.liters||''}L - PKR {l.amount_pkr||''}</li>)}
      </ul>
    </div>
  );
}
