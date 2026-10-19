'use client';
import React, { useEffect, useState } from 'react';

export default function AITutorPage() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(()=>{
    // load history placeholder (real history requires DB migration to be applied)
    const hist = localStorage.getItem('ai_tutor_history');
    if (hist) setMessages(JSON.parse(hist));
  },[]);

  async function send() {
    if (!message.trim()) return;
    const userMsg = message.trim();
    setMessages((m)=>[...m, { role: 'user', text: userMsg }]);
    setMessage('');
    setLoading(true);
    try {
      const res = await fetch('/api/ai-tutor', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ message: userMsg }) });
      const d = await res.json();
      const reply = d.reply || d.message || 'No reply';
      setMessages((m)=>[...m, { role: 'assistant', text: reply }]);
      // save locally for preview
      localStorage.setItem('ai_tutor_history', JSON.stringify([...messages, { role: 'user', text: userMsg }, { role: 'assistant', text: reply }]));
    } catch (e) {
      setMessages((m)=>[...m, { role: 'assistant', text: 'Error contacting AI. Please try again.' }]);
    } finally { setLoading(false); }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">AI Driving Tutor</h1>
      <div className="border rounded p-4 mb-4 max-h-96 overflow-auto space-y-2 bg-white">
        {messages.length===0 && <div className="text-neutral-500">Start a conversation with the AI driving tutor. Replies are short and practical.</div>}
        {messages.map((m,i)=> (
          <div key={i} className={`p-2 rounded ${m.role==='user'?'bg-neutral-100 self-end':'bg-sky-50'}`}>{m.text}</div>
        ))}
      </div>
      <div className="flex gap-2">
        <input className="flex-1 border p-2" value={message} onChange={(e)=>setMessage(e.target.value)} />
        <button className="px-4 py-2 bg-sky-600 text-white rounded" onClick={send} disabled={loading}>{loading?'Sending...':'Send'}</button>
      </div>
    </div>
  );
}
