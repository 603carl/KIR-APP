import { cn } from "@/lib/utils";

interface LiveIndicatorProps {
  isLive?: boolean;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LiveIndicator({ isLive = true, label = 'LIVE', size = 'md' }: LiveIndicatorProps) {
  const sizeStyles = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-2.5 py-1.5'
  };
  
  const dotSizeStyles = {
    sm: 'h-1.5 w-1.5',
    md: 'h-2 w-2',
    lg: 'h-2.5 w-2.5'
  };

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 rounded-full font-mono font-semibold uppercase tracking-wider",
      sizeStyles[size],
      isLive 
        ? "bg-severity-critical/20 text-severity-critical" 
        : "bg-muted text-muted-foreground"
    )}>
      <span className={cn(
        "rounded-full",
        dotSizeStyles[size],
        isLive 
          ? "bg-severity-critical animate-pulse-live" 
          : "bg-muted-foreground"
      )} />
      {label}
    </div>
  );
}
