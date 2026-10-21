import OnboardingWizard from '@/modules/auth/OnboardingWizard';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export default async function OnboardingPage({ params }:{ params:any }){
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    return new Response(null, {
      status: 302,
      headers: { Location: `/${params.locale}/signin` }
    });
  }
  return <div className="min-h-screen bg-slate-900 text-slate-100 p-8"><OnboardingWizard/></div>
}
