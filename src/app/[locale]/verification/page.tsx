'use client';

import React, { useState } from 'react';

export default function VerificationPage() {
  const [cnic, setCnic] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function uploadFile(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  }

  async function runVerify() {
    setError(null);
    setLoading(true);
    try {
      if (!cnic || !selfie) throw new Error('Select both files');
      const a = await uploadFile(cnic);
      const b = await uploadFile(selfie);
      const res = await fetch('/api/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doc_type: 'cnic', doc_url: a.url, selfie_url: b.url }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Verification failed');
      setResult(d);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">AI Verification</h1>
      <div className="space-y-4">
        <div>
          <label className="block mb-1 font-medium">CNIC / Document Photo</label>
          <input type="file" accept="image/*" onChange={(e) => setCnic(e.target.files?.[0] ?? null)} />
        </div>
        <div>
          <label className="block mb-1 font-medium">Selfie</label>
          <input type="file" accept="image/*" onChange={(e) => setSelfie(e.target.files?.[0] ?? null)} />
        </div>
        <div>
          <button onClick={runVerify} disabled={loading} className="px-4 py-2 bg-sky-600 text-white rounded">
            {loading ? 'Running...' : 'Run AI Verification'}
          </button>
        </div>

        {error && <div className="text-red-600">{error}</div>}

        {result && (
          <div className="border p-4 rounded">
            <h2 className="font-semibold">Result</h2>
            <p>Full name: {result.full_name}</p>
            <p>CNIC: {result.cnic_number}</p>
            <p>DOB: {result.dob}</p>
            <p>Face match score: {result.face_match_score}</p>
            <p>Status: {result.ai_decision}</p>
          </div>
        )}
      </div>
    </div>
  );
}
