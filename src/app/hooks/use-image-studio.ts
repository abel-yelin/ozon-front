/**
 * useImageStudio custom hook
 * Convenience hook that exports the ImageStudio context
 * This provides a clean import path for components
 */

'use client';

import { useImageStudio as useImageStudioContext } from '@/shared/contexts/image-studio';

// Re-export the type for convenience
export type { ImageStudioContextValue } from '@/shared/contexts/image-studio';

/**
 * Hook to access ImageStudio context
 * Must be used within ImageStudioProvider
 *
 * @example
 * const { skus, selectSKU, startBatch } = useImageStudio();
 */
export function useImageStudio() {
  return useImageStudioContext();
}
