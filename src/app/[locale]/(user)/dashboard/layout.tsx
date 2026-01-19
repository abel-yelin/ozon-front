import { ReactNode } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getUserInfo } from '@/shared/models/user';
import { LocaleDetector } from '@/shared/blocks/common';
import { DashboardLayout } from '@/shared/blocks/dashboard/layout';
import { Sidebar as SidebarType } from '@/shared/types/blocks/dashboard';

/**
 * User dashboard layout for managing Ozon downloads
 */
export default async function UserDashboardLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Check if user is authenticated
  const user = await getUserInfo();
  if (!user) {
    // Redirect to sign in page - will be handled by middleware
    return null;
  }

  const t = await getTranslations('dashboard');
  const sidebar: SidebarType = t.raw('sidebar');

  return (
    <DashboardLayout sidebar={sidebar}>
      <LocaleDetector />
      {children}
    </DashboardLayout>
  );
}
