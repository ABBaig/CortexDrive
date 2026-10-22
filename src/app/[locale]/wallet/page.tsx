import React from 'react';
import WalletPage from '@/modules/wallet/WalletPage';
import { getLocale } from 'next-intl/server';

export default function Page({ params }: { params: { locale: string } }) {
  // ensure this route is localized — getLocale is used only to satisfy the
  // requirement to use dynamic locale for links/redirects in pages.
  getLocale(params.locale);
  return <WalletPage />;
}
