'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { Badge } from '@/shared/components/ui/badge';
import { Plus, Edit, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';

interface PromptGroup {
  id: string;
  name: string;
  description: string | null;
  isSystemDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

interface PromptTemplate {
  key: string;
  content: string;
  language: string;
  category: string;
}

interface PromptGroupWithTemplates extends PromptGroup {
  prompt_templates?: Record<string, string>;
}

function PromptGroupDialog({
  open,
  onClose,
  group,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  group: PromptGroupWithTemplates | null;
  onSave: (data: any) => Promise<void>;
}) {
  const [name, setName] = useState(group?.name || '');
  const [description, setDescription] = useState(group?.description || '');
  const [templates, setTemplates] = useState<PromptTemplate[]>(
    group?.prompt_templates
      ? Object.entries(group.prompt_templates).map(([key, content]) => ({
          key,
          content: content as string,
          language: key.endsWith('_cn') ? 'cn' : 'en',
          category: key.startsWith('opt_') ? 'option' : 'main',
        }))
      : []
  );
  const [saving, setSaving] = useState(false);

  // Update form when group changes
  useEffect(() => {
    if (group) {
      setName(group.name || '');
      setDescription(group.description || '');
      setTemplates(
        group.prompt_templates
          ? Object.entries(group.prompt_templates).map(([key, content]) => ({
              key,
              content: content as string,
              language: key.endsWith('_cn') ? 'cn' : 'en',
              category: key.startsWith('opt_') ? 'option' : 'main',
            }))
          : []
      );
    } else {
      setName('');
      setDescription('');
      setTemplates([]);
    }
  }, [group]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        name,
        description,
        templates,
      });
      onClose();
      window.location.reload();
    } catch (error) {
      console.error('Failed to save:', error);
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {group ? 'Edit Prompt Group' : 'New Prompt Group'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Default Prompts"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={2}
            />
          </div>

          <div>
            <Label>Templates</Label>
            <div className="mt-2 space-y-2">
              {templates.map((template, index) => (
                <div key={index} className="border rounded p-3 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={template.key}
                      onChange={(e) => {
                        const newTemplates = [...templates];
                        newTemplates[index].key = e.target.value;
                        setTemplates(newTemplates);
                      }}
                      placeholder="Template key (e.g., common_cn)"
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setTemplates(templates.filter((_, i) => i !== index));
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                  <Textarea
                    value={template.content}
                    onChange={(e) => {
                      const newTemplates = [...templates];
                      newTemplates[index].content = e.target.value;
                      setTemplates(newTemplates);
                    }}
                    placeholder="Template content..."
                    rows={4}
                  />
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setTemplates([
                    ...templates,
                    { key: '', content: '', language: 'cn', category: 'main' },
                  ]);
                }}
              >
                Add Template
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !name}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PromptGroupsAdmin() {
  const [groups, setGroups] = useState<PromptGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<PromptGroupWithTemplates | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/ai-playground/prompt-groups');
      const data = await res.json();
      if (data.code === 0) {
        setGroups(data.data.groups);
      }
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (group: PromptGroup) => {
    try {
      const res = await fetch(`/api/ai-playground/prompt-groups/${group.id}`);

      if (!res.ok) {
        console.error('Failed to fetch group:', res.statusText);
        return;
      }

      const data = await res.json();

      if (data.code === 0) {
        setSelectedGroup(data.data.group);
        setDialogOpen(true);
      } else {
        console.error('API returned error:', data);
        alert(`Failed to load group: ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to fetch group details:', error);
      alert('Failed to load group details. Check console for details.');
    }
  };

  const handleDelete = (groupId: string) => {
    setGroupToDelete(groupId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!groupToDelete) return;

    try {
      const res = await fetch(`/api/ai-playground/prompt-groups/${groupToDelete}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setDeleteDialogOpen(false);
        setGroupToDelete(null);
        fetchGroups();
      }
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const handleSave = async (data: any) => {
    const method = selectedGroup ? 'PATCH' : 'POST';
    const url = selectedGroup
      ? `/api/ai-playground/prompt-groups/${selectedGroup.id}`
      : '/api/ai-playground/prompt-groups';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Failed to save');
    }

    return await res.json();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Prompt Groups</h2>
          <p className="text-sm text-gray-600">
            Manage AI prompt template groups
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Group
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : groups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  No prompt groups found
                </TableCell>
              </TableRow>
            ) : (
              groups.map((group) => (
                <TableRow key={group.id}>
                  <TableCell className="font-medium">{group.name}</TableCell>
                  <TableCell>{group.description || '-'}</TableCell>
                  <TableCell>
                    {group.isSystemDefault ? (
                      <Badge>System</Badge>
                    ) : (
                      <Badge variant="outline">User</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(group.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(group)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(group.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <PromptGroupDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setSelectedGroup(null);
        }}
        group={selectedGroup}
        onSave={handleSave}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Prompt Group</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Are you sure you want to delete this prompt group? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setGroupToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
