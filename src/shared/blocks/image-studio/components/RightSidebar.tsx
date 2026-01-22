/**
 * RightSidebar Component
 * Displays batch processing controls and regeneration options
 */

'use client';

import { useState } from 'react';
import { useImageStudio } from '@/app/hooks/use-image-studio';
import { Button } from '@/shared/components/ui/button';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Label } from '@/shared/components/ui/label';
import { Switch } from '@/shared/components/ui/switch';
import { Slider } from '@/shared/components/ui/slider';
import { Badge } from '@/shared/components/ui/badge';
import { Textarea } from '@/shared/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  Play,
  Pause,
  Square,
  Download,
  Settings,
  Sparkles,
  FileUp,
} from 'lucide-react';

export function RightSidebar() {
  const {
    currentSKU,
    settings,
    batchProgress,
    batchStats,
    startBatch,
    cancelBatch,
    downloadBatch,
    openModal,
    updateSettings,
  } = useImageStudio();

  const [regenOptions, setRegenOptions] = useState({
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

  const handleStartBatch = () => {
    startBatch();
  };

  const handleDownload = (format: 'png' | 'jpg' | 'webp') => {
    downloadBatch(format);
  };

  return (
    <div className="flex w-72 flex-col border-l border-neutral-200 bg-white">
      {/* Batch Processing Section */}
      <div className="border-b border-neutral-200 p-4">
        <h3 className="mb-3 font-semibold">Batch Processing</h3>

        {batchProgress ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-600">Progress</span>
              <Badge variant="outline">{batchProgress.percentage}%</Badge>
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${batchProgress.percentage}%` }}
              />
            </div>

            <div className="flex text-xs text-neutral-500">
              <span>{batchProgress.completed} completed</span>
              <span className="mx-auto">/</span>
              <span>{batchProgress.total} total</span>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={cancelBatch}
                title="Stop and cancel the batch job"
              >
                <Square className="mr-1 h-3 w-3" />
                Stop
              </Button>
            </div>
          </div>
        ) : (
          <Button className="w-full" onClick={handleStartBatch}>
            <Play className="mr-2 h-4 w-4" />
            Start Batch
          </Button>
        )}

        {batchStats && (
          <div className="mt-3 rounded-lg bg-neutral-50 p-3 text-xs">
            <div className="flex justify-between">
              <span className="text-neutral-600">Pending:</span>
              <span className="font-medium">{batchStats.pending}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-neutral-600">Processing:</span>
              <span className="font-medium">{batchStats.processing}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-neutral-600">Completed:</span>
              <span className="font-medium text-green-600">{batchStats.completed}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-neutral-600">Failed:</span>
              <span className="font-medium text-red-600">{batchStats.failed}</span>
            </div>
          </div>
        )}
      </div>

      {/* Download Section */}
      <div className="border-b border-neutral-200 p-4">
        <h3 className="mb-3 font-semibold">Download</h3>
        <div className="grid grid-cols-3 gap-2">
          {(['png', 'jpg', 'webp'] as const).map(format => (
            <Button
              key={format}
              variant="outline"
              size="sm"
              onClick={() => handleDownload(format)}
              className="uppercase"
            >
              {format}
            </Button>
          ))}
        </div>
      </div>

      {/* Regeneration Options */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          <h3 className="mb-3 font-semibold">Regeneration Options</h3>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-sm">Prompt Components</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-neutral-600">Common</Label>
                  <Switch
                    checked={regenOptions.includeCommon}
                    onCheckedChange={checked =>
                      setRegenOptions(prev => ({ ...prev, includeCommon: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-neutral-600">Role</Label>
                  <Switch
                    checked={regenOptions.includeRole}
                    onCheckedChange={checked =>
                      setRegenOptions(prev => ({ ...prev, includeRole: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-neutral-600">Title Details</Label>
                  <Switch
                    checked={regenOptions.includeTitleDetails}
                    onCheckedChange={checked =>
                      setRegenOptions(prev => ({ ...prev, includeTitleDetails: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-neutral-600">Plan</Label>
                  <Switch
                    checked={regenOptions.includePlan}
                    onCheckedChange={checked =>
                      setRegenOptions(prev => ({ ...prev, includePlan: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-neutral-600">Style</Label>
                  <Switch
                    checked={regenOptions.includeStyle}
                    onCheckedChange={checked =>
                      setRegenOptions(prev => ({ ...prev, includeStyle: checked }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Image Options</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-neutral-600">Watermark</Label>
                  <Switch
                    checked={regenOptions.optWatermark}
                    onCheckedChange={checked =>
                      setRegenOptions(prev => ({ ...prev, optWatermark: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-neutral-600">Logo</Label>
                  <Switch
                    checked={regenOptions.optLogo}
                    onCheckedChange={checked =>
                      setRegenOptions(prev => ({ ...prev, optLogo: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-neutral-600">Text Edit</Label>
                  <Switch
                    checked={regenOptions.optTextEdit}
                    onCheckedChange={checked =>
                      setRegenOptions(prev => ({ ...prev, optTextEdit: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-neutral-600">Restructure</Label>
                  <Switch
                    checked={regenOptions.optRestructure}
                    onCheckedChange={checked =>
                      setRegenOptions(prev => ({ ...prev, optRestructure: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-neutral-600">Recolor</Label>
                  <Switch
                    checked={regenOptions.optRecolor}
                    onCheckedChange={checked =>
                      setRegenOptions(prev => ({ ...prev, optRecolor: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-neutral-600">Add Markers</Label>
                  <Switch
                    checked={regenOptions.optAddMarkers}
                    onCheckedChange={checked =>
                      setRegenOptions(prev => ({ ...prev, optAddMarkers: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-neutral-600">Strong Consistency</Label>
                  <Switch
                    checked={regenOptions.strongConsistency}
                    onCheckedChange={checked =>
                      setRegenOptions(prev => ({ ...prev, strongConsistency: checked }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Extra Prompt</Label>
              <Textarea
                placeholder="Additional instructions..."
                value={regenOptions.extraPrompt}
                onChange={e =>
                  setRegenOptions(prev => ({ ...prev, extraPrompt: e.target.value }))
                }
                rows={3}
                className="text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Reference Image</Label>
              <Button
                variant="outline"
                className="w-full"
                size="sm"
                onClick={() => openModal('opt-prompt', { options: regenOptions })}
              >
                <FileUp className="mr-2 h-4 w-4" />
                Upload Reference
              </Button>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Settings Button */}
      <div className="border-t border-neutral-200 p-4">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => openModal('settings')}
        >
          <Settings className="mr-2 h-4 w-4" />
          Global Settings
        </Button>
      </div>
    </div>
  );
}
