import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { Crumb } from '@/shared/types/blocks/common';
import { OzonDownload } from '@/shared/blocks/ozon/download';

export default async function OzonDownloadPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('dashboard.ozon');

  const crumbs: Crumb[] = [
    { title: t('crumb_dashboard'), url: '/dashboard' },
    { title: t('crumb'), is_active: true },
  ];

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={t('title')} />
        <div className="p-6">
          <OzonDownload />
        </div>
      </Main>
    </>
  );
}
