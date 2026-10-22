import React from 'react';
import { redirect } from 'next/navigation';
import AdminPanel from '@/modules/admin/AdminPanel';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getTranslations } from 'next-intl/server';

export default async function AdminPage({ params }: { params: { locale: string } }) {
  const supabase = await getSupabaseServerClient();
  const t = await getTranslations({ locale: params.locale, namespace: 'Admin' });

  const { data: { user } } = await supabase.auth.getUser();
  // Gate: user must be in public.admins
  if (!user) redirect(`/${params.locale}/signin`);
  const { data: admins } = await supabase.from('admins').select('user_id').eq('user_id', user.id).limit(1);

  if (!admins || admins.length === 0) {
    // Visible "not authorized" state instead of a silent redirect
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <div className="mt-6 rounded-md bg-amber-900/10 border border-amber-800 p-4 text-amber-100">
          <strong className="block text-lg">{t('adminNotAuthorized')}</strong>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">{t('title')}</h1>
      {/* AdminPanel is a client component */}
      <AdminPanel />
    </div>
  );
}
