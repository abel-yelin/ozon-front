/**
 * EmptyState Component
 * Displays when no SKU is selected
 */

'use client';

import { Package } from 'lucide-react';

export function EmptyState() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-neutral-100">
          <Package className="h-12 w-12 text-neutral-400" />
        </div>
        <h3 className="text-lg font-semibold text-neutral-900">No product selected</h3>
        <p className="mt-2 text-sm text-neutral-600">
          Select a product from the sidebar to view and manage images
        </p>
      </div>
    </div>
  );
}
