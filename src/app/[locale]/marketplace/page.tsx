import Link from 'next/link';
import InstructorCard from '../../../modules/marketplace/components/InstructorCard';
import { getSupabase } from '../../../modules/marketplace/client';

export default async function Marketplace() {
  const cities = ['Lahore','Karachi','Islamabad','Rawalpindi','Faisalabad','Peshawar','Multan'];
  const supabase = getSupabase();
  // Query profiles joined with average rating (ratings table migration is pending)
  let profiles: any[] | null = null;
  try {
    const { data } = await supabase.from('profiles').select(`*, avg_rating:ratings_stars.avg`).limit(50);
    profiles = data as any[] | null;
  } catch (e) {
    console.warn('Supabase query failed in marketplace page (likely missing env or migration):', e);
  }

  return (
    <main className="p-6">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Instructors</h1>
        </header>
        <p className="mt-4 text-muted">Browse instructors by city, verification status, and rating.</p>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {(profiles ?? cities.map((c)=>({ user_id: c, full_name: c, city: c, verification_status:'unverified', hourly_rate:0 }))).map((p:any) => (
            <InstructorCard key={p.user_id} profile={p} />
          ))}
        </div>
      </div>
    </main>
  );
}
