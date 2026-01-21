/**
 * UploadModal Component
 * Modal for pushing processed images to Ozon product listings
 */

'use client';

import { useState } from 'react';
import { useImageStudio } from '@/app/hooks/use-image-studio';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Upload, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

interface PushResult {
  success: boolean;
  data?: {
    product_id: number;
    updated: {
      images: number;
      images360: number;
      color_image: boolean;
    };
    current_images: string[];
  };
  error?: string;
  errors?: Array<{
    field: string;
    index?: number;
    url?: string;
    reason: string;
  }>;
}

export function UploadModal() {
  const { modal, closeModal, currentSKU, currentImagePairs, settings } = useImageStudio();
  const [pushing, setPushing] = useState(false);
  const [result, setResult] = useState<PushResult | null>(null);

  const isOpen = modal.type === 'upload';

  const handlePush = async () => {
    setPushing(true);
    setResult(null);

    try {
      // Get credential from settings
      const credential = {
        client_id: settings.ozonClientId || '',
        api_key: settings.ozonApiKey || ''
      };

      if (!credential.client_id || !credential.api_key) {
        setResult({
          success: false,
          error: 'Ozon API 凭证未配置，请先在设置中配置 Client ID 和 API Key'
        });
        return;
      }

      // Get product_id from currentSKU
      const product_id = currentSKU?.productId;
      if (!product_id) {
        setResult({
          success: false,
          error: '未找到 Product ID，请先下载商品信息'
        });
        return;
      }

      // Build R2 URL list from processed images (outputUrl from image pairs)
      const images = currentImagePairs
        .filter(pair => pair.outputUrl)
        .map(pair => pair.outputUrl);

      if (images.length === 0) {
        setResult({
          success: false,
          error: '没有可推送的图片，请先处理图片'
        });
        return;
      }

      // Call backend API
      const response = await fetch('/api/v1/ozon/push-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential,
          product_id,
          images
        })
      });

      const data: PushResult = await response.json();
      setResult(data);

    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      });
    } finally {
      setPushing(false);
    }
  };

  const handleClose = () => {
    closeModal();
    setResult(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>推送图片到 Ozon</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current SKU info */}
          {currentSKU && (
            <div className="text-sm p-3 bg-neutral-50 rounded-lg">
              <p className="font-medium">当前商品</p>
              <p className="text-neutral-600">SKU: {currentSKU.article || '未设置'}</p>
              <p className="text-neutral-600">Product ID: {currentSKU.productId || '未设置'}</p>
            </div>
          )}

          {/* Image preview */}
          {currentImagePairs.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">
                待推送图片 ({currentImagePairs.filter(p => p.outputUrl).length} 张)
              </p>
              <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto">
                {currentImagePairs.filter(p => p.outputUrl).map((pair) => (
                  <div key={pair.id} className="aspect-square rounded overflow-hidden bg-neutral-100">
                    <img
                      src={pair.outputUrl || pair.inputUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Result display */}
          {result && (
            <div className={`p-3 rounded-lg ${
              result.success
                ? 'bg-green-50 text-green-800'
                : 'bg-red-50 text-red-800'
            }`}>
              <div className="flex items-start gap-2">
                {result.success ? (
                  <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  {result.success ? (
                    <div>
                      <p className="font-medium">推送成功!</p>
                      <p className="text-sm mt-1">
                        已更新 {result.data?.updated.images} 张主图
                        {result.data?.updated.color_image && '，1 张色彩图'}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium">推送失败</p>
                      <p className="text-sm mt-1">{result.error}</p>
                      {result.errors && (
                        <ul className="text-sm mt-2 list-disc list-inside">
                          {result.errors.map((err, i) => (
                            <li key={i}>
                              {err.field}: {err.reason}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleClose}
              disabled={pushing}
            >
              取消
            </Button>
            <Button
              className="flex-1"
              onClick={handlePush}
              disabled={pushing || currentImagePairs.filter(p => p.outputUrl).length === 0}
            >
              {pushing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  推送中...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  确认推送
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
