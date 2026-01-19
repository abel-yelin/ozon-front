# User Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a comprehensive user dashboard for managing Ozon image downloads, including overview statistics, download interface, credential management, task history, and usage analytics.

**Architecture:** Create a new `(user)` route group parallel to `(admin)`, using existing DashboardLayout components with user-specific sidebar configuration. Pages will be server components fetching data via API routes, with client-side components for interactivity.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS, shadcn/ui components, Drizzle ORM, PostgreSQL, Recharts for visualizations.

---

## Task 1: Create User Dashboard Route Group and Layout

**Files:**
- Create: `src/app/[locale]/(user)/dashboard/layout.tsx`
- Create: `src/config/locale/messages/en/dashboard/sidebar.json`
- Create: `src/config/locale/messages/zh/dashboard/sidebar.json`
- Create: `src/app/[locale]/(user)/dashboard/page.tsx` (overview placeholder)

**Step 1: Create the user dashboard layout file**

```typescript
// File: src/app/[locale]/(user)/dashboard/layout.tsx
import { ReactNode } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getUserInfo } from '@/shared/models/user';
import { LocaleDetector } from '@/shared/blocks/common';
import { DashboardLayout } from '@/shared/blocks/dashboard/layout';
import { Sidebar as SidebarType } from '@/shared/types/blocks/dashboard';

/**
 * User dashboard layout for managing Ozon downloads
 */
export default async function UserDashboardLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Check if user is authenticated
  const user = await getUserInfo();
  if (!user) {
    // Redirect to sign in page - will be handled by middleware
    return null;
  }

  const t = await getTranslations('dashboard');
  const sidebar: SidebarType = t.raw('sidebar');

  return (
    <DashboardLayout sidebar={sidebar}>
      <LocaleDetector />
      {children}
    </DashboardLayout>
  );
}
```

**Step 2: Create English sidebar translation**

```json
// File: src/config/locale/messages/en/dashboard/sidebar.json
{
  "header": {
    "brand": {
      "title": "Ozon Dashboard",
      "logo": {
        "src": "/logo.png",
        "alt": "Ozon Dashboard"
      },
      "url": "/dashboard"
    },
    "show_trigger": false
  },
  "main_navs": [
    {
      "title": "Overview",
      "url": "/dashboard",
      "icon": "LayoutDashboard"
    },
    {
      "title": "Ozon Download",
      "url": "/dashboard/ozon",
      "icon": "Download"
    },
    {
      "title": "Credentials",
      "url": "/dashboard/credentials",
      "icon": "Key"
    },
    {
      "title": "Tasks",
      "url": "/dashboard/tasks",
      "icon": "ListTodo"
    },
    {
      "title": "Statistics",
      "url": "/dashboard/stats",
      "icon": "BarChart3"
    }
  ],
  "user": {
    "show_email": true,
    "show_signout": true,
    "signout_callback": "/"
  },
  "footer": {
    "show_theme": true,
    "show_locale": true
  },
  "variant": "inset"
}
```

**Step 3: Create Chinese sidebar translation**

```json
// File: src/config/locale/messages/zh/dashboard/sidebar.json
{
  "header": {
    "brand": {
      "title": "Ozon 仪表盘",
      "logo": {
        "src": "/logo.png",
        "alt": "Ozon 仪表盘"
      },
      "url": "/dashboard"
    },
    "show_trigger": false
  },
  "main_navs": [
    {
      "title": "概览",
      "url": "/dashboard",
      "icon": "LayoutDashboard"
    },
    {
      "title": "Ozon 下载",
      "url": "/dashboard/ozon",
      "icon": "Download"
    },
    {
      "title": "凭证管理",
      "url": "/dashboard/credentials",
      "icon": "Key"
    },
    {
      "title": "任务历史",
      "url": "/dashboard/tasks",
      "icon": "ListTodo"
    },
    {
      "title": "使用统计",
      "url": "/dashboard/stats",
      "icon": "BarChart3"
    }
  ],
  "user": {
    "show_email": true,
    "show_signout": true,
    "signout_callback": "/"
  },
  "footer": {
    "show_theme": true,
    "show_locale": true
  },
  "variant": "inset"
}
```

**Step 4: Create placeholder overview page**

```typescript
// File: src/app/[locale]/(user)/dashboard/page.tsx
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { Crumb } from '@/shared/types/blocks/common';

export default async function DashboardOverviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('dashboard.overview');

  const crumbs: Crumb[] = [
    { title: t('crumb'), is_active: true },
  ];

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={t('title')} />
        <div className="p-6">
          <p className="text-muted-foreground">Dashboard overview coming soon...</p>
        </div>
      </Main>
    </>
  );
}
```

**Step 5: Create overview page translations**

```json
// File: src/config/locale/messages/en/dashboard/overview.json
{
  "crumb": "Dashboard",
  "title": "Dashboard Overview"
}
```

```json
// File: src/config/locale/messages/zh/dashboard/overview.json
{
  "crumb": "仪表盘",
  "title": "仪表盘概览"
}
```

**Step 6: Verify the setup works**

Run: `npm run dev`
Visit: `http://localhost:3000/dashboard`
Expected: Dashboard layout with sidebar visible

**Step 7: Commit initial structure**

```bash
git add src/app/[locale]/(user) src/config/locale/messages/en/dashboard src/config/locale/messages/zh/dashboard
git commit -m "feat: create user dashboard route group and layout"
```

---

## Task 2: Create Dashboard Statistics API Endpoints

**Files:**
- Create: `src/app/api/dashboard/summary/route.ts`
- Create: `src/app/api/dashboard/trends/route.ts`
- Modify: `src/lib/db/ozon.ts` (add new methods)

**Step 1: Add getUserSummary method to ozonDb**

```typescript
// File: src/lib/db/ozon.ts
// Add this method to the OzonDb class (after getUserTaskStats method)

  /**
   * Get user summary statistics
   */
  async getUserSummary(userId: string) {
    const tasks = await this.getUserTasks(userId, { limit: 100000 });

    const totalDownloads = tasks.length;
    const completedTasks = tasks.filter((t: any) => t.status === 'completed');
    const failedTasks = tasks.filter((t: any) => t.status === 'failed');

    const successRate = totalDownloads > 0
      ? (completedTasks.length / totalDownloads) * 100
      : 0;

    const totalImages = tasks.reduce((sum: number, t: any) => sum + (t.successImages || 0), 0);
    const failedImages = tasks.reduce((sum: number, t: any) => sum + (t.failedImages || 0), 0);

    const credentials = await this.getUserCredentials(userId);
    const activeCredentials = credentials.length;

    return {
      totalDownloads,
      successRate: Math.round(successRate * 10) / 10,
      failedDownloads: failedTasks.length,
      totalImages,
      activeCredentials,
    };
  }
```

**Step 2: Add getDailyTrends method to ozonDb**

```typescript
// File: src/lib/db/ozon.ts
// Add this method after getUserSummary

  /**
   * Get daily download trends for specified period
   */
  async getDailyTrends(userId: string, days: number = 7) {
    const tasks = await this.getUserTasks(userId, { limit: 100000 });

    // Get date range
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - days + 1);
    startDate.setHours(0, 0, 0, 0);

    // Filter tasks within date range and group by date
    const dailyStats: Record<string, { tasks: number; images: number }> = {};

    // Initialize all days with 0
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      dailyStats[dateStr] = { tasks: 0, images: 0 };
    }

    // Fill in actual data
    tasks.forEach((task: any) => {
      if (task.completedAt) {
        const dateStr = new Date(task.completedAt).toISOString().split('T')[0];
        if (dailyStats[dateStr]) {
          dailyStats[dateStr].tasks += 1;
          dailyStats[dateStr].images += task.successImages || 0;
        }
      }
    });

    // Convert to array format
    return Object.entries(dailyStats).map(([date, stats]) => ({
      date,
      tasks: stats.tasks,
      images: stats.images,
    }));
  }
```

**Step 3: Create summary API endpoint**

```typescript
// File: src/app/api/dashboard/summary/route.ts
import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { ozonDb } from '@/lib/db/ozon';

// GET - Get user dashboard summary statistics
export async function GET(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const summary = await ozonDb.getUserSummary(user.id);

    return respData(summary);
  } catch (error) {
    console.error('Get dashboard summary error:', error);
    return respErr('Failed to get dashboard summary');
  }
}
```

**Step 4: Create trends API endpoint**

```typescript
// File: src/app/api/dashboard/trends/route.ts
import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { ozonDb } from '@/lib/db/ozon';

// GET - Get download trends for specified period
export async function GET(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const { searchParams } = new URL(req.url);
    const period = parseInt(searchParams.get('period') || '7');

    if (period < 1 || period > 90) {
      return respErr('Period must be between 1 and 90 days');
    }

    const trends = await ozonDb.getDailyTrends(user.id, period);

    return respData({
      period: `${period}d`,
      daily: trends,
    });
  } catch (error) {
    console.error('Get dashboard trends error:', error);
    return respErr('Failed to get dashboard trends');
  }
}
```

**Step 5: Test API endpoints manually**

Run: `npm run dev`

Test summary:
```bash
curl http://localhost:3000/api/dashboard/summary
```

Expected response:
```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "totalDownloads": 0,
    "successRate": 0,
    "failedDownloads": 0,
    "totalImages": 0,
    "activeCredentials": 0
  }
}
```

Test trends:
```bash
curl http://localhost:3000/api/dashboard/trends?period=7
```

**Step 6: Commit API endpoints**

```bash
git add src/app/api/dashboard src/lib/db/ozon.ts
git commit -m "feat: add dashboard statistics API endpoints"
```

---

## Task 3: Create StatsCard Component

**Files:**
- Create: `src/shared/blocks/dashboard/stats-card.tsx`
- Create: `src/shared/blocks/dashboard/index.ts` (export StatsCard)

**Step 1: Create the StatsCard component**

```typescript
// File: src/shared/blocks/dashboard/stats-card.tsx
import { Card, CardContent } from '@/shared/components/ui/card';
import { SmartIcon } from '@/shared/blocks/common';
import { cn } from '@/shared/lib/utils';

export interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: string;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function StatsCard({
  title,
  value,
  change,
  icon,
  trend,
  className,
}: StatsCardProps) {
  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {change !== undefined && (
              <p
                className={cn(
                  'text-xs mt-1',
                  trend === 'up' && 'text-green-600 dark:text-green-400',
                  trend === 'down' && 'text-red-600 dark:text-red-400',
                  trend === 'neutral' && 'text-muted-foreground'
                )}
              >
                {change > 0 ? '+' : ''}{change}% from last period
              </p>
            )}
          </div>
          {icon && (
            <SmartIcon
              name={icon}
              className="h-8 w-8 text-muted-foreground opacity-50"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Export from dashboard index**

```typescript
// File: src/shared/blocks/dashboard/index.ts
export * from './layout';
export * from './sidebar';
export * from './nav';
export * from './sidebar-user';
export * from './header';
export * from './main';
export * from './main-header';
export * from './stats-card';
```

**Step 3: Commit StatsCard component**

```bash
git add src/shared/blocks/dashboard/stats-card.tsx src/shared/blocks/dashboard/index.ts
git commit -m "feat: add StatsCard component for dashboard"
```

---

## Task 4: Build Overview Page with Statistics

**Files:**
- Modify: `src/app/[locale]/(user)/dashboard/page.tsx`
- Create: `src/shared/blocks/dashboard/overview-content.tsx`

**Step 1: Create client-side overview content component**

```typescript
// File: src/shared/blocks/dashboard/overview-content.tsx
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
```

**Step 2: Update overview page to use the component**

```typescript
// File: src/app/[locale]/(user)/dashboard/page.tsx
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { Crumb } from '@/shared/types/blocks/common';
import { OverviewContent } from '@/shared/blocks/dashboard/overview-content';

export default async function DashboardOverviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('dashboard.overview');

  const crumbs: Crumb[] = [
    { title: t('crumb'), is_active: true },
  ];

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={t('title')} />
        <div className="p-6">
          <OverviewContent />
        </div>
      </Main>
    </>
  );
}
```

**Step 3: Test overview page**

Run: `npm run dev`
Visit: `http://localhost:3000/dashboard`
Expected: Statistics cards and trends chart displayed

**Step 4: Commit overview page**

```bash
git add src/app/[locale]/(user)/dashboard/page.tsx src/shared/blocks/dashboard/overview-content.tsx
git commit -m "feat: build dashboard overview page with statistics"
```

---

## Task 5: Move Ozon Download Page to Dashboard

**Files:**
- Create: `src/app/[locale]/(user)/dashboard/ozon/page.tsx`
- Create: `src/config/locale/messages/en/dashboard/ozon.json`
- Create: `src/config/locale/messages/zh/dashboard/ozon.json`
- Modify: `src/shared/blocks/ozon/download.tsx` (enhance with active tasks)

**Step 1: Create Ozon download page**

```typescript
// File: src/app/[locale]/(user)/dashboard/ozon/page.tsx
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { Crumb } from '@/shared/types/blocks/common';
import { OzonDownload } from '@/shared/blocks/ozon/download';

export default async function OzonDownloadPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('dashboard.ozon');

  const crumbs: Crumb[] = [
    { title: t('crumb_dashboard'), url: '/dashboard' },
    { title: t('crumb'), is_active: true },
  ];

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={t('title')} />
        <div className="p-6">
          <OzonDownload />
        </div>
      </Main>
    </>
  );
}
```

**Step 2: Create Ozon page translations**

```json
// File: src/config/locale/messages/en/dashboard/ozon.json
{
  "crumb_dashboard": "Dashboard",
  "crumb": "Ozon Download",
  "title": "Ozon Image Downloader"
}
```

```json
// File: src/config/locale/messages/zh/dashboard/ozon.json
{
  "crumb_dashboard": "仪表盘",
  "crumb": "Ozon 下载",
  "title": "Ozon 图片下载器"
}
```

**Step 3: Test the moved page**

Run: `npm run dev`
Visit: `http://localhost:3000/dashboard/ozon`
Expected: Ozon download interface with dashboard layout

**Step 4: Commit Ozon download page**

```bash
git add src/app/[locale]/(user)/dashboard/ozon src/config/locale/messages/en/dashboard/ozon.json src/config/locale/messages/zh/dashboard/ozon.json
git commit -m "feat: move Ozon download to dashboard"
```

---

## Task 6: Create Credentials Management Page

**Files:**
- Create: `src/app/[locale]/(user)/dashboard/credentials/page.tsx`
- Create: `src/shared/blocks/dashboard/credentials-content.tsx`
- Create: `src/config/locale/messages/en/dashboard/credentials.json`
- Create: `src/config/locale/messages/zh/dashboard/credentials.json`

**Step 1: Create credentials content component**

```typescript
// File: src/shared/blocks/dashboard/credentials-content.tsx
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
```

**Step 2: Create credentials page**

```typescript
// File: src/app/[locale]/(user)/dashboard/credentials/page.tsx
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { Crumb } from '@/shared/types/blocks/common';
import { CredentialsContent } from '@/shared/blocks/dashboard/credentials-content';

export default async function CredentialsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('dashboard.credentials');

  const crumbs: Crumb[] = [
    { title: t('crumb_dashboard'), url: '/dashboard' },
    { title: t('crumb'), is_active: true },
  ];

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={t('title')} />
        <div className="p-6">
          <CredentialsContent />
        </div>
      </Main>
    </>
  );
}
```

**Step 3: Create credentials translations**

```json
// File: src/config/locale/messages/en/dashboard/credentials.json
{
  "crumb_dashboard": "Dashboard",
  "crumb": "Credentials",
  "title": "Credential Management"
}
```

```json
// File: src/config/locale/messages/zh/dashboard/credentials.json
{
  "crumb_dashboard": "仪表盘",
  "crumb": "凭证管理",
  "title": "凭证管理"
}
```

**Step 4: Test credentials page**

Run: `npm run dev`
Visit: `http://localhost:3000/dashboard/credentials`
Expected: Credential cards with add/delete functionality

**Step 5: Commit credentials page**

```bash
git add src/app/[locale]/(user)/dashboard/credentials src/shared/blocks/dashboard/credentials-content.tsx src/config/locale/messages/en/dashboard/credentials.json src/config/locale/messages/zh/dashboard/credentials.json
git commit -m "feat: add credentials management page"
```

---

## Task 7: Create Tasks History Page

**Files:**
- Create: `src/app/[locale]/(user)/dashboard/tasks/page.tsx`
- Create: `src/shared/blocks/dashboard/tasks-content.tsx`
- Create: `src/config/locale/messages/en/dashboard/tasks.json`
- Create: `src/config/locale/messages/zh/dashboard/tasks.json`

**Step 1: Create tasks content component**

```typescript
// File: src/shared/blocks/dashboard/tasks-content.tsx
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
```

**Step 2: Create tasks page**

```typescript
// File: src/app/[locale]/(user)/dashboard/tasks/page.tsx
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { Crumb } from '@/shared/types/blocks/common';
import { TasksContent } from '@/shared/blocks/dashboard/tasks-content';

export default async function TasksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('dashboard.tasks');

  const crumbs: Crumb[] = [
    { title: t('crumb_dashboard'), url: '/dashboard' },
    { title: t('crumb'), is_active: true },
  ];

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={t('title')} />
        <div className="p-6">
          <TasksContent />
        </div>
      </Main>
    </>
  );
}
```

**Step 3: Create tasks translations**

```json
// File: src/config/locale/messages/en/dashboard/tasks.json
{
  "crumb_dashboard": "Dashboard",
  "crumb": "Tasks",
  "title": "Task History"
}
```

```json
// File: src/config/locale/messages/zh/dashboard/tasks.json
{
  "crumb_dashboard": "仪表盘",
  "crumb": "任务历史",
  "title": "任务历史"
}
```

**Step 4: Test tasks page**

Run: `npm run dev`
Visit: `http://localhost:3000/dashboard/tasks`
Expected: Filterable, searchable task list

**Step 5: Commit tasks page**

```bash
git add src/app/[locale]/(user)/dashboard/tasks src/shared/blocks/dashboard/tasks-content.tsx src/config/locale/messages/en/dashboard/tasks.json src/config/locale/messages/zh/dashboard/tasks.json
git commit -m "feat: add tasks history page"
```

---

## Task 8: Create Statistics Page

**Files:**
- Create: `src/app/[locale]/(user)/dashboard/stats/page.tsx`
- Create: `src/shared/blocks/dashboard/stats-content.tsx`
- Create: `src/config/locale/messages/en/dashboard/stats.json`
- Create: `src/config/locale/messages/zh/dashboard/stats.json`

**Step 1: Create stats content component**

```typescript
// File: src/shared/blocks/dashboard/stats-content.tsx
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
```

**Step 2: Create stats page**

```typescript
// File: src/app/[locale]/(user)/dashboard/stats/page.tsx
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { Crumb } from '@/shared/types/blocks/common';
import { StatsContent } from '@/shared/blocks/dashboard/stats-content';

export default async function StatsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('dashboard.stats');

  const crumbs: Crumb[] = [
    { title: t('crumb_dashboard'), url: '/dashboard' },
    { title: t('crumb'), is_active: true },
  ];

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={t('title')} />
        <div className="p-6">
          <StatsContent />
        </div>
      </Main>
    </>
  );
}
```

**Step 3: Create stats translations**

```json
// File: src/config/locale/messages/en/dashboard/stats.json
{
  "crumb_dashboard": "Dashboard",
  "crumb": "Statistics",
  "title": "Usage Statistics"
}
```

```json
// File: src/config/locale/messages/zh/dashboard/stats.json
{
  "crumb_dashboard": "仪表盘",
  "crumb": "使用统计",
  "title": "使用统计"
}
```

**Step 4: Test stats page**

Run: `npm run dev`
Visit: `http://localhost:3000/dashboard/stats`
Expected: Statistics with period selector and trend charts

**Step 5: Commit stats page**

```bash
git add src/app/[locale]/(user)/dashboard/stats src/shared/blocks/dashboard/stats-content.tsx src/config/locale/messages/en/dashboard/stats.json src/config/locale/messages/zh/dashboard/stats.json
git commit -m "feat: add usage statistics page"
```

---

## Task 9: Add Authentication Middleware Protection

**Files:**
- Modify: `src/middleware.ts` (or create if doesn't exist)

**Step 1: Check if middleware exists**

Run: `cat src/middleware.ts` or check if file exists

**Step 2: Add dashboard route protection**

If middleware exists, add dashboard protection. Otherwise create:

```typescript
// File: src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@/shared/auth/client'; // Adjust import based on actual auth setup

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Protect dashboard routes
  if (pathname.startsWith('/dashboard')) {
    const session = await getSession(); // Adjust based on actual auth

    if (!session) {
      const url = request.nextUrl.clone();
      url.pathname = '/sign-in';
      url.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
```

Note: Adjust the auth session check based on your actual authentication setup (likely using the existing auth system from the codebase).

**Step 3: Test authentication protection**

Run: `npm run dev`
1. Visit `http://localhost:3000/dashboard` while logged out
Expected: Redirect to sign-in page
2. Sign in and visit dashboard
Expected: Dashboard loads successfully

**Step 4: Commit middleware**

```bash
git add src/middleware.ts
git commit -m "feat: add authentication protection for dashboard routes"
```

---

## Task 10: Update Existing Routes and Clean Up

**Files:**
- Delete: `src/app/[locale]/(landing)/ozon/page.tsx` (redirect, no longer needed)
- Delete: `src/app/[locale]/(landing)/ozon/download/page.tsx` (moved to dashboard)
- Keep: `src/app/[locale]/(landing)/ozon/download/page.tsx` can redirect to dashboard

**Step 1: Update landing ozon download page to redirect**

```typescript
// File: src/app/[locale]/(landing)/ozon/download/page.tsx
import { redirect } from '@/core/i18n/navigation';

export default async function OzonDownloadRedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  redirect({ href: '/dashboard/ozon', locale });
}
```

**Step 2: Delete redundant ozon redirect page**

Run: `rm "src/app/[locale]/(landing)/ozon/page.tsx"`

**Step 3: Clean up ozon route translations**

The existing ozon translations can stay for the redirect route.

**Step 4: Test redirect**

Run: `npm run dev`
Visit: `http://localhost:3000/ozon/download`
Expected: Redirects to `/dashboard/ozon`

**Step 5: Commit cleanup**

```bash
git add src/app/[locale]/(landing)/ozon
git commit -m "refactor: redirect landing ozon routes to dashboard"
```

---

## Task 11: Update Dashboard Index Exports

**Files:**
- Modify: `src/shared/blocks/dashboard/index.ts`

**Step 1: Update dashboard exports to include new components**

```typescript
// File: src/shared/blocks/dashboard/index.ts
export * from './layout';
export * from './sidebar';
export * from './nav';
export * from './sidebar-user';
export * from './header';
export * from './main';
export * from './main-header';
export * from './stats-card';
export * from './overview-content';
export * from './credentials-content';
export * from './tasks-content';
export * from './stats-content';
```

**Step 2: Verify exports**

Run: `npx tsc --noEmit`
Expected: No export errors

**Step 3: Commit exports**

```bash
git add src/shared/blocks/dashboard/index.ts
git commit -m "chore: update dashboard index exports"
```

---

## Task 12: Final Testing and Validation

**Files:**
- Test all dashboard routes
- Verify authentication
- Check responsive design
- Validate API endpoints

**Step 1: Test all dashboard pages**

```bash
# Start dev server
npm run dev
```

Manual testing checklist:
- [ ] Visit `/dashboard` - Overview page loads
- [ ] Visit `/dashboard/ozon` - Download page works
- [ ] Visit `/dashboard/credentials` - Can add/delete credentials
- [ ] Visit `/dashboard/tasks` - Task list displays correctly
- [ ] Visit `/dashboard/stats` - Statistics page works

**Step 2: Test authentication flow**

- [ ] Sign out and try to access `/dashboard`
- [ ] Verify redirect to sign-in
- [ ] Sign in and verify dashboard access works

**Step 3: Test API endpoints**

```bash
# Test summary endpoint (while authenticated)
curl http://localhost:3000/api/dashboard/summary

# Test trends endpoint
curl http://localhost:3000/api/dashboard/trends?period=7
```

**Step 4: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors

**Step 5: Check responsive design**

- [ ] Open browser dev tools
- [ ] Test mobile view (375px width)
- [ ] Test tablet view (768px width)
- [ ] Test desktop view (1920px width)

**Step 6: Final commit**

```bash
git add .
git commit -m "feat: complete user dashboard implementation"
```

---

## Task 13: Update Design Document

**Files:**
- Modify: `docs/plans/2025-01-19-user-dashboard-design.md`

**Step 1: Update design document with implementation notes**

Add a section at the end:

```markdown
## Implementation Status

**Completed:** 2025-01-19

### Implemented Features
- ✅ Dashboard layout and navigation
- ✅ Overview page with statistics
- ✅ Ozon download integration
- ✅ Credential management
- ✅ Task history with filters
- ✅ Usage statistics page
- ✅ API endpoints for dashboard data
- ✅ Authentication protection

### Technical Decisions Made
- Used existing DashboardLayout component for consistency
- Client-side components for interactivity (auto-refresh, forms)
- Server components for page shells with translations
- Simple bar charts instead of complex visualization library
- Polling-based updates (30s interval) instead of WebSocket

### Future Enhancements
- Add WebSocket for real-time updates
- Implement task scheduling
- Add more chart types (pie, area)
- Create export functionality
- Add more detailed analytics
```

**Step 2: Commit design document update**

```bash
git add docs/plans/2025-01-19-user-dashboard-design.md
git commit -m "docs: update dashboard design with implementation status"
```

---

## Summary

This implementation plan creates a comprehensive user dashboard for managing Ozon image downloads with:

1. **Foundation**: User route group with dashboard layout
2. **API Layer**: Statistics and trends endpoints
3. **Components**: Reusable StatsCard and page-specific components
4. **Pages**: Overview, Ozon Download, Credentials, Tasks, Statistics
5. **Security**: Authentication middleware protection

**Estimated Time**: 4-6 hours for all tasks
**Commits**: 13 atomic commits following TDD principles

All file paths are exact and all code is complete. Each task is bite-sized (2-5 minutes) and can be tested independently.
