'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';

type Fix = {
  booking_id: string;
  lat: number | null;
  lng: number | null;
  updated_at: string | null;
};

type Booking = {
  id: string;
  status: string;
  start_time: string | null;
};

type Props = {
  bookingId: string;
};

export default function LiveTracking({ bookingId }: Props) {
  const t = useTranslations('GpsTracking');
  const supabase = getSupabaseBrowserClient();
  const [fix, setFix] = useState<Fix | null>(null);
  const [noData, setNoData] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myPos, setMyPos] = useState<{ lat: number; lng: number } | null>(null);
  const fixRef = useRef<Fix | null>(null);

  const loadFix = useCallback(async () => {
    const { data, error: dbError } = await supabase
      .from('gps_locations')
      .select('booking_id,lat,lng,updated_at')
      .eq('booking_id', bookingId)
      .maybeSingle();
    if (dbError) {
      setError(t('loadFailed'));
    } else {
      const f = (data as Fix | null) ?? null;
      setFix(f);
      fixRef.current = f;
      if (!f || f.lat == null || f.lng == null) setNoData(true);
      else setNoData(false);
    }
    setLoading(false);
  }, [supabase, bookingId, t]);

  useEffect(() => {
    void loadFix();

    // realtime subscription for instructor fixes
    const channel = supabase
      .channel(`gps:${bookingId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'gps_locations', filter: `booking_id=eq.${bookingId}` },
        (payload: any) => {
          const f = payload.new as Fix;
          setFix(f);
          fixRef.current = f;
          setNoData(false);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'gps_locations', filter: `booking_id=eq.${bookingId}` },
        (payload: any) => {
          const f = payload.new as Fix;
          setFix(f);
          fixRef.current = f;
          setNoData(false);
        }
      )
      .subscribe();

    // learner's own location (for distance-to-you), best-effort
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setMyPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }

    return () => {
      channel.unsubscribe();
    };
  }, [supabase, bookingId, loadFix]);

  function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  const distanceToMe =
    fix && myPos && fix.lat != null && fix.lng != null
      ? haversineKm(myPos.lat, myPos.lng, fix.lat, fix.lng)
      : null;

  const fixAgeSec =
    fix && fix.updated_at ? Math.max(0, Math.floor((Date.now() - new Date(fix.updated_at).getTime()) / 1000)) : null;

  const mapUrl =
    fix && fix.lat != null && fix.lng != null
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${fix.lng - 0.01}%2C${fix.lat - 0.006}%2C${fix.lng + 0.01}%2C${fix.lat + 0.006}&layer=mapnik&marker=${fix.lat}%2C${fix.lng}`
      : null;

  if (loading) return null;

  return (
    <div className="mt-3 p-4 bg-slate-700/60 rounded-xl ring-1 ring-slate-600/60">
      <div className="flex items-center justify-between">
        <div className="text-white font-semibold text-sm">{t('liveTitle')}</div>
        {!noData && fixAgeSec !== null && fixAgeSec < 60 && (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {t('instructorMoving')}
          </span>
        )}
      </div>

      {error && <div className="mt-2 text-sm text-red-400">{error}</div>}

      {noData && <div className="mt-3 text-sm text-slate-400">{t('notSharingYet')}</div>}

      {!noData && fix && fix.lat != null && fix.lng != null && (
        <>
          <div className="mt-3 overflow-hidden rounded-lg ring-1 ring-slate-600">
            <iframe
              title={t('liveTitle')}
              src={mapUrl}
              className="w-full h-64 border-0"
              loading="lazy"
            />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-slate-900/60 rounded-lg">
              <div className="text-slate-400">{t('lastUpdate')}</div>
              <div className="text-white font-semibold">
                {fix.updated_at ? new Date(fix.updated_at).toLocaleTimeString() : '—'}
                {fixAgeSec !== null && (
                  <span className="text-slate-500"> ({fixAgeSec}s)</span>
                )}
              </div>
            </div>
            <div className="p-2 bg-slate-900/60 rounded-lg">
              <div className="text-slate-400">{t('distanceToYou')}</div>
              <div className="text-white font-semibold">
                {distanceToMe != null ? `${distanceToMe.toFixed(2)} km` : t('distanceUnknown')}
              </div>
            </div>
          </div>
          {fixAgeSec !== null && fixAgeSec >= 60 && fixAgeSec < 900 && (
            <div className="mt-2 text-xs text-amber-400">{t('staleFix')}</div>
          )}
        </>
      )}
    </div>
  );
}