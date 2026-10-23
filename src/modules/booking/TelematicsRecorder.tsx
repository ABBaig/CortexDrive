'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';

type Booking = {
  id: string;
  status: string;
  start_time: string | null;
  learner_id: string;
  instructor_id: string;
};

type TelemetryEvent = {
  event: 'harsh_brake' | 'harsh_accel' | 'speeding';
  ts: string;
  speed: number;
};

type Props = {
  booking: Booking;
  onClose: () => void;
  onFinished: () => void;
};

// Detection thresholds (Bykea-style, no hardware):
const HARSH_BRAKE_KMH = 20; // losing 20+ km/h within WINDOW_S
const HARSH_ACCEL_KMH = 15; // gaining 15+ km/h within WINDOW_S
const SPEEDING_KMH = 120;
const WINDOW_S = 3;
const STALE_FIX_MS = 15000;

export default function TelematicsRecorder({ booking, onClose, onFinished }: Props) {
  const t = useTranslations('Telematics');
  const tc = useTranslations('Common');
  const supabase = getSupabaseBrowserClient();
  const [running, setRunning] = useState(false);
  const [supported, setSupported] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [curSpeed, setCurSpeed] = useState<number | null>(null);
  const [maxSpeed, setMaxSpeed] = useState(0);
  const [distanceKm, setDistanceKm] = useState(0);
  const [durationS, setDurationS] = useState(0);
  const [eventCounts, setEventCounts] = useState({ brake: 0, accel: 0, speeding: 0 });
  const [samples, setSamples] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [markingCompleted, setMarkingCompleted] = useState(false);

  // refs (kept out of re-render path)
  const watchIdRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const lastFixRef = useRef<{ lat: number; lng: number; t: number } | null>(null);
  const windowStartRef = useRef<{ speed: number; t: number } | null>(null);
  const distanceRef = useRef(0);
  const maxSpeedRef = useRef(0);
  const durationRef = useRef(0);
  const eventsRef = useRef<TelemetryEvent[]>([]);
  const speedSamplesRef = useRef<number[]>([]);
  const samplesRef = useRef(0);
  const runningRef = useRef(false);
  const harshBrakeCooldownRef = useRef(0);
  const harshAccelCooldownRef = useRef(0);
  const speedingCooldownRef = useRef(0);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setSupported(false);
    }
    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      runningRef.current = false;
    };
  }, []);

  function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  function pushEvent(kind: TelemetryEvent['event'], speedKmh: number) {
    eventsRef.current.push({ event: kind, ts: new Date().toISOString(), speed: Math.round(speedKmh * 10) / 10 });
    setEventCounts((c) => ({
      brake: c.brake + (kind === 'harsh_brake' ? 1 : 0),
      accel: c.accel + (kind === 'harsh_accel' ? 1 : 0),
      speeding: c.speeding + (kind === 'speeding' ? 1 : 0),
    }));
  }

  function onFix(pos: GeolocationPosition) {
    if (!runningRef.current) return;
    const now = Date.now();
    const { latitude: lat, longitude: lng, speed: gpsSpeed, accuracy } = pos.coords;
    samplesRef.current += 1;
    setSamples(samplesRef.current);

    // GPS-provided speed (m/s) when available; else haversine between fixes.
    let speedKmh: number | null = null;
    if (typeof gpsSpeed === 'number' && !Number.isNaN(gpsSpeed) && gpsSpeed >= 0) {
      speedKmh = gpsSpeed * 3.6;
    } else if (lastFixRef.current) {
      const dt = (now - lastFixRef.current.t) / 1000;
      if (dt > 0.5 && dt < STALE_FIX_MS / 1000) {
        const d = haversineKm(lastFixRef.current.lat, lastFixRef.current.lng, lat, lng);
        // ignore GPS noise: skip sub-accuracy jumps
        if (d * 1000 > (accuracy ?? 30)) {
          speedKmh = (d / dt) * 3600;
        }
      }
    }
    // distance (only from fixes, never from computed speed)
    if (lastFixRef.current) {
      const dt = (now - lastFixRef.current.t) / 1000;
      if (dt < STALE_FIX_MS / 1000) {
        distanceRef.current += haversineKm(lastFixRef.current.lat, lastFixRef.current.lng, lat, lng);
        setDistanceKm(Math.round(distanceRef.current * 100) / 100);
      }
    }
    lastFixRef.current = { lat, lng, t: now };

    if (speedKmh !== null) {
      setCurSpeed(Math.round(speedKmh * 10) / 10);
      speedSamplesRef.current.push(speedKmh);
      if (speedKmh > maxSpeedRef.current) {
        maxSpeedRef.current = speedKmh;
        setMaxSpeed(Math.round(speedKmh * 10) / 10);
      }

      // --- event detection over the rolling window ---
      const ws = windowStartRef.current;
      if (!ws) {
        windowStartRef.current = { speed: speedKmh, t: now };
      } else {
        const dWS = (now - ws.t) / 1000;
        if (dWS >= WINDOW_S) {
          const delta = speedKmh - ws.speed;
          if (delta <= -HARSH_BRAKE_KMH && now - harshBrakeCooldownRef.current > 5000) {
            pushEvent('harsh_brake', speedKmh);
            harshBrakeCooldownRef.current = now;
          } else if (delta >= HARSH_ACCEL_KMH && now - harshAccelCooldownRef.current > 5000) {
            pushEvent('harsh_accel', speedKmh);
            harshAccelCooldownRef.current = now;
          }
          windowStartRef.current = { speed: speedKmh, t: now };
        }
      }
      // speeding (instant, with cooldown to avoid duplicate flags per stint)
      if (speedKmh > SPEEDING_KMH && now - speedingCooldownRef.current > 30000) {
        pushEvent('speeding', speedKmh);
        speedingCooldownRef.current = now;
      }
    }

    if (startedAtRef.current !== null) {
      durationRef.current = Math.floor((now - startedAtRef.current) / 1000);
      setDurationS(durationRef.current);
    }
  }

  function onError(err: GeolocationPositionError) {
    if (err.code === err.PERMISSION_DENIED) {
      setPermissionDenied(true);
      stopTracking();
    }
  }

  function startTracking() {
    if (!navigator.geolocation) {
      setSupported(false);
      return;
    }
    setError(null);
    startedAtRef.current = Date.now();
    lastFixRef.current = null;
    windowStartRef.current = null;
    distanceRef.current = 0;
    maxSpeedRef.current = 0;
    durationRef.current = 0;
    eventsRef.current = [];
    speedSamplesRef.current = [];
    samplesRef.current = 0;
    harshBrakeCooldownRef.current = 0;
    harshAccelCooldownRef.current = 0;
    speedingCooldownRef.current = 0;
    setMaxSpeed(0);
    setDistanceKm(0);
    setDurationS(0);
    setSamples(0);
    setEventCounts({ brake: 0, accel: 0, speeding: 0 });
    setSaved(false);
    setScore(null);
    runningRef.current = true;
    setRunning(true);
    watchIdRef.current = navigator.geolocation.watchPosition(onFix, onError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 20000,
    });
  }

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    runningRef.current = false;
    setRunning(false);
  }, []);

  function computeScore(): number | null {
    const n = speedSamplesRef.current.length;
    if (n === 0 || durationRef.current < 60) return null; // too short to grade
    const avg = speedSamplesRef.current.reduce((s, v) => s + v, 0) / n;
    const brake = eventsRef.current.filter((e) => e.event === 'harsh_brake').length;
    const accel = eventsRef.current.filter((e) => e.event === 'harsh_accel').length;
    const speeding = eventsRef.current.filter((e) => e.event === 'speeding').length;
    const perHour = durationRef.current > 0 ? durationRef.current / 3600 : 0;
    const brakeRate = perHour > 0 ? brake / perHour : brake;
    const accelRate = perHour > 0 ? accel / perHour : accel;
    let score = 100;
    score -= Math.min(50, brakeRate * 15);
    score -= Math.min(20, accelRate * 5);
    score -= Math.min(30, speeding * 10);
    // gentle reward for steady average speed (neither crawling nor racing)
    if (avg > 15 && avg < 100) score += 2;
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  async function saveResults() {
    setError(null);
    if (durationRef.current < 60) {
      setError(t('tooShort'));
      return;
    }
    setSaving(true);
    const computedScore = computeScore();
    const payload = {
      device: 'geolocation',
      started_at: startedAtRef.current ? new Date(startedAtRef.current).toISOString() : null,
      ended_at: new Date().toISOString(),
      duration_s: durationRef.current,
      distance_km: Math.round(distanceRef.current * 100) / 100,
      max_speed: Math.round(maxSpeedRef.current * 10) / 10,
      avg_speed:
        speedSamplesRef.current.length > 0
          ? Math.round(
              (speedSamplesRef.current.reduce((s, v) => s + v, 0) / speedSamplesRef.current.length) * 10
            ) / 10
          : null,
      harsh_brake_count: eventsRef.current.filter((e) => e.event === 'harsh_brake').length,
      harsh_accel_count: eventsRef.current.filter((e) => e.event === 'harsh_accel').length,
      speeding_count: eventsRef.current.filter((e) => e.event === 'speeding').length,
      events: eventsRef.current,
    };
    const { error: dbError } = await supabase
      .from('bookings')
      .update({ telematics: payload, telematics_score: computedScore })
      .eq('id', booking.id);
    setSaving(false);
    if (dbError) {
      setError(t('saveFailed'));
      return;
    }
    setScore(computedScore);
    setSaved(true);
  }

  async function markCompleted() {
    setError(null);
    setMarkingCompleted(true);
    const { error: dbError } = await supabase
      .from('bookings')
      .update({ status: 'completed' })
      .eq('id', booking.id);
    setMarkingCompleted(false);
    if (dbError) {
      setError(t('saveFailed'));
      return;
    }
    onFinished();
  }

  function fmtDur(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md bg-slate-800 rounded-xl ring-1 ring-slate-600 p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{t('title')}</h2>
          {!running && (
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none" aria-label="close">×</button>
          )}
        </div>

        {!supported && <div className="mt-4 text-sm text-red-400">{t('notSupported')}</div>}

        {supported && permissionDenied && (
          <div className="mt-4 text-sm text-amber-400">{t('permissionDenied')}</div>
        )}

        {supported && !permissionDenied && (
          <>
            {/* live speed */}
            <div className="mt-4 text-center">
              <div className="text-xs text-slate-400">{t('currentSpeed')}</div>
              <div className="text-5xl font-bold text-white tabular-nums">
                {curSpeed !== null ? Math.round(curSpeed) : '—'}
                <span className="text-lg text-slate-400 ml-1">km/h</span>
              </div>
              {running && (
                <div className="mt-1">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {t('recording')}
                  </span>
                </div>
              )}
            </div>

            {/* stats grid */}
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div className="p-2.5 bg-slate-900/60 rounded-lg">
                <div className="text-xs text-slate-400">{t('duration')}</div>
                <div className="text-white font-semibold tabular-nums">{fmtDur(durationS)}</div>
              </div>
              <div className="p-2.5 bg-slate-900/60 rounded-lg">
                <div className="text-xs text-slate-400">{t('distance')}</div>
 <div className="text-white font-semibold tabular-nums">{distanceKm.toFixed(2)} km</div>
              </div>
              <div className="p-2.5 bg-slate-900/60 rounded-lg">
                <div className="text-xs text-slate-400">{t('maxSpeed')}</div>
                <div className="text-white font-semibold tabular-nums">{maxSpeed} km/h</div>
              </div>
              <div className="p-2.5 bg-slate-900/60 rounded-lg">
                <div className="text-xs text-slate-400">{t('gpsSamples')}</div>
                <div className="text-white font-semibold tabular-nums">{samples}</div>
              </div>
            </div>

            {/* flagged events */}
            <div className="mt-3 flex gap-2 flex-wrap">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${eventCounts.brake > 0 ? 'bg-red-500/15 text-red-300 ring-1 ring-red-500/30' : 'bg-slate-900/60 text-slate-400'}`}>
                {t('harshBrakes')}: {eventCounts.brake}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${eventCounts.accel > 0 ? 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30' : 'bg-slate-900/60 text-slate-400'}`}>
                {t('harshAccels')}: {eventCounts.accel}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${eventCounts.speeding > 0 ? 'bg-red-500/15 text-red-300 ring-1 ring-red-500/30' : 'bg-slate-900/60 text-slate-400'}`}>
                {t('speeding')}: {eventCounts.speeding}
              </span>
            </div>

            {error && <div className="mt-3 text-sm text-red-400">{error}</div>}

            {!running && !saved && (
              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={startTracking}
                  className="w-full px-4 py-2.5 rounded-lg bg-sky-600 text-white font-medium hover:bg-sky-500"
                >
                  {t('start')}
                </button>
                <p className="text-xs text-slate-500 text-center">{t('deviceOnlyNote')}</p>
              </div>
            )}

            {running && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => {
                    stopTracking();
                  }}
                  className="w-full px-4 py-2.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-500"
                >
                  {t('stop')}
                </button>
              </div>
            )}

            {!running && samples > 0 && !saved && (
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => void saveResults()}
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-500 disabled:opacity-50"
                >
                  {saving ? tc('loading') : t('save')}
                </button>
                <button
                  type="button"
                  onClick={startTracking}
                  className="px-4 py-2.5 rounded-lg bg-slate-700 text-slate-200 text-sm hover:bg-slate-600"
                >
                  {t('restart')}
                </button>
              </div>
            )}

            {saved && (
              <div className="mt-4">
                <div className="p-3 bg-slate-900/60 rounded-lg text-center">
                  <div className="text-xs text-slate-400">{t('score')}</div>
                  <div className={`text-4xl font-bold tabular-nums ${(score ?? 0) >= 80 ? 'text-emerald-300' : (score ?? 0) >= 50 ? 'text-amber-300' : 'text-red-400'}`}>
                    {score ?? '—'}
                    <span className="text-base text-slate-400">/100</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-400">{t('scoreNote')}</div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void markCompleted()}
                    disabled={markingCompleted}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {markingCompleted ? tc('loading') : t('markCompleted')}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-lg bg-slate-700 text-slate-200 text-sm hover:bg-slate-600"
                  >
                    {t('closeWithout')}
                  </button>
    </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}