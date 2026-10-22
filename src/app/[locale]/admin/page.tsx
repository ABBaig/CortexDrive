import React from 'react';
import { redirect } from 'next/navigation';
import AdminPanel from '@/modules/admin/AdminPanel';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export default async function AdminPage({ params }: { params: { locale: string } }){
  const supabase = getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  // Gate: user must be in public.admins
  if (!user) redirect(`/${params.locale}/signin`);
  const { data: admins } = await supabase.from('admins').select('user_id').eq('user_id', user.id).limit(1);
  if (!admins || admins.length===0) redirect(`/${params.locale}/`);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Admin</h1>
      {/* AdminPanel is a client component */}
      <AdminPanel/>
    </div>
  );
}
