import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import LearnerDashboard from '@/modules/dashboard/LearnerDashboard';

export default async function DashboardPage({ params }: { params: { locale: string } }) {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: 'Dashboard' });

  const supabase = await getSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect(`/${locale}/signin`);
  const user = session.user;

  const { data: profile } = await supabase
    .from('users')
    .select('full_name,city,role')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role === 'learner') {
    return (
      <LearnerDashboard
        locale={locale}
        userId={user.id}
        fullName={profile?.full_name ?? ''}
        city={profile?.city ?? ''}
      />
    );
  }

  // instructor / admin / vendor / unknown — dashboards land in later passes
  return (
    <AppShell>
      <div className="max-w-2xl mx-auto bg-slate-800 p-6 rounded">
        <h1 className="text-2xl text-white">{t('otherRolePending')}</h1>
      </div>
    </AppShell>
  );
}
