import { BroadcastAlertDialog } from "@/components/dialogs/BroadcastAlertDialog";
import { ConfigureAlertsDialog } from "@/components/dialogs/ConfigureAlertsDialog";
import { ExportDataDialog } from "@/components/dialogs/ExportDataDialog";
import { FilterSheet } from "@/components/dialogs/FilterSheet";
import { GenerateReportDialog } from "@/components/dialogs/GenerateReportDialog";
import { NewIncidentDialog } from "@/components/dialogs/NewIncidentDialog";
import { Button } from "@/components/ui/button";
import {
  Bell,
  Download,
  FileBarChart,
  Filter,
  Megaphone,
  Plus
} from "lucide-react";
import { useState } from "react";

import { FilterState } from "@/components/dialogs/FilterSheet";

interface QuickActionsProps {
  onApplyFilters?: (filters: FilterState) => void;
}

export function QuickActions({ onApplyFilters }: QuickActionsProps) {
  const [exportOpen, setExportOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [newIncidentOpen, setNewIncidentOpen] = useState(false);

  return (
    <>
      <div className="rounded-xl border border-border/50 bg-card p-4">
        <h3 className="font-semibold mb-4">Quick Actions</h3>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="h-auto flex-col gap-2 py-4 hover:bg-primary/10 hover:border-primary/50"
            onClick={() => setExportOpen(true)}
          >
            <Download className="h-5 w-5" />
            <span className="text-xs">Export Data</span>
          </Button>

          <Button
            variant="outline"
            className="h-auto flex-col gap-2 py-4 hover:bg-severity-medium/10 hover:border-severity-medium/50"
            onClick={() => setAlertsOpen(true)}
          >
            <Bell className="h-5 w-5" />
            <span className="text-xs">Configure Alerts</span>
          </Button>

          <Button
            variant="outline"
            className="h-auto flex-col gap-2 py-4 hover:bg-severity-info/10 hover:border-severity-info/50"
            onClick={() => setReportOpen(true)}
          >
            <FileBarChart className="h-5 w-5" />
            <span className="text-xs">Generate Report</span>
          </Button>

          <Button
            variant="outline"
            className="h-auto flex-col gap-2 py-4 hover:bg-severity-high/10 hover:border-severity-high/50"
            onClick={() => setBroadcastOpen(true)}
          >
            <Megaphone className="h-5 w-5" />
            <span className="text-xs">Broadcast Alert</span>
          </Button>
        </div>

        <div className="mt-4 pt-4 border-t border-border/50 flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="flex-1 gap-1.5"
            onClick={() => setFilterOpen(true)}
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
          </Button>
          <Button
            variant="default"
            size="sm"
            className="flex-1 gap-1.5"
            onClick={() => setNewIncidentOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            New Incident
          </Button>
        </div>
      </div>

      {/* Dialogs */}
      <ExportDataDialog open={exportOpen} onOpenChange={setExportOpen} />
      <ConfigureAlertsDialog open={alertsOpen} onOpenChange={setAlertsOpen} />
      <GenerateReportDialog open={reportOpen} onOpenChange={setReportOpen} />
      <BroadcastAlertDialog open={broadcastOpen} onOpenChange={setBroadcastOpen} />
      <FilterSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        onApplyFilters={onApplyFilters}
      />
      <NewIncidentDialog open={newIncidentOpen} onOpenChange={setNewIncidentOpen} />
    </>
  );
}
