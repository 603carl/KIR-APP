import { GenerateReportDialog } from "@/components/dialogs/GenerateReportDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { downloadCSV, generateCSV } from "@/utils/ReportUtils";
import { formatDistanceToNow } from "date-fns";
import {
  BarChart3,
  Calendar,
  Clock,
  Download,
  FileText,
  Filter,
  MoreHorizontal,
  PieChart,
  Plus,
  Search,
  Table,
  Trash2
} from "lucide-react";
import { useEffect, useState } from "react";

interface GeneratedReport {
  id: string;
  name: string;
  description: string | null;
  report_type: string;
  format: string;
  parameters: any;
  created_at: string;
  created_by: string | null;
}

// Template and constants remain

const reportTemplates = [
  { id: 1, name: 'Daily Summary', icon: FileText, color: 'hsl(var(--chart-1))' },
  { id: 2, name: 'Weekly Digest', icon: Calendar, color: 'hsl(var(--chart-2))' },
  { id: 3, name: 'Performance Report', icon: BarChart3, color: 'hsl(var(--chart-3))' },
  { id: 4, name: 'Category Analysis', icon: PieChart, color: 'hsl(var(--chart-4))' },
  { id: 5, name: 'Data Export', icon: Table, color: 'hsl(var(--chart-5))' },
  { id: 6, name: 'Custom Report', icon: Filter, color: 'hsl(var(--primary))' },
];

export default function Reports() {
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const { toast } = useToast();

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("generated_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to fetch reports", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleQuickExport = async (type: string) => {
    toast({ title: "Exporting...", description: "Fetching data for export." });
    try {
      // Fetch incidents with foreign key joins for profile and team names
      let query = (supabase as any).from("incidents").select(`
        *,
        profiles:user_id (full_name, email),
        teams:assigned_team_id (name)
      `);

      if (type === "today") {
        const today = new Date().toISOString().split('T')[0];
        query = query.gte("created_at", today);
      } else if (type === "county") {
        query = query.not("location_name", "is", null);
      } else if (type === "team") {
        query = query.not("assigned_team_id", "is", null);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Flatten data for cleaner CSV
      const csvData = (data || []).map((inc: any) => ({
        ID: inc.id,
        Title: inc.title,
        Category: inc.category,
        Severity: inc.severity,
        Status: inc.status,
        Location: inc.location_name,
        Date: new Date(inc.created_at).toLocaleString(),
        Reporter: inc.profiles?.full_name || 'Anonymous',
        AssignedTeam: inc.teams?.name || 'Unassigned'
      }));

      const csv = generateCSV(csvData);
      downloadCSV(csv, `incident_export_${type}_${new Date().toISOString().split('T')[0]}.csv`);

      toast({ title: "Export Ready", description: "CSV file downloaded successfully." });
    } catch (error: any) {
      toast({ title: "Export Failed", description: error.message, variant: "destructive" });
    }
  };

  const filteredReports = reports.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || r.report_type === typeFilter;
    return matchesSearch && matchesType;
  });
  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Reports & Exports</h1>
          <p className="text-muted-foreground mt-1">
            Generate, schedule, and download reports
          </p>
        </div>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Create Report
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {reportTemplates.map((template) => (
          <Card
            key={template.id}
            className="cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all"
            onClick={() => setIsGenerateOpen(true)}
          >
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center mb-3"
                style={{ backgroundColor: `${template.color}20` }}
              >
                <template.icon className="h-6 w-6" style={{ color: template.color }} />
              </div>
              <p className="text-sm font-medium">{template.name}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Saved Reports */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle>Saved Reports</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search reports..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="summary">Summary</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                  <SelectItem value="analytics">Analytics</SelectItem>
                  <SelectItem value="log">Log</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/50">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading reports...</div>
            ) : filteredReports.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No saved reports found.</div>
            ) : filteredReports.map((report) => (
              <div key={report.id} className="p-4 flex items-center gap-4 hover:bg-muted/50">
                <div className={`p-2 rounded-lg ${report.format === 'pdf' ? 'bg-red-500/20' :
                  report.format === 'excel' || report.format === 'csv' ? 'bg-green-500/20' :
                    'bg-blue-500/20'
                  }`}>
                  <FileText className={`h-5 w-5 ${report.format === 'pdf' ? 'text-red-500' :
                    report.format === 'excel' || report.format === 'csv' ? 'text-green-500' :
                      'text-blue-500'
                    }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{report.name}</h3>
                    <Badge variant="outline" className="text-xs uppercase">
                      {report.format}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                    {report.description}
                  </p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                    </span>
                    <span>{report.parameters?.timeframe || 'custom'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      if (report.format === 'pdf') {
                        window.open(`/reports/print/${report.id}`, '_blank');
                      } else {
                        handleQuickExport(report.report_type);
                      }
                    }}
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={async () => {
                        if (confirm("Delete this report from history?")) {
                          await (supabase as any).from("generated_reports").delete().eq("id", report.id);
                          fetchReports();
                        }
                      }} className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Quick Export</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleQuickExport('all')}>
              <Download className="h-4 w-4" />
              Export All Incidents (CSV)
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleQuickExport('today')}>
              <Download className="h-4 w-4" />
              Export Today's Data
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleQuickExport('county')}>
              <Download className="h-4 w-4" />
              Export County Data
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleQuickExport('team')}>
              <Download className="h-4 w-4" />
              Export Team Performance
            </Button>
          </div>
        </CardContent>
      </Card>

      <GenerateReportDialog
        open={isGenerateOpen}
        onOpenChange={setIsGenerateOpen}
        onSuccess={fetchReports}
      />
    </DashboardLayout>
  );
}
