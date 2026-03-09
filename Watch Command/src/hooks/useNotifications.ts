import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef, useState } from "react";
import { useUserSettings } from "./useUserSettings";

export interface Notification {
    id: string;
    title: string;
    body: string;
    type: string;
    is_read: boolean;
    created_at: string;
}

export function useNotifications() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const { settings: userSettings } = useUserSettings();
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        audioRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3");
        audioRef.current.volume = 0.5;
    }, []);

    const fetchNotifications = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from("notifications")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
                .limit(10);

            if (error) throw error;

            if (data) {
                setNotifications(data);
                setUnreadCount(data.filter((n) => !n.is_read).length);
            }
        } catch (error) {
            console.error("Error fetching notifications:", error);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id: string) => {
        try {
            const { error } = await supabase
                .from("notifications")
                .update({ is_read: true })
                .eq("id", id);

            if (error) throw error;

            // Optimistic update
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch (error) {
            console.error("Error marking notification as read:", error);
        }
    };

    const markAllAsRead = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from("notifications")
                .update({ is_read: true })
                .eq("user_id", user.id)
                .eq("is_read", false);

            if (error) throw error;

            setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error("Error marking all as read:", error);
        }
    };

    useEffect(() => {
        const setupNotifications = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Request notification permissions if enabled in settings
            if (userSettings?.notification_prefs.push_enabled && Notification.permission === "default") {
                await Notification.requestPermission();
            }

            await fetchNotifications();

            // Subscribe to new notifications for THIS user only
            const channel = supabase
                .channel("notifications-changes")
                .on(
                    "postgres_changes",
                    {
                        event: "INSERT",
                        schema: "public",
                        table: "notifications",
                        filter: `user_id=eq.${user.id}`,
                    },
                    (payload) => {
                        const newNotification = payload.new as Notification;
                        setNotifications((prev) => [newNotification, ...prev]);
                        setUnreadCount((prev) => prev + 1);

                        // Play sound if enabled
                        if (userSettings?.notification_prefs.sound_alerts !== false && audioRef.current) {
                            audioRef.current.play().catch(() => { });
                        }

                        // Show browser notification if enabled
                        if (userSettings?.notification_prefs.push_enabled &&
                            Notification.permission === "granted" &&
                            document.visibilityState !== "visible") {
                            new Notification(newNotification.title, {
                                body: newNotification.body,
                                icon: "/favicon.ico"
                            });
                        }
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        };

        setupNotifications();
    }, []);

    return {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        refetch: fetchNotifications,
    };
}
