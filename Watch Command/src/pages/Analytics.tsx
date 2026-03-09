import { getCategoryLabel } from "@/components/dashboard/CategoryIcon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIncidents } from "@/hooks/useIncidents";
import { useUserSettings } from "@/hooks/useUserSettings";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import {
  Activity,
  BarChart3,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  LineChart,
  PieChart,
  TrendingDown,
  TrendingUp,
  Users
} from "lucide-react";
import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  Pie,
  LineChart as RechartsLine,
  PieChart as RechartsPie,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

// COLORS and local constants
const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--category-environment))',
  'hsl(var(--category-corruption))',
  'hsl(var(--category-other))',
];

export default function Analytics() {
  const { settings: userSettings } = useUserSettings();
  const [timeRange, setTimeRange] = useState("30d");
  const { incidents, stats, categoryBreakdown, countyStats, monthlyData, responseTimeData, isLoading } = useIncidents({
    dateRange: timeRange === '7d' ? 'week' : timeRange === '30d' ? 'month' : timeRange === '90d' ? '90d' : timeRange === '1y' ? 'year' : 'all',
    categories: [],
    severities: [],
    statuses: [],
    counties: []
  }, {
    refreshInterval: userSettings?.ui_prefs.refreshInterval
  });

  const handleExport = (format: 'pdf' | 'xml') => {
    if (format === 'xml') {
      const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>\n<IncidentsReport>\n';
      const xmlBody = incidents.map(inc => `  <Incident>
    <ID>${inc.id}</ID>
    <Title>${inc.title}</Title>
    <Category>${inc.category}</Category>
    <Severity>${inc.severity}</Severity>
    <Status>${inc.status}</Status>
    <CreatedAt>${inc.createdAt}</CreatedAt>
  </Incident>`).join('\n');
      const xmlFooter = '\n</IncidentsReport>';
      const blob = new Blob([xmlHeader + xmlBody + xmlFooter], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `incident_report_${new Date().toISOString().split('T')[0]}.xml`;
      a.click();
    } else {
      // PDF Fallback: Professional Print Layout
      window.print();
    }
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Analytics & Reports</h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive incident data analysis and trends
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleExport('pdf')}>
            <Download className="h-4 w-4" />
            PDF Report
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleExport('xml')}>
            <Download className="h-4 w-4" />
            XML Data
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Incidents</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-24 mt-1" />
                ) : (
                  <p className="text-2xl font-bold font-mono">{stats.total.toLocaleString()}</p>
                )}
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                <Activity className="h-5 w-5" />
              </div>
            </div>
            {isLoading ? (
              <Skeleton className="h-4 w-32 mt-2" />
            ) : (
              <div className={`flex items-center gap-1 mt-2 ${stats.trend.total >= 0 ? 'text-severity-low' : 'text-severity-critical'}`}>
                {stats.trend.total >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span className="text-xs">{stats.trend.total >= 0 ? '+' : ''}{stats.trend.total}%</span>
                <span className="text-xs text-muted-foreground">vs last month</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resolution Rate</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-24 mt-1" />
                ) : (
                  <p className="text-2xl font-bold font-mono">{stats.resolutionRate}%</p>
                )}
              </div>
              <div className="h-10 w-10 rounded-full bg-severity-low/20 flex items-center justify-center text-severity-low">
                <CheckCircle className="h-5 w-5" />
              </div>
            </div>
            {isLoading ? (
              <Skeleton className="h-4 w-32 mt-2" />
            ) : (
              <div className={`flex items-center gap-1 mt-2 text-severity-low`}>
                <TrendingUp className="h-3 w-3" />
                <span className="text-xs">+{stats.trend.resolved}%</span>
                <span className="text-xs text-muted-foreground">resolution efficiency</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Response Time</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-24 mt-1" />
                ) : (
                  <p className="text-2xl font-bold font-mono">{stats.avgResponseTime} min</p>
                )}
              </div>
              <div className="h-10 w-10 rounded-full bg-severity-medium/20 flex items-center justify-center text-severity-medium">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            {isLoading ? (
              <Skeleton className="h-4 w-32 mt-2" />
            ) : (
              <div className={`flex items-center gap-1 mt-2 text-severity-low`}>
                <Clock className="h-3 w-3" />
                <span className="text-xs">Optimized for scale</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Users</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-24 mt-1" />
                ) : (
                  <p className="text-2xl font-bold font-mono">{stats.users.toLocaleString()}</p>
                )}
              </div>
              <div className="h-10 w-10 rounded-full bg-chart-4/20 flex items-center justify-center text-chart-4">
                <Users className="h-5 w-5" />
              </div>
            </div>
            {isLoading ? (
              <Skeleton className="h-4 w-32 mt-2" />
            ) : (
              <div className={`flex items-center gap-1 mt-2 ${stats.trend.users >= 0 ? 'text-severity-low' : 'text-severity-critical'}`}>
                {stats.trend.users >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span className="text-xs">{stats.trend.users >= 0 ? '+' : ''}{stats.trend.users}%</span>
                <span className="text-xs text-muted-foreground">active engagement</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends" className="gap-1.5">
            <LineChart className="h-4 w-4" />
            Trends
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-1.5">
            <PieChart className="h-4 w-4" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="performance" className="gap-1.5">
            <BarChart3 className="h-4 w-4" />
            Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Monthly Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Monthly Incident Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {isLoading ? (
                    <Skeleton className="w-full h-full rounded-lg" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyData}>
                        <defs>
                          <linearGradient id="colorIncidents" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--severity-low))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--severity-low))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="incidents"
                          stroke="hsl(var(--chart-1))"
                          fillOpacity={1}
                          fill="url(#colorIncidents)"
                          name="Total Incidents"
                        />
                        <Area
                          type="monotone"
                          dataKey="resolved"
                          stroke="hsl(var(--severity-low))"
                          fillOpacity={1}
                          fill="url(#colorResolved)"
                          name="Resolved"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Response Time */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Average Response Time by Hour</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {isLoading ? (
                    <Skeleton className="w-full h-full rounded-lg" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLine data={responseTimeData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} unit=" min" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="time"
                          stroke="hsl(var(--chart-2))"
                          strokeWidth={2}
                          dot={{ fill: 'hsl(var(--chart-2))' }}
                          name="Response Time"
                        />
                      </RechartsLine>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Incidents by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {isLoading ? (
                    <Skeleton className="w-full h-full rounded-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={categoryBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="count"
                          nameKey="category"
                          label={({ category, percentage }) => `${getCategoryLabel(category)} ${percentage.toFixed(0)}%`}
                          labelLine={false}
                        >
                          {categoryBreakdown.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                          formatter={(value: number, name: string) => [value.toLocaleString(), getCategoryLabel(name as any)]}
                        />
                      </RechartsPie>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Category Breakdown Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Category Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {isLoading ? (
                    Array(8).fill(0).map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-2">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-3 w-3 rounded-full" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                        <div className="flex items-center gap-4">
                          <Skeleton className="h-4 w-12" />
                          <Skeleton className="h-6 w-16 rounded-full" />
                        </div>
                      </div>
                    ))
                  ) : categoryBreakdown.map((cat, i) => (
                    <div key={cat.category} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[i % COLORS.length] }}
                        />
                        <span className="text-sm font-medium">{getCategoryLabel(cat.category)}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-mono">{cat.count.toLocaleString()}</span>
                        <Badge
                          variant="outline"
                          className={cat.trend > 0 ? 'text-severity-low' : 'text-severity-high'}
                        >
                          {cat.trend > 0 ? '+' : ''}{cat.trend}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">County Performance Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                {isLoading ? (
                  <Skeleton className="w-full h-full rounded-lg" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={countyStats.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis dataKey="county" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={80} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      <Bar dataKey="activeReports" fill="hsl(var(--chart-1))" name="Active" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="resolvedReports" fill="hsl(var(--severity-low))" name="Resolved" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
