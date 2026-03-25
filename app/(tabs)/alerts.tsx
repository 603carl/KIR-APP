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
    Zap,
    Bell,
    Check
} from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
    Alert,
    Animated,
    Dimensions,
    FlatList,
    LayoutAnimation,
    PanResponder,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 80;
const ITEM_HEIGHT = 110; // Fixed height for getItemLayout optimization

interface Notification {
    id: string;
    title: string;
    body: string;
    type: string;
    is_read: boolean;
    created_at: string;
    payload?: any;
}

// Ultra-Performance Notification Row using 100% Native Driver
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
    const entranceScale = useRef(new Animated.Value(0.95)).current;
    const entranceOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // High-performance entrance animation
        Animated.parallel([
            Animated.timing(entranceOpacity, {
                toValue: 1,
                duration: 250,
                useNativeDriver: true,
            }),
            Animated.spring(entranceScale, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            })
        ]).start();
    }, []);

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return Math.abs(gestureState.dx) > 15 && Math.abs(gestureState.dy) < 10;
            },
            onPanResponderMove: (_, gestureState) => {
                // Limit swipe to left only for delete
                if (gestureState.dx < 0) {
                    translateX.setValue(gestureState.dx);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dx < -SWIPE_THRESHOLD) {
                    Animated.timing(translateX, {
                        toValue: -SCREEN_WIDTH,
                        duration: 200,
                        useNativeDriver: true
                    }).start(() => onDelete());
                } else {
                    Animated.spring(translateX, {
                        toValue: 0,
                        useNativeDriver: true,
                        friction: 7
                    }).start();
                }
            }
        })
    ).current;

    const Icon = getIcon(notification.type);
    const color = getColor(notification.type);

    return (
        <Animated.View 
            style={[
                styles.alertWrapper, 
                { opacity: entranceOpacity, transform: [{ scale: entranceScale }] }
            ]}
        >
            <View style={styles.deleteBackground}>
                <Trash2 size={24} color={COLORS.white} />
            </View>
            
            <Animated.View
                style={[styles.alertCardContainer, { transform: [{ translateX }] }]}
                {...panResponder.panHandlers}
            >
                <TouchableOpacity 
                    activeOpacity={0.8} 
                    onPress={onPress}
                    style={styles.touchable}
                >
                    <BlurView intensity={Platform.OS === 'ios' ? 40 : 100} tint="light" style={styles.blurCard}>
                        <View style={[styles.statusLine, { backgroundColor: color }]} />
                        
                        <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
                            <Icon size={22} color={color} />
                        </View>

                        <View style={styles.alertContent}>
                            <View style={styles.alertHeader}>
                                <Text style={[styles.alertType, { color }]}>
                                    {notification.type.toUpperCase()}
                                </Text>
                                <Text style={styles.alertTime}>{getTimeAgo(notification.created_at)}</Text>
                            </View>
                            
                            <View style={styles.titleRow}>
                                <Text style={styles.alertTitle} numberOfLines={1}>{notification.title}</Text>
                                {!notification.is_read && <View style={[styles.dot, { backgroundColor: color }]} />}
                            </View>
                            
                            <Text style={styles.alertMessage} numberOfLines={2}>{notification.body}</Text>
                        </View>
                    </BlurView>
                </TouchableOpacity>
            </Animated.View>
        </Animated.View>
    );
});

export default function AlertsScreen() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchNotifications = useCallback(async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            setNotifications(data || []);
            
            // Sync with SecureStore unread count
            const unreadCount = data?.filter(n => !n.is_read).length || 0;
            await SecureStore.setItemAsync('unread_alerts_count', unreadCount.toString());
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
        
        // Real-time synchronization for instant updates
        const channel = supabase
            .channel('alerts-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
                fetchNotifications(true);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [fetchNotifications]);

    const markAllRead = async () => {
        try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('is_read', false);

            if (error) throw error;
            
            // Optimistic update with LayoutAnimation
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            await SecureStore.setItemAsync('unread_alerts_count', '0');
        } catch (error) {
            console.error('Error marking all read:', error);
        }
    };

    const deleteNotification = async (id: string) => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            
            // Optimistic removal
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setNotifications(prev => prev.filter(n => n.id !== id));

            const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('id', id);

            if (error) throw error;
        } catch (error) {
            console.error('Delete error:', error);
            fetchNotifications(true); // Rollback on error
        }
    };

    const getIcon = (type: string) => {
        const t = type.toLowerCase();
        if (t.includes('emergency') || t.includes('critical')) return ShieldAlert;
        if (t.includes('water')) return Droplet;
        if (t.includes('road')) return Car;
        if (t.includes('power')) return Zap;
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

    const getTimeAgo = (date: string) => {
        const diff = Date.now() - new Date(date).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h`;
        return `${Math.floor(hrs / 24)}d`;
    };

    const renderItem = useCallback(({ item }: { item: Notification }) => (
        <SwipeableNotification
            notification={item}
            onPress={() => router.push(`/incident/${item.payload?.incidentId || item.id}` as any)}
            onDelete={() => deleteNotification(item.id)}
            getIcon={getIcon}
            getColor={getColor}
            getTimeAgo={getTimeAgo}
        />
    ), []);

    const keyExtractor = useCallback((item: Notification) => item.id, []);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar style="dark" />
            
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Safety Alerts</Text>
                    <Text style={styles.headerSubtitle}>Real-time notifications</Text>
                </View>
                
                <TouchableOpacity style={styles.actionButton} onPress={markAllRead}>
                    <BlurView intensity={60} tint="light" style={styles.actionBlur}>
                        <Check size={18} color={COLORS.primary} strokeWidth={3} />
                        <Text style={styles.actionText}>Clear</Text>
                    </BlurView>
                </TouchableOpacity>
            </View>

            <FlatList
                data={notifications}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => fetchNotifications()} colors={[COLORS.primary]} />
                }
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIconBox}>
                                <Bell size={48} color={COLORS.textMuted} opacity={0.3} />
                            </View>
                            <Text style={styles.emptyTitle}>You're all caught up</Text>
                            <Text style={styles.emptyText}>New safety alerts and emergency updates will appear here.</Text>
                        </View>
                    ) : null
                }
                // EXTREME PERFORMANCE PROPS
                initialNumToRender={10}
                maxToRenderPerBatch={5}
                windowSize={5}
                removeClippedSubviews={Platform.OS === 'android'}
                getItemLayout={(_, index) => ({
                    length: ITEM_HEIGHT + 12, // Height + Margin
                    offset: (ITEM_HEIGHT + 12) * index,
                    index,
                })}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 20,
    },
    headerTitle: { fontSize: 28, fontWeight: '900', color: COLORS.black, letterSpacing: -0.5 },
    headerSubtitle: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600', marginTop: -2 },
    
    actionButton: { borderRadius: 16, overflow: 'hidden' },
    actionBlur: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 16, 
        paddingVertical: 8,
        gap: 6
    },
    actionText: { fontSize: 13, fontWeight: '800', color: COLORS.primary },

    listContent: { paddingHorizontal: 20, paddingBottom: 100 },
    
    alertWrapper: {
        height: ITEM_HEIGHT,
        marginBottom: 12,
        borderRadius: 24,
        overflow: 'hidden',
        backgroundColor: COLORS.error,
    },
    deleteBackground: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: COLORS.error,
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingRight: 30,
    },
    alertCardContainer: { flex: 1 },
    touchable: { flex: 1 },
    blurCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        paddingLeft: 20,
        backgroundColor: COLORS.white + '95',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: COLORS.white,
    },
    statusLine: {
        position: 'absolute',
        left: 0,
        top: 24,
        bottom: 24,
        width: 4,
        borderTopRightRadius: 4,
        borderBottomRightRadius: 4,
    },
    iconBox: {
        width: 52,
        height: 52,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    alertContent: { flex: 1, marginLeft: 16 },
    alertHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    alertType: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    alertTime: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
    
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
    alertTitle: { fontSize: 16, fontWeight: '800', color: COLORS.black, flex: 1 },
    dot: { width: 6, height: 6, borderRadius: 3 },
    
    alertMessage: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500', lineHeight: 18 },

    emptyState: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
    emptyIconBox: { 
        width: 100, 
        height: 100, 
        borderRadius: 50, 
        backgroundColor: COLORS.primary + '08',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24
    },
    emptyTitle: { fontSize: 20, fontWeight: '800', color: COLORS.black, marginBottom: 8 },
    emptyText: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 22 },
});
