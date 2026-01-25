/**
 * MainContent Component
 * Central area with batch header, dual-panel comparison, and bottom status bar
 */

'use client';

import { useTranslations } from 'next-intl';
import { useImageStudio } from '@/app/hooks/use-image-studio';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { EmptyState } from './EmptyState';
import {
  Play,
  Square,
  RefreshCw,
  MoreVertical,
  Download,
} from 'lucide-react';

export function MainContent() {
  const t = useTranslations('dashboard.imagestudio');
  const {
    currentSKU,
    currentImagePairs,
    batchProgress,
    startBatch,
    openModal,
  } = useImageStudio();

  if (!currentSKU) {
    return <EmptyState />;
  }

  const hasImages = currentImagePairs.length > 0;
  const isBatchProcessing = batchProgress?.status === 'processing';
  const statusMap: Record<string, string> = {
    done: t('main_content.status_done'),
    processing: t('main_content.status_processing'),
    failed: t('main_content.status_failed'),
    pending: t('main_content.status_pending'),
  };

  return (
    <div className="flex flex-1 flex-col bg-white">
      {/* Batch Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {currentSKU.article}
            </h2>
            <Badge variant="outline" className="text-gray-600">
              {t('main_content.image_count', { count: currentImagePairs.length })}
            </Badge>
            {/* Auto-refresh indicator during batch processing */}
            {isBatchProcessing && (
              <Badge variant="secondary" className="animate-pulse bg-blue-100 text-blue-700">
                <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                {t('main_content.auto_refreshing')}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Processing Options */}
            <div className="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5">
              <Checkbox
                id="continuous"
                className="h-4 w-4"
              />
              <label htmlFor="continuous" className="cursor-pointer text-sm text-gray-700">
                {t('main_content.continuous')}
              </label>
            </div>

            <div className="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5">
              <Checkbox
                id="step-review"
                className="h-4 w-4"
              />
              <label htmlFor="step-review" className="cursor-pointer text-sm text-gray-700">
                {t('main_content.step_review')}
              </label>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              {t('main_content.force_refresh')}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {!hasImages ? (
            <div className="flex h-96 items-center justify-center text-gray-500">
              {t('main_content.no_images')}
            </div>
          ) : (
            <div className="grid gap-6">
              {currentImagePairs.map((pair, index) => (
                <div key={pair.id} className="rounded-lg border border-gray-200 p-4">
                  <div className="grid grid-cols-2 gap-6">
                    {/* Input Panel */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500 uppercase">
                          {t('main_content.input')}
                        </span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            #{index + 1}
                          </Badge>
                          <Button variant="ghost" size="sm" className="h-6 px-2">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div
                        className="aspect-square cursor-pointer overflow-hidden rounded-lg bg-gray-100"
                        onClick={() =>
                          openModal('image-edit', {
                            sku: currentSKU.article,
                            filename: pair.inputName || pair.stem,
                            imageUrl: pair.inputUrl,
                            sourceType: 'input',
                            pairId: pair.id,
                          })
                        }
                      >
                        <img
                          src={pair.inputUrl}
                          alt={pair.inputName || pair.stem}
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <p className="text-sm text-gray-600">{pair.inputName || pair.stem}</p>
                    </div>

                    {/* Output Panel */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500 uppercase">
                          {t('main_content.output')}
                        </span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            #{index + 1}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2"
                            onClick={() => {/* TODO: download */}}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div
                        className="aspect-square cursor-pointer overflow-hidden rounded-lg bg-gray-100"
                        onClick={() =>
                          openModal('image-edit', {
                            sku: currentSKU.article,
                            filename: pair.outputName || pair.inputName || pair.stem,
                            imageUrl: pair.outputUrl || null,
                            sourceType: 'output',
                            pairId: pair.id,
                          })
                        }
                      >
                        {pair.outputUrl ? (
                          <img
                            src={pair.outputUrl}
                            alt={pair.outputName || pair.inputName || pair.stem}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-gray-400">
                            {isBatchProcessing ? (
                              <div className="flex flex-col items-center gap-2">
                                <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
                                <span className="text-sm">{t('main_content.generating')}</span>
                              </div>
                            ) : (
                              t('main_content.not_generated')
                            )}
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {pair.outputName ||
                          (isBatchProcessing
                            ? t('main_content.waiting_generate_ellipsis')
                            : t('main_content.waiting_generate'))}
                      </p>
                    </div>
                  </div>

                  {/* Status Indicators */}
                  <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>
                        {t('main_content.status_label', {
                          status: statusMap[pair.status] || t('main_content.status_pending'),
                        })}
                      </span>
                    </div>
                    <Button
                      variant="default"
                      size="sm"
                      className={`gap-2 text-white ${pair.outputUrl ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}
                      disabled={pair.status === 'processing' || isBatchProcessing}
                      onClick={() => openModal('opt-prompt', { pairId: pair.id })}
                    >
                      <RefreshCw className="h-4 w-4" />
                      {pair.outputUrl
                        ? t('main_content.regenerate')
                        : t('main_content.generate')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Bottom Status Bar */}
      <div className="border-t border-gray-200 bg-white px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Left Section - Status and Progress Details */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {/* Status Icon - Blue Square */}
              <div className="h-4 w-4 rounded-sm bg-blue-500"></div>
              <span className="text-sm text-gray-700">
                {isBatchProcessing
                  ? t('main_content.batch_processing')
                  : t('main_content.batch_idle')}
              </span>
              {isBatchProcessing && (
                <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
              )}
            </div>
            <button className="text-xs italic text-gray-500 hover:text-gray-700">
              {t('main_content.progress_detail')}
            </button>
            {/* Progress Bar */}
            <div className="h-2 w-48 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${batchProgress?.percentage || 0}%` }}
              />
            </div>
          </div>

          {/* Middle Section - Status Metrics */}
          <div className="flex items-center gap-8">
            <div className="flex items-baseline gap-2">
              <span className="text-sm text-gray-600">
                {t('main_content.total_tasks')}
              </span>
              <span className="text-base font-semibold text-gray-900">{batchProgress?.total || 0}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-sm text-gray-600">
                {t('main_content.in_progress')}
              </span>
              <span className="text-base font-semibold text-gray-900">
                {batchProgress?.total && batchProgress?.completed
                  ? batchProgress.total - batchProgress.completed - batchProgress.failed
                  : 0}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-sm text-gray-600">
                {t('main_content.completed')}
              </span>
              <span className="text-base font-semibold text-gray-900">{batchProgress?.completed || 0}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-sm text-gray-600">
                {t('main_content.failed_tasks')}
              </span>
              <span className="text-base font-semibold text-gray-900">{batchProgress?.failed || 0}</span>
            </div>
          </div>

          {/* Right Section - Action Buttons */}
          <div className="flex items-center gap-3">
            <Button
              variant="default"
              size="sm"
              className="bg-orange-500 hover:bg-orange-600"
              disabled={!isBatchProcessing}
            >
              <Square className="mr-2 h-5 w-5" />
              {t('main_content.stop')}
            </Button>
            <Button
              variant="default"
              size="sm"
              className="bg-teal-600 hover:bg-teal-700"
              disabled={isBatchProcessing}
              onClick={() => startBatch()}
            >
              <Play className="mr-2 h-5 w-5" />
              {t('main_content.start_batch')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
