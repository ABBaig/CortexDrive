'use client';
import React from 'react';

export default function FuelTrackerSummary({ totalKm, totalLiters, avgKmPerLiter, pkrPerKm }: { totalKm: number; totalLiters: number; avgKmPerLiter: number; pkrPerKm: number; }){
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      <div className="p-3 bg-slate-800 rounded-xl ring-1 ring-slate-700">
        <div className="text-xs text-slate-400">Total KM</div>
        <div className="text-lg text-white font-semibold">{totalKm}</div>
      </div>
      <div className="p-3 bg-slate-800 rounded-xl ring-1 ring-slate-700">
        <div className="text-xs text-slate-400">Total Liters</div>
        <div className="text-lg text-white font-semibold">{Math.round(totalLiters * 100) / 100}</div>
      </div>
      <div className="p-3 bg-slate-800 rounded-xl ring-1 ring-slate-700">
        <div className="text-xs text-slate-400">Avg km/L</div>
        <div className="text-lg text-white font-semibold">{avgKmPerLiter}</div>
      </div>
      <div className="p-3 bg-slate-800 rounded-xl ring-1 ring-slate-700">
        <div className="text-xs text-slate-400">PKR/km</div>
        <div className="text-lg text-white font-semibold">{pkrPerKm}</div>
      </div>
    </div>
  );
}
