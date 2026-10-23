"use client";

import React, { useState, useEffect } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function OnboardingEnterDetails(){
  const supabase = createBrowserSupabaseClient();
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(()=>{
    (async ()=>{
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) { router.push('/signin'); return; }
      const { data: profile } = await supabase.from('users').select('role,onboarded').eq('id', user.id).maybeSingle();
      setRole(profile?.role || 'learner');
      if (profile?.onboarded) {
        // already onboarded -> redirect to role dashboard
        if (profile.role === 'admin') router.push('/admin');
        else if (profile.role === 'instructor') router.push('/instructor');
        else if (profile.role === 'vendor') router.push('/vendor');
        else router.push('/learner');
        return;
      }
      setLoading(false);
    })();
  },[]);

  if (loading) return <div className="p-4 text-slate-200">Loading...</div>;

  async function handleSubmit(e: React.FormEvent){
    e.preventDefault();
    setError(null);
    const session = await supabase.auth.getSession();
    const user = session.data.session?.user;
    if (!user) return router.push('/signin');
    // store enter details in profiles or enter_details table if available
    const payload = { ...form };
    const { error: upErr } = await supabase.from('users').upsert({ id: user.id, full_name: form.full_name || null, city: form.city || null, onboarded: true });
    if (upErr) { setError(upErr.message); return; }
    // try to insert into enter_details if table exists
    try {
      await supabase.from('enter_details').insert([{ user_id: user.id, role: role, payload }]);
    } catch (e) {
      // ignore — migration may not be applied yet
      console.log('enter_details insert skipped', e);
    }
    // handle file uploads: if any file inputs are present, upload to storage and record links
    if ((form.id_card_file as File)) {
      try {
        const file = form.id_card_file as File;
        const key = `uploads/${user.id}/id_card_${Date.now()}_${file.name}`;
        const { data, error: upFileErr } = await supabase.storage.from('user-uploads').upload(key, file);
        if (!upFileErr) {
          await supabase.from('storage_files').insert([{ user_id: user.id, key: data.path, bucket: 'user-uploads', metadata: { original_name: file.name } }]);
        }
      } catch (e) { console.log('file upload failed', e); }
    }

    // redirect to role dashboard
    if (role === 'admin') router.push('/admin');
    else if (role === 'instructor') router.push('/instructor');
    else if (role === 'vendor') router.push('/vendor');
    else router.push('/learner');
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-4 bg-slate-900 text-slate-100 rounded">
      <h2 className="text-2xl mb-4" style={{color:'var(--cd-primary)'}}>Enter details</h2>
      {error && <div className="mb-2 text-red-400">{error}</div>}
      <label className="block mb-2">Full name
        <input className="w-full p-2 mt-1 rounded bg-slate-800" value={form.full_name||''} onChange={e=>setForm({...form, full_name: e.target.value})} />
      </label>
      <label className="block mb-2">City
        <input className="w-full p-2 mt-1 rounded bg-slate-800" value={form.city||''} onChange={e=>setForm({...form, city: e.target.value})} />
      </label>

      {role === 'instructor' && (
        <>
          <label className="block mb-2">Affiliated school
            <input className="w-full p-2 mt-1 rounded bg-slate-800" value={form.school||''} onChange={e=>setForm({...form, school: e.target.value})} />
          </label>
          <label className="block mb-2">Vehicle details
            <input className="w-full p-2 mt-1 rounded bg-slate-800" value={form.vehicle||''} onChange={e=>setForm({...form, vehicle: e.target.value})} />
          </label>
          <label className="block mb-2">ID card file
            <input className="w-full p-2 mt-1 rounded bg-slate-800" type="file" onChange={e=>setForm({...form, id_card_file: e.target.files?.[0]})} />
          </label>
          <label className="block mb-2">Driving license file
            <input className="w-full p-2 mt-1 rounded bg-slate-800" type="file" onChange={e=>setForm({...form, dl_file: e.target.files?.[0]})} />
          </label>
        </>
      )}

      {role === 'vendor' && (
        <>
          <label className="block mb-2">Services provided
            <textarea className="w-full p-2 mt-1 rounded bg-slate-800" value={form.services||''} onChange={e=>setForm({...form, services: e.target.value})} />
          </label>
        </>
      )}

      <button className="w-full p-2 mt-4 rounded bg-teal-500 text-slate-900" type="submit">Continue</button>
    </form>
  );
}
