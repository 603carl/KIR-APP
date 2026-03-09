import { COLORS, SHADOWS, SPACING } from '@/constants/Theme';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import {
    AlertTriangle,
    CheckCircle2,
    Info,
    ShieldAlert,
    Trash2
} from 'lucide-react-native';
import { MotiView } from 'moti';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    PanResponder,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 80;

interface Notification {
    id: string;
    title: string;
    body: string;
    type: string;
    is_read: boolean;
    created_at: string;
    payload?: any;
    isBroadcast?: boolean;
}

// Swipeable Notification Item Component
const SwipeableNotification = ({
    notification,
    onPress,
    onDelete,
    index,
    getIcon,
    getColor,
    getTimeAgo
}: {
    notification: Notification;
    onPress: () => void;
    onDelete: () => void;
    index: number;
    getIcon: (type: string) => any;
    getColor: (type: string) => string;
    getTimeAgo: (date: string) => string;
}) => {
    const translateX = useRef(new Animated.Value(0)).current;
    const itemHeight = useRef(new Animated.Value(1)).current;
    const [isDeleting, setIsDeleting] = useState(false);

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 20;
            },
            onPanResponderMove: (_, gestureState) => {
                // Allow swiping in both directions
                translateX.setValue(gestureState.dx);
            },
            onPanResponderRelease: (_, gestureState) => {
                // Check if swipe is far enough in either direction
                if (Math.abs(gestureState.dx) > SWIPE_THRESHOLD) {
                    // Swipe out animation
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    const direction = gestureState.dx > 0 ? SCREEN_WIDTH : -SCREEN_WIDTH;

                    Animated.parallel([
                        Animated.timing(translateX, {
                            toValue: direction,
                            duration: 200,
                            useNativeDriver: true
                        }),
                        Animated.timing(itemHeight, {
                            toValue: 0,
                            duration: 200,
                            useNativeDriver: false
                        })
                    ]).start(() => {
                        setIsDeleting(true);
                        onDelete();
                    });
                } else {
                    // Snap back
                    Animated.spring(translateX, {
                        toValue: 0,
                        useNativeDriver: true,
                        bounciness: 8
                    }).start();
                }
            }
        })
    ).current;

    const Icon = getIcon(notification.type);
    const color = getColor(notification.type);

    if (isDeleting) return null;

    return (
        <Animated.View style={{ transform: [{ scaleY: itemHeight }] }}>
            {/* Delete background */}
            <View style={styles.deleteBackground}>
                <View style={styles.deleteLeft}>
                    <Trash2 size={24} color={COLORS.white} />
                    <Text style={styles.deleteText}>Delete</Text>
                </View>
                <View style={styles.deleteRight}>
                    <Text style={styles.deleteText}>Delete</Text>
                    <Trash2 size={24} color={COLORS.white} />
                </View>
            </View>

            {/* Notification card */}
            <Animated.View
                style={{ transform: [{ translateX }] }}
                {...panResponder.panHandlers}
            >
                <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
                    <MotiView
                        from={{ opacity: 0, translateY: 20 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ delay: Math.min(index * 80, 400) }}
                        style={[
                            styles.alertCard,
                            !notification.is_read && styles.unreadCard,
                            { borderLeftColor: color }
                        ]}
                    >
                        <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
                            <Icon size={24} color={color} />
                        </View>

                        <View style={styles.alertContent}>
                            <View style={styles.alertHeader}>
                                <View style={styles.typeRow}>
                                    <Text style={[styles.alertType, { color }]}>
                                        {notification.type.toUpperCase()}
                                    </Text>
                                    {!notification.is_read && (
                                        <View style={[styles.unreadBadge, { backgroundColor: color }]}>
                                            <Text style={styles.unreadBadgeText}>NEW</Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={styles.alertTime}>{getTimeAgo(notification.created_at)}</Text>
                            </View>
                            <Text style={styles.alertTitle} numberOfLines={1}>{notification.title}</Text>
                            <Text style={styles.alertMessage} numberOfLines={2}>{notification.body}</Text>
                        </View>
                    </MotiView>
                </TouchableOpacity>
            </Animated.View>
        </Animated.View>
    );
};

export default function AlertsScreen() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [acknowledgedIds, setAcknowledgedIds] = useState<string[]>([]);
    const [deletedIds, setDeletedIds] = useState<string[]>([]);
    const scrollViewRef = useRef<any>(null);

    useEffect(() => {
        loadLocalData();
        fetchNotifications();

        // Local broadcast channel for syncing between components
        const localChannel = supabase.channel('local-sync')
            .on('broadcast', { event: 'refresh-unread-count' }, () => {
                fetchNotifications();
            })
            .subscribe();

        return () => {
            localChannel.unsubscribe();
        };
    }, []);

    const loadLocalData = async () => {
        try {
            const [storedAcknowledged, storedDeleted] = await Promise.all([
                SecureStore.getItemAsync('acknowledged_broadcasts'),
                SecureStore.getItemAsync('deleted_notifications')
            ]);
            if (storedAcknowledged) setAcknowledgedIds(JSON.parse(storedAcknowledged));
            if (storedDeleted) setDeletedIds(JSON.parse(storedDeleted));
        } catch (e) {
            console.error('SecureStore error:', e);
        }
    };

    const fetchNotifications = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get local data
            let localAcknowledged: string[] = [];
            let localDeleted: string[] = [];
            try {
                const [ack, del] = await Promise.all([
                    SecureStore.getItemAsync('acknowledged_broadcasts'),
                    SecureStore.getItemAsync('deleted_notifications')
                ]);
                if (ack) localAcknowledged = JSON.parse(ack);
                if (del) localDeleted = JSON.parse(del);
            } catch (e) { }

            // Fetch in parallel
            const installDate = await SecureStore.getItemAsync('install_date');

            const [personalRes, broadcastRes] = await Promise.all([
                supabase.from('notifications')
                    .select('*')
                    .eq('user_id', user.id)
                    .gt('created_at', installDate || user.created_at),
                supabase.from('broadcasts')
                    .select('*')
                    .gt('created_at', installDate || user.created_at)
            ]);

            if (personalRes.error) throw personalRes.error;
            if (broadcastRes.error) throw broadcastRes.error;

            // Map broadcasts to notification format
            const mappedBroadcasts: Notification[] = (broadcastRes.data || []).map(b => ({
                id: b.id,
                title: b.title,
                body: b.message,
                type: 'Emergency',
                is_read: localAcknowledged.includes(b.id),
                created_at: b.created_at,
                isBroadcast: true
            }));

            // Add isBroadcast flag to personal notifications
            const personalNotifications: Notification[] = (personalRes.data || []).map(n => ({
                ...n,
                isBroadcast: false
            }));

            // Combine, filter deleted, and sort
            const combined = [...mappedBroadcasts, ...personalNotifications]
                .filter(n => !localDeleted.includes(n.id))
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            setNotifications(combined);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const markAsRead = async (id: string, isBroadcast: boolean) => {
        try {
            if (isBroadcast) {
                const updatedIds = [...new Set([...acknowledgedIds, id])];
                setAcknowledgedIds(updatedIds);
                await SecureStore.setItemAsync('acknowledged_broadcasts', JSON.stringify(updatedIds));
            } else {
                await supabase.from('notifications').update({ is_read: true }).eq('id', id);
            }

            // Sync with other components (Tabs badge)
            supabase.channel('local-sync').send({
                type: 'broadcast',
                event: 'refresh-unread-count',
            });
        } catch (e) {
            console.error('Mark read error:', e);
        }
    };

    const deleteNotification = async (id: string, isBroadcast: boolean) => {
        try {
            // Remove from UI immediately
            setNotifications(prev => prev.filter(n => n.id !== id));

            if (isBroadcast) {
                // Store locally as deleted (broadcasts can't be deleted from server)
                const updatedDeleted = [...new Set([...deletedIds, id])];
                setDeletedIds(updatedDeleted);
                await SecureStore.setItemAsync('deleted_notifications', JSON.stringify(updatedDeleted));
            } else {
                // For personal notifications, mark as read on server so count updates
                await supabase.from('notifications').update({ is_read: true }).eq('id', id);
            }

            // Sync with other components
            supabase.channel('local-sync').send({
                type: 'broadcast',
                event: 'refresh-unread-count',
            });

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e) {
            console.error('Delete error:', e);
            // Refetch on error to restore state
            fetchNotifications();
        }
    };

    const handleNotificationPress = (notification: Notification) => {
        markAsRead(notification.id, notification.isBroadcast || false);
        if (notification.payload?.incident_id) {
            router.push(`/incident/${notification.payload.incident_id}`);
        }
    };

    const markAllRead = async () => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Mark personal notifications as read
            await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', user.id);

            // Mark all broadcasts as acknowledged
            const broadcastIds = notifications
                .filter(n => n.isBroadcast)
                .map(n => n.id);
            const combinedIds = [...new Set([...acknowledgedIds, ...broadcastIds])];
            setAcknowledgedIds(combinedIds);
            await SecureStore.setItemAsync('acknowledged_broadcasts', JSON.stringify(combinedIds));

            // Update local state
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));

            // Sync with other components
            supabase.channel('local-sync').send({
                type: 'broadcast',
                event: 'refresh-unread-count',
            });
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const getIcon = (type: string) => {
        switch (type.toLowerCase()) {
            case 'item_critical':
            case 'emergency': return ShieldAlert;
            case 'success': return CheckCircle2;
            case 'warning': return AlertTriangle;
            case 'info':
            default: return Info;
        }
    };

    const getColor = (type: string) => {
        switch (type.toLowerCase()) {
            case 'item_critical':
            case 'emergency': return COLORS.error;
            case 'success': return COLORS.success;
            case 'warning': return COLORS.warning;
            case 'info':
            default: return COLORS.info;
        }
    };

    const getTimeAgo = (dateString: string) => {
        const now = new Date();
        const past = new Date(dateString);
        const diffInMs = now.getTime() - past.getTime();
        const diffInMins = Math.floor(diffInMs / (1000 * 60));
        const diffInHours = Math.floor(diffInMins / 60);
        const diffInDays = Math.floor(diffInHours / 24);

        if (diffInMins < 1) return 'Just now';
        if (diffInMins < 60) return `${diffInMins}m ago`;
        if (diffInHours < 24) return `${diffInHours}h ago`;
        if (diffInDays < 7) return `${diffInDays}d ago`;
        return past.toLocaleDateString();
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    useEffect(() => {
        if (!loading) {
            import('expo-notifications').then(Notifications => {
                Notifications.setBadgeCountAsync(unreadCount).catch(() => { });
            });
        }
    }, [unreadCount, loading]);

    if (loading) {
        return null; // Return nothing to avoid "loading states" as requested for speed
    }

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <SafeAreaView style={styles.safe} edges={['top']}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>Notifications</Text>
                        <Text style={styles.subtitle}>
                            {unreadCount > 0
                                ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
                                : 'All caught up!'
                            }
                        </Text>
                    </View>
                    {unreadCount > 0 && (
                        <TouchableOpacity style={styles.markReadBtn} onPress={markAllRead}>
                            <Text style={styles.markReadText}>Mark all read</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <Animated.ScrollView
                    ref={scrollViewRef}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scroll}
                >
                    {/* Swipe hint */}
                    {notifications.length > 0 && (
                        <View style={styles.swipeHint}>
                            <Text style={styles.swipeHintText}>← Swipe left or right to delete →</Text>
                        </View>
                    )}

                    {notifications.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIconContainer}>
                                <Info size={48} color={COLORS.textMuted} />
                            </View>
                            <Text style={styles.emptyTitle}>No notifications</Text>
                            <Text style={styles.emptySubtitle}>
                                You're all caught up! New alerts will appear here.
                            </Text>
                        </View>
                    ) : (
                        notifications.map((notification, index) => (
                            <SwipeableNotification
                                key={notification.id}
                                notification={notification}
                                index={index}
                                onPress={() => handleNotificationPress(notification)}
                                onDelete={() => deleteNotification(notification.id, notification.isBroadcast || false)}
                                getIcon={getIcon}
                                getColor={getColor}
                                getTimeAgo={getTimeAgo}
                            />
                        ))
                    )}

                    <View style={{ height: 120 }} />
                </Animated.ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    safe: { flex: 1 },
    header: {
        paddingHorizontal: SPACING.lg,
        paddingVertical: 24,
        backgroundColor: COLORS.white,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        ...SHADOWS.soft
    },
    title: { fontSize: 32, fontWeight: '900', color: COLORS.black },
    subtitle: { fontSize: 14, color: COLORS.textMuted, fontWeight: '600', marginTop: 4 },
    markReadBtn: {
        backgroundColor: COLORS.primary + '15',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12
    },
    markReadText: { fontSize: 13, color: COLORS.primary, fontWeight: '800' },
    scroll: { padding: SPACING.lg, paddingTop: 12 },
    swipeHint: {
        alignItems: 'center',
        marginBottom: 16,
        paddingVertical: 8,
    },
    swipeHintText: {
        fontSize: 12,
        color: COLORS.textMuted,
        fontWeight: '600',
    },
    deleteBackground: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: COLORS.error,
        borderRadius: 24,
        paddingHorizontal: 24,
    },
    deleteLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    deleteRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    deleteText: {
        color: COLORS.white,
        fontWeight: '800',
        fontSize: 14,
    },
    alertCard: {
        flexDirection: 'row',
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 18,
        marginBottom: 16,
        ...SHADOWS.soft,
        borderLeftWidth: 5,
        borderLeftColor: COLORS.textMuted
    },
    unreadCard: {
        backgroundColor: COLORS.white,
        ...SHADOWS.premium,
    },
    iconBox: {
        width: 54,
        height: 54,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center'
    },
    alertContent: { flex: 1, marginLeft: 16 },
    alertHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
    },
    typeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    alertType: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
    unreadBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    unreadBadgeText: {
        color: COLORS.white,
        fontSize: 9,
        fontWeight: '900',
    },
    alertTime: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
    alertTitle: { fontSize: 17, fontWeight: '800', color: COLORS.black, marginBottom: 4 },
    alertMessage: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
        paddingHorizontal: 40,
    },
    emptyIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    emptyTitle: {
        fontSize: 20,
        color: COLORS.black,
        fontWeight: '800',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: COLORS.textMuted,
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: 20,
    },
});
