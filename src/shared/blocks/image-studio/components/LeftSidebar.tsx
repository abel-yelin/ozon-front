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

  const getStatusLabel = (status: SKUStatus) => {
    switch (status) {
      case 'not_generated':
        return '未生成';
      case 'main_generated':
        return '主图已生成';
      case 'done':
        return '已归档';
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
            placeholder="搜索..."
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
            全选 ({skus.length})
          </button>
          <button
            onClick={() => updateFilters({ onlyMainImages: !filters.onlyMainImages })}
            className={`flex-1 rounded-md px-3 py-2 text-sm transition-colors ${
              filters.onlyMainImages
                ? 'bg-blue-500 text-white'
                : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            仅主图
          </button>
        </div>

        {/* Status Dropdown */}
        <Select
          value={filters.status || 'all'}
          onValueChange={(value: SKUStatus | 'all') => updateFilters({ status: value })}
        >
          <SelectTrigger className="h-9 w-full border-gray-300 bg-white text-sm">
            <SelectValue placeholder="全部状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="not_generated">未生成</SelectItem>
            <SelectItem value="main_generated">主图已生成</SelectItem>
            <SelectItem value="done">已归档</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* File List */}
      <ScrollArea className="flex-1">
        <div className="bg-white">
          {filteredSKUs.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">
              暂无文件
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

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-medium text-gray-900">{sku.article}</span>
                    {sku.status === 'done' && (
                      <span className="text-sm text-green-500">(已归档)</span>
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
            已选择 {selectedSKUIds.size} 项
          </span>
          <Button
            size="sm"
            className="bg-blue-500 hover:bg-blue-600"
            disabled={selectedSKUIds.size === 0}
          >
            激活
          </Button>
        </div>
      </div>
    </div>
  );
}
