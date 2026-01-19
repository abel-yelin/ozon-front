import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { Crumb } from '@/shared/types/blocks/common';
import { TasksContent } from '@/shared/blocks/dashboard/tasks-content';

export default async function TasksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('dashboard.tasks');

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
          <TasksContent />
        </div>
      </Main>
    </>
  );
}
