import { COLORS, SHADOWS, SPACING } from '@/constants/Theme';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
    CheckCircle2,
    ChevronRight,
    Info,
    ShieldAlert
} from 'lucide-react-native';
import { MotiView } from 'moti';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Notification {
    id: string;
    title: string;
    body: string;
    type: string;
    is_read: boolean;
    created_at: string;
    payload?: any;
}

export default function AlertsScreen() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchNotifications();

        const subscription = supabase
            .channel('public:notifications')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
                fetchNotifications();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

    const fetchNotifications = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setNotifications(data || []);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const markReadAt = async (id: string) => {
        try {
            await supabase.from('notifications').update({ is_read: true }).eq('id', id);
            setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch (e) {
            console.error('Mark read error:', e);
        }
    };

    const deleteNotification = async (id: string) => {
        try {
            await supabase.from('notifications').delete().eq('id', id);
            setNotifications(notifications.filter(n => n.id !== id));
        } catch (e) {
            console.error('Delete error:', e);
        }
    };

    const handleNotificationPress = (alert: Notification) => {
        markReadAt(alert.id);
        if (alert.payload?.incident_id) {
            router.push(`/incident/${alert.payload.incident_id}`);
        }
    };

    const markAllRead = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', user.id);

            if (error) throw error;
            setNotifications(notifications.map(n => ({ ...n, is_read: true })));
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'Emergency': return ShieldAlert;
            case 'Update': return CheckCircle2;
            default: return Info;
        }
    };

    const getColor = (type: string) => {
        switch (type) {
            case 'Emergency': return COLORS.error;
            case 'Update': return COLORS.primary;
            default: return COLORS.info;
        }
    };

    const getTimeAgo = (dateString: string) => {
        const now = new Date();
        const past = new Date(dateString);
        const diffInMs = now.getTime() - past.getTime();
        const diffInMins = Math.floor(diffInMs / (1000 * 60));
        const diffInHours = Math.floor(diffInMins / 60);

        if (diffInMins < 60) return `${diffInMins}m ago`;
        if (diffInHours < 24) return `${diffInHours}h ago`;
        return past.toLocaleDateString();
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }
    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <SafeAreaView style={styles.safe} edges={['top']}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>Notifications</Text>
                        <Text style={styles.subtitle}>Stay informed on national safety</Text>
                    </View>
                    <TouchableOpacity style={styles.markReadBtn} onPress={markAllRead}>
                        <Text style={styles.markReadText}>Mark all as read</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
                    {notifications.length === 0 ? (
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 }}>
                            <Info size={48} color={COLORS.textMuted} />
                            <Text style={{ marginTop: 16, color: COLORS.textMuted, fontSize: 16, fontWeight: '600' }}>No notifications yet</Text>
                        </View>
                    ) : (
                        notifications.map((alert, index) => {
                            const Icon = getIcon(alert.type);
                            const color = getColor(alert.type);
                            return (
                                <TouchableOpacity
                                    key={alert.id}
                                    activeOpacity={0.8}
                                    onPress={() => handleNotificationPress(alert)}
                                >
                                    <MotiView
                                        from={{ opacity: 0, translateX: -20 }}
                                        animate={{ opacity: 1, translateX: 0 }}
                                        transition={{ delay: index * 100 }}
                                        style={[styles.alertCard, !alert.is_read && styles.unreadCard]}
                                    >
                                        <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
                                            <Icon size={24} color={color} />
                                        </View>

                                        <View style={styles.alertContent}>
                                            <View style={styles.alertHeader}>
                                                <Text style={[styles.alertType, { color }]}>{alert.type}</Text>
                                                <Text style={styles.alertTime}>{getTimeAgo(alert.created_at)}</Text>
                                            </View>
                                            <Text style={styles.alertTitle}>{alert.title}</Text>
                                            <Text style={styles.alertMessage} numberOfLines={2}>{alert.body}</Text>

                                            {!alert.is_read && <View style={styles.unreadDot} />}
                                        </View>

                                        <TouchableOpacity
                                            style={styles.optionsBtn}
                                            onPress={(e) => {
                                                e.stopPropagation();
                                                deleteNotification(alert.id);
                                            }}
                                        >
                                            <ChevronRight size={18} color={COLORS.textMuted} />
                                        </TouchableOpacity>
                                    </MotiView>
                                </TouchableOpacity>
                            );
                        })
                    )}

                    <View style={{ height: 100 }} />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.white },
    safe: { flex: 1 },
    header: { paddingHorizontal: SPACING.lg, paddingVertical: 24, backgroundColor: COLORS.white },
    title: { fontSize: 32, fontWeight: '900', color: COLORS.black },
    subtitle: { fontSize: 14, color: COLORS.textMuted, fontWeight: '600', marginTop: 4 },
    markReadBtn: { marginTop: 16, alignSelf: 'flex-start' },
    markReadText: { fontSize: 14, color: COLORS.primary, fontWeight: '800' },
    scroll: { padding: SPACING.lg },
    alertCard: { flexDirection: 'row', backgroundColor: COLORS.background, borderRadius: 24, padding: 18, marginBottom: 16, ...SHADOWS.soft, borderLeftWidth: 6 },
    unreadCard: { backgroundColor: COLORS.white, ...SHADOWS.premium },
    iconBox: { width: 54, height: 54, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    alertContent: { flex: 1, marginLeft: 16 },
    alertHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    alertType: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
    alertTime: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
    alertTitle: { fontSize: 18, fontWeight: '800', color: COLORS.black, marginBottom: 6 },
    alertMessage: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, marginLeft: 8 },
    optionsBtn: { marginLeft: 8, justifyContent: 'center' },
});
