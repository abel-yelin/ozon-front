import { redirect } from '@/core/i18n/navigation';

export default async function OzonDownloadRedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  redirect({ href: '/dashboard/ozon', locale });
}
