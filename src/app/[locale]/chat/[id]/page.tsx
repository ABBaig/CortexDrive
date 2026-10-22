'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';

export default function ChatPage() {
  const params = useParams();
  const id = params?.id as string;
  const supabase = getSupabaseBrowserClient();
  const t = useTranslations('Chat');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const subRef = useRef<any>(null);

  useEffect(()=>{
    if (!id) return;
    let mounted = true;
    (async ()=>{
      setLoading(true);
      try {
        const res = await fetch(`/api/chat/messages?conversation_id=${id}`);
        if (!res.ok) throw new Error('failed');
        const json = await res.json();
        if (!mounted) return;
        setMessages(json.items || []);
      } catch (e:any) { setError(String(e)); }
      setLoading(false);
    })();

    // subscribe
    const ch = supabase.channel(`conversation:${id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversation_messages' }, (payload)=>{
      if (payload.new.conversation_id === id) setMessages(m=>[...m, payload.new]);
    }).subscribe();
    subRef.current = ch;
    return ()=>{ ch.unsubscribe(); mounted=false; };
  },[id, supabase]);

  async function send() {
    if (!input) return;
    try {
      const res = await fetch('/api/chat/messages', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({ conversation_id: id, body: input }) });
      if (!res.ok) throw new Error('send failed');
      const json = await res.json();
      setMessages(m=>[...m, json.message]);
      setInput('');
    } catch (e:any) { setError(String(e)); }
  }

  async function escalate() {
    try {
      const res = await fetch('/api/chat/escalate', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({ conversation_id: id }) });
      if (!res.ok) throw new Error('escalate failed');
      alert('Admin connected');
    } catch (e:any) { alert('Could not connect admin'); }
  }

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-medium">Chat</h2>
        <button onClick={escalate} className="px-3 py-1 bg-amber-500 text-white rounded">{t('connectAdmin')}</button>
      </div>
      <div className="border rounded p-3 mb-3 h-96 overflow-auto">
        {loading ? <div className="text-neutral-400">Loading...</div> : error ? <div className="text-red-600">{error}</div> : messages.length===0 ? <div className="text-neutral-400">No messages yet</div> : messages.map((m,i)=>(
          <div key={i} className="mb-2">
            <div className="text-sm text-neutral-500">{m.sender?.full_name ?? m.sender_id}</div>
            <div className="p-2 bg-slate-100 rounded inline-block">{m.body}</div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={input} onChange={e=>setInput(e.target.value)} className="flex-1 p-2 border rounded" />
        <button onClick={send} className="px-3 py-1 bg-sky-500 text-white rounded">Send</button>
      </div>
    </div>
  );
}
