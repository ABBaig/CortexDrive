use client';

import React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

const locales = [
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'ur', label: 'اردو', dir: 'rtl' },
  { code: 'roman_ur', label: 'Roman Urdu', dir: 'ltr' },
];

export function LanguageSelector() {
  const router = useRouter();
  const pathname = usePathname() || '/en';
  const searchParams = useSearchParams();
  const t = useTranslations('Common');

  // current locale is the first segment of the pathname (e.g. /en/...)
  const currentLocale = pathname.split('/')[1] || 'en';

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newLocale = e.target.value;
    // preserve pathname after the locale segment
    const parts = pathname.split('/');
    // remove the first empty string and the locale segment
    parts[1] = newLocale;
    const newPath = parts.join('/') || `/${newLocale}`;

    const params = searchParams ? `?${searchParams.toString()}` : '';

    // use replace to avoid polluting history and preserve search params
    router.replace(`${newPath}${params}`);
  }

  return (
    <div>
      <label htmlFor="lang-select" className="sr-only">
        {t('selectLanguage')}
      </label>
      <select
        id="lang-select"
        value={locales.find((l) => l.code === currentLocale)?.code || 'en'}
        onChange={onChange}
        className="rounded border border-neutral-300 bg-white px-3 py-1 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-dark-slate dark:text-neutral-100"
      >
        {locales.map((l) => (
          <option key={l.code} value={l.code} dir={l.dir}>
            {l.label}
          </option>
        ))}
      </select>
    </div>
  );
}
