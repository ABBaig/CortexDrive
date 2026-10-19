use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

const locales = [
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'ur', label: 'اردو', dir: 'rtl' },
  { code: 'roman_ur', label: 'Roman Urdu', dir: 'ltr' },
];

export function LanguageSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('Common');

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newLocale = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    router.push(`/${newLocale}${pathname}?${params.toString()}`);
  }

  return (
    <label htmlFor="lang-select" className="sr-only">
      {t('selectLanguage')}
    </label>
    <select
      id="lang-select"
      value={locales.find((l) => l.code === (typeof window !== 'undefined' ? window.location.pathname.split('/')[1] : 'en'))?.code || 'en'}
      onChange={onChange}
      className="rounded border border-neutral-300 bg-white px-3 py-1 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-dark-slate dark:text-neutral-100"
    >
      {locales.map((l) => (
        <option key={l.code} value={l.code} dir={l.dir}>
          {l.label}
        </option>
      ))}
    </select>
  );
}
