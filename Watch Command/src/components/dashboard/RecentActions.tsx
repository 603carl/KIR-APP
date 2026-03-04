import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ActivityItem } from "@/types/incident";
import { formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Plus,
  Shield,
  UserCheck,
  Users
} from "lucide-react";

interface RecentActionsProps {
  activities?: ActivityItem[];
}

const actionIcons: Record<string, React.ReactNode> = {
  new_incident: <Plus className="h-3.5 w-3.5" />,
  assign: <Users className="h-3.5 w-3.5" />,
  resolve: <CheckCircle2 className="h-3.5 w-3.5" />,
  verify: <UserCheck className="h-3.5 w-3.5" />,
  escalate: <AlertTriangle className="h-3.5 w-3.5" />,
  create_user: <Shield className="h-3.5 w-3.5" />,
  status_change: <ArrowRight className="h-3.5 w-3.5" />
};

const actionColors: Record<string, string> = {
  new_incident: 'bg-primary/20 text-primary',
  assign: 'bg-[hsl(262,83%,15%)] text-[hsl(262,83%,58%)]',
  resolve: 'bg-severity-low-bg text-severity-low',
  verify: 'bg-primary/20 text-primary',
  escalate: 'bg-severity-high-bg text-severity-high',
  create_user: 'bg-severity-info-bg text-severity-info',
  status_change: 'bg-severity-info-bg text-severity-info'
};

export function RecentActions({ activities = [] }: RecentActionsProps) {
  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border/50">
        <h3 className="font-semibold">Recent Admin Actions</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Audit trail of operator activities</p>
      </div>

      <ScrollArea className="h-[300px]">
        <div className="divide-y divide-border/30">
          {activities.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No recent actions recorded.
            </div>
          ) : (
            activities.map((action) => (
              <div
                key={action.id}
                className="px-4 py-3 hover:bg-accent/30 transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full",
                    actionColors[action.type] || 'bg-muted text-muted-foreground'
                  )}>
                    {actionIcons[action.type] || <Shield className="h-3.5 w-3.5" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{action.details}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        by <span className="text-foreground/80">{action.actor?.name || 'System'}</span>
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(action.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
