
import '../globals.css';
import type { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { notFound } from 'next/navigation';

export const metadata = {
  title: 'CortexDrive',
  description:
    'AI-assisted driving education and instructor marketplace in Pakistan',
};

const locales = ['en', 'ur', 'roman_ur'];

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  const locale = params.locale;

  // Reject unsupported locales
  if (!locales.includes(locale)) {
    notFound();
  }

  const messages = (
    await import(`../../messages/${locale}.json`)
  ).default;

  return (
    <html
      lang={locale === 'roman_ur' ? 'en-PK' : locale}
      dir={locale === 'ur' ? 'rtl' : 'ltr'}
    >
      <body>
        <NextIntlClientProvider
          locale={locale}
          messages={messages}
        >
          {children}
          {/* Floating AI widget mounted client-side */}
          {/* @ts-ignore */}
          <script dangerouslySetInnerHTML={{ __html: `(() => { const el = document.createElement('div'); el.id = 'ai-widget-root'; document.body.appendChild(el); })()` }} />

        </NextIntlClientProvider>
      </body>
    </html>
  );
}

        </NextIntlClientProvider>
      </body>
    </html>
  );
}