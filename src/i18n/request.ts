import {getRequestConfig} from 'next-intl/server';

const locales = ['en', 'ur', 'roman_ur'] as const;

export default getRequestConfig(async ({requestLocale}) => {
  const requestedLocale = await requestLocale;

  const locale =
    requestedLocale && locales.some((l) => l === requestedLocale)
      ? requestedLocale
      : 'en';

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});
