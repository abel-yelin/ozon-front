'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { SmartIcon } from '@/shared/blocks/common';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';

interface Task {
  id: string;
  articles: string[];
  field: string;
  status: string;
  totalArticles: number;
  totalImages: number;
  successImages: number;
  failedImages: number;
  createdAt: string;
  completedAt: string | null;
}

export function TasksContent() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadTasks();
  }, [statusFilter]);

  async function loadTasks() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/ozon/tasks?${params}`);
      const data = await response.json();

      if (data.code === 0) {
        setTasks(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteTask(taskId: string) {
    if (!confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      const response = await fetch(`/api/ozon/tasks/${taskId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.code === 0) {
        loadTasks();
      }
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'completed':
        return <Badge variant="default"><SmartIcon name="CheckCircle" className="mr-1 h-3 w-3" />Success</Badge>;
      case 'failed':
        return <Badge variant="destructive"><SmartIcon name="XCircle" className="mr-1 h-3 w-3" />Failed</Badge>;
      case 'processing':
        return <Badge variant="secondary"><SmartIcon name="Loader" className="mr-1 h-3 w-3 animate-spin" />Processing</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  const filteredTasks = tasks.filter((task) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      task.id.toLowerCase().includes(searchLower) ||
      task.articles.some((a) => a.toLowerCase().includes(searchLower))
    );
  });

  if (loading) {
    return <TasksSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Search by task ID or article..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-[300px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tasks Table */}
      <Card>
        <CardContent className="p-0">
          {filteredTasks.length === 0 ? (
            <div className="p-12 text-center">
              <SmartIcon name="ListTodo" className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No tasks found</h3>
              <p className="text-muted-foreground">
                {search || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Start by creating a download task'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task ID</TableHead>
                  <TableHead>Articles</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Images</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-mono text-sm">
                      {task.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>{task.totalArticles} items</TableCell>
                    <TableCell>{getStatusBadge(task.status)}</TableCell>
                    <TableCell>
                      {task.successImages}/{task.totalImages}
                      {task.failedImages > 0 && (
                        <span className="text-red-600 ml-1">
                          ({task.failedImages} failed)
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(task.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTask(task.id)}
                      >
                        <SmartIcon name="Trash" className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TasksSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex gap-4">
            <Skeleton className="h-10 w-[200px]" />
            <Skeleton className="h-10 w-[300px]" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
