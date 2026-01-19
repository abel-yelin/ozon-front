'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { Skeleton } from '@/shared/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { SmartIcon } from '@/shared/blocks/common';

interface Credential {
  id: string;
  name: string;
  createdAt: string;
}

export function CredentialsContent() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newCredential, setNewCredential] = useState({
    name: '',
    client_id: '',
    api_key: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCredentials();
  }, []);

  async function loadCredentials() {
    try {
      setLoading(true);
      const response = await fetch('/api/ozon/credentials');
      const data = await response.json();

      if (data.code === 0) {
        setCredentials(data.data || []);
      } else {
        setError(data.message || 'Failed to load credentials');
      }
    } catch (err) {
      console.error('Failed to load credentials:', err);
      setError('Failed to load credentials');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCredential(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/ozon/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCredential),
      });

      const data = await response.json();

      if (data.code === 0) {
        setShowAddDialog(false);
        setNewCredential({ name: '', client_id: '', api_key: '' });
        loadCredentials();
      } else {
        setError(data.message || 'Failed to create credential');
      }
    } catch (err) {
      console.error('Failed to create credential:', err);
      setError('Failed to create credential');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteCredential(id: string) {
    if (!confirm('Are you sure you want to delete this credential?')) {
      return;
    }

    try {
      const response = await fetch(`/api/ozon/credentials?id=${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.code === 0) {
        loadCredentials();
      } else {
        setError(data.message || 'Failed to delete credential');
      }
    } catch (err) {
      console.error('Failed to delete credential:', err);
      setError('Failed to delete credential');
    }
  }

  function maskClientId(clientId: string) {
    if (clientId.length <= 8) return '***';
    return `${clientId.slice(0, 4)}***${clientId.slice(-4)}`;
  }

  if (loading) {
    return <CredentialsSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header with Add button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Your Credentials</h2>
          <p className="text-muted-foreground">
            Manage your Ozon API credentials
          </p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <SmartIcon name="Plus" className="mr-2 h-4 w-4" />
              Add Credential
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Ozon Credential</DialogTitle>
              <DialogDescription>
                Add a new Ozon Seller API credential to your account
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateCredential}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Credential Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Main Store"
                    value={newCredential.name}
                    onChange={(e) =>
                      setNewCredential({ ...newCredential, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client_id">Client ID</Label>
                  <Input
                    id="client_id"
                    placeholder="Your Ozon Client ID"
                    value={newCredential.client_id}
                    onChange={(e) =>
                      setNewCredential({ ...newCredential, client_id: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="api_key">API Key</Label>
                  <Input
                    id="api_key"
                    type="password"
                    placeholder="Your Ozon API Key"
                    value={newCredential.api_key}
                    onChange={(e) =>
                      setNewCredential({ ...newCredential, api_key: e.target.value })
                    }
                    required
                  />
                </div>
                {error && (
                  <p className="text-sm text-red-600">{error}</p>
                )}
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Credential'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Credentials List */}
      {credentials.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <SmartIcon name="Key" className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No credentials yet</h3>
            <p className="text-muted-foreground mb-4">
              Add your first Ozon API credential to get started
            </p>
            <Button onClick={() => setShowAddDialog(true)}>
              <SmartIcon name="Plus" className="mr-2 h-4 w-4" />
              Add Credential
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {credentials.map((cred) => (
            <Card key={cred.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{cred.name}</CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <SmartIcon name="MoreVertical" className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleDeleteCredential(cred.id)}
                        className="text-red-600"
                      >
                        <SmartIcon name="Trash" className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    <SmartIcon name="CheckCircle" className="mr-1 h-3 w-3" />
                    Active
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Created: {new Date(cred.createdAt).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CredentialsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
