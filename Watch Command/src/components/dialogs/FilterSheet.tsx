import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Filter, X } from "lucide-react";
import { useState } from "react";

interface FilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyFilters?: (filters: FilterState) => void;
}

export interface FilterState {
  categories: string[];
  severities: string[];
  statuses: string[];
  counties: string[];
  dateRange: string;
}

const categories = [
  { value: "water", label: "Water" },
  { value: "roads", label: "Roads" },
  { value: "power", label: "Power" },
  { value: "health", label: "Health" },
  { value: "security", label: "Security" },
  { value: "corruption", label: "Corruption" },
  { value: "environment", label: "Environment" },
  { value: "other", label: "Other" },
];

const severities = [
  { value: "critical", label: "Critical", color: "bg-severity-critical" },
  { value: "high", label: "High", color: "bg-severity-high" },
  { value: "medium", label: "Medium", color: "bg-severity-medium" },
  { value: "low", label: "Low", color: "bg-severity-low" },
  { value: "info", label: "Info", color: "bg-severity-info" },
];

const statuses = [
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under Review" },
  { value: "verified", label: "Verified" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
  { value: "rejected", label: "Rejected" },
];

export function FilterSheet({ open, onOpenChange, onApplyFilters }: FilterSheetProps) {
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    severities: [],
    statuses: [],
    counties: [],
    dateRange: "all",
  });

  const toggleArrayFilter = (
    key: "categories" | "severities" | "statuses" | "counties",
    value: string
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter((v) => v !== value)
        : [...prev[key], value],
    }));
  };

  const clearFilters = () => {
    setFilters({
      categories: [],
      severities: [],
      statuses: [],
      counties: [],
      dateRange: "all",
    });
  };

  const activeFilterCount =
    filters.categories.length +
    filters.severities.length +
    filters.statuses.length +
    filters.counties.length +
    (filters.dateRange !== "all" ? 1 : 0);

  const handleApply = () => {
    onApplyFilters?.(filters);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:max-w-[400px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary">{activeFilterCount} active</Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            Filter incidents by category, severity, status, and more.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Date Range */}
          <div className="space-y-2">
            <Label>Date Range</Label>
            <Select
              value={filters.dateRange}
              onValueChange={(v) => setFilters({ ...filters, dateRange: v })}
            >
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

          {/* Categories */}
          <div className="space-y-3">
            <Label>Categories</Label>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((cat) => (
                <div key={cat.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`cat-${cat.value}`}
                    checked={filters.categories.includes(cat.value)}
                    onCheckedChange={() => toggleArrayFilter("categories", cat.value)}
                  />
                  <label htmlFor={`cat-${cat.value}`} className="text-sm cursor-pointer">
                    {cat.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Severities */}
          <div className="space-y-3">
            <Label>Severity</Label>
            <div className="flex flex-wrap gap-2">
              {severities.map((sev) => (
                <Badge
                  key={sev.value}
                  variant={filters.severities.includes(sev.value) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleArrayFilter("severities", sev.value)}
                >
                  <span className={`w-2 h-2 rounded-full mr-1.5 ${sev.color}`} />
                  {sev.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="space-y-3">
            <Label>Status</Label>
            <div className="grid grid-cols-2 gap-2">
              {statuses.map((status) => (
                <div key={status.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${status.value}`}
                    checked={filters.statuses.includes(status.value)}
                    onCheckedChange={() => toggleArrayFilter("statuses", status.value)}
                  />
                  <label htmlFor={`status-${status.value}`} className="text-sm cursor-pointer">
                    {status.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" className="flex-1" onClick={clearFilters}>
            <X className="h-4 w-4 mr-2" />
            Clear
          </Button>
          <Button className="flex-1" onClick={handleApply}>
            Apply Filters
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
