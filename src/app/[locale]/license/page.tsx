'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LicensePage() {
  const [permit, setPermit] = useState('');
  const [testDate, setTestDate] = useState('');
  const [stage, setStage] = useState('learner_permit');
  const [message, setMessage] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/license', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ permit_number: permit, test_date: testDate }) });
    const d = await res.json();
    if (res.ok) {
      setMessage('Saved');
      setStage(d.current_stage);
    } else setMessage(d.message || 'Error');
  }

  const steps = ['learner_permit','test_scheduled','test_passed','provisional','permanent'];

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">License Progress</h1>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block mb-1">Permit Number</label>
          <input value={permit} onChange={(e)=>setPermit(e.target.value)} className="border p-2 w-full" />
        </div>
        <div>
          <label className="block mb-1">Test Date</label>
          <input type="date" value={testDate} onChange={(e)=>setTestDate(e.target.value)} className="border p-2" />
        </div>
        <button type="submit" className="px-4 py-2 bg-sky-600 text-white rounded">Save</button>
      </form>

      {message && <div className="mt-4">{message}</div>}

      <div className="mt-6">
        <h2 className="font-medium mb-2">Progress</h2>
        <div className="flex gap-2 items-center">
          {steps.map(s => (
            <div key={s} className={`px-3 py-2 rounded ${s===stage?'bg-emerald-500 text-white':'bg-neutral-200'}`}>{s}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
