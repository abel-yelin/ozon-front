/**
 * ImageModal Component
 * Modal for viewing images in full size
 */

'use client';

import { useEffect } from 'react';
import { useImageStudio } from '@/app/hooks/use-image-studio';
import { Dialog, DialogContent } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { X, Download } from 'lucide-react';

export function ImageModal() {
  const { modal, closeModal, downloadImage } = useImageStudio();

  const isOpen = modal.type === 'image';
  const pair = modal.data?.pair;

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeModal();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeModal]);

  if (!isOpen || !pair) return null;

  const handleDownload = () => {
    downloadImage(pair.id, 'png');
  };

  return (
    <Dialog open={isOpen} onOpenChange={closeModal}>
      <DialogContent className="max-h-[90vh] max-w-[90vw] p-0">
        <div className="relative flex h-[90vh] items-center justify-center bg-black">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 z-10 bg-black/50 text-white hover:bg-black/70"
            onClick={closeModal}
          >
            <X className="h-5 w-5" />
          </Button>

          {/* Download button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-4 z-10 bg-black/50 text-white hover:bg-black/70"
            onClick={handleDownload}
          >
            <Download className="h-5 w-5" />
          </Button>

          {/* Image */}
          <img
            src={pair.generated?.url || pair.original.url}
            alt="Full size"
            className="max-h-full max-w-full object-contain"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
