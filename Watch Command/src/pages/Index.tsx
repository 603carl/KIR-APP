import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { CategoryChart } from "@/components/dashboard/CategoryChart";
import { CountyTable } from "@/components/dashboard/CountyTable";
import { CriticalIncidentsPanel } from "@/components/dashboard/CriticalIncidentsPanel";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentActions } from "@/components/dashboard/RecentActions";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { SystemHealthPanel } from "@/components/dashboard/SystemHealthPanel";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { useIncidents } from "@/hooks/useIncidents";
import { useSystemHealth } from "@/hooks/useSystemHealth";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Gauge
} from "lucide-react";

import { FilterState } from "@/components/dialogs/FilterSheet";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useState } from "react";

export default function Index() {
  const { settings: userSettings } = useUserSettings();
  const [filters, setFilters] = useState<FilterState | undefined>(undefined);
  const { incidents, stats, categoryBreakdown, countyStats, activities, isLoading } = useIncidents(filters, {
    refreshInterval: userSettings?.ui_prefs.refreshInterval,
    limit: userSettings?.ui_prefs.itemsPerPage
  });
  const health = useSystemHealth();

  // Filter active critical/high incidents for the panel
  const criticalIncidents = isLoading ? [] : incidents.filter(i =>
    (i.severity === 'critical' || i.severity === 'high') &&
    !['Resolved', 'Closed', 'Rejected', 'resolved', 'closed', 'rejected'].includes(i.status)
  ).slice(0, 10);

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="mb-6" />

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <StatsCard
          title="Total Reports"
          value={stats.total}
          trend={stats.trend.total}
          icon={<FileText className="h-5 w-5" />}
          variant="info"
          sparklineData={stats.sparklines.total}
          isLoading={isLoading}
        />
        <StatsCard
          title="Active Reports"
          value={stats.active}
          trend={stats.trend.active}
          icon={<Activity className="h-5 w-5" />}
          variant="warning"
          sparklineData={stats.sparklines.active}
          isLoading={isLoading}
        />
        <StatsCard
          title="Resolved Today"
          value={stats.resolvedToday}
          trend={stats.trend.resolved}
          icon={<CheckCircle className="h-5 w-5" />}
          variant="success"
          sparklineData={stats.sparklines.resolved}
          isLoading={isLoading}
        />
        <StatsCard
          title="Critical Alerts"
          value={stats.critical}
          trend={stats.trend.critical}
          icon={<AlertTriangle className="h-5 w-5" />}
          variant="critical"
          sparklineData={stats.sparklines.critical}
          isLoading={isLoading}
        />
        <StatsCard
          title="Avg Response"
          value={stats.avgResponseTime}
          suffix="min"
          icon={<Clock className="h-5 w-5" />}
          variant="default"
          sparklineData={stats.sparklines.response}
          isLoading={isLoading}
        />
        <StatsCard
          title="Resolution Rate"
          value={stats.resolutionRate}
          suffix="%"
          trend={stats.trend.resolved}
          icon={<Gauge className="h-5 w-5" />}
          variant="success"
          sparklineData={stats.sparklines.resolutionRate}
          isLoading={isLoading}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Trend Chart */}
          <TrendChart isLoading={isLoading} />

          {/* Critical Incidents */}
          <CriticalIncidentsPanel incidents={criticalIncidents} isLoading={isLoading} />

          {/* County Performance Table */}
          <CountyTable data={countyStats.slice(0, 15)} isLoading={isLoading} />
        </div>

        {/* Right Column - 1/3 width */}
        <div className="space-y-6">
          {/* System Health */}
          <SystemHealthPanel health={health} />

          {/* Category Breakdown */}
          <CategoryChart data={categoryBreakdown} isLoading={isLoading} />

          {/* Quick Actions */}
          <QuickActions />

          {/* Activity Feed */}
          <ActivityFeed activities={activities} maxHeight="400px" isLoading={isLoading} />

          {/* Recent Admin Actions */}
          <RecentActions activities={activities} isLoading={isLoading} />
        </div>
      </div>
    </DashboardLayout>
  );
}
