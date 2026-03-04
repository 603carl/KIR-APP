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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Incident } from "@/types/incident";
import { AlertTriangle, ArrowUpCircle, Loader2 } from "lucide-react";
import { useState } from "react";

interface EscalationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    incident: Incident | null;
    onSuccess?: () => void;
}

export function EscalationDialog({ open, onOpenChange, incident, onSuccess }: EscalationDialogProps) {
    const [loading, setLoading] = useState(false);
    const [reason, setReason] = useState("");
    const [newSeverity, setNewSeverity] = useState("high");
    const { toast } = useToast();

    const handleEscalate = async () => {
        if (!incident || !reason) return;

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("incidents")
                .update({
                    severity: newSeverity,
                    status: 'Under Review', // Re-trigger review
                    updated_at: new Date().toISOString()
                })
                .eq("id", incident.id)
                .select();

            if (error) throw error;
            if (!data || data.length === 0) throw new Error('Escalation failed. You may not have permission to modify this incident.');

            // Create an alert for this escalation
            await supabase.from("alerts").insert({
                rule_name: "Manual Escalation",
                message: `Incident ${incident.id} escalated to ${newSeverity}: ${reason}`,
                severity: newSeverity,
                acknowledged: false
            });

            // Audit records
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('staff_audit_logs').insert({
                    actor_id: user.id,
                    action: 'Escalated Incident',
                    target_resource: `incident:${incident.id}`,
                    details: { new_severity: newSeverity, reason }
                });
            }

            // Side effects (notification/timeline) now handled by database trigger

            toast({
                title: "Incident Escalated",
                description: `Incident severity has been updated to ${newSeverity}.`,
            });

            onSuccess?.();
            onOpenChange(false);
        } catch (error: any) {
            toast({
                title: "Escalation Failed",
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
                    <DialogTitle className="flex items-center gap-2 text-severity-critical">
                        <AlertTriangle className="h-5 w-5" />
                        Escalate Incident
                    </DialogTitle>
                    <DialogDescription>
                        Raise the priority level of incident <span className="font-mono font-medium text-foreground">{incident.id.slice(0, 8).toUpperCase()}</span>.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-3">
                        <Label>New Severity Level</Label>
                        <RadioGroup value={newSeverity} onValueChange={setNewSeverity} className="flex gap-4">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="high" id="r-high" />
                                <Label htmlFor="r-high" className="font-medium">High</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="critical" id="r-critical" />
                                <Label htmlFor="r-critical" className="font-medium text-severity-critical">Critical</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <div className="space-y-2">
                        <Label>Escalation Reason</Label>
                        <Textarea
                            placeholder="Why does this need immediate attention?"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={3}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleEscalate}
                        disabled={loading || !reason}
                        variant="destructive"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Escalating...
                            </>
                        ) : (
                            <>
                                <ArrowUpCircle className="mr-2 h-4 w-4" />
                                Confirm Escalation
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
