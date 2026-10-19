import {defineRouting} from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'ur', 'roman_ur'],
  defaultLocale: 'en',
  localePrefix: 'always',
  localeDetection: false
});
