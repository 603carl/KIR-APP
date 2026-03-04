import { Button } from "@/components/ui/button";
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
import { downloadCSV, generateCSV } from "@/utils/ReportUtils";
import { Download, FileText, Loader2 } from "lucide-react";
import { useState } from "react";

interface GenerateReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialType?: string;
}

export function GenerateReportDialog({ open, onOpenChange, onSuccess, initialType = "summary" }: GenerateReportDialogProps) {
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState(initialType);
  const [format, setFormat] = useState("pdf");
  const [timeframe, setTimeframe] = useState("7d");
  const { toast } = useToast();

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Fetch data based on parameters
      let query = supabase.from("incidents").select("*");

      if (timeframe === "24h") {
        const date = new Date(Date.now() - 86400000).toISOString();
        query = query.gte("created_at", date);
      } else if (timeframe === "7d") {
        const date = new Date(Date.now() - 7 * 86400000).toISOString();
        query = query.gte("created_at", date);
      } else if (timeframe === "30d") {
        const date = new Date(Date.now() - 30 * 86400000).toISOString();
        query = query.gte("created_at", date);
      }

      const { data: incidents, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      const reportName = `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report - ${new Date().toLocaleDateString()}`;

      // Calculate some quick metrics for the new printable report
      const resolvedCount = incidents?.filter(i => ['Resolved', 'Closed', 'Rejected', 'resolved', 'closed', 'rejected'].includes(i.status)).length || 0;
      const totalCount = incidents?.length || 0;

      const reportParameters = {
        timeframe,
        generatedFor: {
          employee_id: user?.user_metadata?.employee_id || 'UNKNOWN',
          full_name: user?.user_metadata?.full_name || user?.email || 'Operator',
          role: user?.user_metadata?.role || 'Responder'
        },
        metrics: {
          total: totalCount,
          resolved: resolvedCount,
          resolutionRate: totalCount > 0 ? ((resolvedCount / totalCount) * 100).toFixed(1) : 0
        },
        // We trim incidents down slightly so we don't blow up the JSON payload, just keeping necessary fields for the printable table
        incidents: (incidents || []).map((inc: any) => ({
          id: inc.id,
          title: inc.title,
          category: inc.category,
          severity: inc.severity,
          status: inc.status,
          date: new Date(inc.created_at).toLocaleString()
        }))
      };

      // 2. Handle Generation for CSV directly
      if (format === "csv") {
        const csvContent = generateCSV(incidents || []);
        downloadCSV(csvContent, `${reportName.replace(/\s+/g, '_')}.csv`);
      }

      // 3. Save metadata to generated_reports
      const { data: insertedReport, error: saveError } = await (supabase as any).from("generated_reports").insert({
        name: reportName,
        description: `Generated ${reportType} report for the last ${timeframe}`,
        report_type: reportType,
        format: format,
        parameters: reportParameters,
        created_by: user?.id
      }).select().single();

      if (saveError) throw saveError;

      toast({
        title: "Report Generated",
        description: format === "pdf" ? "Report added to your saved history. Click Download to print." : "CSV downloaded successfully.",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message,
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
            <FileText className="h-5 w-5" />
            Generate New Report
          </DialogTitle>
          <DialogDescription>
            Configure the parameters for your incident report.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Report Type</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="summary">Daily Summary</SelectItem>
                <SelectItem value="performance">Performance Analysis</SelectItem>
                <SelectItem value="audit">System Audit Log</SelectItem>
                <SelectItem value="incident_log">Incident Master Log</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Timeframe</Label>
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Output Format</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF (Print-Ready)</SelectItem>
                <SelectItem value="csv">Excel / CSV</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Generate
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
