import { SystemHealth } from "@/types/incident";
import { cn } from "@/lib/utils";
import { 
  Activity, 
  Database, 
  Wifi, 
  Clock, 
  AlertCircle, 
  CheckCircle 
} from "lucide-react";

interface SystemHealthPanelProps {
  health: SystemHealth;
}

const statusConfig = {
  healthy: {
    label: 'Healthy',
    color: 'text-severity-low',
    bg: 'bg-severity-low',
    icon: CheckCircle
  },
  degraded: {
    label: 'Degraded',
    color: 'text-severity-medium',
    bg: 'bg-severity-medium',
    icon: AlertCircle
  },
  down: {
    label: 'Down',
    color: 'text-severity-critical',
    bg: 'bg-severity-critical',
    icon: AlertCircle
  },
  connected: {
    label: 'Connected',
    color: 'text-severity-low',
    bg: 'bg-severity-low',
    icon: CheckCircle
  },
  reconnecting: {
    label: 'Reconnecting',
    color: 'text-severity-medium',
    bg: 'bg-severity-medium',
    icon: Activity
  },
  disconnected: {
    label: 'Disconnected',
    color: 'text-severity-critical',
    bg: 'bg-severity-critical',
    icon: AlertCircle
  }
};

export function SystemHealthPanel({ health }: SystemHealthPanelProps) {
  const getStatusConfig = (status: keyof typeof statusConfig) => statusConfig[status];

  const items = [
    { 
      label: 'API Status', 
      icon: Activity, 
      status: health.api,
      config: getStatusConfig(health.api)
    },
    { 
      label: 'Database', 
      icon: Database, 
      status: health.database,
      config: getStatusConfig(health.database)
    },
    { 
      label: 'WebSocket', 
      icon: Wifi, 
      status: health.websocket,
      config: getStatusConfig(health.websocket)
    }
  ];

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">System Health</h3>
        <span className="text-xs font-mono text-severity-low flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-severity-low animate-pulse" />
          {health.uptime}% uptime
        </span>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <item.icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{item.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn(
                "h-2 w-2 rounded-full",
                item.config.bg,
                item.status !== 'down' && item.status !== 'disconnected' && "animate-pulse"
              )} />
              <span className={cn("text-xs font-medium", item.config.color)}>
                {item.config.label}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-border/50 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Avg Response</p>
          <p className="font-mono text-lg font-semibold">{health.avgResponseTime}ms</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Error Rate</p>
          <p className={cn(
            "font-mono text-lg font-semibold",
            health.errorRate > 1 ? "text-severity-critical" : "text-severity-low"
          )}>
            {health.errorRate}%
          </p>
        </div>
      </div>
    </div>
  );
}
