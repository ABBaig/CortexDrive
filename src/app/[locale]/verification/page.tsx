'use client';

import React, { useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

function StatusBadge({ status }: { status: string }) {
  if (!status) return null;
  const map: Record<string, { label: string; cls: string }> = {
    verified: { label: 'Verified', cls: 'bg-emerald-100 text-emerald-800' },
    needs_review: { label: 'Needs Review', cls: 'bg-amber-100 text-amber-800' },
    rejected: { label: 'Rejected', cls: 'bg-red-100 text-red-800' },
    pending: { label: 'Pending', cls: 'bg-neutral-100 text-neutral-800' },
  };
  const p = map[status] ?? { label: status, cls: 'bg-neutral-100 text-neutral-800' };
  return <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${p.cls}`}>{p.label}</span>;
}

export default function VerificationPage() {
  const [cnic, setCnic] = useState<File | null>(null);
  const [license, setLicense] = useState<File | null>(null);
  const [docType, setDocType] = useState<'cnic' | 'driving_license'>('cnic');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const supabase = getSupabaseBrowserClient();

  async function uploadToStorage(file: File, userId: string, namePrefix: string) {
    const ts = Date.now();
    const path = `verifications/${userId}/${namePrefix}-${ts}-${file.name}`;
    const bucket = 'verifications';
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
    if (error) throw new Error(error.message);
    // store the storage path (data.path)
    return data.path;
  }

  async function submit() {
    setMessage(null);
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be signed in');
      if (!cnic || (docType === 'driving_license' && !license)) throw new Error('Please select required files');

      // Upload files to private storage under verifications/{user.id}/...
      const cnicPath = await uploadToStorage(cnic, user.id, 'cnic');
      let licensePath = null;
      if (docType === 'driving_license' && license) {
        licensePath = await uploadToStorage(license, user.id, 'license');
      }

      // Insert verification row
      const payload: any = {
        user_id: user.id,
        type: docType,
        doc_url: licensePath ?? cnicPath,
        selfie_url: null,
        status: 'pending',
      };

      const { data, error } = await supabase.from('verifications').insert(payload).select('*').single();
      if (error) throw new Error(error.message);

      setMessage('Verification submitted and is pending review.');
    } catch (e: any) {
      setMessage(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Verification</h1>

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
          <label className="block mb-1 font-medium">CNIC / ID Photo</label>
          <input type="file" accept="image/*" onChange={(e) => setCnic(e.target.files?.[0] ?? null)} />
        </div>

        {docType === 'driving_license' && (
          <div>
            <label className="block mb-1 font-medium">Driving License Photo</label>
            <input type="file" accept="image/*" onChange={(e) => setLicense(e.target.files?.[0] ?? null)} />
          </div>
        )}

        <div className="flex items-center gap-3">
          <button onClick={submit} disabled={loading} className="px-4 py-2 bg-sky-600 text-white rounded">
            {loading ? 'Submitting...' : 'Submit for verification'}
          </button>
        </div>

        {message && <div className="text-sm text-neutral-700">{message}</div>}
      </div>
    </div>
  );
}
