import { COLORS, SHADOWS, SPACING } from '@/constants/Theme';
import { supabase } from '@/lib/supabase';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import {
    AlertTriangle,
    Car,
    CheckCircle2,
    Droplet,
    Info,
    ShieldAlert,
    Trash2,
    Zap
} from 'lucide-react-native';
import { MotiView } from 'moti';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Dimensions,
    FlatList,
    LayoutAnimation,
    PanResponder,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

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

// Memoized Swipeable Notification Item Component for Zero-Lag Performance
const SwipeableNotification = React.memo(({
    notification,
    onPress,
    onDelete,
    getIcon,
    getColor,
    getTimeAgo
}: {
    notification: Notification;
    onPress: () => void;
    onDelete: () => void;
    getIcon: (type: string) => any;
    getColor: (type: string) => string;
    getTimeAgo: (date: string) => string;
}) => {
    const translateX = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(1)).current;
    const height = useRef(new Animated.Value(1)).current;

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 10;
            },
            onPanResponderMove: (_, gestureState) => {
                translateX.setValue(gestureState.dx);
            },
            onPanResponderRelease: (_, gestureState) => {
                if (Math.abs(gestureState.dx) > SWIPE_THRESHOLD) {
                    const direction = gestureState.dx > 0 ? SCREEN_WIDTH : -SCREEN_WIDTH;
                    
                    Animated.parallel([
                        Animated.timing(translateX, {
                            toValue: direction,
                            duration: 150,
                            useNativeDriver: true
                        }),
                        Animated.timing(opacity, {
                            toValue: 0,
                            duration: 150,
                            useNativeDriver: true
                        })
                    ]).start(() => {
                        onDelete();
                    });
                } else {
                    Animated.spring(translateX, {
                        toValue: 0,
                        useNativeDriver: true,
                        friction: 6
                    }).start();
                }
            }
        })
    ).current;

    const Icon = getIcon(notification.type);
    const color = getColor(notification.type);

    return (
        <Animated.View style={[styles.alertWrapper, { opacity }]}>
            <View style={styles.deleteBackground}>
                <Trash2 size={24} color={COLORS.white} />
            </View>
            <Animated.View
                style={[styles.alertCardContainer, { transform: [{ translateX }] }]}
                {...panResponder.panHandlers}
            >
                <TouchableOpacity 
                    activeOpacity={0.7} 
                    onPress={onPress}
                    style={[
                        styles.alertCard,
                        !notification.is_read && styles.unreadCard,
                        { borderLeftColor: color }
                    ]}
                >
                    <View style={[styles.iconBox, { backgroundColor: color + '12' }]}>
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
                </TouchableOpacity>
            </Animated.View>
        </Animated.View>
    );
});

export default function AlertsScreen() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [acknowledgedIds, setAcknowledgedIds] = useState<string[]>([]);
    const [deletedIds, setDeletedIds] = useState<string[]>([]);
    const scrollViewRef = useRef<any>(null);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadLocalData();
        fetchNotifications();

        const channel = supabase.channel('public:broadcasts')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'broadcasts' }, () => {
                fetchNotifications();
            })
            .subscribe();

        const localChannel = supabase.channel('local-sync')
            .on('broadcast', { event: 'refresh-unread-count' }, () => {
                fetchNotifications();
            })
            .subscribe();

        return () => {
            channel.unsubscribe();
            localChannel.unsubscribe();
        };
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchNotifications();
        setRefreshing(false);
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
                
                // Keep state in sync
                setAcknowledgedIds(localAcknowledged);
                setDeletedIds(localDeleted);
            } catch (e) { }

            const installDate = await SecureStore.getItemAsync('install_date');

            // CRITICAL: Load with LIMIT to prevent "White Screen" and 1-minute lag
            const [personalRes, broadcastRes] = await Promise.all([
                supabase.from('notifications')
                    .select('*')
                    .eq('user_id', user.id)
                    .gt('created_at', installDate || user.created_at)
                    .order('created_at', { ascending: false })
                    .limit(50), 
                supabase.from('broadcasts')
                    .select('*')
                    .gt('created_at', installDate || user.created_at)
                    .order('created_at', { ascending: false })
                    .limit(50)
            ]);

            if (personalRes.error) throw personalRes.error;
            if (broadcastRes.error) throw broadcastRes.error;

            const mappedBroadcasts: Notification[] = (broadcastRes.data || []).map(b => ({
                id: b.id,
                title: b.title,
                body: b.message,
                type: 'Emergency',
                is_read: localAcknowledged.includes(b.id),
                created_at: b.created_at,
                isBroadcast: true
            }));

            const personalNotifications: Notification[] = (personalRes.data || []).map(n => ({
                ...n,
                isBroadcast: false
            }));

            const combined = [...mappedBroadcasts, ...personalNotifications]
                .filter(n => !localDeleted.includes(n.id))
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 50); // Hard secondary limit for UI stability

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
                const currentAck = await SecureStore.getItemAsync('acknowledged_broadcasts');
                const ackList = currentAck ? JSON.parse(currentAck) : [];
                const updatedIds = [...new Set([...ackList, id])];
                setAcknowledgedIds(updatedIds);
                await SecureStore.setItemAsync('acknowledged_broadcasts', JSON.stringify(updatedIds));
            } else {
                const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
                if (error) throw error;
            }

            // Optimistic UI update
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));

            // Sync with other components
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
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            // 1. Get current deleted list from store
            const currentDel = await SecureStore.getItemAsync('deleted_notifications');
            const delList = currentDel ? JSON.parse(currentDel) : [];
            const updatedDeleted = [...new Set([...delList, id])];
            
            // 2. Persist to store immediately
            await SecureStore.setItemAsync('deleted_notifications', JSON.stringify(updatedDeleted));
            setDeletedIds(updatedDeleted);

            // 3. Update server side for personal notifications (hard delete or flag)
            if (!isBroadcast) {
                // For personal notifications, we also mark as read so they don't count in badge
                await supabase.from('notifications').update({ is_read: true }).eq('id', id);
            }

            // 4. Update UI state
            // Optimistic rendering: remove from UI immediately
            const updated = notifications.filter(n => n.id !== id);
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setNotifications(updated);

            // 5. Sync count across app
            supabase.channel('local-sync').send({
                type: 'broadcast',
                event: 'refresh-unread-count',
            });

        } catch (e) {
            console.error('Delete error:', e);
            Alert.alert('Error', 'Failed to delete notification.');
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
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Server-side update for personal
            const { error: personalError } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', user.id)
                .eq('is_read', false); // Only update unread
            
            if (personalError) throw personalError;

            // 2. Local-store update for broadcasts
            const broadcastIds = notifications
                .filter(n => n.isBroadcast && !n.is_read)
                .map(n => n.id);
            
            const currentAck = await SecureStore.getItemAsync('acknowledged_broadcasts');
            const ackList = currentAck ? JSON.parse(currentAck) : [];
            const combinedIds = [...new Set([...ackList, ...broadcastIds])];
            
            await SecureStore.setItemAsync('acknowledged_broadcasts', JSON.stringify(combinedIds));
            setAcknowledgedIds(combinedIds);

            // 3. Optimistic UI update
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));

            // 4. Sync globally
            supabase.channel('local-sync').send({
                type: 'broadcast',
                event: 'refresh-unread-count',
            });

            Alert.alert('Success', 'All notifications marked as read.');
        } catch (error: any) {
            console.error('Error marking all as read:', error);
            Alert.alert('Error', 'Could not clear notifications.');
        }
    };

    const getIcon = (type: string) => {
        const t = type.toLowerCase();
        if (t.includes('emergency') || t.includes('critical')) return ShieldAlert;
        if (t.includes('water')) return Droplet;
        if (t.includes('road')) return Car;
        if (t.includes('power') || t.includes('elect')) return Zap;
        if (t.includes('health')) return ShieldAlert;
        if (t.includes('success')) return CheckCircle2;
        if (t.includes('warning')) return AlertTriangle;
        return Info;
    };

    const getColor = (type: string) => {
        const t = type.toLowerCase();
        if (t.includes('emergency') || t.includes('critical')) return COLORS.error;
        if (t.includes('water') || t.includes('road') || t.includes('power')) return COLORS.primary;
        if (t.includes('success')) return COLORS.success;
        if (t.includes('warning')) return COLORS.warning;
        return COLORS.info;
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
        if (!loading && !isExpoGo) {
            try {
                const Notifications = require('expo-notifications');
                if (Notifications.setBadgeCountAsync) {
                    Notifications.setBadgeCountAsync(unreadCount).catch(() => { });
                }
            } catch (e) {
                // Ignore expo-notifications error in Expo Go
            }
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

                <FlatList
                    data={notifications}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.scroll}
                    showsVerticalScrollIndicator={false}
                    removeClippedSubviews={true}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[COLORS.primary]}
                            tintColor={COLORS.primary}
                        />
                    }
                    ListHeaderComponent={() => (
                        notifications.length > 0 ? (
                            <View style={styles.swipeHint}>
                                <Text style={styles.swipeHintText}>← Swipe to delete →</Text>
                            </View>
                        ) : null
                    )}
                    ListEmptyComponent={() => (
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIconContainer}>
                                <Info size={48} color={COLORS.textMuted} />
                            </View>
                            <Text style={styles.emptyTitle}>No notifications</Text>
                            <Text style={styles.emptySubtitle}>
                                You're all caught up! New alerts will appear here.
                            </Text>
                        </View>
                    )}
                    renderItem={({ item, index }) => (
                        <SwipeableNotification
                            notification={item}
                            onPress={() => handleNotificationPress(item)}
                            onDelete={() => deleteNotification(item.id, item.isBroadcast || false)}
                            getIcon={getIcon}
                            getColor={getColor}
                            getTimeAgo={getTimeAgo}
                        />
                    )}
                    ListFooterComponent={() => <View style={{ height: 120 }} />}
                />
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
        bottom: 12,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.error,
        borderRadius: 20,
    },
    alertWrapper: {
        marginBottom: 12,
        borderRadius: 20,
        overflow: 'hidden',
    },
    alertCardContainer: {
        backgroundColor: COLORS.background,
    },
    alertCard: {
        flexDirection: 'row',
        backgroundColor: COLORS.white + 'F5', // aero transparency
        borderRadius: 20,
        padding: 16,
        ...SHADOWS.soft,
        borderLeftWidth: 4,
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
