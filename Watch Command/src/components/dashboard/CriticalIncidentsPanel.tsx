import { AssignTeamDialog } from "@/components/dialogs/AssignTeamDialog";
import { EscalationDialog } from "@/components/dialogs/EscalationDialog";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Incident } from "@/types/incident";
import { formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  ChevronRight,
  Clock,
  Eye,
  MapPin,
  User
} from "lucide-react";
import { CategoryIcon } from "./CategoryIcon";
import { SeverityBadge } from "./SeverityBadge";
import { StatusBadge } from "./StatusBadge";

export function CriticalIncidentsPanel({ incidents }: CriticalIncidentsPanelProps) {
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [escalateOpen, setEscalateOpen] = useState(false);
  const navigate = useNavigate();

  const handleAction = (incident: Incident, action: 'assign' | 'escalate' | 'view') => {
    setSelectedIncident(incident);
    if (action === 'assign') setAssignOpen(true);
    if (action === 'escalate') setEscalateOpen(true);
    if (action === 'view') navigate(`/incidents/${incident.id}`);
  };

  return (
    <div className="rounded-xl border border-severity-critical/30 bg-severity-critical-bg/20 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-severity-critical/20 bg-severity-critical/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-severity-critical/20 animate-pulse-glow">
            <AlertTriangle className="h-4 w-4 text-severity-critical" />
          </div>
          <div>
            <h3 className="font-semibold text-severity-critical">Critical Incidents</h3>
            <p className="text-xs text-muted-foreground">{incidents.length} requiring immediate attention</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-severity-critical/30 text-severity-critical hover:bg-severity-critical/10"
          onClick={() => navigate('/incidents?severity=critical')}
        >
          View All
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>

      {/* Incidents List */}
      <ScrollArea className="max-h-[400px]">
        <div className="divide-y divide-border/30">
          {incidents.map((incident, index) => (
            <div
              key={incident.id}
              onClick={() => handleAction(incident, 'view')}
              className={cn(
                "p-4 hover:bg-accent/30 transition-all cursor-pointer group",
                index === 0 && "animate-fade-in-up"
              )}
            >
              {/* Header Row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    {incident.id.slice(0, 8).toUpperCase()}
                  </span>
                  <SeverityBadge
                    severity={incident.severity}
                    size="sm"
                    pulse={incident.severity === 'critical'}
                  />
                  <StatusBadge status={incident.status} size="sm" />
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(incident.createdAt), { addSuffix: true })}
                </span>
              </div>

              {/* Title & Category */}
              <div className="mt-2 flex items-start gap-2">
                <CategoryIcon category={incident.category} showBackground />
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm group-hover:text-primary transition-colors">
                    {incident.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {incident.description}
                  </p>
                </div>
              </div>

              {/* Metadata Row */}
              <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {incident.location.county}
                </span>
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {incident.reporter.name}
                  {incident.reporter.verified && (
                    <span className="text-primary">✓</span>
                  )}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {incident.views}
                </span>
              </div>

              {/* Quick Actions */}
              <div className="mt-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 text-xs"
                  onClick={(e) => { e.stopPropagation(); handleAction(incident, 'assign'); }}
                >
                  Assign Team
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={(e) => { e.stopPropagation(); handleAction(incident, 'escalate'); }}
                >
                  Escalate
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={(e) => { e.stopPropagation(); handleAction(incident, 'view'); }}
                >
                  View Details
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <AssignTeamDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        incident={selectedIncident}
      />

      <EscalationDialog
        open={escalateOpen}
        onOpenChange={setEscalateOpen}
        incident={selectedIncident}
      />
    </div>
  );
}
