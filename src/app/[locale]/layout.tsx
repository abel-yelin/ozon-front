import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { routing } from '@/core/i18n/config';
import { loadAllMessages } from '@/core/i18n/request';
import { ThemeProvider } from '@/core/theme/provider';
import { Toaster } from '@/shared/components/ui/sonner';
import { AppContextProvider } from '@/shared/contexts/app';
import { getMetadata } from '@/shared/lib/seo';

export const generateMetadata = getMetadata();

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  // Get messages for client components
  const messages = await loadAllMessages(locale);

  return (
    <NextIntlClientProvider messages={messages}>
      <ThemeProvider>
        <AppContextProvider>
          {children}
          <Toaster position="top-center" richColors />
        </AppContextProvider>
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
