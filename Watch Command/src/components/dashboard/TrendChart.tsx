import { Skeleton } from "@/components/ui/skeleton";
import { useIncidents } from "@/hooks/useIncidents";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

// Production-ready hourly trend aggregation
const generateStatTrend = (incidents: any[]) => {
  const data = [];
  const now = new Date();

  for (let i = 23; i >= 0; i--) {
    const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hourStr = hour.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    // Filter incidents from this specific hour slot within the last 24 hours
    const hourIncidents = incidents.filter(inc => {
      const created = new Date(inc.createdAt);
      // Check if the incident was created within the 1-hour window starting at 'hour'
      const diff = now.getTime() - created.getTime();
      const oneHour = 60 * 60 * 1000;
      const hoursAgo = i;

      // An incident belongs to this bucket if it was created between (i+1) hours ago and i hours ago
      return diff >= hoursAgo * oneHour && diff < (hoursAgo + 1) * oneHour;
    });

    const count = hourIncidents.length;
    const resolved = hourIncidents.filter(inc => inc.status === 'Resolved' || inc.status === 'Closed' || inc.status === 'Rejected').length;
    const critical = hourIncidents.filter(inc => inc.severity === 'critical' || inc.severity === 'high').length;

    data.push({
      time: hourStr,
      incidents: count,
      resolved,
      critical
    });
  }

  return data;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-xl">
        <p className="font-medium text-sm mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-xs" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function TrendChart({ isLoading = false }: { isLoading?: boolean }) {
  const { incidents } = useIncidents();
  const data = generateStatTrend(incidents);

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold">Incident Trends</h3>
          <p className="text-xs text-muted-foreground">Last 24 hours</p>
        </div>
        {!isLoading && (
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary" />
              New Incidents
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-severity-low" />
              Resolved
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-severity-critical" />
              Critical
            </span>
          </div>
        )}
      </div>

      <div className="h-[250px] w-full">
        {isLoading ? (
          <Skeleton className="w-full h-full rounded-lg" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              {/* ... (existing AreaChart content) */}
              <defs>
                <linearGradient id="colorIncidents" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCritical" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="time"
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                width={30}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="incidents"
                name="New Incidents"
                stroke="hsl(217, 91%, 60%)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorIncidents)"
              />
              <Area
                type="monotone"
                dataKey="resolved"
                name="Resolved"
                stroke="hsl(142, 71%, 45%)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorResolved)"
              />
              <Area
                type="monotone"
                dataKey="critical"
                name="Critical"
                stroke="hsl(0, 84%, 60%)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorCritical)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
