import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CategoryBreakdown } from "@/types/incident";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CategoryIcon, getCategoryLabel } from "./CategoryIcon";

interface CategoryChartProps {
  data: CategoryBreakdown[];
  isLoading?: boolean;
}

const COLORS = [
  'hsl(199, 89%, 48%)',  // water
  'hsl(25, 95%, 53%)',   // roads
  'hsl(45, 93%, 47%)',   // power
  'hsl(0, 84%, 60%)',    // health
  'hsl(262, 83%, 58%)',  // security
  'hsl(142, 71%, 45%)',  // environment
  'hsl(339, 90%, 51%)',  // corruption
  'hsl(215, 20%, 55%)',  // other
];

export function CategoryChart({ data, isLoading = false }: CategoryChartProps) {
  const chartData = data.map(item => ({
    name: getCategoryLabel(item.category),
    value: item.count,
    category: item.category,
    percentage: item.percentage,
    trend: item.trend
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-xl">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {data.value.toLocaleString()} incidents ({data.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4">
      <h3 className="font-semibold mb-4">Incidents by Category</h3>

      <div className="flex items-center gap-4">
        {/* Pie Chart */}
        <div className="w-[180px] h-[180px]">
          {isLoading ? (
            <Skeleton className="w-full h-full rounded-full" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      className="hover:opacity-80 transition-opacity cursor-pointer"
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2">
          {isLoading ? (
            Array(6).fill(0).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))
          ) : (
            data.slice(0, 6).map((item, index) => (
              <div
                key={item.category}
                className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: COLORS[index] }}
                  />
                  <CategoryIcon category={item.category} size="sm" />
                  <span className="text-sm">{getCategoryLabel(item.category)}</span>
                </div>
                <span className="font-mono text-sm">{item.percentage}%</span>
                {item.trend !== 0 && (
                  <span className={cn(
                    "flex items-center text-xs",
                    item.trend > 0 ? "text-severity-low" : "text-severity-critical"
                  )}>
                    {item.trend > 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
