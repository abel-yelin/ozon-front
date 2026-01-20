/**
 * ImageGrid Component
 * Displays a grid of all SKUs when no specific SKU is selected
 */

'use client';

import { useImageStudio } from '@/app/hooks/use-image-studio';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Check } from 'lucide-react';

export function ImageGrid() {
  const { skus, selectedSKUIds, currentSKU, selectSKU, deselectSKU, setCurrentSKU } = useImageStudio();

  const isSelected = (id: string) => selectedSKUIds.has(id);
  const isCurrent = (id: string) => currentSKU?.id === id;

  const handleToggleSelect = (id: string) => {
    if (isSelected(id)) {
      deselectSKU(id);
    } else {
      selectSKU(id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'not_generated':
        return 'bg-neutral-200 text-neutral-700';
      case 'main_generated':
        return 'bg-blue-100 text-blue-700';
      case 'done':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-neutral-100 text-neutral-600';
    }
  };

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {skus.map(sku => (
        <div
          key={sku.id}
          className={`group relative overflow-hidden rounded-lg border-2 transition-all ${
            isCurrent(sku.id)
              ? 'border-blue-500 shadow-md'
              : 'border-transparent hover:border-neutral-300'
          }`}
        >
          {/* Selection indicator */}
          {isSelected(sku.id) && (
            <div className="absolute right-2 top-2 z-10 rounded-full bg-blue-500 p-1">
              <Check className="h-3 w-3 text-white" />
            </div>
          )}

          {/* Image thumbnail */}
          <div
            className="aspect-square cursor-pointer overflow-hidden bg-neutral-100"
            onClick={() => setCurrentSKU(sku)}
          >
            <img
              src={sku.thumbnail}
              alt={sku.article}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          </div>

          {/* Info overlay */}
          <div className="border-t border-neutral-200 bg-white p-2">
            <p className="truncate text-xs font-medium">{sku.article}</p>
            <div className="mt-1 flex items-center justify-between">
              <Badge className={`text-[10px] ${getStatusColor(sku.status)}`}>
                {sku.status.replace('_', ' ')}
              </Badge>
              {sku.isMainImage && (
                <span className="text-[10px] text-neutral-500">Main</span>
              )}
            </div>
          </div>

          {/* Quick select overlay on hover */}
          <div
            className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={() => handleToggleSelect(sku.id)}
          >
            <Button
              variant={isSelected(sku.id) ? 'default' : 'secondary'}
              size="sm"
            >
              {isSelected(sku.id) ? 'Selected' : 'Select'}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
