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
import { Loader2, Shield, Users } from "lucide-react";
import { useEffect, useState } from "react";

interface SOSAlert {
    id: string;
    user_id: string;
    lat: number;
    lng: number;
    location_name: string | null;
}

interface DispatchTeamSOSDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sos: SOSAlert | null;
    onSuccess?: () => void;
}

interface Team {
    id: string;
    name: string;
    type: string;
    status: string | null;
}

export function DispatchTeamSOSDialog({ open, onOpenChange, sos, onSuccess }: DispatchTeamSOSDialogProps) {
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

    const handleDispatch = async () => {
        if (!sos || !selectedTeam) return;

        setLoading(true);
        try {
            // 1. Update SOS Alert status
            const { error: sosError } = await supabase
                .from("sos_alerts")
                .update({
                    status: 'acknowledged',
                    acknowledged_by: 'Watch Command - Dispatched',
                    acknowledged_at: new Date().toISOString()
                })
                .eq("id", sos.id);

            if (sosError) throw sosError;

            const team = teams.find(t => t.id === selectedTeam);

            // 2. Notify the SOS User
            await supabase.from("notifications").insert({
                title: "EMERGENCY DISPATCH",
                body: `${team?.name || 'A specialized team'} has been dispatched to your location. Help is arriving.`,
                type: "warning",
                user_id: sos.user_id
            });

            // 3. Log System Alert
            await supabase.from("alerts").insert({
                rule_name: "SOS Dispatch",
                message: `Team ${team?.name} dispatched to SOS signal at ${sos.location_name || 'unknown location'}`,
                severity: "critical",
                acknowledged: true
            });

            toast({
                title: "Team Dispatched",
                description: `Emergency response team ${team?.name} is en route.`,
            });

            onSuccess?.();
            onOpenChange(false);
        } catch (error: any) {
            toast({
                title: "Dispatch Failed",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    if (!sos) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] border-red-500 bg-slate-950 text-white">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-500 font-black tracking-tighter text-2xl">
                        <Users className="h-6 w-6" />
                        EMERGENCY DISPATCH
                    </DialogTitle>
                    <DialogDescription className="text-red-200/70 font-medium">
                        Select a specialized team to respond to the SOS signal at <span className="text-white underline underline-offset-4">{sos.location_name || 'Current Location'}</span>.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label className="text-red-100 font-bold uppercase text-[10px] tracking-widest">Select Elite Team</Label>
                        <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                            <SelectTrigger className="bg-red-950/20 border-red-500/30 text-white">
                                <SelectValue placeholder="CHOOSE RESPONSE TEAM..." />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-red-500/30 text-white">
                                {teams.map((team) => (
                                    <SelectItem key={team.id} value={team.id} className="focus:bg-red-500/10 focus:text-white">
                                        <span className="flex items-center gap-2">
                                            <Shield className="h-3 w-3 text-red-400" />
                                            {team.name}
                                            <span className="text-[10px] bg-red-500/20 px-1 rounded ml-auto">{team.type}</span>
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="rounded border border-red-500/20 p-3 bg-red-500/5 text-xs text-red-100/60 leading-relaxed italic">
                        <p>
                            Immediate dispatch will notify the user that help is arriving. This action is logged as a critical operational deployment.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading} className="border-white/10 text-white hover:bg-slate-900">
                        ABORT
                    </Button>
                    <Button onClick={handleDispatch} disabled={loading || !selectedTeam} className="bg-red-600 hover:bg-red-500 text-white font-black shadow-[0_0_20px_rgba(220,38,38,0.3)]">
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                DISPATCHING...
                            </>
                        ) : (
                            "CONFIRM DISPATCH"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
