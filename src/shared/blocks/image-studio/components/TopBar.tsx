/**
 * TopBar Component
 * Header with logo, navigation tabs, and action buttons
 */

'use client';

import { useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useImageStudio } from '@/app/hooks/use-image-studio';
import { Button } from '@/shared/components/ui/button';
import { PromptGroupSelector } from './PromptGroupSelector';  // NEW import
import {
  Download,
  Settings,
  Upload,
  Sparkles,
  ChevronDown,
} from 'lucide-react';

export function TopBar() {
  const t = useTranslations('dashboard.imagestudio');
  const locale = useLocale();
  const { currentSKU, isLoading, error, openModal } = useImageStudio();
  const [activeTab, setActiveTab] = useState<'process' | 'history'>('process');
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    // Set initial time only on client to avoid hydration mismatch
    setCurrentTime(new Date());

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDateTime = (date: Date) => {
    const normalizedLocale =
      locale === 'zh' || locale === 'zh-CN' ? 'zh-CN' : 'en-US';
    return date.toLocaleString(normalizedLocale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      {/* Logo Section */}
      <div className="flex items-center gap-8">
        <PromptGroupSelector />

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('process')}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'process'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t('top_bar.tab_process')}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'history'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t('top_bar.tab_history')}
          </button>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4">
        {/* Date/Time Display - only render on client to avoid hydration mismatch */}
        {currentTime && (
          <div className="text-sm text-gray-600" suppressHydrationWarning>
            {formatDateTime(currentTime)}
          </div>
        )}

        {/* Action Buttons */}
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => openModal('settings')}
        >
          <Sparkles className="h-4 w-4" />
          {t('top_bar.mode_pro')}
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => openModal('download')}
        >
          <Download className="h-4 w-4" />
          {t('top_bar.download')}
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => openModal('settings')}
        >
          <Settings className="h-4 w-4" />
          {t('top_bar.settings')}
        </Button>

        <Button
          variant="default"
          size="sm"
          className="gap-2 bg-blue-600 hover:bg-blue-700"
          onClick={() => openModal('upload')}
        >
          <Upload className="h-4 w-4" />
          {t('top_bar.upload')}
        </Button>
      </div>
    </header>
  );
}
