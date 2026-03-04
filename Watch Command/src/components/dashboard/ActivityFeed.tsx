import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ActivityItem } from "@/types/incident";
import { formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Pause,
  Play,
  Plus,
  Users
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CategoryIcon } from "./CategoryIcon";
import { LiveIndicator } from "./LiveIndicator";
import { SeverityBadge } from "./SeverityBadge";

interface ActivityFeedProps {
  activities: ActivityItem[];
  maxHeight?: string;
}

const activityIcons: Record<ActivityItem['type'], React.ReactNode> = {
  new_incident: <Plus className="h-3.5 w-3.5" />,
  status_change: <ArrowRight className="h-3.5 w-3.5" />,
  assignment: <Users className="h-3.5 w-3.5" />,
  resolution: <CheckCircle className="h-3.5 w-3.5" />,
  escalation: <AlertTriangle className="h-3.5 w-3.5" />
};

const activityColors: Record<ActivityItem['type'], string> = {
  new_incident: 'bg-primary/20 text-primary',
  status_change: 'bg-severity-info-bg text-severity-info',
  assignment: 'bg-[hsl(262,83%,15%)] text-[hsl(262,83%,58%)]',
  resolution: 'bg-severity-low-bg text-severity-low',
  escalation: 'bg-severity-high-bg text-severity-high'
};

export function ActivityFeed({ activities, maxHeight = "500px" }: ActivityFeedProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [visibleActivities, setVisibleActivities] = useState(activities.slice(0, 20));
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // If we get new activities while LIVE and they are newer than our top item, 
    // we should prepending them to visibleActivities to show them immediately.
    if (!isPaused && activities.length > 0) {
      setVisibleActivities(prev => {
        const newItems = activities.filter(a => !prev.some(p => p.id === a.id));
        if (newItems.length === 0) return prev;

        // Add newest items to the top and keep buffer manageable
        const combined = [...newItems, ...prev];
        return combined.slice(0, 50);
      });
    }

    // Fallback trickle for initial load or legacy items
    if (!isPaused && activities.length > visibleActivities.length) {
      const timer = setInterval(() => {
        setVisibleActivities(prev => {
          const nextIndex = prev.length;
          if (nextIndex < activities.length) {
            // Find the next item from the original source that we don't have yet
            const nextItem = activities.find(a => !prev.some(p => p.id === a.id));
            if (nextItem) return [nextItem, ...prev].slice(0, 50);
          }
          return prev;
        });
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [isPaused, activities, visibleActivities]);

  return (
    <div className="flex flex-col rounded-xl border border-border/50 bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold">Live Activity Feed</h3>
          <LiveIndicator isLive={!isPaused} />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsPaused(!isPaused)}
          className="h-8 gap-1.5"
        >
          {isPaused ? (
            <>
              <Play className="h-3.5 w-3.5" />
              Resume
            </>
          ) : (
            <>
              <Pause className="h-3.5 w-3.5" />
              Pause
            </>
          )}
        </Button>
      </div>

      {/* Activity List */}
      <ScrollArea className="flex-1" style={{ maxHeight }}>
        <div className="divide-y divide-border/30">
          {visibleActivities.map((activity, index) => (
            <div
              key={activity.id}
              className={cn(
                "px-4 py-3 hover:bg-accent/50 transition-colors cursor-pointer",
                index === 0 && "animate-slide-in-right bg-accent/30"
              )}
            >
              <div className="flex items-start gap-3">
                {/* Activity Type Icon */}
                <div className={cn(
                  "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full",
                  activityColors[activity.type]
                )}>
                  {activityIcons[activity.type]}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-muted-foreground">
                      {activity.incident.id}
                    </span>
                    <SeverityBadge severity={activity.incident.severity} size="sm" />
                    <CategoryIcon category={activity.incident.category} size="sm" showBackground />
                  </div>

                  <p className="mt-1 text-sm font-medium truncate">
                    {activity.incident.title}
                  </p>

                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {activity.details}
                    {activity.actor && (
                      <span className="text-foreground/80"> by {activity.actor.name}</span>
                    )}
                  </p>
                </div>

                {/* Timestamp */}
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Footer Stats */}
      <div className="border-t border-border/50 px-4 py-2 bg-muted/30">
        <p className="text-xs text-muted-foreground text-center">
          Showing {visibleActivities.length} of {activities.length} activities
        </p>
      </div>
    </div>
  );
}
