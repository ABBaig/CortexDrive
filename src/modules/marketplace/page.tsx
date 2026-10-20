import React from 'react';
import InstructorCard from './components/InstructorCard';
import { getSupabase } from './client';

export default async function MarketplacePage() {
  const supabase = getSupabase();
  const { data: profiles } = await supabase.from('profiles').select('*, avg_rating').limit(50);

  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold mb-4">Instructors</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {profiles?.map((p: any) => (
          <InstructorCard key={p.id} profile={p} />
        ))}
      </div>
    </main>
  );
}
