/**
 * DownloadModal Component
 * Modal for batch download options
 */

'use client';

import { useState } from 'react';
import { useImageStudio } from '@/app/hooks/use-image-studio';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group';
import { Download } from 'lucide-react';

export function DownloadModal() {
  const { modal, closeModal, downloadBatch } = useImageStudio();
  const [format, setFormat] = useState<'png' | 'jpg' | 'webp'>('png');

  const isOpen = modal.type === 'download';

  const handleDownload = () => {
    downloadBatch(format);
    closeModal();
  };

  return (
    <Dialog open={isOpen} onOpenChange={closeModal}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Download Batch</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Image Format</Label>
            <RadioGroup value={format} onValueChange={(value: 'png' | 'jpg' | 'webp') => setFormat(value)}>
              <div className="flex items-center space-x-2 rounded-lg border p-3">
                <RadioGroupItem value="png" id="png" />
                <Label htmlFor="png" className="flex-1 cursor-pointer">
                  <div className="font-medium">PNG</div>
                  <div className="text-xs text-neutral-500">Lossless compression, larger file size</div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 rounded-lg border p-3">
                <RadioGroupItem value="jpg" id="jpg" />
                <Label htmlFor="jpg" className="flex-1 cursor-pointer">
                  <div className="font-medium">JPG</div>
                  <div className="text-xs text-neutral-500">Lossy compression, smaller file size</div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 rounded-lg border p-3">
                <RadioGroupItem value="webp" id="webp" />
                <Label htmlFor="webp" className="flex-1 cursor-pointer">
                  <div className="font-medium">WebP</div>
                  <div className="text-xs text-neutral-500">Modern format, best compression</div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Button className="w-full" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download as {format.toUpperCase()}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
