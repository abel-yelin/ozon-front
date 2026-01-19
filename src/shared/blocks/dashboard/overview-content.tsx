'use client';

import { useEffect, useState } from 'react';

import { StatsCard } from './stats-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Badge } from '@/shared/components/ui/badge';

interface SummaryStats {
  totalDownloads: number;
  successRate: number;
  failedDownloads: number;
  totalImages: number;
  activeCredentials: number;
}

interface TrendData {
  date: string;
  tasks: number;
  images: number;
}

interface TrendsResponse {
  period: string;
  daily: TrendData[];
}

export function OverviewContent() {
  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    // Refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      setError(null);

      // Fetch summary and trends in parallel
      const [summaryRes, trendsRes] = await Promise.all([
        fetch('/api/dashboard/summary'),
        fetch('/api/dashboard/trends?period=7'),
      ]);

      if (!summaryRes.ok || !trendsRes.ok) {
        throw new Error('Failed to load dashboard data');
      }

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
      console.error('Failed to load dashboard data:', err);
      setError('Failed to load dashboard data');
      setLoading(false);
    }
  }

  if (loading) {
    return <OverviewSkeleton />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  const maxTasks = Math.max(...trends.map((t) => t.tasks), 1);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Downloads"
          value={summary?.totalDownloads || 0}
          icon="Download"
        />
        <StatsCard
          title="Success Rate"
          value={`${summary?.successRate || 0}%`}
          icon="CheckCircle"
          trend={(summary?.successRate || 0) >= 90 ? 'up' : 'neutral'}
        />
        <StatsCard
          title="Failed Downloads"
          value={summary?.failedDownloads || 0}
          icon="XCircle"
          trend={summary?.failedDownloads === 0 ? 'neutral' : 'down'}
        />
        <StatsCard
          title="Total Images"
          value={summary?.totalImages || 0}
          icon="Image"
        />
      </div>

      {/* Active Credentials */}
      <div className="grid gap-4 md:grid-cols-2">
        <StatsCard
          title="Active Credentials"
          value={summary?.activeCredentials || 0}
          icon="Key"
        />
        <Card>
          <CardHeader>
            <CardTitle>Storage Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Images Downloaded</span>
                <span>{summary?.totalImages || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Download Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Download Trends (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {trends.map((day) => (
              <div key={day.date} className="flex items-center gap-4">
                <div className="w-24 text-sm text-muted-foreground">
                  {new Date(day.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  })}
                </div>
                <div className="flex-1">
                  <div className="h-8 bg-muted rounded flex items-center px-2">
                    <div
                      className="h-6 bg-primary rounded"
                      style={{
                        width: `${(day.tasks / maxTasks) * 100}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="w-20 text-sm text-right">
                  {day.tasks} tasks
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
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
    </div>
  );
}
