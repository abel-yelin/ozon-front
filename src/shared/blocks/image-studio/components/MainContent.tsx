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
import { ImageComparison } from './ImageComparison';
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
    batchProgress,
    startBatch,
    cancelBatch,
    downloadBatch,
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
                      <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
                        <img
                          src={pair.inputImage.url}
                          alt={pair.inputImage.filename}
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <p className="text-sm text-gray-600">{pair.inputImage.filename}</p>
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
                      <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
                        {pair.outputImage ? (
                          <img
                            src={pair.outputImage.url}
                            alt={pair.outputImage.filename}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-gray-400">
                            未生成
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {pair.outputImage?.filename || '等待生成...'}
                      </p>
                    </div>
                  </div>

                  {/* Status Indicators */}
                  <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>状态: {pair.status === 'completed' ? '已完成' : pair.status === 'processing' ? '处理中' : '待处理'}</span>
                      {pair.processingTime && (
                        <span>耗时: {pair.processingTime}ms</span>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      disabled={pair.status === 'processing'}
                    >
                      <RefreshCw className="h-4 w-4" />
                      重新生成
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Bottom Status Bar */}
      <div className="border-t border-gray-200 bg-gray-50 px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Progress Indicators */}
          <div className="flex items-center gap-6">
            {batchProgress ? (
              <>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">进度:</span>
                  <span className="font-medium text-gray-900">
                    {batchProgress.completed} / {batchProgress.total}
                  </span>
                  <span className="text-gray-500">
                    ({Math.round(batchProgress.percentage)}%)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">成功:</span>
                  <span className="font-medium text-green-600">
                    {batchProgress.completed}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">失败:</span>
                  <span className="font-medium text-red-600">
                    {batchProgress.failed}
                  </span>
                </div>
              </>
            ) : (
              <span className="text-sm text-gray-500">准备就绪</span>
            )}
          </div>

          {/* Control Buttons */}
          <div className="flex items-center gap-3">
            {batchProgress?.status === 'processing' ? (
              <Button
                variant="destructive"
                size="sm"
                className="gap-2"
                onClick={cancelBatch}
              >
                <Square className="h-4 w-4" />
                终止
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                className="gap-2 bg-blue-600 hover:bg-blue-700"
                onClick={() => startBatch()}
                disabled={!hasImages}
              >
                <Play className="h-4 w-4" />
                开始批量处理
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
