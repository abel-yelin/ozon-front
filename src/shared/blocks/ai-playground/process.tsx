'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { Sparkles, Upload, Settings, Clock, CheckCircle2, X } from 'lucide-react';

import { useAiPlayground } from '@/shared/contexts/ai-playground';
import { AI_JOB_TYPES } from '@/lib/api/ai-playground';
import { useAiImagePairs, useAiImageUpload, useAiJobProgress, useAiJobSubmit } from '@/app/hooks/use-ai-playground';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';

export function AiPlaygroundProcess() {
  const t = useTranslations('dashboard.aiplayground');
  const { activeTab, setActiveTab } = useAiPlayground();

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="process" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">{t('tabs.process')}</span>
          </TabsTrigger>
          <TabsTrigger value="review" className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span className="hidden sm:inline">{t('tabs.review')}</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">{t('tabs.history')}</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">{t('tabs.settings')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="process" className="space-y-6">
          <ProcessTab />
        </TabsContent>

        <TabsContent value="review" className="space-y-6">
          <ReviewTab />
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <HistoryTab />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ========================================
// Process Tab
// ========================================

function ProcessTab() {
  const t = useTranslations('dashboard.aiplayground');
  const tReview = useTranslations('dashboard.aiplayground-review');
  const {
    jobConfig,
    updateJobType,
    setJobConfig,
    uploadedImages,
    removeUploadedImage,
    clearUploadedImages,
    currentJobId,
    setActiveTab,
  } = useAiPlayground();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const maxFiles = 50;
  const maxSize = 10 * 1024 * 1024;
  const { uploadFiles, isUploading, error, canUpload } = useAiImageUpload({
    maxFiles,
    maxSize,
    allowedTypes: ['image/png', 'image/jpeg', 'image/webp'],
  });
  const [selectedType, setSelectedType] = useState(jobConfig.type);
  const { submitJob, isSubmitting, error: submitError, canSubmit } = useAiJobSubmit();
  const { progress, result, error: progressError } = useAiJobProgress(currentJobId);
  const imagePairOptions = useMemo(
    () => ({
      jobId: currentJobId || undefined,
      limit: 50,
      enabled: Boolean(currentJobId),
    }),
    [currentJobId]
  );
  const { imagePairs, isLoading: isLoadingPairs } = useAiImagePairs(imagePairOptions);
  const previewPairs = useMemo(() => {
    if (result) {
      return result.source_image_urls.map((sourceUrl, index) => ({
        id: `${sourceUrl}-${index}`,
        sourceUrl,
        resultUrl: result.result_image_urls[index],
      }));
    }

    if (imagePairs.length > 0) {
      return imagePairs.map((pair) => ({
        id: pair.id,
        sourceUrl: pair.sourceUrl,
        resultUrl: pair.resultUrl,
      }));
    }

    return [];
  }, [result, imagePairs]);

  const handleTypeSelect = (type: string) => {
    setSelectedType(type as any);
    updateJobType(type as any);
  };

  const handleBrowse = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      uploadFiles(event.target.files);
    }
    event.target.value = '';
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      uploadFiles(event.dataTransfer.files);
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const backgroundConfig = jobConfig.backgroundReplacement || {
    backgroundPrompt: '',
    negativePrompt: '',
    quality: 'standard',
    format: 'png',
  };

  const handleBackgroundPromptChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setJobConfig({
      ...jobConfig,
      backgroundReplacement: {
        ...backgroundConfig,
        backgroundPrompt: event.target.value,
      },
    });
  };

  const handleNegativePromptChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setJobConfig({
      ...jobConfig,
      backgroundReplacement: {
        ...backgroundConfig,
        negativePrompt: event.target.value,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Job Type Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">{t('job_types.title')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {AI_JOB_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => handleTypeSelect(type.value)}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedType === type.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="text-center">
                <div className="font-medium">{t(`job_types.${type.value}`)}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {t(`job_types.${type.value}_desc`)}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Upload Area */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">{t('upload.title')}</h3>
        <div
          className="border-2 border-dashed rounded-lg p-6 space-y-5 h-[520px] overflow-y-auto"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {uploadedImages.length === 0 ? (
            <div className="text-center space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
              <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-lg font-medium">{t('upload.drag_drop')}</p>
              <p className="text-sm text-muted-foreground">
                {t('upload.supported_formats')}
              </p>
              <Button variant="outline" onClick={handleBrowse} disabled={!canUpload || isUploading}>
                {t('upload.browse')}
              </Button>
              <p className="text-xs text-muted-foreground">
                {t('upload.max_files', { max: maxFiles })}
              </p>
            </div>
          ) : null}
          {isUploading ? (
            <p className="text-sm text-muted-foreground text-center">
              {t('status.processing')}
            </p>
          ) : null}
          {error ? <p className="text-sm text-destructive text-center">{error}</p> : null}
          {uploadedImages.length > 0 ? (
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {t('upload.selected_count', { count: uploadedImages.length })}
                </p>
                <Button variant="ghost" size="sm" onClick={clearUploadedImages}>
                  {t('upload.clear_all')}
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {uploadedImages.map((image) => (
                  <div
                    key={image.id}
                    className="group relative overflow-hidden rounded-lg border bg-muted/10"
                  >
                    <img
                      src={image.url}
                      alt={image.name}
                      className="h-24 w-full object-contain bg-muted/20"
                      loading="lazy"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-2 rounded-full bg-background/90 p-1 shadow opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => removeUploadedImage(image.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <div className="px-2 py-1 text-xs text-muted-foreground truncate">
                      {image.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {currentJobId && isLoadingPairs ? (
            <p className="text-sm text-muted-foreground text-center border-t pt-4">
              {t('status.processing')}
            </p>
          ) : null}
          {previewPairs.length > 0 ? (
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{t('tabs.review')}</p>
                <Button variant="outline" size="sm" onClick={() => setActiveTab('review')}>
                  {t('tabs.review')}
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {previewPairs.map((pair) => (
                  <div key={pair.id} className="rounded-lg border p-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs uppercase text-muted-foreground">
                          {tReview('image_card.source')}
                        </p>
                        <img
                          src={pair.sourceUrl}
                          alt="Source"
                          className="mt-2 h-24 w-full rounded-md object-contain bg-muted/20"
                          loading="lazy"
                        />
                      </div>
                      <div>
                        <p className="text-xs uppercase text-muted-foreground">
                          {tReview('image_card.result')}
                        </p>
                        {pair.resultUrl ? (
                          <img
                            src={pair.resultUrl}
                            alt="Result"
                            className="mt-2 h-24 w-full rounded-md object-contain bg-muted/20"
                            loading="lazy"
                          />
                        ) : (
                          <div className="mt-2 h-24 w-full rounded-md border border-dashed" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Configuration */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">{t('config.title')}</h3>
        <div className="space-y-4 p-4 border rounded-lg">
          {jobConfig.type === 'background_replacement' ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('config.background_prompt')}</label>
                <Textarea
                  rows={3}
                  value={backgroundConfig.backgroundPrompt}
                  placeholder={t('config.background_prompt_placeholder')}
                  onChange={handleBackgroundPromptChange}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('config.negative_prompt')}</label>
                <Textarea
                  rows={2}
                  value={backgroundConfig.negativePrompt}
                  placeholder={t('config.negative_prompt_placeholder')}
                  onChange={handleNegativePromptChange}
                />
              </div>
            </>
          ) : null}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">{t('config.quality')}</label>
              <div className="mt-2 space-y-2">
                <button className="w-full text-left px-3 py-2 rounded border">
                  {t('config.quality_standard')}
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">{t('config.format')}</label>
              <div className="mt-2 space-y-2">
                <button className="w-full text-left px-3 py-2 rounded border">
                  {t('config.format_png')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button
          size="lg"
          className="min-w-[200px]"
          onClick={submitJob}
          disabled={!canSubmit || isSubmitting || isUploading}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          {t('actions.submit')}
        </Button>
      </div>

      {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}
      {progressError ? <p className="text-sm text-destructive">{progressError}</p> : null}

      {progress ? (
        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {t(
                `status.${progress.status === 'cancelled' ? 'failed' : progress.status}`
              )}
            </p>
            <span className="text-sm text-muted-foreground">
              {t('status.progress', { progress: progress.progress })}
            </span>
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-primary transition-all"
              style={{ width: `${progress.progress}%` }}
            />
          </div>
        </div>
      ) : null}

      
    </div>
  );
}

// ========================================
// Review Tab
// ========================================

function ReviewTab() {
  const t = useTranslations('dashboard.aiplayground-review');
  const { currentJobId } = useAiPlayground();
  const imagePairOptions = useMemo(
    () => ({
      jobId: currentJobId || undefined,
      limit: 100,
      enabled: Boolean(currentJobId),
    }),
    [currentJobId]
  );
  const { imagePairs, isLoading, error, updateImagePair } = useAiImagePairs(imagePairOptions);

  const handleApprove = async (pairId: string) => {
    await updateImagePair(pairId, { approved: true, archived: false });
  };

  const handleReject = async (pairId: string) => {
    await updateImagePair(pairId, { approved: false, archived: true });
  };

  if (!currentJobId) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{t('empty.description')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isLoading ? <p className="text-muted-foreground">{t('description')}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {imagePairs.length === 0 && !isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t('empty.description')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {imagePairs.map((pair) => (
            <div key={pair.id} className="rounded-lg border p-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">
                    {t('image_card.source')}
                  </p>
                  <img
                    src={pair.sourceUrl}
                    alt="Source"
                    className="mt-2 h-36 w-full rounded-md object-cover"
                    loading="lazy"
                  />
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">
                    {t('image_card.result')}
                  </p>
                  {pair.resultUrl ? (
                    <img
                      src={pair.resultUrl}
                      alt="Result"
                      className="mt-2 h-36 w-full rounded-md object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="mt-2 h-36 w-full rounded-md border border-dashed" />
                  )}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Button size="sm" onClick={() => handleApprove(pair.id)}>
                  {t('image_card.approve')}
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleReject(pair.id)}>
                  {t('image_card.reject')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ========================================
// History Tab
// ========================================

function HistoryTab() {
  const t = useTranslations('dashboard.aiplayground-history');

  return (
    <div className="text-center py-12">
      <p className="text-muted-foreground">{t('empty.description')}</p>
    </div>
  );
}

// ========================================
// Settings Tab
// ========================================

function SettingsTab() {
  const t = useTranslations('dashboard.aiplayground-settings');

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">{t('sections.general')}</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">{t('general.auto_approve')}</p>
              <p className="text-sm text-muted-foreground">
                {t('general.auto_approve_desc')}
              </p>
            </div>
            <input type="checkbox" className="h-4 w-4" />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button>{t('actions.save')}</Button>
      </div>
    </div>
  );
}
