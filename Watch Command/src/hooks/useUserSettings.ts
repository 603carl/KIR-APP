import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface UserSettings {
    id: string;
    notification_prefs: {
        critical_alerts: boolean;
        daily_summary: boolean;
        team_assignments: boolean;
        system_maintenance: boolean;
        push_enabled: boolean;
        sound_alerts: boolean;
    };
    ui_prefs: {
        darkMode: boolean;
        compactMode: boolean;
        sidebarCollapsed: boolean;
        itemsPerPage: number;
        refreshInterval: number;
        autoLockTimeout: number;
    };
}

const DEFAULT_NOTIFICATION_PREFS = {
    critical_alerts: true,
    daily_summary: true,
    team_assignments: true,
    system_maintenance: false,
    push_enabled: true,
    sound_alerts: true,
};

const DEFAULT_UI_PREFS = {
    darkMode: true,
    compactMode: false,
    sidebarCollapsed: false,
    itemsPerPage: 50,
    refreshInterval: 5,
    autoLockTimeout: 10,
};

export function useUserSettings() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const { data: settings, isLoading, error } = useQuery({
        queryKey: ["user_settings"],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            // Check employees table first
            const { data: emplData, error: emplError } = await supabase
                .from("employees" as any)
                .select("id, notification_prefs, ui_prefs")
                .eq("id", user.id)
                .single();

            if (emplData) {
                const empl = emplData as any;
                return {
                    id: empl.id,
                    notification_prefs: { ...DEFAULT_NOTIFICATION_PREFS, ...(empl.notification_prefs || {}) },
                    ui_prefs: { ...DEFAULT_UI_PREFS, ...(empl.ui_prefs || {}) }
                } as UserSettings;
            }

            // Fallback to profiles
            const { data, error } = await supabase
                .from("profiles")
                .select("id, notification_prefs, ui_prefs")
                .eq("id", user.id)
                .single();

            if (error) throw error;

            const profile = data as any;
            return {
                id: profile.id,
                notification_prefs: { ...DEFAULT_NOTIFICATION_PREFS, ...(profile.notification_prefs || {}) },
                ui_prefs: { ...DEFAULT_UI_PREFS, ...(profile.ui_prefs || {}) }
            } as UserSettings;
        },
    });

    const updateMutation = useMutation({
        mutationFn: async (updates: Partial<Omit<UserSettings, 'id'>>) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            // Try updating employees first
            const { data: isEmpl } = await supabase.from("employees" as any).select("id").eq("id", user.id).single();

            if (isEmpl) {
                const { error } = await supabase
                    .from("employees" as any)
                    .update(updates)
                    .eq("id", user.id);
                if (error) throw error;
                return;
            }

            const { error } = await supabase
                .from("profiles")
                .update(updates)
                .eq("id", user.id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["user_settings"] });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to update user settings.",
                variant: "destructive",
            });
        },
    });

    const updateNotificationPrefs = (prefs: Partial<UserSettings['notification_prefs']>) => {
        if (!settings) return;
        updateMutation.mutate({
            notification_prefs: { ...settings.notification_prefs, ...prefs }
        });
    };

    const updateUIPrefs = (prefs: Partial<UserSettings['ui_prefs']>) => {
        if (!settings) return;
        updateMutation.mutate({
            ui_prefs: { ...settings.ui_prefs, ...prefs }
        });
    };

    return {
        settings,
        isLoading,
        error,
        updateNotificationPrefs,
        updateUIPrefs,
        isUpdating: updateMutation.isPending,
    };
}
