/**
 * LeftSidebar Component
 * Displays file list with search, filtering, and status selection
 */

'use client';

import { useMemo } from 'react';
import { useImageStudio } from '@/app/hooks/use-image-studio';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Input } from '@/shared/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Search, ChevronDown } from 'lucide-react';
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
    <div className="flex w-72 flex-col border-r border-gray-200 bg-gray-50">
      {/* Header with Search */}
      <div className="border-b border-gray-200 bg-white p-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="搜索..."
            value={filters.searchQuery || ''}
            onChange={e => updateFilters({ searchQuery: e.target.value })}
            className="border-gray-300 bg-gray-50 pl-9"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-gray-200 bg-white px-4 py-3">
        {/* Checkbox Filters */}
        <div className="mb-3 flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <Checkbox
              checked={filters.onlyMainImages}
              onCheckedChange={checked => updateFilters({ onlyMainImages: !!checked })}
            />
            <span>全选</span>
            <span className="ml-auto text-xs text-gray-500">{skus.length}</span>
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <Checkbox
              checked={filters.onlyMainImages}
              onCheckedChange={checked => updateFilters({ onlyMainImages: !!checked })}
            />
            <span>仅主图</span>
          </label>
        </div>

        {/* Status Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">状态:</span>
          <Select
            value={filters.status || 'all'}
            onValueChange={(value: SKUStatus | 'all') => updateFilters({ status: value })}
          >
            <SelectTrigger className="h-8 flex-1 border-gray-300 text-sm">
              <SelectValue placeholder="全部状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="not_generated">未生成</SelectItem>
              <SelectItem value="main_generated">主图已生成</SelectItem>
              <SelectItem value="done">已完成</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* File List */}
      <ScrollArea className="flex-1">
        <div className="bg-white p-2">
          {filteredSKUs.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">
              暂无文件
            </div>
          ) : (
            filteredSKUs.map(sku => (
              <div
                key={sku.id}
                className={`mb-1 flex cursor-pointer items-center gap-2 rounded-lg p-2 transition-colors ${
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
                />

                <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-gray-100">
                  <img
                    src={sku.thumbnail}
                    alt={sku.article}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-gray-900">{sku.article}</div>
                  <div className="mt-0.5 flex items-center gap-1">
                    <span className={`text-xs ${getStatusColor(sku.status)}`}>
                      {getStatusLabel(sku.status)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            已选择: {selectedSKUIds.size}
          </span>
          <span className="text-gray-500">
            共 {filteredSKUs.length} 项
          </span>
        </div>
      </div>
    </div>
  );
}
