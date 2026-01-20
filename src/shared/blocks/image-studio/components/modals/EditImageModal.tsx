/**
 * EditImageModal Component
 * Modal for editing/regenerating a selected input/output image
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useImageStudio } from '@/app/hooks/use-image-studio';
import { Dialog, DialogContent } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';

type EditImageModalData = {
  sku?: string;
  filename?: string;
  imageUrl?: string | null;
  sourceType?: 'input' | 'output';
};

type EditOptionsState = {
  includeCommon: boolean;
  includeRole: boolean;
  includeTitleDetails: boolean;
  includePlan: boolean;
  includeStyle: boolean;
  optWatermark: boolean;
  optLogo: boolean;
  optTextEdit: boolean;
  optRestructure: boolean;
  optRecolor: boolean;
  optAddMarkers: boolean;
  strongConsistency: boolean;
  extraPrompt: string;
};

const defaultOptions: EditOptionsState = {
  includeCommon: true,
  includeRole: false,
  includeTitleDetails: false,
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
};

export function EditImageModal() {
  const { modal, closeModal } = useImageStudio();
  const isOpen = modal.type === 'image-edit';
  const data = (modal.data || {}) as EditImageModalData;
  const [options, setOptions] = useState<EditOptionsState>(defaultOptions);
  const [refFileName, setRefFileName] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setOptions(defaultOptions);
    setRefFileName('');
  }, [isOpen, data.sourceType]);

  const title = useMemo(() => {
    const label = data.sourceType === 'input' ? 'input' : 'output';
    const name = data.filename ? data.filename : '未命名图片';
    if (data.sku) return `${data.sku} / ${name} (${label})`;
    return `${name} (${label})`;
  }, [data.filename, data.sku, data.sourceType]);

  const isInput = data.sourceType === 'input';
  const primaryLabel = isInput ? '微调覆盖原图' : '重新生成';
  const secondaryLabel = isInput ? '生成' : '当前图片优化';

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={closeModal}>
      <DialogContent className="max-w-[980px] p-0">
        <div className="flex flex-col">
          <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
            <div className="text-sm font-medium text-neutral-800">{title}</div>
            <button
              type="button"
              onClick={closeModal}
              className="rounded-md p-1 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-800"
              aria-label="关闭"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-6 px-6 py-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
              <div className="flex h-full min-h-[420px] items-center justify-center overflow-hidden rounded-xl bg-white">
                {data.imageUrl ? (
                  <img
                    src={data.imageUrl}
                    alt={data.filename || 'preview'}
                    className="max-h-[460px] w-full object-contain"
                  />
                ) : (
                  <div className="text-sm text-neutral-400">暂无预览</div>
                )}
              </div>
            </div>

            <div className="space-y-5 text-sm text-neutral-700">
              <div className="space-y-3">
                <div className="text-xs font-semibold text-neutral-500">生成类提示</div>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={options.includeCommon}
                    onCheckedChange={(checked) =>
                      setOptions((prev) => ({ ...prev, includeCommon: Boolean(checked) }))
                    }
                  />
                  通用
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={options.includeRole}
                    onCheckedChange={(checked) =>
                      setOptions((prev) => ({ ...prev, includeRole: Boolean(checked) }))
                    }
                  />
                  主/副图
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={options.includeTitleDetails}
                    onCheckedChange={(checked) =>
                      setOptions((prev) => ({ ...prev, includeTitleDetails: Boolean(checked) }))
                    }
                  />
                  标题详情
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={options.includePlan}
                    onCheckedChange={(checked) =>
                      setOptions((prev) => ({ ...prev, includePlan: Boolean(checked) }))
                    }
                  />
                  方案
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={options.includeStyle}
                    onCheckedChange={(checked) =>
                      setOptions((prev) => ({ ...prev, includeStyle: Boolean(checked) }))
                    }
                  />
                  风格（副图可用）
                </label>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-semibold text-neutral-500">修改类提示</div>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={options.optWatermark}
                    onCheckedChange={(checked) =>
                      setOptions((prev) => ({ ...prev, optWatermark: Boolean(checked) }))
                    }
                  />
                  去水印
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={options.optLogo}
                    onCheckedChange={(checked) =>
                      setOptions((prev) => ({ ...prev, optLogo: Boolean(checked) }))
                    }
                  />
                  去logo
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={options.optTextEdit}
                    onCheckedChange={(checked) =>
                      setOptions((prev) => ({ ...prev, optTextEdit: Boolean(checked) }))
                    }
                  />
                  文字修改
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={options.optRestructure}
                    onCheckedChange={(checked) =>
                      setOptions((prev) => ({ ...prev, optRestructure: Boolean(checked) }))
                    }
                  />
                  图片重构
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={options.optRecolor}
                    onCheckedChange={(checked) =>
                      setOptions((prev) => ({ ...prev, optRecolor: Boolean(checked) }))
                    }
                  />
                  重新配色
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={options.optAddMarkers}
                    onCheckedChange={(checked) =>
                      setOptions((prev) => ({ ...prev, optAddMarkers: Boolean(checked) }))
                    }
                  />
                  增加标记
                </label>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-semibold text-neutral-500">一致性增强</div>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={options.strongConsistency}
                    onCheckedChange={(checked) =>
                      setOptions((prev) => ({ ...prev, strongConsistency: Boolean(checked) }))
                    }
                  />
                  一致性加强
                </label>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold text-neutral-500">参考图（可选）</div>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setRefFileName(e.target.files?.[0]?.name || '')}
                />
                {refFileName ? (
                  <div className="text-xs text-neutral-400">{refFileName}</div>
                ) : null}
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold text-neutral-500">额外提示词（可选）</div>
                <Textarea
                  placeholder="可在此补充更具体的要求..."
                  value={options.extraPrompt}
                  onChange={(e) =>
                    setOptions((prev) => ({ ...prev, extraPrompt: e.target.value }))
                  }
                  rows={3}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-neutral-200 px-6 py-4">
            <Button variant="secondary">
              {secondaryLabel}
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700">
              {primaryLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
