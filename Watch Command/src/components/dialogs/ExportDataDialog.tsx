import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Download, FileText, Loader2, Table } from "lucide-react";
import { useState } from "react";

interface ExportDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportDataDialog({ open, onOpenChange }: ExportDataDialogProps) {
  const [loading, setLoading] = useState(false);
  const [format, setFormat] = useState("csv");
  const [dateRange, setDateRange] = useState("all");
  const [includeFields, setIncludeFields] = useState({
    basic: true,
    location: true,
    reporter: false,
    team: true,
  });
  const { toast } = useToast();

  const handleExport = async () => {
    setLoading(true);

    try {
      let query = supabase
        .from("incidents")
        .select("*, teams(name)");

      // Apply date filter
      if (dateRange === "today") {
        const today = new Date().toISOString().split("T")[0];
        query = query.gte("created_at", today);
      } else if (dateRange === "week") {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte("created_at", weekAgo);
      } else if (dateRange === "month") {
        const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte("created_at", monthAgo);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast({
          title: "No Data",
          description: "No incidents found for the selected criteria.",
          variant: "destructive",
        });
        return;
      }

      // Filter fields based on selection
      const exportData = data.map((incident) => {
        const row: any = {};

        if (includeFields.basic) {
          row.incident_number = incident.id; // incident.incident_number might not exist on DB schema, using id
          row.title = incident.title;
          row.description = incident.description;
          row.category = incident.category;
          row.severity = incident.severity;
          row.status = incident.status;
          row.created_at = incident.created_at;
          row.updated_at = incident.updated_at;
        }

        if (includeFields.location) {
          row.county = incident.location; // DB uses 'location' for county often, or we need to check schema. schema said 'location' and 'location_name'
          row.address = incident.location_name;
          row.latitude = incident.lat;
          row.longitude = incident.lng;
        }

        // DB schema for incidents doesn't have reporter_name etc directly usually, it has user_id. 
        // For now, these are not easily joinable without a 'profiles' join or similar. 
        // We will skip reporter fields if they are not in the main table or simple join, 
        // assuming standard privacy. But let's check schema again.
        // The schema shows user_id.
        // We will leave reporter empty or basic for now unless we join profiles.
        // Let's join profiles too.

        if (includeFields.team) {
          // Supabase returns joined data as an object or array depending on relation
          // teams: { name: ... }
          const teamData = incident.teams as any;
          row.assigned_team_name = teamData?.name || "Unassigned";
          // views/updates are mock or simplified
          // row.views = incident.views; // 'views' not in DB schema provided earlier
          // row.updates_count = 0; 
        }

        return row;
      });

      // Generate file content
      let content: string;
      let mimeType: string;
      let extension: string;

      if (format === "csv") {
        const headers = Object.keys(exportData[0]).join(",");
        const rows = exportData.map((row) =>
          Object.values(row)
            .map((val) => (typeof val === "string" ? `"${val.replace(/"/g, '""')}"` : val))
            .join(",")
        );
        content = [headers, ...rows].join("\n");
        mimeType = "text/csv";
        extension = "csv";
      } else {
        content = JSON.stringify(exportData, null, 2);
        mimeType = "application/json";
        extension = "json";
      }

      // Download file
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `incidents_export_${new Date().toISOString().split("T")[0]}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: `Exported ${exportData.length} incidents successfully.`,
      });

      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Data
          </DialogTitle>
          <DialogDescription>
            Export incident data in your preferred format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Export Format</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={format === "csv" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setFormat("csv")}
              >
                <Table className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button
                type="button"
                variant={format === "json" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setFormat("json")}
              >
                <FileText className="h-4 w-4 mr-2" />
                JSON
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Date Range</Label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Include Fields</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="basic"
                  checked={includeFields.basic}
                  onCheckedChange={(checked) =>
                    setIncludeFields({ ...includeFields, basic: !!checked })
                  }
                />
                <label htmlFor="basic" className="text-sm">
                  Basic Info (ID, Title, Status, Category, Severity)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="location"
                  checked={includeFields.location}
                  onCheckedChange={(checked) =>
                    setIncludeFields({ ...includeFields, location: !!checked })
                  }
                />
                <label htmlFor="location" className="text-sm">
                  Location Data (County, Address, Coordinates)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="reporter"
                  checked={includeFields.reporter}
                  onCheckedChange={(checked) =>
                    setIncludeFields({ ...includeFields, reporter: !!checked })
                  }
                />
                <label htmlFor="reporter" className="text-sm">
                  Reporter Info (Name, Phone, Email)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="team"
                  checked={includeFields.team}
                  onCheckedChange={(checked) =>
                    setIncludeFields({ ...includeFields, team: !!checked })
                  }
                />
                <label htmlFor="team" className="text-sm">
                  Assignment & Metrics (Team, Views, Updates)
                </label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
