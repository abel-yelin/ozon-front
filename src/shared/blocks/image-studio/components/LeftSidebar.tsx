/**
 * LeftSidebar Component
 * Displays list of SKUs with filtering and selection
 */

'use client';

import { useMemo } from 'react';
import { useImageStudio } from '@/app/hooks/use-image-studio';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Search, Upload, Filter } from 'lucide-react';
import type { SKUStatus } from '@/shared/blocks/image-studio/types';

export function LeftSidebar() {
  const {
    skus,
    selectedSKUIds,
    currentSKU,
    filters,
    loadSKUs,
    selectSKU,
    deselectSKU,
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

  const getStatusColor = (status: SKUStatus) => {
    switch (status) {
      case 'not_generated':
        return 'bg-neutral-200 text-neutral-700';
      case 'main_generated':
        return 'bg-blue-100 text-blue-700';
      case 'done':
        return 'bg-green-100 text-green-700';
    }
  };

  const getStatusLabel = (status: SKUStatus) => {
    switch (status) {
      case 'not_generated':
        return 'Not Generated';
      case 'main_generated':
        return 'Main Generated';
      case 'done':
        return 'Done';
    }
  };

  return (
    <div className="flex w-80 flex-col border-r border-neutral-200 bg-white">
      {/* Header */}
      <div className="border-b border-neutral-200 p-4">
        <h2 className="mb-3 text-lg font-semibold">Products</h2>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input
            placeholder="Search by article..."
            value={filters.searchQuery || ''}
            onChange={e => updateFilters({ searchQuery: e.target.value })}
            className="pl-9"
          />
        </div>

        {/* Filters */}
        <div className="mb-3 flex gap-2">
          <Select
            value={filters.status || 'all'}
            onValueChange={(value: SKUStatus | 'all') => updateFilters({ status: value })}
          >
            <SelectTrigger className="h-8 flex-1 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="not_generated">Not Generated</SelectItem>
              <SelectItem value="main_generated">Main Generated</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Upload button */}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => openModal('upload')}
        >
          <Upload className="mr-2 h-4 w-4" />
          Upload Images
        </Button>
      </div>

      {/* SKU List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredSKUs.length === 0 ? (
            <div className="py-8 text-center text-sm text-neutral-500">
              No products found
            </div>
          ) : (
            filteredSKUs.map(sku => (
              <div
                key={sku.id}
                className={`mb-1 flex cursor-pointer items-center gap-2 rounded-lg p-2 transition-colors ${
                  isCurrent(sku.id)
                    ? 'bg-blue-50'
                    : 'hover:bg-neutral-50'
                }`}
                onClick={() => setCurrentSKU(sku)}
              >
                <Checkbox
                  checked={isSelected(sku.id)}
                  onCheckedChange={checked => handleToggleSelect(sku.id, !!checked)}
                  onClick={e => e.stopPropagation()}
                />

                <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-neutral-100">
                  <img
                    src={sku.thumbnail}
                    alt={sku.article}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{sku.article}</div>
                  <div className="mt-0.5 flex items-center gap-1">
                    <Badge className={`h-4 px-1 text-xs ${getStatusColor(sku.status)}`}>
                      {getStatusLabel(sku.status)}
                    </Badge>
                    {sku.isMainImage && (
                      <Badge variant="outline" className="h-4 px-1 text-xs">
                        Main
                      </Badge>
                    )}
                  </div>
                </div>

                {sku.isApproved && (
                  <div className="text-green-500">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-neutral-200 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-neutral-600">
            {selectedSKUIds.size} selected
          </span>
          <span className="text-neutral-500">
            {filteredSKUs.length} total
          </span>
        </div>
      </div>
    </div>
  );
}
