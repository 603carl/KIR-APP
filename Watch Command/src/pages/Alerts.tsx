import { ConfigureAlertsDialog } from "@/components/dialogs/ConfigureAlertsDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  Clock,
  Edit,
  Info,
  Loader2,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Settings,
  Smartphone,
  Trash2
} from "lucide-react";
import { useEffect, useState } from "react";

interface AlertRule {
  id: string;
  name: string;
  description: string | null;
  condition: string;
  channels: string[];
  enabled: boolean;
  triggered_count: number;
  last_triggered_at: string | null;
  created_at: string;
}

interface Alert {
  id: string;
  rule_name: string;
  message: string;
  severity: string;
  acknowledged: boolean;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  created_at: string;
  user_id: string | null;
  profiles?: {
    full_name: string | null;
    email: string | null;
    bio: string | null;
    avatar_url: string | null;
    blood_group: string | null;
    medical_conditions: string | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
  } | null;
}

export default function Alerts() {
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: alertsData, error: alertsError } = await supabase
        .from("alerts")
        .select("*, profiles(full_name, email, bio, avatar_url, blood_group, medical_conditions, emergency_contact_name, emergency_contact_phone)")
        .order("created_at", { ascending: false })
        .limit(50);

      const rulesResult = await supabase.from("alert_rules").select("*").order("created_at", { ascending: false });

      if (rulesResult.error) throw rulesResult.error;
      if (alertsError) throw alertsError;

      setAlertRules((rulesResult.data as any) || []);
      setAlerts((alertsData as any) || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch alerts data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Subscribe to real-time alerts
    const channel = supabase
      .channel('system_alerts_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'alerts'
        },
        async (payload) => {
          console.log('Alert change:', payload);
          if (payload.eventType === 'INSERT') {
            // Fetch fresh data for the new alert to get profile join
            const { data } = await supabase
              .from('alerts')
              .select("*, profiles(full_name, email, bio, avatar_url, blood_group, medical_conditions, emergency_contact_name, emergency_contact_phone)")
              .eq('id', payload.new.id)
              .single();

            if (data) {
              setAlerts((prev) => [data as Alert, ...prev]);
              toast({
                title: "NEW MISSION SIGNAL",
                description: data.message,
                variant: "destructive",
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            setAlerts((prev) =>
              prev.map(a => a.id === (payload.new as Alert).id ? { ...a, ...payload.new } : a)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const toggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from("alert_rules")
        .update({ enabled })
        .eq("id", ruleId);

      if (error) throw error;

      setAlertRules((prev) =>
        prev.map((r) => (r.id === ruleId ? { ...r, enabled } : r))
      );

      toast({
        title: enabled ? "Rule Enabled" : "Rule Disabled",
        description: `Alert rule has been ${enabled ? "enabled" : "disabled"}.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update rule",
        variant: "destructive",
      });
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from("alerts")
        .update({
          acknowledged: true,
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: "Current User",
        })
        .eq("id", alertId);

      if (error) throw error;

      setAlerts((prev) =>
        prev.map((a) =>
          a.id === alertId
            ? { ...a, acknowledged: true, acknowledged_at: new Date().toISOString() }
            : a
        )
      );

      toast({
        title: "Alert Acknowledged",
        description: "The alert has been marked as acknowledged.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to acknowledge alert",
        variant: "destructive",
      });
    }
  };

  const unacknowledgedCount = alerts.filter((a) => !a.acknowledged).length;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pt-4">
        <div />
        <Button size="sm" className="gap-1.5" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Create Alert Rule
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Rules</p>
                <p className="text-2xl font-bold font-mono">
                  {alertRules.filter((r) => r.enabled).length}
                </p>
              </div>
              <Bell className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Alerts</p>
                <p className="text-2xl font-bold font-mono text-severity-critical">
                  {unacknowledgedCount}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-severity-critical opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Alerts</p>
                <p className="text-2xl font-bold font-mono">{alerts.length}</p>
              </div>
              <Clock className="h-8 w-8 text-severity-medium opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Acknowledged</p>
                <p className="text-2xl font-bold font-mono text-severity-low">
                  {alerts.length > 0
                    ? Math.round((alerts.filter((a) => a.acknowledged).length / alerts.length) * 100)
                    : 0}
                  %
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-severity-low opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rules" className="gap-1.5">
            <Settings className="h-4 w-4" />
            Alert Rules
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <Clock className="h-4 w-4" />
            Alert History
            {unacknowledgedCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 justify-center">
                {unacknowledgedCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          {alertRules.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No alert rules configured</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setCreateDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Rule
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
              {alertRules.map((rule, i) => (
                <div
                  key={rule.id}
                  className={`p-4 flex items-center gap-4 ${i !== alertRules.length - 1 ? "border-b border-border/50" : ""
                    }`}
                >
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={(checked) => toggleRule(rule.id, checked)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{rule.name}</h3>
                      <Badge variant="outline" className="text-xs">
                        {rule.triggered_count} triggers
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {rule.description}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <code className="text-xs bg-muted px-2 py-0.5 rounded">
                        {rule.condition}
                      </code>
                      <div className="flex items-center gap-1">
                        {rule.channels?.includes("email") && (
                          <Mail className="h-3 w-3 text-muted-foreground" />
                        )}
                        {rule.channels?.includes("sms") && (
                          <MessageSquare className="h-3 w-3 text-muted-foreground" />
                        )}
                        {rule.channels?.includes("push") && (
                          <Smartphone className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>Last triggered</p>
                    <p>
                      {rule.last_triggered_at
                        ? formatDistanceToNow(new Date(rule.last_triggered_at), {
                          addSuffix: true,
                        })
                        : "Never"}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Rule
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Recent Alerts</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {alerts.length === 0 ? (
                <div className="py-12 text-center">
                  <Bell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No alerts yet</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="divide-y divide-border/50">
                    {alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={`p-4 flex flex-col gap-3 transition-colors ${!alert.acknowledged ? "bg-primary/5 border-l-4 border-l-red-500" : "bg-card"
                          } ${selectedAlertId === alert.id ? "ring-2 ring-primary ring-inset" : ""}`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`mt-0.5 p-1.5 rounded-full ${alert.severity === "critical"
                              ? "bg-severity-critical/20"
                              : alert.severity === "high"
                                ? "bg-severity-high/20"
                                : "bg-severity-medium/20"
                              }`}
                          >
                            {alert.severity === "critical" ? (
                              <AlertTriangle className="h-4 w-4 text-severity-critical" />
                            ) : alert.severity === "high" ? (
                              <AlertTriangle className="h-4 w-4 text-severity-high" />
                            ) : (
                              <Info className="h-4 w-4 text-severity-medium" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold tracking-tight">{alert.rule_name}</p>
                              {!alert.acknowledged && (
                                <Badge variant="destructive" className="text-[10px] h-4 font-black">
                                  UNCHARTED
                                </Badge>
                              )}
                              {alert.profiles && (
                                <Badge variant="outline" className="text-[10px] h-4 border-primary/30 text-primary flex gap-1 items-center bg-primary/5">
                                  <Smartphone className="h-2.5 w-2.5" />
                                  PROFILE DETECTED
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-foreground/80 mt-1 font-medium leading-relaxed">
                              {alert.message}
                            </p>
                            <div className="flex items-center gap-3 mt-2">
                              <p className="text-[10px] text-muted-foreground uppercase font-mono">
                                {formatDistanceToNow(new Date(alert.created_at), {
                                  addSuffix: true,
                                })}
                              </p>
                              {alert.profiles && (
                                <button
                                  onClick={() => setSelectedAlertId(selectedAlertId === alert.id ? null : alert.id)}
                                  className="text-[10px] font-bold text-primary hover:underline underline-offset-2 flex items-center gap-1"
                                >
                                  {selectedAlertId === alert.id ? "HIDE INTEL" : "VIEW REPORTER INTEL"}
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            {!alert.acknowledged && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-[10px] font-bold border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white"
                                onClick={() => acknowledgeAlert(alert.id)}
                              >
                                ACKNOWLEDGE
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Expandable Reporter Intel Card */}
                        {selectedAlertId === alert.id && alert.profiles && (
                          <div className="mt-2 p-3 rounded-lg bg-black/40 border border-primary/20 animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-center gap-3 mb-3 pb-2 border-b border-white/10">
                              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/40 text-primary">
                                {alert.profiles.full_name?.charAt(0) || 'U'}
                              </div>
                              <div>
                                <h4 className="text-sm font-black text-white">{alert.profiles.full_name || 'Anonymous User'}</h4>
                                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Mail className="h-2.5 w-2.5" />
                                  {alert.profiles.email || 'No email registered'}
                                </p>
                              </div>
                              <Badge className="ml-auto bg-green-500/20 text-green-400 border-green-500/30 text-[9px]">VERIFIED REPORTER</Badge>
                            </div>

                            {/* Emergency Intel Grid */}
                            <div className="grid grid-cols-2 gap-2 mb-3">
                              <div className="p-2 rounded bg-white/5 border border-white/5">
                                <p className="text-[8px] uppercase text-primary font-bold tracking-widest">Blood Group</p>
                                <p className="text-xs font-black text-white">{alert.profiles.blood_group || 'UNKNOWN'}</p>
                              </div>
                              <div className="p-2 rounded bg-white/5 border border-white/5">
                                <p className="text-[8px] uppercase text-primary font-bold tracking-widest">Medical Notes</p>
                                <p className="text-[10px] font-medium text-white line-clamp-1">{alert.profiles.medical_conditions || 'NONE'}</p>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest italic flex items-center gap-1">
                                <Info className="h-3 w-3" />
                                Operational Profile / Bio
                              </p>
                              <div className="bg-white/5 p-2 rounded border border-white/5 italic text-[11px] text-foreground/90 leading-relaxed">
                                "{alert.profiles.bio || "No tactical biography provided for this reporter."}"
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <ConfigureAlertsDialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) fetchData();
        }}
      />
    </DashboardLayout >
  );
}
