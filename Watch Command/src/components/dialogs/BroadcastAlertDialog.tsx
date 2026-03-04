import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Loader2, Megaphone } from "lucide-react";
import { useState } from "react";

interface BroadcastAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BroadcastAlertDialog({ open, onOpenChange }: BroadcastAlertDialogProps) {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState<"extreme" | "severe" | "amber">("severe");
  const { toast } = useToast();

  const resetForm = () => {
    setTitle("");
    setMessage("");
    setSeverity("severe");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !message.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("broadcasts").insert({
        title,
        message,
        severity: severity,
      });

      if (error) throw error;

      toast({
        title: "Alert Broadcast",
        description: "Your alert has been sent to all active agents.",
      });

      resetForm();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to broadcast alert.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Broadcast Alert
          </DialogTitle>
          <DialogDescription>
            Send an immediate alert to all active response team members.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-severity-medium/10 border border-severity-medium/20 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-severity-medium flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              This will send an immediate notification to all agents. Use for urgent communications only.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Alert Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Emergency Response Required"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label>Severity Level</Label>
            <Select value={severity} onValueChange={(v: any) => setSeverity(v)} disabled={loading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="extreme">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                    Extreme (Life-Threatening)
                  </span>
                </SelectItem>
                <SelectItem value="severe">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                    Severe (Immediate Action)
                  </span>
                </SelectItem>
                <SelectItem value="amber">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    Amber (Get Prepared)
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              placeholder="Enter the alert message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={loading}
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} variant="destructive">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Broadcasting...
                </>
              ) : (
                <>
                  <Megaphone className="mr-2 h-4 w-4" />
                  Broadcast Alert
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
