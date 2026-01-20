/**
 * ImageComparison Component
 * Displays before/after comparison for an image pair
 */

'use client';

import { useState } from 'react';
import { useImageStudio } from '@/app/hooks/use-image-studio';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Card } from '@/shared/components/ui/card';
import {
  Eye,
  Download,
  RefreshCw,
  Maximize2,
} from 'lucide-react';
import type { ImagePair } from '@/shared/blocks/image-studio/types';

interface ImageComparisonProps {
  pair: ImagePair;
}

export function ImageComparison({ pair }: ImageComparisonProps) {
  const { openModal, downloadImage, regenerateImage } = useImageStudio();
  const [showGenerated, setShowGenerated] = useState(!!pair.generated);

  const statusColors = {
    pending: 'bg-neutral-100 text-neutral-700',
    processing: 'bg-blue-100 text-blue-700',
    done: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
  };

  const statusLabels = {
    pending: 'Pending',
    processing: 'Processing...',
    done: 'Complete',
    failed: 'Failed',
  };

  const handleRegenerate = () => {
    openModal('opt-prompt', { pairId: pair.id });
  };

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-4 py-3">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs">
            {pair.type === 'main' ? 'Main Image' : 'Secondary'}
          </Badge>
          <Badge className={`text-xs ${statusColors[pair.status]}`}>
            {statusLabels[pair.status]}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowGenerated(!showGenerated)}
            disabled={!pair.generated}
          >
            <Eye className="mr-1 h-4 w-4" />
            {showGenerated ? 'Show Original' : 'Show Generated'}
          </Button>

          {pair.generated && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => downloadImage(pair.id, 'png')}
            >
              <Download className="h-4 w-4" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => openModal('image', { pair })}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleRegenerate}
            disabled={pair.status === 'processing'}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Image Display */}
      <div className="relative aspect-square w-full bg-neutral-100">
        {showGenerated && pair.generated ? (
          <img
            src={pair.generated.url}
            alt="Generated"
            className="h-full w-full object-contain"
          />
        ) : (
          <img
            src={pair.original.url}
            alt="Original"
            className="h-full w-full object-contain"
          />
        )}

        {/* Overlay info */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-2">
          <p className="text-xs text-white">
            {showGenerated && pair.generated
              ? `${pair.generated.width}x${pair.generated.height}`
              : `${pair.original.width}x${pair.original.height}`}
          </p>
          {pair.generated?.prompt && showGenerated && (
            <p className="mt-1 line-clamp-2 text-xs text-white/80">
              {pair.generated.prompt}
            </p>
          )}
        </div>
      </div>

      {/* Prompt display (if available) */}
      {pair.original.prompt && (
        <div className="border-t border-neutral-200 bg-neutral-50 px-4 py-2">
          <p className="text-xs text-neutral-600">
            <span className="font-medium">Prompt:</span> {pair.original.prompt}
          </p>
        </div>
      )}
    </Card>
  );
}
