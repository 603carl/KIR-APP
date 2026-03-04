import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Incident } from "@/types/incident";
import { Loader2, Shield, Users } from "lucide-react";
import { useEffect, useState } from "react";

interface AssignTeamDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    incident: Incident | null;
    onSuccess?: () => void;
}

interface Team {
    id: string;
    name: string;
    type: string;
    status: string | null;
}

export function AssignTeamDialog({ open, onOpenChange, incident, onSuccess }: AssignTeamDialogProps) {
    const [loading, setLoading] = useState(false);
    const [teams, setTeams] = useState<Team[]>([]);
    const [selectedTeam, setSelectedTeam] = useState("");
    const { toast } = useToast();

    useEffect(() => {
        if (open) {
            fetchTeams();
        }
    }, [open]);

    const fetchTeams = async () => {
        try {
            const { data, error } = await supabase
                .from("teams")
                .select("*")
                .eq("status", "active");

            if (error) throw error;
            setTeams(data || []);
        } catch (error) {
            console.error("Error fetching teams:", error);
        }
    };

    const handleAssign = async () => {
        if (!incident || !selectedTeam) return;

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("incidents")
                .update({
                    assigned_team_id: selectedTeam,
                    status: 'Assigned',
                    updated_at: new Date().toISOString()
                })
                .eq("id", incident.id)
                .select();

            if (error) throw error;
            if (!data || data.length === 0) throw new Error('Assignment failed. You may not have permission to modify this incident.');

            // Side effects (notification/timeline) now handled by database trigger

            // 4. Log System Alert for Audit Trail
            const team = teams.find(t => t.id === selectedTeam);
            await supabase.from("alerts").insert({
                rule_name: "Team Assignment",
                message: `Team ${team?.name || selectedTeam} assigned to incident ${incident.id}`,
                severity: "info",
                acknowledged: false
            });

            // Audit records
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('staff_audit_logs').insert({
                    actor_id: user.id,
                    action: 'Assigned Team',
                    target_resource: `incident:${incident.id}`,
                    details: { team_id: selectedTeam, team_name: team?.name }
                });
            }



            toast({
                title: "Team Assigned",
                description: `Team has been successfully assigned to incident ${incident.id}.`,
            });

            onSuccess?.();
            onOpenChange(false);
        } catch (error: any) {
            toast({
                title: "Assignment Failed",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    if (!incident) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Assign Response Team
                    </DialogTitle>
                    <DialogDescription>
                        Deploy a specialized team to handle incident <span className="font-mono font-medium text-foreground">{incident.id}</span>.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label>Select Team</Label>
                        <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                            <SelectTrigger>
                                <SelectValue placeholder="Choose a team..." />
                            </SelectTrigger>
                            <SelectContent>
                                {teams.map((team) => (
                                    <SelectItem key={team.id} value={team.id}>
                                        <span className="flex items-center gap-2">
                                            <Shield className="h-3 w-3 text-muted-foreground" />
                                            {team.name}
                                            <span className="text-xs text-muted-foreground ml-auto">({team.type})</span>
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="rounded-md border p-3 bg-muted/50 text-sm text-muted-foreground">
                        <p>
                            Assigning a team will automatically update the incident status to <span className="font-medium text-primary">Assigned</span> and notify team members.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleAssign} disabled={loading || !selectedTeam}>
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Assigning...
                            </>
                        ) : (
                            "Confirm Assignment"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
