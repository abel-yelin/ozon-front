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
