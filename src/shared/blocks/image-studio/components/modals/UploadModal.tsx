/**
 * UploadModal Component
 * Modal for pushing processed images to Ozon product listings
 */

'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
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
  errorLink?: {
    href: string;
    text: string;
    target?: string;
  };
  errors?: Array<{
    field: string;
    index?: number;
    url?: string;
    reason: string;
  }>;
}

export function UploadModal() {
  const t = useTranslations('dashboard.imagestudio');
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
        error: t('upload_modal.errors.no_credential')
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
          error: t('upload_modal.errors.no_product_id'),
          errorLink: {
            href: '/dashboard/ozon',
            text: t('upload_modal.errors.go_to_ozon'),
            target: '_blank'
          }
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
          error: t('upload_modal.errors.no_images')
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

      if (!response.ok) {
        const errorData = await response.json();
        setResult({
          success: false,
          error: errorData.message || t('upload_modal.errors.request_failed')
        });
        return;
      }

      const resp = await response.json();

      // Handle wrapped response structure: {code, message, data}
      if (resp.code !== 0) {
        setResult({
          success: false,
          error: resp.message || t('upload_modal.errors.push_failed')
        });
        return;
      }

      // Extract actual PushResult from wrapped data
      const data: PushResult = resp.data;
      setResult(data);

    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : t('upload_modal.errors.unknown')
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
          <DialogTitle>{t('upload_modal.title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Credential Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('upload_modal.credential_label')}</label>
            {credentials.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  {t('upload_modal.credential_empty_prefix')}
                  <a href="/dashboard/credentials" className="underline font-medium">
                    {t('upload_modal.credential_empty_link')}
                  </a>
                  {t('upload_modal.credential_empty_suffix')}
                </p>
              </div>
            ) : (
              <Select value={selectedCredentialId} onValueChange={setSelectedCredentialId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('upload_modal.credential_placeholder')} />
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
              <p className="font-medium">{t('upload_modal.current_product')}</p>
              <p className="text-neutral-600">
                {t('upload_modal.sku_label', {
                  value: currentSKU.article || t('upload_modal.not_set'),
                })}
              </p>
              <p className={`text-neutral-600 ${currentSKU.productId ? 'text-green-700 font-medium' : 'text-amber-600'}`}>
                {t('upload_modal.product_id_label', {
                  value: currentSKU.productId || t('upload_modal.not_set'),
                })}
                {currentSKU.productId && <span className="ml-1">✓</span>}
              </p>
              {!currentSKU.productId && (
                <a
                  href="/dashboard/ozon"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center mt-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors text-sm font-medium"
                >
                  {t('upload_modal.product_id_download')}
                </a>
              )}
            </div>
          )}

          {/* Image preview */}
          {currentImagePairs.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">
                {t('upload_modal.images_to_push', {
                  count: currentImagePairs.filter(p => p.outputUrl).length,
                })}
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
                      <p className="font-medium">{t('upload_modal.success_title')}</p>
                      <p className="text-sm mt-1">
                        {t('upload_modal.success_images', {
                          count: result.data?.updated.images ?? 0,
                        })}
                        {result.data?.updated.color_image &&
                          t('upload_modal.success_color_image')}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium">{t('upload_modal.failure_title')}</p>
                      <p className="text-sm mt-1">{result.error}</p>
                      {result.errorLink && (
                        <a
                          href={result.errorLink.href}
                          target={result.errorLink.target || '_blank'}
                          rel="noopener noreferrer"
                          className="inline-flex items-center mt-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors text-sm font-medium"
                        >
                          {result.errorLink.text}
                        </a>
                      )}
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
              {t('upload_modal.cancel')}
            </Button>
            <Button
              className="flex-1"
              onClick={handlePush}
              disabled={pushing || !selectedCredentialId || currentImagePairs.filter(p => p.outputUrl).length === 0}
            >
              {pushing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('upload_modal.pushing')}
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {t('upload_modal.confirm_push')}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
