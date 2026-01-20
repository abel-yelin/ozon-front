/**
 * MainContent Component
 * Central area displaying image grids and comparison views
 */

'use client';

import { useImageStudio } from '@/app/hooks/use-image-studio';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { ImageGrid } from './ImageGrid';
import { ImageComparison } from './ImageComparison';
import { EmptyState } from './EmptyState';

export function MainContent() {
  const { currentSKU, currentImagePairs } = useImageStudio();

  if (!currentSKU) {
    return <EmptyState />;
  }

  // Show comparison view if we have image pairs
  if (currentImagePairs.length > 0) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <ScrollArea className="flex-1">
          <div className="p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">{currentSKU.article}</h2>
              <p className="mt-1 text-sm text-neutral-600">
                {currentImagePairs.length} image pair{currentImagePairs.length !== 1 ? 's' : ''} available
              </p>
            </div>
            <div className="grid gap-6">
              {currentImagePairs.map(pair => (
                <ImageComparison key={pair.id} pair={pair} />
              ))}
            </div>
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Show grid view for SKU selection without images
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ScrollArea className="flex-1">
        <div className="p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">{currentSKU.article}</h2>
            <p className="mt-1 text-sm text-neutral-600">No images generated yet</p>
          </div>
          <ImageGrid />
        </div>
      </ScrollArea>
    </div>
  );
}
