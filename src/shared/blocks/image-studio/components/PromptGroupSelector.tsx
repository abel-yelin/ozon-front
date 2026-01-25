/**
 * PromptGroupSelector Component
 * Dropdown selector for switching between prompt groups in TopBar
 */

'use client';

import { useTranslations } from 'next-intl';
import { useImageStudio } from '@/shared/contexts/image-studio';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Layers } from 'lucide-react';

interface PromptGroupSelectorProps {
  className?: string;
}

export function PromptGroupSelector({ className }: PromptGroupSelectorProps) {
  const t = useTranslations('dashboard.imagestudio');
  const { settings, updateSettings } = useImageStudio();

  const groups = settings.prompt_groups || [];
  const activeId = settings.active_prompt_group_id || '';
  const activeName = settings.active_prompt_group_name || '';

  const handleChange = async (id: string) => {
    if (id === activeId) return; // No change needed

    try {
      const response = await fetch('/api/image-studio/prompt-groups/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to switch prompt group');
      }

      // Refresh settings to get new active group templates
      const settingsRes = await fetch('/api/image-studio/settings');
      const data = await settingsRes.json();
      if (data.code === 0) {
        updateSettings(data.data);
      }
    } catch (err) {
      console.error('Failed to switch prompt group:', err);
      // Could show toast notification here
    }
  };

  // Don't render if no groups available
  if (groups.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      <Layers className="h-4 w-4 text-neutral-500" />
      <Select value={activeId} onValueChange={handleChange}>
        <SelectTrigger className="w-[180px] h-8">
          <SelectValue placeholder={t('prompt_group.placeholder')}>
            {activeName || t('prompt_group.placeholder')}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {groups.map((group: { id: string; name: string }) => (
            <SelectItem key={group.id} value={group.id}>
              {group.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
