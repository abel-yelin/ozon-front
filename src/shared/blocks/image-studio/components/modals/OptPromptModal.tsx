/**
 * OptPromptModal Component
 * Modal for regeneration options and reference image upload
 */

'use client';

import { useState } from 'react';
import { useImageStudio } from '@/app/hooks/use-image-studio';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Switch } from '@/shared/components/ui/switch';
import { Sparkles, Upload } from 'lucide-react';

export function OptPromptModal() {
  const { modal, closeModal, regenerateImage } = useImageStudio();
  const pairId = modal.data?.pairId;

  const isOpen = modal.type === 'opt-prompt';

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

  if (!isOpen) return null;

  const handleRegenerate = async () => {
    if (!pairId) return;
    await regenerateImage(pairId, { ...options, refFile: refFile || undefined });
    closeModal();
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
          <DialogTitle>Regeneration Options</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Prompt Components */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Prompt Components</Label>
            <div className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-neutral-600">Common</Label>
                <Switch
                  checked={options.includeCommon}
                  onCheckedChange={checked =>
                    setOptions(prev => ({ ...prev, includeCommon: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-neutral-600">Role</Label>
                <Switch
                  checked={options.includeRole}
                  onCheckedChange={checked =>
                    setOptions(prev => ({ ...prev, includeRole: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-neutral-600">Title Details</Label>
                <Switch
                  checked={options.includeTitleDetails}
                  onCheckedChange={checked =>
                    setOptions(prev => ({ ...prev, includeTitleDetails: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-neutral-600">Plan</Label>
                <Switch
                  checked={options.includePlan}
                  onCheckedChange={checked =>
                    setOptions(prev => ({ ...prev, includePlan: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-neutral-600">Style</Label>
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
            <Label className="text-sm font-medium">Image Options</Label>
            <div className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-neutral-600">Watermark</Label>
                <Switch
                  checked={options.optWatermark}
                  onCheckedChange={checked =>
                    setOptions(prev => ({ ...prev, optWatermark: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-neutral-600">Logo</Label>
                <Switch
                  checked={options.optLogo}
                  onCheckedChange={checked =>
                    setOptions(prev => ({ ...prev, optLogo: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-neutral-600">Text Edit</Label>
                <Switch
                  checked={options.optTextEdit}
                  onCheckedChange={checked =>
                    setOptions(prev => ({ ...prev, optTextEdit: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-neutral-600">Restructure</Label>
                <Switch
                  checked={options.optRestructure}
                  onCheckedChange={checked =>
                    setOptions(prev => ({ ...prev, optRestructure: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-neutral-600">Recolor</Label>
                <Switch
                  checked={options.optRecolor}
                  onCheckedChange={checked =>
                    setOptions(prev => ({ ...prev, optRecolor: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-neutral-600">Add Markers</Label>
                <Switch
                  checked={options.optAddMarkers}
                  onCheckedChange={checked =>
                    setOptions(prev => ({ ...prev, optAddMarkers: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-neutral-600">Strong Consistency</Label>
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
            <Label>Extra Prompt</Label>
            <Textarea
              placeholder="Additional instructions for image generation..."
              value={options.extraPrompt}
              onChange={e =>
                setOptions(prev => ({ ...prev, extraPrompt: e.target.value }))
              }
              rows={3}
            />
          </div>

          {/* Reference Image */}
          <div className="space-y-2">
            <Label>Reference Image (Optional)</Label>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="flex-1" asChild>
                <label htmlFor="ref-file" className="cursor-pointer">
                  <Upload className="mr-2 h-4 w-4" />
                  {refFile ? refFile.name : 'Choose file...'}
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
                  Clear
                </Button>
              )}
            </div>
          </div>

          <Button className="w-full" onClick={handleRegenerate}>
            <Sparkles className="mr-2 h-4 w-4" />
            Regenerate Image
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
