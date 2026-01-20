/**
 * TopBar Component
 * Header with navigation and action buttons
 */

'use client';

import { useImageStudio } from '@/app/hooks/use-image-studio';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import {
  Home,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

export function TopBar() {
  const { currentSKU, isLoading, error, loadSKUs, refreshCurrentSKU } = useImageStudio();

  return (
    <header className="flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-4">
      <div className="flex items-center gap-4">
        {/* Breadcrumb / Navigation */}
        <div className="flex items-center gap-2 text-sm">
          <Home className="h-4 w-4 text-neutral-400" />
          <span className="text-neutral-600">Dashboard</span>
          <span className="text-neutral-400">/</span>
          <span className="font-medium text-neutral-900">Image Studio</span>
        </div>

        {/* Current SKU indicator */}
        {currentSKU && (
          <>
            <div className="h-6 w-px bg-neutral-200" />
            <Badge variant="outline" className="gap-1">
              <span className="text-neutral-600">Current:</span>
              <span className="font-medium">{currentSKU.article}</span>
            </Badge>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Error indicator */}
        {error && (
          <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-1.5 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Refresh button */}
        <Button
          variant="outline"
          size="sm"
          onClick={currentSKU ? refreshCurrentSKU : loadSKUs}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
    </header>
  );
}
