'use client';
import React, { useRef, useState } from 'react';

export default function BookingPage() {
  const [tracking, setTracking] = useState(false);
  const watchId = useRef<number | null>(null);
  const [events, setEvents] = useState<{ time: number; delta_kmh: number; type: string }[]>([]);
  const [lastLocation, setLastLocation] = useState<{ lat:number; lng:number } | null>(null);
  const [lastSpeed, setLastSpeed] = useState<number | null>(null);

  function toKmh(mps?: number | null) { if (mps == null) return null; return Math.round(mps * 3.6); }

  function start() {
    if (!('geolocation' in navigator)) return alert('Geolocation not supported');
    const id = navigator.geolocation.watchPosition((pos)=>{
      const speed = pos.coords.speed; // meters/sec or null
      const kh = toKmh(speed);
      if (lastSpeed != null && kh != null) {
        const delta = Math.abs(kh - lastSpeed);
        if (delta >= 10) {
          const type = kh > lastSpeed ? 'harsh_acceleration' : 'harsh_braking';
          setEvents(e=>[...e, { time: Date.now(), delta_kmh: delta, type }]);
        }
      }
      setLastSpeed(kh);
      setLastLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    }, (err)=>{ alert('Location error: '+err.message); }, { maximumAge: 0, timeout: 10000, enableHighAccuracy: true, distanceFilter: 0 });
    // geolocation.watchPosition returns a number id
    // @ts-ignore
    watchId.current = id as number;
    setTracking(true);
  }

  function end() {
    if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current as number);
    setTracking(false);
    // Save events to server (for preview we just console.log)
    (async ()=>{
      try {
        await fetch('/api/booking/telematics', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ events, lastLocation }) });
        alert('Trip saved');
        setEvents([]);
      } catch (e) { alert('Save failed'); }
    })();
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Booking Trip Telematics</h1>
      <div className="mb-4">
        {tracking ? (
          <button className="px-4 py-2 bg-red-600 text-white rounded" onClick={end}>End Trip</button>
        ) : (
          <button className="px-4 py-2 bg-emerald-600 text-white rounded" onClick={start}>Start Trip</button>
        )}
      </div>

      <div className="mb-4">
        <h2 className="font-medium">Latest location</h2>
        {lastLocation ? <div>{lastLocation.lat.toFixed(5)},{lastLocation.lng.toFixed(5)}</div> : <div className="text-neutral-500">No location yet</div>}
      </div>

      <div>
        <h2 className="font-medium">Harsh events</h2>
        {events.length===0 && <div className="text-neutral-500">No events</div>}
        <ul className="mt-2 space-y-2">
          {events.map((ev,i)=> (
            <li key={i} className="border p-2 rounded">{new Date(ev.time).toLocaleString()} — {ev.type} — Δ {ev.delta_kmh} km/h</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
