import { cn } from "@/lib/utils";
import { IncidentSeverity } from "@/types/incident";
import { AlertCircle, AlertTriangle, CheckCircle, Flame, Info } from "lucide-react";

interface SeverityBadgeProps {
  severity: IncidentSeverity;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
}

const severityConfig: Record<IncidentSeverity, {
  label: string;
  icon: React.ReactNode;
  className: string;
}> = {
  critical: {
    label: 'Critical',
    icon: <Flame className="h-3 w-3" />,
    className: 'severity-critical'
  },
  high: {
    label: 'High',
    icon: <AlertTriangle className="h-3 w-3" />,
    className: 'severity-high'
  },
  medium: {
    label: 'Medium',
    icon: <AlertCircle className="h-3 w-3" />,
    className: 'severity-medium'
  },
  low: {
    label: 'Low',
    icon: <CheckCircle className="h-3 w-3" />,
    className: 'severity-low'
  },
  info: {
    label: 'Info',
    icon: <Info className="h-3 w-3" />,
    className: 'severity-info'
  }
};

const sizeStyles = {
  sm: 'text-[10px] px-1.5 py-0.5 gap-1',
  md: 'text-xs px-2 py-1 gap-1.5',
  lg: 'text-sm px-2.5 py-1.5 gap-2'
};

export function SeverityBadge({ severity, showLabel = true, size = 'md', pulse = false }: SeverityBadgeProps) {
  const config = severityConfig[severity] || severityConfig['info'];

  return (
    <div className={cn(
      "inline-flex items-center rounded-full font-medium",
      sizeStyles[size],
      config.className,
      pulse && (severity === 'critical' || severity === 'high') && 'animate-pulse-glow'
    )}>
      {config.icon}
      {showLabel && <span>{config.label}</span>}
    </div>
  );
}
