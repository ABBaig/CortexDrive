import './globals.css';
import { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { notFound } from 'next/navigation';

export const metadata = {
  title: 'CortexDrive',
  description: 'AI-assisted driving education and instructor marketplace in Pakistan',
};

export default async function RootLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  let messages;
  try {
    messages = (await import(`../messages/${params.locale}.json`)).default;
  } catch {
    notFound();
  }

  return (
    <html lang={params.locale} dir={params.locale === 'ur' ? 'rtl' : 'ltr'}>
      <body>
        <NextIntlClientProvider locale={params.locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
