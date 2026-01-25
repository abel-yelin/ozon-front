/**
 * OptPromptModal Component
 * Modal for regeneration options and reference image upload
 */

'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useImageStudio } from '@/app/hooks/use-image-studio';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Switch } from '@/shared/components/ui/switch';
import { Sparkles, Upload, AlertCircle } from 'lucide-react';

export function OptPromptModal() {
  const t = useTranslations('dashboard.imagestudio');
  const { modal, closeModal, regenerateImage } = useImageStudio();
  const pairId = modal.data?.pairId;

  const isOpen = modal.type === 'opt-prompt';
  const canSubmit = Boolean(pairId);

  const [options, setOptions] = useState({
    includeCommon: true,
    includeRole: false,
    includeTitleDetails: true,
    includePlan: false,
    includeStyle: false,
    optWatermark: false,
    optLogo: false,
    optTextEdit: false,
    optRestructure: false,
    optRecolor: false,
    optAddMarkers: false,
    strongConsistency: false,
    extraPrompt: '',
  });

  const [refFile, setRefFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingCredits, setRemainingCredits] = useState<number | null>(null);

  // Fetch user's credit balance when modal opens
  useEffect(() => {
    if (isOpen) {
      fetch('/api/user/get-user-credits')
        .then(res => res.json())
        .then(data => {
          if (data.code === 0) {
            setRemainingCredits(data.data?.remainingCredits || 0);
          }
        })
        .catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRegenerate = async () => {
    if (!pairId) return;

    setIsLoading(true);
    setError(null);

    try {
      console.info('[ImageStudio] Regenerate submit', { pairId });
      await regenerateImage(pairId, { ...options, refFile: refFile || undefined });
      console.info('[ImageStudio] Regenerate submitted', { pairId });
      closeModal();
    } catch (error) {
      console.error('[ImageStudio] Regenerate failed', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to regenerate image';

      // Check if it's an insufficient credits error
      if (errorMsg.includes('积分不足') || errorMsg.includes('Insufficient credits')) {
        setError(errorMsg);
      } else {
        setError('重新生成失败，请稍后重试');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setRefFile(file);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={closeModal}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('opt_prompt_modal.title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Prompt Components */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {t('opt_prompt_modal.section_prompt_components')}
            </Label>
            <div className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-neutral-600">
                  {t('opt_prompt_modal.option_common')}
                </Label>
                <Switch
                  checked={options.includeCommon}
                  onCheckedChange={checked =>
                    setOptions(prev => ({ ...prev, includeCommon: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-neutral-600">
                  {t('opt_prompt_modal.option_role')}
                </Label>
                <Switch
                  checked={options.includeRole}
                  onCheckedChange={checked =>
                    setOptions(prev => ({ ...prev, includeRole: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-neutral-600">
                  {t('opt_prompt_modal.option_title_details')}
                </Label>
                <Switch
                  checked={options.includeTitleDetails}
                  onCheckedChange={checked =>
                    setOptions(prev => ({ ...prev, includeTitleDetails: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-neutral-600">
                  {t('opt_prompt_modal.option_plan')}
                </Label>
                <Switch
                  checked={options.includePlan}
                  onCheckedChange={checked =>
                    setOptions(prev => ({ ...prev, includePlan: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-neutral-600">
                  {t('opt_prompt_modal.option_style')}
                </Label>
                <Switch
                  checked={options.includeStyle}
                  onCheckedChange={checked =>
                    setOptions(prev => ({ ...prev, includeStyle: checked }))
                  }
                />
              </div>
            </div>
          </div>

          {/* Image Options */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {t('opt_prompt_modal.section_image_options')}
            </Label>
            <div className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-neutral-600">
                  {t('opt_prompt_modal.option_watermark')}
                </Label>
                <Switch
                  checked={options.optWatermark}
                  onCheckedChange={checked =>
                    setOptions(prev => ({ ...prev, optWatermark: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-neutral-600">
                  {t('opt_prompt_modal.option_logo')}
                </Label>
                <Switch
                  checked={options.optLogo}
                  onCheckedChange={checked =>
                    setOptions(prev => ({ ...prev, optLogo: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-neutral-600">
                  {t('opt_prompt_modal.option_text_edit')}
                </Label>
                <Switch
                  checked={options.optTextEdit}
                  onCheckedChange={checked =>
                    setOptions(prev => ({ ...prev, optTextEdit: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-neutral-600">
                  {t('opt_prompt_modal.option_restructure')}
                </Label>
                <Switch
                  checked={options.optRestructure}
                  onCheckedChange={checked =>
                    setOptions(prev => ({ ...prev, optRestructure: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-neutral-600">
                  {t('opt_prompt_modal.option_recolor')}
                </Label>
                <Switch
                  checked={options.optRecolor}
                  onCheckedChange={checked =>
                    setOptions(prev => ({ ...prev, optRecolor: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-neutral-600">
                  {t('opt_prompt_modal.option_add_markers')}
                </Label>
                <Switch
                  checked={options.optAddMarkers}
                  onCheckedChange={checked =>
                    setOptions(prev => ({ ...prev, optAddMarkers: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-neutral-600">
                  {t('opt_prompt_modal.option_strong_consistency')}
                </Label>
                <Switch
                  checked={options.strongConsistency}
                  onCheckedChange={checked =>
                    setOptions(prev => ({ ...prev, strongConsistency: checked }))
                  }
                />
              </div>
            </div>
          </div>

          {/* Extra Prompt */}
          <div className="space-y-2">
            <Label>{t('opt_prompt_modal.section_extra_prompt')}</Label>
            <Textarea
              placeholder={t('opt_prompt_modal.extra_prompt_placeholder')}
              value={options.extraPrompt}
              onChange={e =>
                setOptions(prev => ({ ...prev, extraPrompt: e.target.value }))
              }
              rows={3}
            />
          </div>

          {/* Reference Image */}
          <div className="space-y-2">
            <Label>{t('opt_prompt_modal.section_reference_image')}</Label>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="flex-1" asChild>
                <label htmlFor="ref-file" className="cursor-pointer">
                  <Upload className="mr-2 h-4 w-4" />
                  {refFile ? refFile.name : t('opt_prompt_modal.choose_file')}
                </label>
              </Button>
              <input
                id="ref-file"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              {refFile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRefFile(null)}
                >
                  {t('opt_prompt_modal.clear')}
                </Button>
              )}
            </div>
          </div>

          {!canSubmit && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              {t('opt_prompt_modal.warning_select_image')}
            </div>
          )}

          {/* Credit Balance Display */}
          {remainingCredits !== null && (
            <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-blue-700">当前积分余额：</span>
                <span className="font-semibold text-blue-900">{remainingCredits}</span>
              </div>
              <div className="mt-1 text-blue-600">
                单张图片重新生成需要 <span className="font-semibold">1</span> 积分
              </div>
              {remainingCredits < 1 && (
                <div className="mt-2 flex items-center gap-1 text-xs text-red-600">
                  <AlertCircle className="h-3 w-3" />
                  <span>积分不足，请先充值</span>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold">生成失败</div>
                  <div className="mt-1">{error}</div>
                  {error.includes('积分不足') && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 h-7 text-xs"
                      onClick={() => window.location.href = '/pricing'}
                    >
                      前往充值
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          <Button
            className="w-full"
            onClick={handleRegenerate}
            disabled={!canSubmit || isLoading || (remainingCredits !== null && remainingCredits < 1)}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {isLoading ? '提交中...' : t('opt_prompt_modal.regenerate')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
