import { CategoryIcon } from "@/components/dashboard/CategoryIcon";
import { SeverityBadge } from "@/components/dashboard/SeverityBadge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Incident } from "@/types/incident";
import { formatDistanceToNow } from "date-fns";
import { ChevronRight, Eye, MapPin, MessageSquare } from "lucide-react";


interface IncidentListPanelProps {
  incidents: Incident[];
  selectedIncident: Incident | null;
  onIncidentSelect: (incident: Incident) => void;
  onFlyToIncident: (incident: Incident) => void;
  isLoading?: boolean;
}

export function IncidentListPanel({
  incidents,
  selectedIncident,
  onIncidentSelect,
  onFlyToIncident,
  isLoading = false
}: IncidentListPanelProps) {
  return (
    <ScrollArea className="h-[calc(100vh-450px)] min-h-[200px]">
      <div className="space-y-2 p-1">
        {isLoading ? (
          Array(5).fill(0).map((_, i) => (
            <div key={i} className="p-3 rounded-lg border border-border/50 bg-muted/30 space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-12" />
              </div>
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          ))
        ) : incidents.slice(0, 50).map(incident => (
          <div
            key={incident.id}
            className={`
              p-3 rounded-lg border cursor-pointer transition-all
              ${selectedIncident?.id === incident.id
                ? 'bg-primary/10 border-primary'
                : 'bg-muted/30 border-border/50 hover:bg-muted/50'
              }
            `}
            onClick={() => onIncidentSelect(incident)}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <CategoryIcon category={incident.category} size="sm" />
                <span className="text-xs font-mono text-muted-foreground">{incident.id}</span>
              </div>
              <SeverityBadge severity={incident.severity} size="sm" />
            </div>

            <h4 className="text-sm font-medium mb-1 line-clamp-2">
              {incident.title}
            </h4>

            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{incident.location.county}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" /> {incident.views}
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" /> {incident.updates}
                </span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onFlyToIncident(incident);
                }}
              >
                View <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>

            <div className="text-[10px] text-muted-foreground mt-2">
              {formatDistanceToNow(new Date(incident.createdAt), { addSuffix: true })}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
