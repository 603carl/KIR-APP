import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useIncidents } from "@/hooks/useIncidents";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Bell,
  ChevronLeft,
  ChevronRight,
  FileText,
  Folder,
  HelpCircle,
  LayoutDashboard,
  Map,
  Settings,
  Shield,
  Users,
  Zap
} from "lucide-react";
import { NavLink as RouterNavLink, useNavigate } from "react-router-dom";

interface SidebarProps {
  className?: string;
  isCollapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

export function Sidebar({ className, isCollapsed, onCollapsedChange }: SidebarProps) {
  const { stats, isLoading } = useIncidents();
  const { signOut, user, role } = useAuth();
  const navigate = useNavigate();

  const isAdmin = role === "admin";

  const mainNavItems = [
    { icon: LayoutDashboard, label: "Overview", href: "/" },
    { icon: FileText, label: "Incidents", href: "/incidents", badge: isLoading ? "..." : stats.total >= 1000 ? `${(stats.total / 1000).toFixed(1)}K` : stats.total.toString() },
    { icon: Map, label: "Live Map", href: "/map" },
    { icon: BarChart3, label: "Analytics", href: "/analytics" },
    { icon: Users, label: "Teams", href: "/teams" },
  ];

  const managementNavItems = [
    { icon: Bell, label: "Alerts", href: "/alerts", badge: isLoading ? "..." : stats.critical.toString() },
    { icon: Folder, label: "Reports", href: "/reports" },
  ];

  const adminNavItems = [
    { icon: LayoutDashboard, label: "Admin Panel", href: "/admin" },
    { icon: Shield, label: "Staff Management", href: "/admin/users" },
    { icon: FileText, label: "Audit Logs", href: "/admin/logs" },
    { icon: Settings, label: "System Config", href: "/admin/settings" },
  ];

  const systemNavItems = [
    { icon: Settings, label: "Settings", href: "/settings" },
    { icon: HelpCircle, label: "Help", href: "/help" },
  ];

  const NavItem = ({
    icon: Icon,
    label,
    href,
    badge
  }: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    href: string;
    badge?: string;
  }) => (
    <RouterNavLink
      to={href}
      className={({ isActive }) => cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all hover:bg-sidebar-accent",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:text-sidebar-foreground",
        isCollapsed && "justify-center px-2"
      )}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      {!isCollapsed && (
        <>
          <span className="flex-1">{label}</span>
          {badge && (
            <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-mono text-primary">
              {badge}
            </span>
          )}
        </>
      )}
    </RouterNavLink>
  );

  return (
    <aside className={cn(
      "flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
      isCollapsed ? "w-16" : "w-64",
      className
    )}>
      {/* Collapse Toggle */}
      <div className="flex justify-end p-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onCollapsedChange(!isCollapsed)}
          className="h-7 w-7 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1 px-3">
        {/* Staff/Responder Navigation (Non-Admins) */}
        {role !== "admin" && (
          <>
            {!isCollapsed && (
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                Operations
              </p>
            )}
            {mainNavItems.map((item) => (
              <NavItem key={item.href} {...item} />
            ))}

            <Separator className="my-4 bg-sidebar-border" />

            {!isCollapsed && (
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                Internal
              </p>
            )}
            {managementNavItems.map((item) => (
              <NavItem key={item.href} {...item} />
            ))}
          </>
        )}

        {/* Administration Section (Admin Only) */}
        {role === "admin" && (
          <>
            {!isCollapsed && (
              <p className="mb-2 px-3 font-bold text-xs uppercase tracking-[0.2em] text-primary/60 mb-6 px-3">
                Command Center
              </p>
            )}
            <div className="space-y-2">
              {adminNavItems.map((item) => (
                <NavItem key={item.href} {...item} />
              ))}
            </div>
          </>
        )}

        <Separator className="my-4 bg-sidebar-border" />

        {!isCollapsed && (
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
            System
          </p>
        )}
        {systemNavItems.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </nav>

      {/* Sign Out Footer */}
      <div className="border-t border-sidebar-border p-2">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-500",
            isCollapsed && "justify-center px-2"
          )}
          onClick={async () => {
            await signOut();
            navigate("/auth");
          }}
        >
          <Zap className="h-5 w-5 flex-shrink-0 rotate-180" />
          {!isCollapsed && <span>Sign Out</span>}
        </Button>
      </div>
    </aside>
  );
}
