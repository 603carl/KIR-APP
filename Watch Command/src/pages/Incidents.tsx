import { CategoryIcon, getCategoryLabel } from "@/components/dashboard/CategoryIcon";
import { SeverityBadge } from "@/components/dashboard/SeverityBadge";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useIncidents } from "@/hooks/useIncidents";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  Clock,
  Download,
  Eye,
  Image,
  LayoutGrid,
  LayoutList,
  Loader2,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Search,
  User
} from "lucide-react";
import { useState } from "react";

import { ExportDataDialog } from "@/components/dialogs/ExportDataDialog";
import { NewIncidentDialog } from "@/components/dialogs/NewIncidentDialog";
import { Incident } from "@/types/incident";

import { useNavigate, useSearchParams } from "react-router-dom";

// ... inside component ...
export default function Incidents() {
  const { incidents, isLoading: loading } = useIncidents();
  const [searchParams] = useSearchParams(); // Get URL params

  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [selectedIncidents, setSelectedIncidents] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Initialize from URL params or default to 'all'
  // Initialize from URL params or default to 'all'
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get("category") || "all");
  const [severityFilter, setSeverityFilter] = useState(searchParams.get("severity") || "all");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all");
  const [dateFilter, setDateFilter] = useState(searchParams.get("date") || "all");

  const [newIncidentOpen, setNewIncidentOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const { toast } = useToast();

  const filteredIncidents = incidents.filter((incident) => {
    const matchesCategory = categoryFilter === "all" || incident.category === categoryFilter;
    const matchesSeverity = severityFilter === "all" || incident.severity === severityFilter;
    const matchesStatus = statusFilter === "all" || incident.status === statusFilter;

    let matchesDate = true;
    if (dateFilter !== "all") {
      const created = new Date(incident.createdAt);
      const now = new Date();
      if (dateFilter === "today") {
        matchesDate = created.toDateString() === now.toDateString();
      } else if (dateFilter === "week") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchesDate = created >= weekAgo;
      } else if (dateFilter === "month") {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        matchesDate = created >= monthAgo;
      }
    }

    if (!matchesCategory || !matchesSeverity || !matchesStatus || !matchesDate) return false;
    const query = searchQuery.toLowerCase();
    return (
      incident.id.toLowerCase().includes(query) ||
      incident.title.toLowerCase().includes(query) ||
      incident.location.county.toLowerCase().includes(query) ||
      incident.description.toLowerCase().includes(query)
    );
  });

  const toggleIncident = (id: string) => {
    setSelectedIncidents((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIncidents.length === filteredIncidents.length) {
      setSelectedIncidents([]);
    } else {
      setSelectedIncidents(filteredIncidents.map((i) => i.id));
    }
  };

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Incident Management</h1>
          <p className="text-muted-foreground mt-1">
            {loading ? "Loading..." : `${filteredIncidents.length.toLocaleString()} incidents found`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setExportOpen(true)}>
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setNewIncidentOpen(true)}>
            <Plus className="h-4 w-4" />
            New Incident
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="rounded-xl border border-border/50 bg-card p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by ID, title, location..."
              className="pl-9 bg-muted/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[140px] bg-muted/50">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="water">Water</SelectItem>
                <SelectItem value="roads">Roads</SelectItem>
                <SelectItem value="power">Power</SelectItem>
                <SelectItem value="health">Health</SelectItem>
                <SelectItem value="security">Security</SelectItem>
                <SelectItem value="corruption">Corruption</SelectItem>
                <SelectItem value="environment">Environment</SelectItem>
              </SelectContent>
            </Select>

            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[140px] bg-muted/50">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] bg-muted/50">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[140px] bg-muted/50">
                <SelectValue placeholder="Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>

            {/* View Toggle */}
            <div className="flex items-center border border-border rounded-lg p-1 bg-muted/50">
              <Button
                variant={viewMode === "card" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2"
                onClick={() => setViewMode("card")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "table" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2"
                onClick={() => setViewMode("table")}
              >
                <LayoutList className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIncidents.length > 0 && (
        <div className="rounded-xl border border-primary/50 bg-primary/10 p-3 mb-4 flex items-center justify-between animate-fade-in-up">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={selectedIncidents.length === filteredIncidents.length}
              onCheckedChange={selectAll}
            />
            <span className="text-sm font-medium">
              {selectedIncidents.length} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              Assign Team
            </Button>
            <Button variant="outline" size="sm">
              Change Status
            </Button>
            <Button variant="outline" size="sm">
              Export
            </Button>
          </div>
        </div>
      )}

      {/* Incidents List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredIncidents.length === 0 ? (
        <div className="text-center py-12">
          <MapPin className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">No incidents found</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => setNewIncidentOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create First Incident
          </Button>
        </div>
      ) : (
        <ScrollArea className="h-[calc(100vh-380px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredIncidents.map((incident) => (
              <IncidentCard
                key={incident.id}
                incident={incident}
                selected={selectedIncidents.includes(incident.id)}
                onSelect={() => toggleIncident(incident.id)}
              />
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Dialogs */}
      <NewIncidentDialog
        open={newIncidentOpen}
        onOpenChange={setNewIncidentOpen}
        onSuccess={() => { }} // Hook handles real-time update
      />
      <ExportDataDialog open={exportOpen} onOpenChange={setExportOpen} />
    </DashboardLayout>
  );
}

function IncidentCard({
  incident,
  selected,
  onSelect,
}: {
  incident: Incident;
  selected: boolean;
  onSelect: () => void;
}) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/incidents/${incident.id}`)}
      className={cn(
        "rounded-xl border bg-card p-4 transition-all hover:shadow-lg cursor-pointer group",
        selected
          ? "border-primary bg-primary/5"
          : "border-border/50 hover:border-border"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Checkbox checked={selected} onCheckedChange={onSelect} />
          <span className="font-mono text-xs text-muted-foreground">
            {incident.id.slice(0, 8).toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <SeverityBadge severity={incident.severity as any} size="sm" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>View Details</DropdownMenuItem>
              <DropdownMenuItem>Assign Team</DropdownMenuItem>
              <DropdownMenuItem>Change Status</DropdownMenuItem>
              <DropdownMenuItem>Edit</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Category & Status */}
      <div className="flex items-center gap-2 mt-2">
        <CategoryIcon category={incident.category as any} size="sm" showBackground />
        <span className="text-xs text-muted-foreground">
          {getCategoryLabel(incident.category as any)}
        </span>
        <StatusBadge status={incident.status as any} size="sm" showIcon={false} />
      </div>

      {/* Title */}
      <h3 className="font-medium mt-2 line-clamp-2 group-hover:text-primary transition-colors">
        {incident.title}
      </h3>

      {/* Description */}
      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
        {incident.description}
      </p>

      {/* Metadata */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {incident.location.county}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatDistanceToNow(new Date(incident.createdAt), { addSuffix: true })}
        </span>
        {incident.reporter?.name && (
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {incident.reporter.name}
            {incident.reporter.verified && <span className="text-primary">✓</span>}
          </span>
        )}
      </div>

      {/* Footer Stats */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {incident.views || 0}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            {incident.updates || 0}
          </span>
          {incident.media?.photos && incident.media.photos.length > 0 && (
            <span className="flex items-center gap-1">
              <Image className="h-3 w-3" />
              {incident.media.photos.length}
            </span>
          )}
        </div>
        {incident.assignedTeam && (
          <Badge variant="outline" className="text-[10px]">
            {incident.assignedTeam.name}
          </Badge>
        )}
      </div>
    </div>
  );
}
