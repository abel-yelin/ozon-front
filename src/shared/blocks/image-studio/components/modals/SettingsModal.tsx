/**
 * SettingsModal Component
 * Modal for global settings configuration
 */

'use client';

import { useImageStudio } from '@/app/hooks/use-image-studio';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { Switch } from '@/shared/components/ui/switch';
import { Slider } from '@/shared/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Settings } from 'lucide-react';

export function SettingsModal() {
  const { modal, closeModal, settings, updateSettings } = useImageStudio();

  const isOpen = modal.type === 'settings';

  const handleSave = () => {
    closeModal();
  };

  return (
    <Dialog open={isOpen} onOpenChange={closeModal}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Studio Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image Size */}
          <div className="space-y-2">
            <Label>Image Size</Label>
            <Select
              value={settings.imageSize}
              onValueChange={(value: '1024x1024' | '1536x1536' | '2048x2048') =>
                updateSettings({ imageSize: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1024x1024">1024 x 1024</SelectItem>
                <SelectItem value="1536x1536">1536 x 1536</SelectItem>
                <SelectItem value="2048x2048">2048 x 2048</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Image Format */}
          <div className="space-y-2">
            <Label>Image Format</Label>
            <Select
              value={settings.imageFormat}
              onValueChange={(value: 'png' | 'jpg' | 'webp') =>
                updateSettings({ imageFormat: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="png">PNG</SelectItem>
                <SelectItem value="jpg">JPG</SelectItem>
                <SelectItem value="webp">WebP</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quality */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Quality</Label>
              <span className="text-sm text-neutral-600">{settings.quality}%</span>
            </div>
            <Slider
              value={[settings.quality]}
              onValueChange={([value]) => updateSettings({ quality: value })}
              min={50}
              max={100}
              step={5}
              className="w-full"
            />
          </div>

          {/* Preserve Original */}
          <div className="flex items-center justify-between">
            <Label htmlFor="preserve">Preserve Original</Label>
            <Switch
              id="preserve"
              checked={settings.preserveOriginal}
              onCheckedChange={checked => updateSettings({ preserveOriginal: checked })}
            />
          </div>

          {/* Ozon API Credentials */}
          <div className="space-y-3 pt-3 border-t">
            <Label className="text-sm font-medium">Ozon API 凭证</Label>

            <div className="space-y-2">
              <Label htmlFor="ozon-client-id" className="text-xs text-neutral-600">
                Client ID
              </Label>
              <Input
                id="ozon-client-id"
                type="text"
                placeholder="输入 Ozon Client-Id"
                value={settings.ozonClientId || ''}
                onChange={(e) => updateSettings({ ozonClientId: e.target.value })}
                className="text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ozon-api-key" className="text-xs text-neutral-600">
                API Key
              </Label>
              <Input
                id="ozon-api-key"
                type="password"
                placeholder="输入 Ozon Api-Key"
                value={settings.ozonApiKey || ''}
                onChange={(e) => updateSettings({ ozonApiKey: e.target.value })}
                className="text-sm"
              />
            </div>
          </div>

          <Button className="w-full" onClick={handleSave}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
