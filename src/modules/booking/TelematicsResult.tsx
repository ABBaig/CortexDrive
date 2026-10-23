'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

type Telemetry = {
  duration_s?: number;
  distance_km?: number | null;
  max_speed?: number | null;
  avg_speed?: number | null;
  harsh_brake_count?: number;
  harsh_accel_count?: number;
  speeding_count?: number;
  events?: { event: string; ts: string; speed: number }[];
};

type Props = {
  telematics: Telemetry | null;
  score: number | null;
};

export default function TelematicsResult({ telematics, score }: Props) {
  const t = useTranslations('Telematics');
  const [open, setOpen] = useState(false);

  if (!telematics) return null;

  function fmtDur(s?: number) {
    if (!s) return '—';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300"
      >
        <span
          className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
            score == null
              ? 'bg-slate-500/20 text-slate-300'
              : score >= 80
                ? 'bg-emerald-500/15 text-emerald-300'
                : score >= 50
                  ? 'bg-amber-500/15 text-amber-300'
                  : 'bg-red-500/15 text-red-300'
          }`}
        >
          {score == null ? '—' : score}
        </span>
        {t('viewLessonScore')}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`w-3 h-3 transition-transform ${open ? 'rotate-90' : ''}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {open && (
        <div className="mt-2 p-3 bg-slate-800 rounded-lg ring-1 ring-slate-700/60 text-xs space-y-1.5">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-slate-400">{t('duration')}: </span>
              <span className="text-slate-200 tabular-nums">{fmtDur(telematics.duration_s)}</span>
            </div>
            <div>
              <span className="text-slate-400">{t('distance')}: </span>
              <span className="text-slate-200 tabular-nums">
                {telematics.distance_km != null ? `${telematics.distance_km} km` : '—'}
              </span>
            </div>
            <div>
              <span className="text-slate-400">{t('maxSpeed')}: </span>
              <span className="text-slate-200 tabular-nums">
                {telematics.max_speed != null ? `${telematics.max_speed} km/h` : '—'}
              </span>
            </div>
            <div>
              <span className="text-slate-400">{t('avgSpeed')}: </span>
              <span className="text-slate-200 tabular-nums">
                {telematics.avg_speed != null ? `${telematics.avg_speed} km/h` : '—'}
              </span>
            </div>
          </div>
          <div className="flex gap-1.5 flex-wrap pt-1">
            <span className={`px-2 py-0.5 rounded-full ${(telematics.harsh_brake_count ?? 0) > 0 ? 'bg-red-500/15 text-red-300' : 'bg-slate-900/60 text-slate-400'}`}>
              {t('harshBrakes')}: {telematics.harsh_brake_count ?? 0}
            </span>
            <span className={`px-2 py-0.5 rounded-full ${(telematics.harsh_accel_count ?? 0) > 0 ? 'bg-amber-500/15 text-amber-300' : 'bg-slate-900/60 text-slate-400'}`}>
              {t('harshAccels')}: {telematics.harsh_accel_count ?? 0}
            </span>
            <span className={`px-2 py-0.5 rounded-full ${(telematics.speeding_count ?? 0) > 0 ? 'bg-red-500/15 text-red-300' : 'bg-slate-900/60 text-slate-400'}`}>
              {t('speeding')}: {telematics.speeding_count ?? 0}
            </span>
          </div>
          {telematics.events && telematics.events.length > 0 && (
            <div className="pt-1">
              <div className="text-slate-400">{t('events')}:</div>
              <ul className="mt-1 space-y-0.5">
                {telematics.events.map((e, i) => (
                  <li key={i} className="text-slate-300">
                    {e.event === 'harsh_brake' ? t('harshBrakes') : e.event === 'harsh_accel' ? t('harshAccels') : t('speeding')}
                    {' · '}
                    <span className="tabular-nums">{e.speed} km/h</span>
                    {' · '}
                    <span className="text-slate-500">{new Date(e.ts).toLocaleTimeString()}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}