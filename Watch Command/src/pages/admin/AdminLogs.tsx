import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
    Clock,
    Filter,
    Search,
    User
} from "lucide-react";
import { useEffect, useState } from "react";

interface LogEntry {
    id: string;
    created_at: string;
    action: string;
    target_resource: string;
    details: any;
    employees: {
        full_name: string | null;
        email: string | null;
    } | null;
}

export default function AdminLogs() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const { toast } = useToast();

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("staff_audit_logs")
                .select(`
          id,
          created_at,
          action,
          target_resource,
          details,
          employees:actor_id (
            full_name,
            email
          )
        `)
                .order("created_at", { ascending: false })
                .limit(100);

            if (error) throw error;
            setLogs(data as unknown as LogEntry[]);
        } catch (error: any) {
            toast({
                title: "Error",
                description: "Failed to fetch audit logs",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const filteredLogs = logs.filter((log) =>
        (log.action?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
        (log.employees?.full_name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
        (log.target_resource?.toLowerCase() || "").includes(searchQuery.toLowerCase())
    );

    const getActionColor = (action: string) => {
        if (action.includes('create')) return 'bg-green-100 text-green-800';
        if (action.includes('delete')) return 'bg-red-100 text-red-800';
        if (action.includes('update')) return 'bg-blue-100 text-blue-800';
        return 'bg-gray-100 text-gray-800';
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Audit Logs</h1>
                    <p className="text-muted-foreground mt-1">
                        Monitor all staff actions and system events.
                    </p>
                </div>
            </div>

            <Card className="mb-6">
                <CardContent className="p-4">
                    <div className="flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search logs by action, user, or resource..."
                                className="pl-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Badge variant="outline" className="flex items-center gap-1 cursor-pointer hover:bg-gray-100 px-3">
                            <Filter className="h-3 w-3" />
                            Filter
                        </Badge>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[180px]">Timestamp</TableHead>
                                <TableHead>Staff Member</TableHead>
                                <TableHead>Action</TableHead>
                                <TableHead>Resource</TableHead>
                                <TableHead>Details</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredLogs.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell className="font-mono text-xs text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-3 w-3" />
                                            {format(new Date(log.created_at), "MMM d, HH:mm:ss")}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <User className="h-3 w-3 text-muted-foreground" />
                                            <span className="font-medium text-sm">{log.employees?.full_name || 'System'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className={`border-0 ${getActionColor(log.action)}`}>
                                            {log.action}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">
                                        {log.target_resource}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                                        {JSON.stringify(log.details)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
