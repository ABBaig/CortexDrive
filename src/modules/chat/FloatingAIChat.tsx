'use client';
import React, { useState } from 'react';
import { useLocale } from 'next-intl';

export default function FloatingAIChat({ locale }: { locale: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<{id:string, from:'user'|'ai', text:string}[]>([]);
  const [input, setInput] = useState('');
  const i18n = useLocale();

  async function send() {
    if (!input) return;
    const text = input;
    setInput('');
    const userMsg = { id: Date.now().toString(), from: 'user' as const, text };
    setMessages(m=>[...m, userMsg]);
    setLoading(true);
    try {
      const res = await fetch('/api/ai-tutor', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({ message: text, locale }) });
      const json = await res.json();
      const aiText = json.answer || json.data || '[MOCK ANSWER]';
      const aiMsg = { id: Date.now().toString()+':ai', from: 'ai' as const, text: aiText + (json.mock? ' \n\n'+i18n('Chat.mockAiNotice'): '') };
      setMessages(m=>[...m, aiMsg]);
    } catch (err) {
      setMessages(m=>[...m, { id: Date.now().toString()+':err', from: 'ai', text: 'Error contacting AI' }]);
    } finally { setLoading(false); }
  }

  return (
    <div>
      <div className="fixed right-4 bottom-4 z-50">
        <div className="flex flex-col items-end">
          {open && (
            <div className="w-80 h-96 bg-white shadow rounded mb-2 flex flex-col overflow-hidden">
              <div className="p-2 border-b flex items-center justify-between">
                <div className="font-medium">AI Tutor</div>
                <button onClick={()=>setOpen(false)} className="text-sm">Close</button>
              </div>
              <div className="p-2 flex-1 overflow-auto text-sm">
                {messages.length===0 ? <div className="text-muted">Ask a driving question</div> : messages.map(m=> (
                  <div key={m.id} className={m.from==='user'? 'text-right':'text-left'}>
                    <div className={m.from==='user'? 'inline-block bg-sky-100 text-sky-900 p-2 rounded':'inline-block bg-slate-100 text-slate-800 p-2 rounded'}>{m.text}</div>
                  </div>
                ))}
              </div>
              <div className="p-2 border-t">
                <div className="flex gap-2">
                  <input value={input} onChange={e=>setInput(e.target.value)} className="flex-1 p-2 border rounded" />
                  <button disabled={loading} onClick={send} className="px-3 py-1 bg-sky-500 text-white rounded">Ask</button>
                </div>
              </div>
            </div>
          )}
          <button onClick={()=>setOpen(v=>!v)} className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow">AI</button>
        </div>
      </div>
    </div>
  );
}
