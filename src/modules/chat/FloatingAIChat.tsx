'use client';
import React, { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

export default function FloatingAIChat({ locale }: { locale: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = React.useState<{ id: string; from: 'user' | 'ai'; text: string }[]>([]);
  const [input, setInput] = React.useState('');
  const t = useTranslations('AiTutor');
  const tc = useTranslations('Chat');
  const tCommon = useTranslations('Common');

  const greeting = t('greeting');

  async function send() {
    if (!input || loading) return;
    const text = input;
    setInput('');
    setMessages((m) => [...m, { id: Date.now().toString(), from: 'user', text }]);
    setLoading(true);
    try {
      const res = await fetch('/api/ai-tutor', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: text, locale }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'failed');
      const aiText = json.answer || '[NO_ANSWER]';
      setMessages((m) => [...m, {
        id: Date.now().toString() + ':ai',
        from: 'ai',
        text: aiText + (json.mock ? '\n\n' + tc('mockAiNotice') : ''),
      }]);
    } catch {
      setMessages((m) => [...m, { id: Date.now().toString() + ':err', from: 'ai', text: tCommon('error') }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed right-4 bottom-4 z-50">
      <div className="flex flex-col items-end">
        {/* Greeting bubble — appears when the site loads and the chat is closed */}
        {!open && (
          <div className="mb-2 max-w-[240px] px-3 py-2 rounded-xl rounded-br-sm bg-slate-800 text-slate-100 text-xs shadow-lg ring-1 ring-slate-600">
            {greeting}
          </div>
        )}

        {open && (
          <div className="w-80 h-96 bg-slate-900 shadow-2xl rounded-xl mb-2 flex flex-col overflow-hidden ring-1 ring-slate-600">
            <div className="p-2 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Image
                  src="/logo.png"
                  alt="Cortexa"
                  width={24}
                  height={24}
                  className="w-6 h-6 rounded-full bg-slate-700 object-cover"
                />
                <span className="font-medium text-white">{t('title')}</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-sm text-slate-400 hover:text-white">{t('close')}</button>
            </div>
            <div className="p-2 flex-1 overflow-auto text-sm bg-slate-900">
              {messages.length === 0 ? (
                <div className="text-slate-400">{t('empty')}</div>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className={m.from === 'user' ? 'text-right mb-1' : 'text-left mb-1'}>
                    <div className={m.from === 'user'
                      ? 'inline-block bg-sky-600 text-white p-2 rounded'
                      : 'inline-block bg-slate-800 text-slate-100 p-2 rounded'}>
                      {m.text}
                    </div>
                  </div>
                ))
              )}
              {loading && <div className="text-slate-400 text-sm">{tCommon('loading')}</div>}
            </div>
            <div className="p-2 border-t border-slate-700">
              <div className="flex gap-2">
                <input value={input} onChange={(e) => setInput(e.target.value)} className="flex-1 p-2 rounded bg-slate-800 text-white border border-slate-600 focus:outline-none" />
                <button disabled={loading} onClick={send} className="px-3 py-1 bg-sky-600 text-white rounded">{t('ask')}</button>
              </div>
            </div>
          </div>
        )}

        {/* The AI button — the CortexDrive logo itself */}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={t('title')}
          className="w-12 h-12 rounded-full bg-slate-800 ring-1 ring-slate-600 flex items-center justify-center shadow-lg overflow-hidden hover:ring-sky-500 transition"
        >
          <Image
            src="/logo.png"
            alt="Cortexa"
            width={48}
            height={48}
            className="w-12 h-12 object-cover rounded-full"
          />
        </button>
      </div>
    </div>
  );
}