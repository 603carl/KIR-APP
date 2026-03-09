import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { CountyStats } from "@/types/incident";
import { ArrowUpDown, TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";

interface CountyTableProps {
  data: CountyStats[];
  isLoading?: boolean;
}
type SortKey = keyof CountyStats;

export function CountyTable({ data, isLoading = false }: CountyTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('totalReports');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const sortedData = [...data].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    }
    return sortDirection === 'asc'
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal));
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  const SortableHeader = ({ label, sortKeyName }: { label: string; sortKeyName: SortKey }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleSort(sortKeyName)}
      className={cn(
        "h-8 px-2 -ml-2 font-medium",
        sortKey === sortKeyName && "text-primary"
      )}
    >
      {label}
      <ArrowUpDown className="ml-1 h-3 w-3" />
    </Button>
  );

  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border/50">
        <h3 className="font-semibold">County Performance</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Top 15 counties by incident volume</p>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[150px]">
                <SortableHeader label="County" sortKeyName="county" />
              </TableHead>
              <TableHead className="text-right">
                <SortableHeader label="Total" sortKeyName="totalReports" />
              </TableHead>
              <TableHead className="text-right">
                <SortableHeader label="Active" sortKeyName="activeReports" />
              </TableHead>
              <TableHead className="text-right">
                <SortableHeader label="Resolved" sortKeyName="resolvedReports" />
              </TableHead>
              <TableHead className="text-right">
                <SortableHeader label="Avg Response" sortKeyName="avgResponseTime" />
              </TableHead>
              <TableHead className="text-right">
                <SortableHeader label="Resolution %" sortKeyName="resolutionRate" />
              </TableHead>
              <TableHead className="text-right w-[100px]">
                <SortableHeader label="Trend" sortKeyName="trend" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(10).fill(0).map((_, i) => (
                <TableRow key={i} className="border-border/30">
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : sortedData.map((county, index) => (
              <TableRow
                key={county.county}
                className="cursor-pointer hover:bg-accent/50"
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-4">
                      {index + 1}
                    </span>
                    {county.county}
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono">
                  {county.totalReports.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <span className={cn(
                    "font-mono px-2 py-0.5 rounded",
                    county.activeReports > 300
                      ? "bg-severity-high-bg text-severity-high"
                      : county.activeReports > 150
                        ? "bg-severity-medium-bg text-severity-medium"
                        : "text-muted-foreground"
                  )}>
                    {county.activeReports}
                  </span>
                </TableCell>
                <TableCell className="text-right font-mono text-muted-foreground">
                  {county.resolvedReports.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <span className={cn(
                    "font-mono",
                    county.avgResponseTime > 45
                      ? "text-severity-critical"
                      : county.avgResponseTime > 30
                        ? "text-severity-medium"
                        : "text-severity-low"
                  )}>
                    {county.avgResponseTime}m
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          county.resolutionRate > 85
                            ? "bg-severity-low"
                            : county.resolutionRate > 70
                              ? "bg-severity-medium"
                              : "bg-severity-critical"
                        )}
                        style={{ width: `${county.resolutionRate}%` }}
                      />
                    </div>
                    <span className="font-mono text-xs w-8">{county.resolutionRate}%</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <span className={cn(
                    "inline-flex items-center gap-0.5 text-xs font-medium",
                    county.trend > 0 ? "text-severity-low" : "text-severity-critical"
                  )}>
                    {county.trend > 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {Math.abs(county.trend)}%
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
