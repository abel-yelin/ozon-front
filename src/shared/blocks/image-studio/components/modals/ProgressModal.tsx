/**
 * ProgressModal Component
 * Modal for displaying batch processing progress
 */

'use client';

import { useTranslations } from 'next-intl';
import { useImageStudio } from '@/app/hooks/use-image-studio';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Progress } from '@/shared/components/ui/progress';
import { Badge } from '@/shared/components/ui/badge';
import { Pause, Play, Square, RefreshCw, X } from 'lucide-react';

export function ProgressModal() {
  const t = useTranslations('dashboard.imagestudio');
  const { modal, batchProgress, closeModal, pauseBatch, resumeBatch, cancelBatch } = useImageStudio();

  const isOpen = modal.type === 'progress';

  if (!isOpen || !batchProgress) return null;

  const isProcessing = batchProgress.status === 'processing';
  const isPaused = batchProgress.status === 'paused';
  const statusMap: Record<string, string> = {
    processing: t('progress_modal.status_processing'),
    paused: t('progress_modal.status_paused'),
    completed: t('progress_modal.status_completed'),
    canceled: t('progress_modal.status_canceled'),
  };

  return (
    <Dialog open={isOpen} onOpenChange={closeModal}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('progress_modal.title')}</DialogTitle>
          <button
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
            onClick={closeModal}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">{t('progress_modal.close')}</span>
          </button>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-600">{t('progress_modal.progress')}</span>
              <Badge variant="outline">{batchProgress.percentage}%</Badge>
            </div>
            <Progress value={batchProgress.percentage} className="h-2" />
            <div className="flex text-xs text-neutral-500">
              <span>{t('progress_modal.completed', { count: batchProgress.completed })}</span>
              <span className="mx-auto">/</span>
              <span>{t('progress_modal.total', { count: batchProgress.total })}</span>
            </div>
          </div>

          {/* Status */}
          <div className="rounded-lg bg-neutral-50 p-3 text-center">
            <p className="text-sm font-medium capitalize">
              {statusMap[batchProgress.status] || batchProgress.status}
            </p>
            {batchProgress.failed > 0 && (
              <p className="mt-1 text-xs text-red-600">
                {t('progress_modal.failed', { count: batchProgress.failed })}
              </p>
            )}
            {isProcessing && (
              <p className="mt-1 text-xs text-blue-600">
                <RefreshCw className="mr-1 inline h-3 w-3 animate-spin" />
                {t('progress_modal.auto_refreshing')}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {isProcessing && (
              <Button variant="outline" className="flex-1" onClick={pauseBatch}>
                <Pause className="mr-2 h-4 w-4" />
                {t('progress_modal.pause')}
              </Button>
            )}
            {isPaused && (
              <Button variant="outline" className="flex-1" onClick={resumeBatch}>
                <Play className="mr-2 h-4 w-4" />
                {t('progress_modal.resume')}
              </Button>
            )}
            <Button variant="outline" className="flex-1" onClick={cancelBatch}>
              <Square className="mr-2 h-4 w-4" />
              {t('progress_modal.cancel')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
