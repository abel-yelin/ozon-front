/**
 * UploadModal Component
 * Modal for pushing processed images to Ozon product listings
 */

'use client';

import { useState, useEffect } from 'react';
import { useImageStudio } from '@/app/hooks/use-image-studio';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Upload, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

interface OzonCredential {
  id: string;
  name: string;
  createdAt: string;
}

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
  const { modal, closeModal, currentSKU, currentImagePairs } = useImageStudio();
  const [pushing, setPushing] = useState(false);
  const [result, setResult] = useState<PushResult | null>(null);
  const [credentials, setCredentials] = useState<OzonCredential[]>([]);
  const [selectedCredentialId, setSelectedCredentialId] = useState<string>('');

  const isOpen = modal.type === 'upload';

  // Load credentials when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchCredentials();
    }
  }, [isOpen]);

  const fetchCredentials = async () => {
    try {
      const response = await fetch('/api/ozon/credentials');
      const data = await response.json();
      if (data.code === 0 && data.data) {
        setCredentials(data.data);
        // Auto-select first credential if available
        if (data.data.length > 0 && !selectedCredentialId) {
          setSelectedCredentialId(data.data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load credentials:', error);
    }
  };

  const handlePush = async () => {
    if (!selectedCredentialId) {
      setResult({
        success: false,
        error: '请先选择 Ozon API 凭证'
      });
      return;
    }

    setPushing(true);
    setResult(null);

    try {
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

      // Call backend API with credential ID
      const response = await fetch('/api/ozon/push-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentialId: selectedCredentialId,
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
    setSelectedCredentialId('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>推送图片到 Ozon</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Credential Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">选择 Ozon API 凭证</label>
            {credentials.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  未找到凭证，请先在{' '}
                  <a href="/dashboard/credentials" className="underline font-medium">
                    凭证管理
                  </a>
                  {' '}页面添加
                </p>
              </div>
            ) : (
              <Select value={selectedCredentialId} onValueChange={setSelectedCredentialId}>
                <SelectTrigger>
                  <SelectValue placeholder="选择凭证" />
                </SelectTrigger>
                <SelectContent>
                  {credentials.map((cred) => (
                    <SelectItem key={cred.id} value={cred.id}>
                      {cred.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

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
              disabled={pushing || !selectedCredentialId || currentImagePairs.filter(p => p.outputUrl).length === 0}
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
