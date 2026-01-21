/**
 * MainContent Component
 * Central area with batch header, dual-panel comparison, and bottom status bar
 */

'use client';

import { useImageStudio } from '@/app/hooks/use-image-studio';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { EmptyState } from './EmptyState';
import {
  Play,
  Square,
  RefreshCw,
  MoreVertical,
  Download,
} from 'lucide-react';

export function MainContent() {
  const {
    currentSKU,
    currentImagePairs,
    startBatch,
    openModal,
  } = useImageStudio();

  if (!currentSKU) {
    return <EmptyState />;
  }

  const hasImages = currentImagePairs.length > 0;

  return (
    <div className="flex flex-1 flex-col bg-white">
      {/* Batch Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {currentSKU.article}
            </h2>
            <Badge variant="outline" className="text-gray-600">
              共 {currentImagePairs.length} 张
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            {/* Processing Options */}
            <div className="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5">
              <Checkbox
                id="continuous"
                className="h-4 w-4"
              />
              <label htmlFor="continuous" className="cursor-pointer text-sm text-gray-700">
                连续处理
              </label>
            </div>

            <div className="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5">
              <Checkbox
                id="step-review"
                className="h-4 w-4"
              />
              <label htmlFor="step-review" className="cursor-pointer text-sm text-gray-700">
                分步审核
              </label>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              强制刷新
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {!hasImages ? (
            <div className="flex h-96 items-center justify-center text-gray-500">
              暂无图像数据
            </div>
          ) : (
            <div className="grid gap-6">
              {currentImagePairs.map((pair, index) => (
                <div key={pair.id} className="rounded-lg border border-gray-200 p-4">
                  <div className="grid grid-cols-2 gap-6">
                    {/* Input Panel */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500 uppercase">input</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            #{index + 1}
                          </Badge>
                          <Button variant="ghost" size="sm" className="h-6 px-2">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div
                        className="aspect-square cursor-pointer overflow-hidden rounded-lg bg-gray-100"
                        onClick={() =>
                          openModal('image-edit', {
                            sku: currentSKU.article,
                            filename: pair.inputName || pair.stem,
                            imageUrl: pair.inputUrl,
                            sourceType: 'input',
                            pairId: pair.id,
                          })
                        }
                      >
                        <img
                          src={pair.inputUrl}
                          alt={pair.inputName || pair.stem}
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <p className="text-sm text-gray-600">{pair.inputName || pair.stem}</p>
                    </div>

                    {/* Output Panel */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500 uppercase">output</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            #{index + 1}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2"
                            onClick={() => {/* TODO: download */}}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div
                        className="aspect-square cursor-pointer overflow-hidden rounded-lg bg-gray-100"
                        onClick={() =>
                          openModal('image-edit', {
                            sku: currentSKU.article,
                            filename: pair.outputName || pair.inputName || pair.stem,
                            imageUrl: pair.outputUrl || null,
                            sourceType: 'output',
                            pairId: pair.id,
                          })
                        }
                      >
                        {pair.outputUrl ? (
                          <img
                            src={pair.outputUrl}
                            alt={pair.outputName || pair.inputName || pair.stem}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-gray-400">
                            未生成
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {pair.outputName || '等待生成...'}
                      </p>
                    </div>
                  </div>

                  {/* Status Indicators */}
                  <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>
                        状态: {pair.status === 'done' ? '已完成' : pair.status === 'processing' ? '处理中' : pair.status === 'failed' ? '异常' : '待处理'}
                      </span>
                    </div>
                    <Button
                      variant="default"
                      size="sm"
                      className={`gap-2 text-white ${pair.outputUrl ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}
                      disabled={pair.status === 'processing'}
                      onClick={() => openModal('opt-prompt', { pairId: pair.id })}
                    >
                      <RefreshCw className="h-4 w-4" />
                      {pair.outputUrl ? '重新生成' : '生成'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Bottom Status Bar */}
      <div className="border-t border-gray-200 bg-white px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Left Section - Status and Progress Details */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {/* Status Icon - Blue Square */}
              <div className="h-4 w-4 rounded-sm bg-blue-500"></div>
              <span className="text-sm text-gray-700">等待任务开始</span>
            </div>
            <button className="text-xs italic text-gray-500 hover:text-gray-700">
              进度详情
            </button>
            {/* Progress Bar */}
            <div className="h-2 w-48 overflow-hidden rounded-full bg-gray-200">
              <div className="h-full w-0 bg-blue-500"></div>
            </div>
          </div>

          {/* Middle Section - Status Metrics */}
          <div className="flex items-center gap-8">
            <div className="flex items-baseline gap-2">
              <span className="text-sm text-gray-600">总任务数</span>
              <span className="text-base font-semibold text-gray-900">0</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-sm text-gray-600">进行中</span>
              <span className="text-base font-semibold text-gray-900">0</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-sm text-gray-600">已完成</span>
              <span className="text-base font-semibold text-gray-900">0</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-sm text-gray-600">异常任务</span>
              <span className="text-base font-semibold text-gray-900">0</span>
            </div>
          </div>

          {/* Right Section - Action Buttons */}
          <div className="flex items-center gap-3">
            <Button
              variant="default"
              size="sm"
              className="bg-orange-500 hover:bg-orange-600"
            >
              <Square className="mr-2 h-5 w-5" />
              终止
            </Button>
            <Button
              variant="default"
              size="sm"
              className="bg-teal-600 hover:bg-teal-700"
              onClick={() => startBatch()}
            >
              <Play className="mr-2 h-5 w-5" />
              开始批量处理
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
