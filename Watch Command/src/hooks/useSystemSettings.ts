import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface SystemSettings {
    id: string;
    system_name: string;
    organization_name: string;
    admin_email: string;
    support_phone: string;
    system_description: string;
    timezone: string;
    date_format: string;
    language: string;
    currency: string;
    two_factor_required: boolean;
    session_timeout: number;
    password_expiry_days: number;
    api_rate_limit: number;
    integrations_config: any;
}

export function useSystemSettings() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const { data: settings, isLoading, error } = useQuery({
        queryKey: ["system_settings"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("system_settings" as any)
                .select("*")
                .eq("id", "global")
                .single();

            if (error) throw error;
            return (data as unknown) as SystemSettings;
        },
    });

    const updateMutation = useMutation({
        mutationFn: async (newSettings: Partial<SystemSettings>) => {
            const { error } = await supabase
                .from("system_settings" as any)
                .update(newSettings)
                .eq("id", "global");

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["system_settings"] });
            toast({
                title: "Settings Saved",
                description: "System configuration has been updated successfully.",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to update settings.",
                variant: "destructive",
            });
        },
    });

    return {
        settings,
        isLoading,
        error,
        updateSettings: updateMutation.mutate,
        isUpdating: updateMutation.isPending,
    };
}
