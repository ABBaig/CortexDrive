'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';

export default function FloatingAIWidget() {
  const locale = useLocale();
  const t = useTranslations('AiTutor');
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{role:string, content:string}[]>([]);
  const [input, setInput] = useState('');
  const cooldown = useRef(false);

  async function send() {
    if (!input.trim()) return;
    const userMsg = { role: 'user', content: input };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    if (cooldown.current) return;
    cooldown.current = true;
    setTimeout(() => (cooldown.current = false), 1000);
    try {
      const res = await fetch('/api/ai-tutor', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prompt: input, locale }) });
      const json = await res.json();
      setMessages((m) => [...m, { role: 'assistant', content: json.answer ?? 'No answer' }]);
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', content: 'Error' }]);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="flex flex-col items-end">
        {open && (
          <div className="w-80 max-h-96 bg-white shadow-lg rounded p-2 flex flex-col">
            <div className="text-sm font-medium mb-2">{t('widgetTitle')}</div>
            <div className="flex-1 overflow-auto mb-2">
              {messages.map((m, i) => (
                <div key={i} className={`mb-1 p-1 rounded ${m.role==='user'? 'bg-sky-100 self-end':'bg-gray-100 self-start'}`}>{m.content}</div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={input} onChange={(e)=>setInput(e.target.value)} className="flex-1 border p-1 rounded" />
              <button onClick={send} className="px-3 py-1 bg-sky-600 text-white rounded">{t('send')}</button>
            </div>
          </div>
        )}
        <button onClick={() => setOpen((o)=>!o)} className="mt-2 w-12 h-12 rounded-full bg-sky-600 text-white">AI</button>
      </div>
    </div>
  );
}
