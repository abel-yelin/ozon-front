import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { Crumb } from '@/shared/types/blocks/common';
import { AiPlaygroundProcess } from '@/shared/blocks/ai-playground/process';
import { AiPlaygroundProvider } from '@/shared/contexts/ai-playground';

export default async function AiPlaygroundPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('dashboard.aiplayground');

  const crumbs: Crumb[] = [
    { title: t('crumb_dashboard'), url: '/dashboard' },
    { title: t('crumb'), is_active: true },
  ];

  return (
    <AiPlaygroundProvider>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={t('title')} description={t('description')} />
        <div className="p-6">
          <AiPlaygroundProcess />
        </div>
      </Main>
    </AiPlaygroundProvider>
  );
}
