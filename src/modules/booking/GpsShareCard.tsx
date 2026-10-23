'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';

type Booking = {
  id: string;
  status: string;
  start_time: string | null;
  end_time: string | null;
};

const UPDATE_INTERVAL_MS = 8000; // throttle writes to ~1 per 8s

export default function GpsShareCard({ instructorId }: { instructorId: string }) {
  const t = useTranslations('GpsTracking');
  const tc = useTranslations('Common');
  const supabase = getSupabaseBrowserClient();
  const [bookings, setBookings] = useState<Booking[]>([]);
  [selected, setSelected] = useState<string>('');
  const [sharing, setSharing] = useState(false);
  const [supported, setSupported] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // refs out of render path
  const watchIdRef = useRef<number | null>(null);
  const lastWriteRef = useRef(0);
  const bookingIdRef = useRef<string | null>(null);
  const sharingRef = useRef(false);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('bookings')
      .select('id,status,start_time,end_time')
      .eq('instructor_id', instructorId)
      .in('status', ['booked', 'in_progress'])
      .order('start_time', { ascending: true })
      .limit(20);
    setBookings((data ?? []) as Booking[]);
    setLoading(false);
  }, [supabase, instructorId]);

  useEffect(() => {
    void loadBookings();
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setSupported(false);
    }
    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      sharingRef.current = false;
    };
  }, [loadBookings]);

  async function upsertFix(lat: number, lng: number) {
    const bookingId = bookingIdRef.current;
    if (!bookingId) return;
    const { error: dbError } = await supabase.from('gps_locations').upsert(
      { booking_id: bookingId, lat, lng, updated_at: new Date().toISOString() },
      { onConflict: 'booking_id' }
    );
    if (dbError) {
      setError(t('shareFailed'));
      return;
    }
    setLastUpdate(new Date().toLocaleTimeString());
  }

  function onFix(pos: GeolocationPosition) {
    if (!sharingRef.current) return;
    const now = Date.now();
    if (now - lastWriteRef.current < UPDATE_INTERVAL_MS) return; // throttle
    lastWriteRef.current = now;
    void upsertFix(pos.coords.latitude, pos.coords.longitude);
  }

  function onError(err: GeolocationPositionError) {
    if (err.code === err.PERMISSION_DENIED) {
      setPermissionDenied(true);
      stopSharing();
    }
  }

  function startSharing() {
    if (!navigator.geolocation) {
      setSupported(false);
      return;
    }
    setError(null);
    if (!selected) {
      setError(t('pickLessonFirst'));
      return;
    }
    bookingIdRef.current = selected;
    sharingRef.current = true;
    setSharing(true);
    watchIdRef.current = navigator.geolocation.watchPosition(onFix, onError, {
      enableHighAccuracy: true,
      maximumAge: 15000,
      timeout: 20000,
    });
  }

  function stopSharing() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    sharingRef.current = false;
    setSharing(false);
  }

  return (
    <div className="mt-3 p-4 bg-slate-700/60 rounded-xl ring-1 ring-slate-600/60">
      <div className="text-white font-semibold text-sm">{t('shareTitle')}</div>
      <div className="text-xs text-slate-400 mt-0.5">{t('shareHint')}</div>

      {loading && <div className="mt-3 text-sm text-slate-400">{tc('loading')}</div>}

      {!loading && !supported && (
        <div className="mt-3 text-sm text-red-400">{t('notSupported')}</div>
      )}

      {supported && permissionDenied && (
        <div className="mt-3 text-sm text-amber-400">{t('permissionDenied')}</div>
      )}

      {supported && (
        <>
          {!sharing ? (
            <div className="mt-3 space-y-2">
              {bookings.length === 0 ? (
                <div className="text-sm text-slate-400">{t('noLessons')}</div>
              ) : (
                <select
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                  className="w-full p-2 rounded bg-slate-900 text-white border border-slate-600 focus:border-sky-500 focus:outline-none text-sm"
                >
                  <option value="">—</option>
                  {bookings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.start_time ? new Date(b.start_time).toLocaleString() : b.id.slice(0, 8)}
                    </option>
                  ))}
                </select>
              )}
              {error && <div className="text-sm text-red-400">{error}</div>}
              <button
                type="button"
                onClick={startSharing}
                disabled={!selected || bookings.length === 0}
                className="w-full px-4 py-2 rounded-lg bg-sky-600 text-white font-medium text-sm hover:bg-sky-500 disabled:opacity-50"
              >
                {t('startShare')}
              </button>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2 text-sm text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {t('sharingActive')}
                {lastUpdate && <span className="text-slate-400">· {t('lastUpdate')} {lastUpdate}</span>}
              </div>
              {error && <div className="text-sm text-red-400">{error}</div>}
              <button
                type="button"
                onClick={stopSharing}
                className="w-full px-4 py-2 rounded-lg bg-red-600 text-white font-medium text-sm hover:bg-red-500"
              >
                {t('stopShare')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}