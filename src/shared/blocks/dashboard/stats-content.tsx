'use client';

import { useEffect, useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { SmartIcon } from '@/shared/blocks/common';
import { StatsCard } from './stats-card';

interface TrendData {
  date: string;
  tasks: number;
  images: number;
}

export function StatsContent() {
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(7);

  useEffect(() => {
    loadData();
  }, [period]);

  async function loadData() {
    try {
      setLoading(true);

      const [summaryRes, trendsRes] = await Promise.all([
        fetch('/api/dashboard/summary'),
        fetch(`/api/dashboard/trends?period=${period}`),
      ]);

      const summaryData = await summaryRes.json();
      const trendsData = await trendsRes.json();

      if (summaryData.code === 0) {
        setSummary(summaryData.data);
      }

      if (trendsData.code === 0) {
        setTrends(trendsData.data.daily);
      }

      setLoading(false);
    } catch (err) {
      console.error('Failed to load stats:', err);
      setLoading(false);
    }
  }

  if (loading) {
    return <StatsSkeleton />;
  }

  const maxTasks = Math.max(...trends.map((t) => t.tasks), 1);
  const maxImages = Math.max(...trends.map((t) => t.images), 1);

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Usage Statistics</h2>
        <div className="flex gap-2">
          {[7, 30, 90].map((days) => (
            <button
              key={days}
              onClick={() => setPeriod(days)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                period === days
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {days === 7 ? '7 Days' : days === 30 ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Tasks"
          value={summary?.totalDownloads || 0}
          icon="ListTodo"
        />
        <StatsCard
          title="Total Images"
          value={summary?.totalImages || 0}
          icon="Image"
        />
        <StatsCard
          title="Success Rate"
          value={`${summary?.successRate || 0}%`}
          icon="TrendingUp"
        />
        <StatsCard
          title="Avg Time/Task"
          value="45s"
          icon="Clock"
        />
      </div>

      {/* Download Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Download Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {trends.map((day) => (
              <div key={day.date} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{new Date(day.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  })}</span>
                  <span>{day.tasks} tasks / {day.images} images</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-20 text-xs text-muted-foreground">Tasks</div>
                    <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${(day.tasks / maxTasks) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-20 text-xs text-muted-foreground">Images</div>
                    <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${(day.images / maxImages) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
