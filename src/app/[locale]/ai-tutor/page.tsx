'use client';
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import BackButton from '@/components/BackButton';

export default function AITutorPage() {
  const t = useTranslations('AiTutor');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // load history placeholder (real history requires DB migration to be applied)
    const hist = localStorage.getItem('ai_tutor_history');
    if (hist) setMessages(JSON.parse(hist));
  }, []);

  async function send() {
    if (!message.trim()) return;
    const userMsg = message.trim();
    setMessages((m) => [...m, { role: 'user', text: userMsg }]);
    setMessage('');
    setLoading(true);
    try {
      const res = await fetch('/api/ai-tutor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: userMsg }) });
      const d = await res.json();
      const reply = d.reply || d.message || d.answer || 'No reply';
      setMessages((m) => [...m, { role: 'assistant', text: reply }]);
      // save locally for preview
      localStorage.setItem('ai_tutor_history', JSON.stringify([...messages, { role: 'user', text: userMsg }, { role: 'assistant', text: reply }]));
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', text: 'Error contacting AI. Please try again.' }]);
    } finally { setLoading(false); }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <BackButton />
      <div className="flex items-center gap-3 mb-4">
        <Image
          src="/logo.png"
          alt="Cortexa"
          width={40}
          height={40}
          className="w-10 h-10 rounded-full object-cover"
        />
        <h1 className="text-2xl font-semibold text-white">{t('title')}</h1>
      </div>
      <div className="border border-slate-700 rounded p-4 mb-4 max-h-96 overflow-auto space-y-2 bg-slate-900">
        {messages.length === 0 && <div className="text-slate-400">{t('greeting')}</div>}
        {messages.map((m, i) => (
          <div key={i} className={`p-2 rounded ${m.role === 'user' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-100'}`}>{m.text}</div>
        ))}
      </div>
      <div className="flex gap-2">
        <input className="flex-1 p-2 rounded bg-slate-800 text-white border border-slate-600 focus:outline-none focus:border-sky-500" value={message} onChange={(e) => setMessage(e.target.value)} />
        <button className="px-4 py-2 bg-sky-600 text-white rounded" onClick={send} disabled={loading}>{loading ? 'Sending...' : t('ask')}</button>
      </div>
    </div>
  );
}