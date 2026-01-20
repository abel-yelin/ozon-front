'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Sparkles, Upload, Settings, Clock, CheckCircle2 } from 'lucide-react';

import { useAiPlayground } from '@/shared/contexts/ai-playground';
import { AI_JOB_TYPES } from '@/lib/api/ai-playground';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Button } from '@/shared/components/ui/button';

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
  const { jobConfig, updateJobType } = useAiPlayground();
  const [selectedType, setSelectedType] = useState(jobConfig.type);

  const handleTypeSelect = (type: string) => {
    setSelectedType(type as any);
    updateJobType(type as any);
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
        <div className="border-2 border-dashed rounded-lg p-12 text-center">
          <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium mb-2">{t('upload.drag_drop')}</p>
          <p className="text-sm text-muted-foreground mb-4">
            {t('upload.supported_formats')}
          </p>
          <Button variant="outline">{t('upload.browse')}</Button>
        </div>
      </div>

      {/* Configuration */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">{t('config.title')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
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

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button size="lg" className="min-w-[200px]">
          <Sparkles className="h-4 w-4 mr-2" />
          {t('actions.submit')}
        </Button>
      </div>
    </div>
  );
}

// ========================================
// Review Tab
// ========================================

function ReviewTab() {
  const t = useTranslations('dashboard.aiplayground-review');

  return (
    <div className="text-center py-12">
      <p className="text-muted-foreground">{t('empty.description')}</p>
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
