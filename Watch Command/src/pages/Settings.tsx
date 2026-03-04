import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { useUserSettings } from "@/hooks/useUserSettings";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import {
  Bell,
  Loader2,
  Palette
} from "lucide-react";

export default function SettingsPage() {
  const {
    settings: systemSettings,
    isLoading: loadingSystem,
    updateSettings: saveSystemSettings,
    isUpdating: savingSystem
  } = useSystemSettings();

  const {
    settings: userSettings,
    isLoading: loadingUser,
    updateNotificationPrefs,
    updateUIPrefs,
    isUpdating: savingUser
  } = useUserSettings();

  const isLoading = loadingSystem || loadingUser;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Account Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your personal preferences and notification settings.
        </p>
      </div>

      <Tabs defaultValue="notifications" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="notifications" className="gap-1.5">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-1.5">
            <Palette className="h-4 w-4" />
            Appearance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>Configure email notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Critical Incident Alerts</Label>
                  <p className="text-sm text-muted-foreground">Receive emails for critical severity incidents</p>
                </div>
                <Switch
                  checked={userSettings?.notification_prefs.critical_alerts}
                  onCheckedChange={(v) => updateNotificationPrefs({ critical_alerts: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Daily Summary Reports</Label>
                  <p className="text-sm text-muted-foreground">Receive daily incident summary via email</p>
                </div>
                <Switch
                  checked={userSettings?.notification_prefs.daily_summary}
                  onCheckedChange={(v) => updateNotificationPrefs({ daily_summary: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Team Assignment Notifications</Label>
                  <p className="text-sm text-muted-foreground">Notify when incidents are assigned to your team</p>
                </div>
                <Switch
                  checked={userSettings?.notification_prefs.team_assignments}
                  onCheckedChange={(v) => updateNotificationPrefs({ team_assignments: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>System Maintenance Alerts</Label>
                  <p className="text-sm text-muted-foreground">Receive alerts about scheduled maintenance</p>
                </div>
                <Switch
                  checked={userSettings?.notification_prefs.system_maintenance}
                  onCheckedChange={(v) => updateNotificationPrefs({ system_maintenance: v })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Push Notifications</CardTitle>
              <CardDescription>Configure browser push notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive real-time browser notifications</p>
                </div>
                <Switch
                  checked={userSettings?.notification_prefs.push_enabled}
                  onCheckedChange={(v) => updateNotificationPrefs({ push_enabled: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Sound Alerts</Label>
                  <p className="text-sm text-muted-foreground">Play sound for critical notifications</p>
                </div>
                <Switch
                  checked={userSettings?.notification_prefs.sound_alerts}
                  onCheckedChange={(v) => updateNotificationPrefs({ sound_alerts: v })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Theme Settings</CardTitle>
              <CardDescription>Customize the dashboard appearance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">Use dark theme for the dashboard</p>
                </div>
                <Switch
                  checked={userSettings?.ui_prefs.darkMode}
                  onCheckedChange={(v) => updateUIPrefs({ darkMode: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Compact Mode</Label>
                  <p className="text-sm text-muted-foreground">Reduce spacing for more content</p>
                </div>
                <Switch
                  checked={userSettings?.ui_prefs.compactMode}
                  onCheckedChange={(v) => updateUIPrefs({ compactMode: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Sidebar Collapsed by Default</Label>
                  <p className="text-sm text-muted-foreground">Start with minimized sidebar</p>
                </div>
                <Switch
                  checked={userSettings?.ui_prefs.sidebarCollapsed}
                  onCheckedChange={(v) => updateUIPrefs({ sidebarCollapsed: v })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Display</CardTitle>
              <CardDescription>Configure how data is displayed</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Items per Page</Label>
                  <p className="text-sm text-muted-foreground">Default pagination size</p>
                </div>
                <Select
                  value={userSettings?.ui_prefs?.itemsPerPage?.toString() || "50"}
                  onValueChange={(v) => updateUIPrefs({ itemsPerPage: parseInt(v) })}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-refresh Interval</Label>
                  <p className="text-sm text-muted-foreground">Dashboard data refresh rate</p>
                </div>
                <Select
                  value={userSettings?.ui_prefs?.refreshInterval?.toString() || "5"}
                  onValueChange={(v) => updateUIPrefs({ refreshInterval: parseInt(v) })}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 seconds</SelectItem>
                    <SelectItem value="10">10 seconds</SelectItem>
                    <SelectItem value="30">30 seconds</SelectItem>
                    <SelectItem value="60">1 minute</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-lock Timeout</Label>
                  <p className="text-sm text-muted-foreground">System lock inactivity period</p>
                </div>
                <Select
                  value={userSettings?.ui_prefs?.autoLockTimeout?.toString() || "10"}
                  onValueChange={(v) => updateUIPrefs({ autoLockTimeout: parseInt(v) })}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 minute</SelectItem>
                    <SelectItem value="5">5 minutes</SelectItem>
                    <SelectItem value="10">10 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
