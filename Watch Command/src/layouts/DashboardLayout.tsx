import { Header } from "@/components/dashboard/Header";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { SOSEmergencyOverlay } from "@/components/dashboard/SOSEmergencyOverlay";
import { useAutoLock } from "@/hooks/useAutoLock";
import { useUserSettings } from "@/hooks/useUserSettings";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { settings, updateUIPrefs } = useUserSettings();
  const { setTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useAutoLock(settings?.ui_prefs.autoLockTimeout || 10);

  // Sync sidebar state
  const isSidebarCollapsed = settings?.ui_prefs.sidebarCollapsed ?? false;
  const toggleSidebar = (collapsed: boolean) => {
    updateUIPrefs({ sidebarCollapsed: collapsed });
  };

  // Sync theme
  useEffect(() => {
    if (settings) {
      setTheme(settings.ui_prefs.darkMode ? "dark" : "light");
    }
  }, [settings?.ui_prefs.darkMode, setTheme]);

  return (
    <div className={cn("min-h-screen bg-background", settings?.ui_prefs.compactMode && "compact-mode")}>
      {/* Scanning Laser HUD */}
      <div className="scanning-laser animate-scan" />

      {/* SOS Emergency Overlay */}
      <SOSEmergencyOverlay />

      <div className="relative flex min-h-screen">
        {/* Desktop Sidebar */}
        <Sidebar
          className="hidden lg:flex fixed left-0 top-0 h-screen z-40"
          isCollapsed={isSidebarCollapsed}
          onCollapsedChange={toggleSidebar}
        />

        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <Sidebar
              className="h-screen w-64"
              isCollapsed={false}
              onCollapsedChange={() => { }}
            />
          </div>
        )}

        {/* Main Content Area */}
        <div className={cn("flex-1 transition-all duration-300", isSidebarCollapsed ? "lg:pl-16" : "lg:pl-64")}>
          <Header onMenuClick={() => setIsMobileMenuOpen(true)} />

          <main className="p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
