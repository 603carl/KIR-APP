import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

interface StatsCardProps {
  title: string;
  value: number | string;
  trend?: number;
  trendLabel?: string;
  icon: React.ReactNode;
  variant?: 'default' | 'critical' | 'warning' | 'success' | 'info';
  sparklineData?: number[];
  suffix?: string;
  animate?: boolean;
  isLoading?: boolean;
}

const variantStyles = {
  default: 'border-border/50 bg-card',
  critical: 'border-severity-critical/30 bg-severity-critical-bg/50',
  warning: 'border-severity-high/30 bg-severity-high-bg/50',
  success: 'border-severity-low/30 bg-severity-low-bg/50',
  info: 'border-primary/30 bg-primary/5'
};

const iconVariantStyles = {
  default: 'bg-muted text-muted-foreground',
  critical: 'bg-severity-critical/20 text-severity-critical',
  warning: 'bg-severity-high/20 text-severity-high',
  success: 'bg-severity-low/20 text-severity-low',
  info: 'bg-primary/20 text-primary'
};

export function StatsCard({
  title,
  value,
  trend,
  trendLabel = 'vs last week',
  icon,
  variant = 'default',
  sparklineData,
  suffix = '',
  animate = true,
  isLoading = false
}: StatsCardProps) {
  const [displayValue, setDisplayValue] = useState<number | string>(typeof value === 'number' ? 0 : value);

  useEffect(() => {
    if (isLoading) return;

    if (typeof value === 'number' && animate) {
      const duration = 1000;
      const steps = 30;
      const increment = value / steps;
      let current = 0;

      const timer = setInterval(() => {
        current += increment;
        if (current >= value) {
          setDisplayValue(value);
          clearInterval(timer);
        } else {
          setDisplayValue(Math.floor(current));
        }
      }, duration / steps);

      return () => clearInterval(timer);
    } else {
      setDisplayValue(value);
    }
  }, [value, animate, isLoading]);

  const formatValue = (val: number | string) => {
    if (typeof val === 'number') {
      if (val >= 1000000) {
        return (val / 1000000).toFixed(1) + 'M';
      } else if (val >= 1000) {
        return (val / 1000).toFixed(1) + 'K';
      }
      return val.toLocaleString();
    }
    return val;
  };

  const TrendIcon = trend === undefined ? null : trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend === undefined ? '' : trend > 0 ? 'text-severity-low' : trend < 0 ? 'text-severity-critical' : 'text-muted-foreground';

  // Simple sparkline SVG
  const renderSparkline = () => {
    if (isLoading) return <Skeleton className="h-6 w-20" />;
    if (!sparklineData || sparklineData.length < 2) return null;

    const max = Math.max(...sparklineData);
    const min = Math.min(...sparklineData);
    const range = max - min || 1;

    const width = 80;
    const height = 24;
    const points = sparklineData.map((val, i) => {
      const x = (i / (sparklineData.length - 1)) * width;
      const y = height - ((val - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width={width} height={height} className="opacity-60">
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          points={points}
          className={cn(
            variant === 'critical' ? 'text-severity-critical' :
              variant === 'warning' ? 'text-severity-high' :
                variant === 'success' ? 'text-severity-low' :
                  'text-primary'
          )}
        />
      </svg>
    );
  };

  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl border p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg",
      variantStyles[variant]
    )}>
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5 grid-pattern" />

      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          <div className="mt-2 flex items-baseline gap-1">
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <span className="font-mono text-3xl font-bold tracking-tight animate-count-up">
                  {formatValue(displayValue)}
                </span>
                {suffix && (
                  <span className="text-sm text-muted-foreground">{suffix}</span>
                )}
              </>
            )}
          </div>

          {trend !== undefined && (
            <div className="mt-2 flex items-center gap-1.5">
              {isLoading ? (
                <Skeleton className="h-4 w-32" />
              ) : (
                <>
                  {TrendIcon && <TrendIcon className={cn("h-3.5 w-3.5", trendColor)} />}
                  <span className={cn("text-xs font-medium", trendColor)}>
                    {trend > 0 ? '+' : ''}{trend}%
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {trendLabel}
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg",
            iconVariantStyles[variant]
          )}>
            {icon}
          </div>
          {renderSparkline()}
        </div>
      </div>
    </div>
  );
}
