/**
 * Ozon image download page component
 */
'use client';

import { useState, useEffect } from 'react';
import { useOzonDownload } from '@/app/hooks/use-ozon-download';

export function OzonDownload() {
  const { download, pollTask, isLoading, error, result, reset } =
    useOzonDownload();

  const [credentials, setCredentials] = useState<any[]>([]);
  const [credentialId, setCredentialId] = useState('');
  const [articles, setArticles] = useState('');
  const [field, setField] = useState<'offer_id' | 'sku' | 'vendor_code'>(
    'offer_id'
  );
  const [currentTask, setCurrentTask] = useState<any>(null);
  const [showCredentialForm, setShowCredentialForm] = useState(false);
  const [newCredential, setNewCredential] = useState({
    name: '',
    client_id: '',
    api_key: '',
  });

  // Load credentials on mount
  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    try {
      const response = await fetch('/api/ozon/credentials');
      const data = await response.json();
      if (data.code === 0) {
        setCredentials(data.data || []);
        if (data.data && data.data.length > 0 && !credentialId) {
          setCredentialId(data.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load credentials:', err);
    }
  };

  const handleCreateCredential = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/ozon/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCredential),
      });

      const data = await response.json();
      if (data.code === 0) {
        setShowCredentialForm(false);
        setNewCredential({ name: '', client_id: '', api_key: '' });
        loadCredentials();
      } else {
        alert(data.message || 'Failed to create credential');
      }
    } catch (err) {
      alert('Failed to create credential');
    }
  };

  const handleDeleteCredential = async (id: string) => {
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
        if (credentialId === id) {
          setCredentialId('');
        }
      }
    } catch (err) {
      alert('Failed to delete credential');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!credentialId) {
      alert('Please select a credential');
      return;
    }

    const articleList = articles
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    if (articleList.length === 0) {
      alert('Please enter at least one article number');
      return;
    }

    if (articleList.length > 100) {
      alert('Maximum 100 articles per batch');
      return;
    }

    const downloadResult = await download({
      credentialId,
      articles: articleList,
      field,
    });

    if (downloadResult?.success && downloadResult.task) {
      setCurrentTask(downloadResult.task);

      // Poll for completion
      const pollResult = await pollTask(downloadResult.task.id);
      if (pollResult?.success) {
        setCurrentTask(pollResult.task);
      }
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6">Ozon Image Downloader</h1>

        {/* Credential Management */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">Ozon Credentials</h2>
            <button
              onClick={() => setShowCredentialForm(!showCredentialForm)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              {showCredentialForm ? 'Cancel' : 'Add Credential'}
            </button>
          </div>

          {showCredentialForm && (
            <form onSubmit={handleCreateCredential} className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Credential Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newCredential.name}
                    onChange={(e) =>
                      setNewCredential({ ...newCredential, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded dark:bg-gray-600"
                    placeholder="e.g., Main Store"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Client ID
                  </label>
                  <input
                    type="text"
                    required
                    value={newCredential.client_id}
                    onChange={(e) =>
                      setNewCredential({ ...newCredential, client_id: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded dark:bg-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    API Key
                  </label>
                  <input
                    type="password"
                    required
                    value={newCredential.api_key}
                    onChange={(e) =>
                      setNewCredential({ ...newCredential, api_key: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded dark:bg-gray-600"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Save Credential
                </button>
              </div>
            </form>
          )}

          {credentials.length === 0 ? (
            <p className="text-gray-500 italic">No credentials configured</p>
          ) : (
            <div className="space-y-2">
              {credentials.map((cred) => (
                <div
                  key={cred.id}
                  className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded"
                >
                  <div>
                    <div className="font-medium">{cred.name}</div>
                    <div className="text-xs text-gray-500">
                      Created: {new Date(cred.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCredentialId(cred.id)}
                      className={`px-3 py-1 rounded text-sm ${
                        credentialId === cred.id
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-600'
                      }`}
                    >
                      {credentialId === cred.id ? 'Selected' : 'Select'}
                    </button>
                    <button
                      onClick={() => handleDeleteCredential(cred.id)}
                      className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Download Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Query Field
            </label>
            <select
              value={field}
              onChange={(e) =>
                setField(e.target.value as 'offer_id' | 'sku' | 'vendor_code')
              }
              className="w-full px-3 py-2 border rounded dark:bg-gray-600"
            >
              <option value="offer_id">Offer ID (Recommended)</option>
              <option value="sku">SKU</option>
              <option value="vendor_code">Vendor Code</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Article Numbers (one per line, max 100)
            </label>
            <textarea
              placeholder="123456&#10;789012&#10;345678"
              className="w-full px-3 py-2 border rounded dark:bg-gray-600 font-mono min-h-[200px]"
              value={articles}
              onChange={(e) => setArticles(e.target.value)}
            />
            <p className="text-sm text-gray-500 mt-1">
              {articles.split('\n').filter(Boolean).length} / 100 articles
            </p>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded">
              {error}
            </div>
          )}

          {result && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                Download Completed
              </h3>
              <div className="text-sm text-green-700 dark:text-green-200 space-y-1">
                <p>Total Articles: {result.total_articles}</p>
                <p>Processed: {result.processed}</p>
                <p>Total Images: {result.total_images}</p>
                <p>Success: {result.success_images}</p>
                {result.failed_images > 0 && (
                  <p className="text-red-600">Failed: {result.failed_images}</p>
                )}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !credentialId}
            className="w-full px-4 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
          >
            {isLoading ? 'Processing...' : 'Start Download'}
          </button>
        </form>
      </div>
    </div>
  );
}
