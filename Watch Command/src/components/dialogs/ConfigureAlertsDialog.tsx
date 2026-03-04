import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bell, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ConfigureAlertsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConfigureAlertsDialog({ open, onOpenChange }: ConfigureAlertsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [condition, setCondition] = useState("severity_critical");
  const [channels, setChannels] = useState({
    email: true,
    sms: false,
    push: true,
  });
  const { toast } = useToast();

  const conditionOptions = [
    { value: "severity_critical", label: "Severity = Critical" },
    { value: "severity_high", label: "Severity = High" },
    { value: "category_security", label: "Category = Security" },
    { value: "category_health", label: "Category = Health" },
    { value: "unassigned_15min", label: "Unassigned for 15 minutes" },
    { value: "county_spike", label: "County incident spike (50%+)" },
  ];

  const resetForm = () => {
    setName("");
    setDescription("");
    setCondition("severity_critical");
    setChannels({ email: true, sms: false, push: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a rule name.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const selectedChannels = Object.entries(channels)
        .filter(([_, enabled]) => enabled)
        .map(([channel]) => channel);

      const conditionLabel = conditionOptions.find((c) => c.value === condition)?.label || condition;

      const { error } = await supabase.from("alert_rules").insert({
        name: name.trim(),
        description: description.trim() || null,
        condition: conditionLabel,
        channels: selectedChannels,
        enabled: true,
      });

      if (error) throw error;

      toast({
        title: "Alert Rule Created",
        description: `Alert rule "${name}" has been created successfully.`,
      });

      resetForm();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create alert rule.",
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
            <Bell className="h-5 w-5" />
            Configure Alert Rule
          </DialogTitle>
          <DialogDescription>
            Create a new alert rule to receive notifications.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Rule Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Critical Incident Alert"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="What does this alert do?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Trigger Condition *</Label>
            <Select value={condition} onValueChange={setCondition} disabled={loading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {conditionOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Notification Channels</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="email"
                  checked={channels.email}
                  onCheckedChange={(checked) =>
                    setChannels({ ...channels, email: !!checked })
                  }
                />
                <label htmlFor="email" className="text-sm">
                  Email
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sms"
                  checked={channels.sms}
                  onCheckedChange={(checked) =>
                    setChannels({ ...channels, sms: !!checked })
                  }
                />
                <label htmlFor="sms" className="text-sm">
                  SMS
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="push"
                  checked={channels.push}
                  onCheckedChange={(checked) =>
                    setChannels({ ...channels, push: !!checked })
                  }
                />
                <label htmlFor="push" className="text-sm">
                  Push Notification
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Rule"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
