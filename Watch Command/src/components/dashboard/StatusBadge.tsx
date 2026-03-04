import { cn } from "@/lib/utils";
import { IncidentStatus } from "@/types/incident";
import {
  Archive,
  Check,
  CheckCircle2,
  FileText,
  Loader2,
  Search,
  Users,
  XCircle
} from "lucide-react";

interface StatusBadgeProps {
  status: IncidentStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const statusConfig: Record<IncidentStatus, {
  label: string;
  icon: React.ReactNode;
  className: string;
}> = {
  submitted: {
    label: 'Submitted',
    icon: <FileText className="h-3 w-3" />,
    className: 'bg-muted text-muted-foreground border-border'
  },
  Submitted: {
    label: 'Submitted',
    icon: <FileText className="h-3 w-3" />,
    className: 'bg-muted text-muted-foreground border-border'
  },
  pending: {
    label: 'Pending',
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
    className: 'bg-severity-medium-bg text-severity-medium border-severity-medium/30'
  },
  Pending: {
    label: 'Pending',
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
    className: 'bg-severity-medium-bg text-severity-medium border-severity-medium/30'
  },
  under_review: {
    label: 'Under Review',
    icon: <Search className="h-3 w-3" />,
    className: 'bg-severity-info-bg text-severity-info border-severity-info/30'
  },
  'Under Review': {
    label: 'Under Review',
    icon: <Search className="h-3 w-3" />,
    className: 'bg-severity-info-bg text-severity-info border-severity-info/30'
  },
  verified: {
    label: 'Verified',
    icon: <CheckCircle2 className="h-3 w-3" />,
    className: 'bg-primary/10 text-primary border-primary/30'
  },
  Verified: {
    label: 'Verified',
    icon: <CheckCircle2 className="h-3 w-3" />,
    className: 'bg-primary/10 text-primary border-primary/30'
  },
  assigned: {
    label: 'Assigned',
    icon: <Users className="h-3 w-3" />,
    className: 'bg-[hsl(262,83%,15%)] text-[hsl(262,83%,58%)] border-[hsl(262,83%,58%)/0.3]'
  },
  Assigned: {
    label: 'Assigned',
    icon: <Users className="h-3 w-3" />,
    className: 'bg-[hsl(262,83%,15%)] text-[hsl(262,83%,58%)] border-[hsl(262,83%,58%)/0.3]'
  },
  in_progress: {
    label: 'In Progress',
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
    className: 'bg-severity-medium-bg text-severity-medium border-severity-medium/30'
  },
  'In Progress': {
    label: 'In Progress',
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
    className: 'bg-severity-medium-bg text-severity-medium border-severity-medium/30'
  },
  resolved: {
    label: 'Resolved',
    icon: <Check className="h-3 w-3" />,
    className: 'bg-severity-low-bg text-severity-low border-severity-low/30'
  },
  Resolved: {
    label: 'Resolved',
    icon: <Check className="h-3 w-3" />,
    className: 'bg-severity-low-bg text-severity-low border-severity-low/30'
  },
  closed: {
    label: 'Closed',
    icon: <Archive className="h-3 w-3" />,
    className: 'bg-muted/50 text-muted-foreground border-border/50'
  },
  Closed: {
    label: 'Closed',
    icon: <Archive className="h-3 w-3" />,
    className: 'bg-muted/50 text-muted-foreground border-border/50'
  },
  rejected: {
    label: 'Rejected',
    icon: <XCircle className="h-3 w-3" />,
    className: 'bg-severity-critical-bg/50 text-severity-critical/70 border-severity-critical/20'
  },
  Rejected: {
    label: 'Rejected',
    icon: <XCircle className="h-3 w-3" />,
    className: 'bg-severity-critical-bg/50 text-severity-critical/70 border-severity-critical/20'
  }
};

const sizeStyles = {
  sm: 'text-[10px] px-1.5 py-0.5 gap-1',
  md: 'text-xs px-2 py-1 gap-1.5',
  lg: 'text-sm px-2.5 py-1.5 gap-2'
};

export function StatusBadge({ status, size = 'md', showIcon = true }: StatusBadgeProps) {
  // Normalize status for config lookup (handle mixed casing from database/legacy)
  const normalizedStatus = status?.toLowerCase().replace(/\s+/g, '_') as IncidentStatus;
  const config = statusConfig[normalizedStatus] || statusConfig.submitted;

  if (!config) return null; // Double safety

  return (
    <div className={cn(
      "inline-flex items-center rounded-full font-medium border",
      sizeStyles[size],
      config.className
    )}>
      {showIcon && config.icon}
      <span>{config.label}</span>
    </div>
  );
}
