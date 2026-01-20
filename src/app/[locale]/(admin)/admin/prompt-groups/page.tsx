import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { Crumb } from '@/shared/types/blocks/common';
import { PromptGroupsAdmin } from '@/shared/blocks/admin/prompt-groups';

export default async function PromptGroupsAdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('admin.prompt_groups');

  const crumbs: Crumb[] = [
    { title: t('crumb_admin'), url: '/admin' },
    { title: t('crumb'), is_active: true },
  ];

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={t('title')} description={t('description')} />
        <div className="p-6">
          <PromptGroupsAdmin />
        </div>
      </Main>
    </>
  );
}
