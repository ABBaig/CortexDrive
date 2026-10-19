import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Layout } from '@/components/Layout';

export default function Home() {
  const t = useTranslations('Home');

  return (
    <Layout>
      <main className="flex min-h-screen flex-col items-center justify-center bg-dark-slate text-neutral text-center px-4 py-16">
        <h1 className="text-4xl font-bold mb-4">{t('welcome')}</h1>
        <p className="max-w-xl text-lg mb-8">{t('tagline')}</p>
        <div className="flex gap-4">
          <Link href="/learners/register" className="btn-primary">
            {t('ctaLearner')}
          </Link>
          <Link href="/instructors/register" className="btn-secondary">
            {t('ctaInstructor')}
          </Link>
        </div>
      </main>
    </Layout>
  );
}
