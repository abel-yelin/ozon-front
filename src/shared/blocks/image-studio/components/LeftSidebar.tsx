/**
 * LeftSidebar Component
 * Displays file list with search, filtering, and status selection
 */

'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useImageStudio } from '@/app/hooks/use-image-studio';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Search } from 'lucide-react';
import type { SKUStatus } from '@/shared/blocks/image-studio/types';

export function LeftSidebar() {
  const t = useTranslations('dashboard.imagestudio');
  const {
    skus,
    selectedSKUIds,
    currentSKU,
    filters,
    loadSKUs,
    selectSKU,
    deselectSKU,
    selectMultipleSKUs,
    clearSelection,
    setCurrentSKU,
    updateFilters,
    openModal,
  } = useImageStudio();

  // Filter SKUs based on current filters
  const filteredSKUs = useMemo(() => {
    return skus.filter(sku => {
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        if (!sku.article.toLowerCase().includes(query)) {
          return false;
        }
      }
      if (filters.status && filters.status !== 'all') {
        if (sku.status !== filters.status) {
          return false;
        }
      }
      if (filters.onlyMainImages && !sku.isMainImage) {
        return false;
      }
      if (filters.onlyApproved && !sku.isApproved) {
        return false;
      }
      return true;
    });
  }, [skus, filters]);

  const isSelected = (id: string) => selectedSKUIds.has(id);
  const isCurrent = (id: string) => currentSKU?.id === id;

  const handleToggleSelect = (id: string, checked: boolean) => {
    if (checked) {
      selectSKU(id);
    } else {
      deselectSKU(id);
    }
  };

  const getStatusLabel = (status: SKUStatus) => {
    switch (status) {
      case 'not_generated':
        return t('left_sidebar.status_not_generated');
      case 'main_generated':
        return t('left_sidebar.status_main_generated');
      case 'done':
        return t('left_sidebar.status_done');
    }
  };

  const getStatusColor = (status: SKUStatus) => {
    switch (status) {
      case 'not_generated':
        return 'text-gray-500';
      case 'main_generated':
        return 'text-blue-500';
      case 'done':
        return 'text-green-500';
    }
  };

  return (
    <div className="flex w-72 flex-col border-r border-gray-200 bg-gray-50">
      {/* Header with Search */}
      <div className="border-b border-gray-200 bg-white p-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder={t('left_sidebar.search_placeholder')}
            value={filters.searchQuery || ''}
            onChange={e => updateFilters({ searchQuery: e.target.value })}
            className="border-gray-300 bg-gray-50 pl-9"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-gray-200 bg-white px-4 py-3">
        {/* Filter Buttons */}
        <div className="mb-3 flex gap-2">
          <button
            onClick={() => {
              if (selectedSKUIds.size === skus.length) {
                clearSelection();
              } else {
                selectMultipleSKUs(skus.map(s => s.id));
              }
            }}
            className={`flex-1 rounded-md px-3 py-2 text-sm transition-colors ${
              selectedSKUIds.size === skus.length && skus.length > 0
                ? 'border border-gray-300 bg-white text-gray-700'
                : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {t('left_sidebar.select_all', { count: skus.length })}
          </button>
          <button
            onClick={() => updateFilters({ onlyMainImages: !filters.onlyMainImages })}
            className={`flex-1 rounded-md px-3 py-2 text-sm transition-colors ${
              filters.onlyMainImages
                ? 'bg-blue-500 text-white'
                : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {t('left_sidebar.only_main')}
          </button>
        </div>

        {/* Status Dropdown */}
        <Select
          value={filters.status || 'all'}
          onValueChange={(value: SKUStatus | 'all') => updateFilters({ status: value })}
        >
          <SelectTrigger className="h-9 w-full border-gray-300 bg-white text-sm">
            <SelectValue placeholder={t('left_sidebar.status_placeholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('left_sidebar.status_all')}</SelectItem>
            <SelectItem value="not_generated">
              {t('left_sidebar.status_not_generated')}
            </SelectItem>
            <SelectItem value="main_generated">
              {t('left_sidebar.status_main_generated')}
            </SelectItem>
            <SelectItem value="done">{t('left_sidebar.status_done')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* File List */}
      <ScrollArea className="flex-1">
        <div className="bg-white">
          {filteredSKUs.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">
              {t('left_sidebar.empty')}
            </div>
          ) : (
            filteredSKUs.map(sku => (
              <div
                key={sku.id}
                className={`flex cursor-pointer items-center gap-3 border-b border-gray-100 px-4 py-3 transition-colors ${
                  isCurrent(sku.id)
                    ? 'bg-blue-50'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => setCurrentSKU(sku)}
              >
                <Checkbox
                  checked={isSelected(sku.id)}
                  onCheckedChange={checked => handleToggleSelect(sku.id, !!checked)}
                  onClick={e => e.stopPropagation()}
                  className="h-5 w-5"
                />

                {/* Thumbnail */}
                <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                  <img
                    src={sku.thumbnail}
                    alt={sku.article}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-medium text-gray-900">{sku.article}</span>
                    {sku.status === 'done' && (
                      <span className="text-sm text-green-500">
                        {t('left_sidebar.archived_tag')}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                    <span className={`px-1.5 py-0.5 rounded ${getStatusColor(sku.status)} bg-opacity-10`}>
                      {getStatusLabel(sku.status)}
                    </span>
                    {sku.isMainImage && (
                      <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-600">
                        {t('left_sidebar.main_image')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer with Activate Button */}
      <div className="border-t border-gray-200 bg-gray-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">
            {t('left_sidebar.selected_count', { count: selectedSKUIds.size })}
          </span>
          <Button
            size="sm"
            className="bg-blue-500 hover:bg-blue-600"
            disabled={selectedSKUIds.size === 0}
          >
            {t('left_sidebar.activate')}
          </Button>
        </div>
      </div>
    </div>
  );
}
