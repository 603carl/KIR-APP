import { CategoryIcon, getCategoryLabel } from "@/components/dashboard/CategoryIcon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { kenyaCountiesGeoData } from "@/lib/kenya-counties-geo";
import { Incident, IncidentCategory } from "@/types/incident";
import {
  Crosshair,
  Filter,
  Layers,
  MapPin,
  RotateCcw
} from "lucide-react";

interface MapControlsProps {
  showHeatmap: boolean;
  setShowHeatmap: (value: boolean) => void;
  showClusters: boolean;
  setShowClusters: (value: boolean) => void;
  showBoundaries: boolean;
  setShowBoundaries: (value: boolean) => void;
  selectedCategory: string | null;
  setSelectedCategory: (value: string | null) => void;
  incidents: Incident[];
  categories: { category: IncidentCategory; count: number }[];
  onCountySelect: (county: string, lat: number, lng: number) => void;
  onResetView: () => void;
  onLocateUser: () => void;
}

export function MapControls({
  showHeatmap,
  setShowHeatmap,
  showClusters,
  setShowClusters,
  showBoundaries,
  setShowBoundaries,
  selectedCategory,
  setSelectedCategory,
  incidents,
  categories,
  onCountySelect,
  onResetView,
  onLocateUser
}: MapControlsProps) {
  const filteredIncidents = selectedCategory
    ? incidents.filter(i => i.category === selectedCategory)
    : incidents;

  // Calculate incident counts per county
  const countyCounts = kenyaCountiesGeoData.map(county => {
    const searchName = county.name.toLowerCase().replace(' city', '').trim();
    return {
      ...county,
      incidentCount: filteredIncidents.filter(i => {
        const incLoc = (i.location.county || '').toLowerCase();
        return incLoc === county.name.toLowerCase() ||
          incLoc === searchName ||
          incLoc.includes(county.name.toLowerCase()) ||
          incLoc.includes(searchName);
      }).length
    };
  }).sort((a, b) => b.incidentCount - a.incidentCount);

  return (
    <div className="space-y-4">
      {/* Quick Actions */}
      <Card>
        <CardContent className="p-3">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5"
              onClick={onResetView}
            >
              <RotateCcw className="h-4 w-4" />
              Reset View
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5"
              onClick={onLocateUser}
            >
              <Crosshair className="h-4 w-4" />
              My Location
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Layer Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Map Layers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="heatmap" className="text-sm cursor-pointer">Heat Map</Label>
            <Switch id="heatmap" checked={showHeatmap} onCheckedChange={setShowHeatmap} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="clusters" className="text-sm cursor-pointer">Cluster Markers</Label>
            <Switch id="clusters" checked={showClusters} onCheckedChange={setShowClusters} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="boundaries" className="text-sm cursor-pointer">County Boundaries</Label>
            <Switch id="boundaries" checked={showBoundaries} onCheckedChange={setShowBoundaries} />
          </div>
        </CardContent>
      </Card>

      {/* Category Filter */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filter by Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {categories.map((cat) => (
              <Button
                key={cat.category}
                variant={selectedCategory === cat.category ? "secondary" : "ghost"}
                size="sm"
                className="justify-start gap-2 h-auto py-2"
                onClick={() => setSelectedCategory(
                  selectedCategory === cat.category ? null : cat.category
                )}
              >
                <CategoryIcon category={cat.category} size="sm" />
                <span className="text-xs truncate">{getCategoryLabel(cat.category)}</span>
                <Badge variant="outline" className="ml-auto text-[10px] px-1">
                  {cat.count}
                </Badge>
              </Button>
            ))}
          </div>
          {selectedCategory && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2 text-xs"
              onClick={() => setSelectedCategory(null)}
            >
              Clear Filter
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Hotspots */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Hotspot Areas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[180px]">
            <div className="p-4 pt-0 space-y-1">
              {countyCounts.slice(0, 10).map((county, i) => (
                <div
                  key={county.name}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => onCountySelect(county.name, county.lat, county.lng)}
                >
                  <div className="flex items-center gap-2">
                    <span className={`
                      text-xs font-mono w-5 h-5 rounded-full flex items-center justify-center
                      ${i < 3 ? 'bg-severity-critical/20 text-severity-critical' : 'text-muted-foreground'}
                    `}>
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium">{county.name}</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-xs ${i < 3 ? 'border-severity-critical/30 text-severity-critical' : ''
                      }`}
                  >
                    {county.incidentCount}
                  </Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold font-mono text-severity-critical">
                {filteredIncidents.filter(i => i.severity === 'critical').length}
              </p>
              <p className="text-xs text-muted-foreground">Critical</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold font-mono text-severity-high">
                {filteredIncidents.filter(i => i.severity === 'high').length}
              </p>
              <p className="text-xs text-muted-foreground">High Priority</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold font-mono">47</p>
              <p className="text-xs text-muted-foreground">Counties</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold font-mono text-primary">
                {filteredIncidents.filter(i => !['Resolved', 'Closed', 'Rejected', 'resolved', 'closed', 'rejected'].includes(i.status)).length}
              </p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
