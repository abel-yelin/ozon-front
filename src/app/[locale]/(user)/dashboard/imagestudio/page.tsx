'use client';

/**
 * ImageStudio Page (localized dashboard route)
 * Full-screen AI-powered batch image processing interface
 */

import { ImageStudioProvider } from '@/shared/contexts/image-studio';
import { TopBar } from '@/shared/blocks/image-studio/components/TopBar';
import { LeftSidebar } from '@/shared/blocks/image-studio/components/LeftSidebar';
import { MainContent } from '@/shared/blocks/image-studio/components/MainContent';
import { ImageModal } from '@/shared/blocks/image-studio/components/modals/ImageModal';
import { EditImageModal } from '@/shared/blocks/image-studio/components/modals/EditImageModal';
import { ProgressModal } from '@/shared/blocks/image-studio/components/modals/ProgressModal';
import { DownloadModal } from '@/shared/blocks/image-studio/components/modals/DownloadModal';
import { SettingsModal } from '@/shared/blocks/image-studio/components/modals/SettingsModal';
import { OptPromptModal } from '@/shared/blocks/image-studio/components/modals/OptPromptModal';

function ImageStudioContent() {
  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar />
      <MainContent />
      </div>
      <ImageModal />
      <EditImageModal />
      <ProgressModal />
      <DownloadModal />
      <SettingsModal />
      <OptPromptModal />
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
