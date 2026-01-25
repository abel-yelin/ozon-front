/**
 * EmptyState Component
 * Displays when no SKU is selected
 */

'use client';

import { useTranslations } from 'next-intl';
import { Package } from 'lucide-react';

export function EmptyState() {
  const t = useTranslations('dashboard.imagestudio');
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-neutral-100">
          <Package className="h-12 w-12 text-neutral-400" />
        </div>
        <h3 className="text-lg font-semibold text-neutral-900">
          {t('empty_state.title')}
        </h3>
        <p className="mt-2 text-sm text-neutral-600">
          {t('empty_state.description')}
        </p>
      </div>
    </div>
  );
}
