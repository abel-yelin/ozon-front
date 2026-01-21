/**
 * ImageStudio Page
 * Full-screen AI-powered batch image processing interface
 */

'use client';

import { useEffect } from 'react';
import { ImageStudioProvider } from '@/shared/contexts/image-studio';
import { TopBar } from '@/shared/blocks/image-studio/components/TopBar';
import { LeftSidebar } from '@/shared/blocks/image-studio/components/LeftSidebar';
import { RightSidebar } from '@/shared/blocks/image-studio/components/RightSidebar';
import { MainContent } from '@/shared/blocks/image-studio/components/MainContent';
import { ImageModal } from '@/shared/blocks/image-studio/components/modals/ImageModal';
import { EditImageModal } from '@/shared/blocks/image-studio/components/modals/EditImageModal';
import { ProgressModal } from '@/shared/blocks/image-studio/components/modals/ProgressModal';
import { DownloadModal } from '@/shared/blocks/image-studio/components/modals/DownloadModal';
import { SettingsModal } from '@/shared/blocks/image-studio/components/modals/SettingsModal';
import { OptPromptModal } from '@/shared/blocks/image-studio/components/modals/OptPromptModal';
import { UploadModal } from '@/shared/blocks/image-studio/components/modals/UploadModal';

function ImageStudioContent() {
  return (
    <div className="flex h-screen flex-col bg-neutral-50">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar />
        <MainContent />
      <RightSidebar />
      </div>
      <ImageModal />
      <EditImageModal />
      <ProgressModal />
      <DownloadModal />
      <SettingsModal />
      <OptPromptModal />
      <UploadModal />
    </div>
  );
}

export default function ImageStudioPage() {
  return (
    <ImageStudioProvider>
      <ImageStudioContent />
    </ImageStudioProvider>
  );
}
