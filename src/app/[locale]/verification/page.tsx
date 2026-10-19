'use client';

import React, { useState } from 'react';

function StatusBadge({ status }: { status: string }) {
  if (!status) return null;
  const map: Record<string, { label: string; cls: string }> = {
    verified: { label: 'AI-Verified', cls: 'bg-emerald-100 text-emerald-800' },
    needs_review: { label: 'Needs Review', cls: 'bg-amber-100 text-amber-800' },
    rejected: { label: 'Rejected', cls: 'bg-red-100 text-red-800' },
    pending: { label: 'Pending', cls: 'bg-neutral-100 text-neutral-800' },
  };
  const p = map[status] ?? { label: status, cls: 'bg-neutral-100 text-neutral-800' };
  return <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${p.cls}`}>{p.label}</span>;
}

function ScoreBar({ score }: { score: number | null }) {
  const pct = score != null ? Math.max(0, Math.min(100, Math.round(score * 100))) : 0;
  const color = score == null ? 'bg-neutral-200' : score >= 0.75 ? 'bg-emerald-500' : score >= 0.5 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="w-full">
      <div className="w-full h-3 bg-neutral-200 rounded overflow-hidden">
        <div style={{ width: `${pct}%` }} className={`${color} h-3`} />
      </div>
      <div className="text-sm mt-1">Score: {score == null ? '—' : `${pct}%`}</div>
    </div>
  );
}

export default function VerificationPage() {
  const [cnic, setCnic] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [docType, setDocType] = useState<'cnic' | 'driving_license'>('cnic');
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
    setResult(null);
    try {
      if (!cnic || !selfie) throw new Error('Select both document and selfie files');
      const a = await uploadFile(cnic);
      const b = await uploadFile(selfie);
      const res = await fetch('/api/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doc_type: docType, doc_url: a.url, selfie_url: b.url }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Verification failed');
      // Gracefully handle empty responses
      if (!d || !('face_match_score' in d)) {
        setError('AI returned an unexpected response. Please try again.');
      } else {
        setResult(d);
      }
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">AI Verification</h1>

      <div className="space-y-4">
        <div>
          <label className="block mb-1 font-medium">Document type</label>
          <div className="flex gap-2">
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="doc" checked={docType === 'cnic'} onChange={() => setDocType('cnic')} />
              <span>CNIC / National ID</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="doc" checked={docType === 'driving_license'} onChange={() => setDocType('driving_license')} />
              <span>Driving License (instructors)</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block mb-1 font-medium">Document Photo</label>
          <input type="file" accept="image/*" onChange={(e) => setCnic(e.target.files?.[0] ?? null)} />
        </div>
        <div>
          <label className="block mb-1 font-medium">Selfie</label>
          <input type="file" accept="image/*" onChange={(e) => setSelfie(e.target.files?.[0] ?? null)} />
        </div>

        <div className="flex items-center gap-3">
          <button onClick={runVerify} disabled={loading} className="px-4 py-2 bg-sky-600 text-white rounded">
            {loading ? 'Running...' : 'Run AI Verification'}
          </button>
          <button
            onClick={() => {
              setCnic(null);
              setSelfie(null);
              setResult(null);
              setError(null);
            }}
            className="px-3 py-2 border rounded"
          >
            Reset
          </button>
        </div>

        {error && (
          <div className="text-red-600">
            {error} <button onClick={runVerify} className="underline ml-2">Retry</button>
          </div>
        )}

        {result && (
          <div className="border p-4 rounded space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">AI Result</h2>
              <StatusBadge status={result.ai_decision} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="text-sm text-neutral-500">Full name</div>
                <div className="font-medium">{result.full_name ?? '—'}</div>

                <div className="text-sm text-neutral-500 mt-2">CNIC / ID</div>
                <div className="font-medium">{result.cnic_number ?? '—'}</div>

                <div className="text-sm text-neutral-500 mt-2">Date of birth</div>
                <div className="font-medium">{result.dob ?? '—'}</div>

                {result.issue_date && (
                  <>
                    <div className="text-sm text-neutral-500 mt-2">Issue</div>
                    <div className="font-medium">{result.issue_date}</div>
                  </>
                )}
                {result.expiry_date && (
                  <>
                    <div className="text-sm text-neutral-500 mt-2">Expiry</div>
                    <div className="font-medium">{result.expiry_date}</div>
                  </>
                )}
              </div>

              <div>
                <div className="text-sm text-neutral-500">Face match</div>
                <div className="mt-2">
                  <ScoreBar score={typeof result.face_match_score === 'number' ? result.face_match_score : null} />
                </div>

                <div className="text-sm text-neutral-500 mt-4">Raw AI payload</div>
                <pre className="text-xs bg-neutral-50 p-2 rounded max-h-48 overflow-auto">{JSON.stringify(result.raw ?? result.ocr_payload ?? {}, null, 2)}</pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
