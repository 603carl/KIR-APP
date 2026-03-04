import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import {
    Activity,
    AlertCircle,
    CheckCircle2,
    Clock,
    ShieldCheck,
    Users,
    Users2
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        totalUsers: 0,
        operators: 0,
        responders: 0,
        admins: 0,
        totalLogs: 0,
        recentLogs: [] as any[],
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchAdminStats() {
            setLoading(true);
            try {
                // Fetch User Counts
                const { data: employees } = await supabase
                    .from("employees" as any)
                    .select("role");

                const counts = (employees || []).reduce((acc: any, curr: any) => {
                    const role = curr.role || 'unknown';
                    acc[role] = (acc[role] || 0) + 1;
                    acc.total = (acc.total || 0) + 1;
                    return acc;
                }, { total: 0, operator: 0, responder: 0, admin: 0 });

                // Fetch Recent Logs
                const { data: logs } = await supabase
                    .from("staff_audit_logs")
                    .select(`
            id,
            created_at,
            action,
            target_resource,
            employees:actor_id (
              full_name
            )
          `)
                    .order("created_at", { ascending: false })
                    .limit(5);

                // Fetch Total Logs Count
                const { count: logsCount } = await supabase
                    .from("staff_audit_logs")
                    .select("*", { count: 'exact', head: true });

                setStats({
                    totalUsers: counts.total,
                    operators: counts.operator,
                    responders: counts.responder,
                    admins: counts.admin,
                    totalLogs: logsCount || 0,
                    recentLogs: logs || [],
                });
            } catch (error) {
                console.error("Error fetching admin stats:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchAdminStats();
    }, []);

    const statCards = [
        { title: "Total Staff", value: stats.totalUsers, icon: Users, color: "text-blue-600" },
        { title: "Operators", value: stats.operators, icon: Activity, color: "text-green-600" },
        { title: "Responders", value: stats.responders, icon: ShieldCheck, color: "text-orange-600" },
        { title: "Admins", value: stats.admins, icon: AlertCircle, color: "text-red-600" },
    ];

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Admin Control Center</h1>
                    <p className="text-muted-foreground">System-wide overview and staff management.</p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
                {statCards.map((stat, i) => (
                    <Card key={i}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                            <stat.icon className={`h-4 w-4 ${stat.color}`} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stat.value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="col-span-1">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Recent Audit Logs</CardTitle>
                        <Link to="/admin/logs" className="text-sm text-primary hover:underline">View all</Link>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {stats.recentLogs.map((log) => (
                                <div key={log.id} className="flex items-center gap-4 text-sm">
                                    <div className="bg-muted p-2 rounded-full">
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <p className="font-medium leading-none">
                                            {log.employees?.full_name || "System"} {log.action.replace('_', ' ')}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {stats.recentLogs.length === 0 && (
                                <p className="text-center text-muted-foreground py-4">No recent activity</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Quick Access</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <Link to="/admin/users">
                            <div className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted transition-colors">
                                <Users2 className="h-5 w-5 text-primary" />
                                <div>
                                    <p className="font-medium">Staff Management</p>
                                    <p className="text-xs text-muted-foreground">Add, remove or manage staff accounts</p>
                                </div>
                            </div>
                        </Link>
                        <Link to="/admin/logs">
                            <div className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted transition-colors">
                                <CheckCircle2 className="h-5 w-5 text-primary" />
                                <div>
                                    <p className="font-medium">System Compliance</p>
                                    <p className="text-xs text-muted-foreground">Review system logs and audit trails</p>
                                </div>
                            </div>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
