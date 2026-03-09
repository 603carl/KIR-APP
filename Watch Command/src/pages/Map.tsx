import { CategoryIcon, getCategoryLabel } from "@/components/dashboard/CategoryIcon";
import { SeverityBadge } from "@/components/dashboard/SeverityBadge";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { IncidentListPanel } from "@/components/map/IncidentListPanel";
import { MapContainer } from "@/components/map/MapContainer";
import { MapControls } from "@/components/map/MapControls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIncidents } from "@/hooks/useIncidents";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Incident } from "@/types/incident";
import { format, formatDistanceToNow } from "date-fns";
import {
  Activity,
  AlertTriangle,
  Clock,
  Download,
  ExternalLink,
  MapPin,
  Printer,
  RefreshCw,
  Share2,
  Users,
  X
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export default function MapPage() {
  const { incidents, isLoading } = useIncidents();
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showClusters, setShowClusters] = useState(true);
  const [showBoundaries, setShowBoundaries] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [zoomLevel, setZoomLevel] = useState(6);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredIncidents = selectedCategory
    ? incidents.filter(i => i.category === selectedCategory)
    : incidents;

  const criticalCount = filteredIncidents.filter(i => i.severity === 'critical').length;
  const highCount = filteredIncidents.filter(i => i.severity === 'high').length;

  // Calculate category counts from live incidents
  const categoryCounts = incidents.reduce((acc: any[], incident) => {
    const existing = acc.find(a => a.category === incident.category);
    if (existing) {
      existing.count++;
    } else {
      acc.push({ category: incident.category, count: 1 });
    }
    return acc;
  }, []);

  // Handle incident selection from map
  const handleIncidentSelect = useCallback((incident: Incident) => {
    setSelectedIncident(incident);
  }, []);

  // Fly to incident on map
  const handleFlyToIncident = useCallback((incident: Incident) => {
    if (incident.location.coordinates) {
      window.dispatchEvent(new CustomEvent('mapFlyTo', {
        detail: {
          lat: incident.location.coordinates.lat,
          lng: incident.location.coordinates.lng,
          zoom: 12
        }
      }));
      setSelectedIncident(incident);
    }
  }, []);

  // Handle county selection
  const handleCountySelect = useCallback((county: string, lat: number, lng: number) => {
    window.dispatchEvent(new CustomEvent('mapFlyTo', {
      detail: { lat, lng, zoom: 10 }
    }));
    toast.info(`Viewing ${county} County`);
  }, []);

  // Reset map view
  const handleResetView = useCallback(() => {
    window.dispatchEvent(new Event('mapResetView'));
    toast.info('Map view reset to Kenya');
  }, []);

  // Locate user
  const handleLocateUser = useCallback(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          window.dispatchEvent(new CustomEvent('mapFlyTo', {
            detail: {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              zoom: 12
            }
          }));
          toast.success('Located your position');
        },
        () => {
          toast.error('Unable to get your location');
        }
      );
    } else {
      toast.error('Geolocation is not supported');
    }
  }, []);

  // Refresh data
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success('Map data refreshed');
    }, 1000);
  }, []);

  // Export map
  const handleExportMap = useCallback(() => {
    toast.success('Exporting map data...');
    // In production, this would generate a PDF or image
    const data = incidents.map(i => ({
      id: i.id,
      title: i.title,
      category: i.category,
      severity: i.severity,
      status: i.status,
      county: i.location.county,
      lat: i.location.coordinates?.lat,
      lng: i.location.coordinates?.lng,
      createdAt: i.createdAt
    }));

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `incidents-export-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [incidents]);

  // Listen for incident events from map popups
  useEffect(() => {
    const handleViewIncident = (e: CustomEvent) => {
      const incident = incidents.find(i => i.id === e.detail);
      if (incident) setSelectedIncident(incident);
    };

    const handleAssignIncident = (e: CustomEvent) => {
      toast.info(`Opening assignment panel for ${e.detail}`);
    };

    window.addEventListener('viewIncident', handleViewIncident as EventListener);
    window.addEventListener('assignIncident', handleAssignIncident as EventListener);

    return () => {
      window.removeEventListener('viewIncident', handleViewIncident as EventListener);
      window.removeEventListener('assignIncident', handleAssignIncident as EventListener);
    };
  }, [incidents]);

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-120px)]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold">Live Incident Map</h1>
            <p className="text-muted-foreground mt-1">
              Real-time geographic visualization of incidents across Kenya's 47 counties
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              Zoom: {zoomLevel}x
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleExportMap}
            >
              <Download className="h-4 w-4" />
              Export Map
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 xl:grid-cols-4 gap-4">
          {/* Map Area */}
          <div className="xl:col-span-3 rounded-xl border border-border/50 bg-card overflow-hidden relative">
            <MapContainer
              showHeatmap={showHeatmap}
              showClusters={showClusters}
              showBoundaries={showBoundaries}
              selectedCategory={selectedCategory}
              incidents={incidents}
              onIncidentSelect={handleIncidentSelect}
              onZoomChange={setZoomLevel}
              onCountyClick={(county) => toast.info(`Clicked ${county} County`)}
            />

            {/* Stats Overlay */}
            <div className="absolute top-4 left-4 flex gap-2 z-[400]">
              <Badge className="bg-severity-critical/20 text-severity-critical border-severity-critical/30 gap-1 backdrop-blur-sm">
                <AlertTriangle className="h-3 w-3" />
                {criticalCount} Critical
              </Badge>
              <Badge className="bg-severity-high/20 text-severity-high border-severity-high/30 gap-1 backdrop-blur-sm">
                <Activity className="h-3 w-3" />
                {highCount} High Priority
              </Badge>
            </div>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur rounded-lg p-3 border border-border/50 z-[400]">
              <p className="text-xs font-medium mb-2">Incident Severity</p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-severity-low" />
                  <span className="text-xs">Low</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-severity-medium" />
                  <span className="text-xs">Medium</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-severity-high" />
                  <span className="text-xs">High</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-severity-critical animate-pulse" />
                  <span className="text-xs">Critical</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Controls */}
          <div className="space-y-4 overflow-auto">
            <Tabs defaultValue="controls" className="w-full">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="controls">Controls</TabsTrigger>
                <TabsTrigger value="incidents">Incidents</TabsTrigger>
              </TabsList>

              <TabsContent value="controls" className="mt-4">
                <MapControls
                  showHeatmap={showHeatmap}
                  setShowHeatmap={setShowHeatmap}
                  showClusters={showClusters}
                  setShowClusters={setShowClusters}
                  showBoundaries={showBoundaries}
                  setShowBoundaries={setShowBoundaries}
                  selectedCategory={selectedCategory}
                  setSelectedCategory={setSelectedCategory}
                  incidents={incidents}
                  categories={categoryCounts}
                  onCountySelect={handleCountySelect}
                  onResetView={handleResetView}
                  onLocateUser={handleLocateUser}
                />
              </TabsContent>

              <TabsContent value="incidents" className="mt-4">
                <IncidentListPanel
                  incidents={selectedCategory
                    ? incidents.filter(i => i.category === selectedCategory)
                    : incidents
                  }
                  selectedIncident={selectedIncident}
                  onIncidentSelect={handleIncidentSelect}
                  onFlyToIncident={handleFlyToIncident}
                  isLoading={isLoading}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Incident Detail Panel */}
        {selectedIncident && (
          <div className="fixed inset-y-0 right-0 w-full max-w-md bg-background border-l border-border shadow-2xl z-50 overflow-auto">
            <div className="sticky top-0 bg-background/95 backdrop-blur border-b border-border p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CategoryIcon category={selectedIncident.category} size="md" showBackground />
                <div>
                  <h2 className="font-bold">{selectedIncident.id}</h2>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(selectedIncident.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedIncident(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-4 space-y-4">
              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                <SeverityBadge severity={selectedIncident.severity} />
                <StatusBadge status={selectedIncident.status} />
                <Badge variant="outline" className="gap-1">
                  <CategoryIcon category={selectedIncident.category} size="sm" />
                  {getCategoryLabel(selectedIncident.category)}
                </Badge>
              </div>

              {/* Title & Description */}
              <div>
                <h3 className="text-lg font-semibold mb-2">{selectedIncident.title}</h3>
                <p className="text-sm text-muted-foreground">{selectedIncident.description}</p>
              </div>

              {/* Location */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Location
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p><span className="text-muted-foreground">County:</span> {selectedIncident.location.county}</p>
                  <p><span className="text-muted-foreground">Sub-county:</span> {selectedIncident.location.subcounty}</p>
                  <p><span className="text-muted-foreground">Address:</span> {selectedIncident.location.address}</p>
                  {selectedIncident.location.coordinates && (
                    <p className="text-xs text-muted-foreground font-mono">
                      {selectedIncident.location.coordinates.lat.toFixed(4)}, {selectedIncident.location.coordinates.lng.toFixed(4)}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Reporter */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Reporter
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium">
                      {selectedIncident.reporter.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{selectedIncident.reporter.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {selectedIncident.reporter.type.replace('_', ' ')}
                        {selectedIncident.reporter.verified && (
                          <Badge variant="outline" className="ml-2 text-[10px] py-0">Verified</Badge>
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Assigned Team */}
              {selectedIncident.assignedTeam && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Assigned Team
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm font-medium">{selectedIncident.assignedTeam.name}</p>
                    <p className="text-xs text-muted-foreground">ID: {selectedIncident.assignedTeam.id}</p>
                  </CardContent>
                </Card>
              )}

              {/* Timeline */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created:</span>
                    <span>{format(new Date(selectedIncident.createdAt), 'PPp')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Updated:</span>
                    <span>{format(new Date(selectedIncident.updatedAt), 'PPp')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Views:</span>
                    <span>{selectedIncident.views}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Updates:</span>
                    <span>{selectedIncident.updates}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2 pt-4">
                <Button className="gap-2" onClick={() => toast.success('Opening full details...')}>
                  <ExternalLink className="h-4 w-4" />
                  Full Details
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => toast.success('Opening assignment panel...')}>
                  <Users className="h-4 w-4" />
                  Assign Team
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/incidents/${selectedIncident.id}`);
                  toast.success('Link copied to clipboard');
                }}>
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => {
                  window.print();
                }}>
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
