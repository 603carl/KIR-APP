import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Shield, UserMinus, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";

interface ManageMembersDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    teamId: string | null;
    teamName: string | null;
    onSuccess: () => void;
}

interface Responder {
    id: string;
    full_name: string | null;
    email: string | null;
    role: string | null;
    team_id: string | null;
}

export function ManageMembersDialog({ open, onOpenChange, teamId, teamName, onSuccess }: ManageMembersDialogProps) {
    const [loading, setLoading] = useState(false);
    const [responders, setResponders] = useState<Responder[]>([]);
    const { toast } = useToast();

    const fetchResponders = async () => {
        setLoading(true);
        try {
            const { data, error } = await (supabase as any)
                .from("profiles")
                .select("id, full_name, email, role, team_id")
                .in("role", ["responder", "operator"]);

            if (error) throw error;
            setResponders(data || []);
        } catch (error: any) {
            toast({
                title: "Error",
                description: "Failed to fetch responders",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) {
            fetchResponders();
        }
    }, [open]);

    const handleToggleMembership = async (responderId: string, currentTeamId: string | null) => {
        try {
            const newTeamId = currentTeamId === teamId ? null : teamId;
            const { error } = await supabase
                .from("profiles")
                .update({ team_id: newTeamId } as any)
                .eq("id", responderId);

            if (error) throw error;

            toast({
                title: newTeamId ? "Member Added" : "Member Removed",
                description: newTeamId ? "Responder added to team." : "Responder removed from team.",
            });

            fetchResponders();
            onSuccess();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Manage Members: {teamName}</DialogTitle>
                    <DialogDescription>
                        Assign or remove responders from this team.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="h-[350px] pr-4">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : responders.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            No staff members available.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {responders.map((responder) => (
                                <div
                                    key={responder.id}
                                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                                            <Shield className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">{responder.full_name || "Unknown"}</p>
                                            <p className="text-xs text-muted-foreground">{responder.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {responder.team_id && responder.team_id !== teamId && (
                                            <Badge variant="outline" className="text-[10px]">
                                                In other team
                                            </Badge>
                                        )}
                                        <Button
                                            size="sm"
                                            variant={responder.team_id === teamId ? "destructive" : "default"}
                                            onClick={() => handleToggleMembership(responder.id, responder.team_id)}
                                            className="h-8 gap-1.5"
                                        >
                                            {responder.team_id === teamId ? (
                                                <>
                                                    <UserMinus className="h-3.5 w-3.5" />
                                                    Remove
                                                </>
                                            ) : (
                                                <>
                                                    <UserPlus className="h-3.5 w-3.5" />
                                                    Add
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
