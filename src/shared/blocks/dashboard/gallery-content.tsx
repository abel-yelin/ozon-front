'use client';

import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { SmartIcon } from '@/shared/blocks/common';

type GalleryImage = {
  url: string;
  article: string;
  taskId: string;
  createdAt: string;
};

export function GalleryContent() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadImages();
  }, []);

  async function loadImages() {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/ozon/gallery?limit=240');
      const data = await response.json();

      if (data.code === 0) {
        setImages(data.data?.images || []);
      } else {
        setError(data.message || 'Failed to load gallery');
      }
    } catch (err) {
      console.error('Failed to load gallery:', err);
      setError('Failed to load gallery');
    } finally {
      setLoading(false);
    }
  }

  const filteredImages = useMemo(() => {
    if (!search) return images;
    const query = search.toLowerCase();
    return images.filter((image) => {
      return (
        image.article.toLowerCase().includes(query) ||
        image.taskId.toLowerCase().includes(query)
      );
    });
  }, [images, search]);

  if (loading) {
    return <GallerySkeleton />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Image Gallery</h2>
            <p className="text-muted-foreground">
              Browse images uploaded to Cloudflare R2
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row">
            <Input
              placeholder="Search by article or task id..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="md:w-[260px]"
            />
            <Button variant="outline" onClick={loadImages}>
              <SmartIcon name="RefreshCw" className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card>
          <CardContent className="p-6 text-sm text-red-600">
            {error}
          </CardContent>
        </Card>
      )}

      {filteredImages.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <SmartIcon
              name="Image"
              className="mx-auto mb-4 h-12 w-12 text-muted-foreground"
            />
            <h3 className="text-lg font-semibold mb-2">No images found</h3>
            <p className="text-muted-foreground">
              Run an Ozon download task to populate your gallery
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredImages.map((image) => (
            <Card key={image.url} className="overflow-hidden">
              <a
                href={image.url}
                target="_blank"
                rel="noreferrer"
                className="block"
              >
                <img
                  src={image.url}
                  alt={image.article}
                  className="h-48 w-full object-cover"
                  loading="lazy"
                />
              </a>
              <CardContent className="space-y-1 p-4">
                <div className="text-sm font-medium">{image.article}</div>
                <div className="text-xs text-muted-foreground">
                  Task {image.taskId.slice(0, 8)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function GallerySkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-3 h-4 w-64" />
        </CardContent>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Card key={index} className="overflow-hidden">
            <Skeleton className="h-48 w-full" />
            <CardContent className="space-y-2 p-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
