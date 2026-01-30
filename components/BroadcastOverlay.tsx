import { supabase } from '@/lib/supabase';
import * as SecureStore from 'expo-secure-store';
import { AlertCircle, AlertTriangle } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Animated, AppState, Dimensions, StatusBar, StyleSheet, Text, TouchableOpacity, Vibration, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

// Colors matching the screenshots
const THEMES = {
    extreme: {
        bg: '#DC2626', // Red
        type: 'EXTREME EMERGENCY',
        icon: AlertTriangle,
        title: 'EXTREME EMERGENCY\nALERT',
    },
    severe: {
        bg: '#EA580C', // Orange
        type: 'SEVERE ALERT',
        icon: AlertCircle, // Using Circle with !
        title: 'SEVERE WEATHER\nWARNING',
    },
    amber: {
        bg: '#D97706', // Yellow/Gold
        type: 'AMBER ALERT',
        icon: AlertCircle,
        title: 'AMBER ADVISORY ALERT',
    },
};

interface Broadcast {
    id: string;
    type: string;
    title: string;
    message: string;
    severity: 'extreme' | 'severe' | 'amber';
    created_at: string;
}

export default function BroadcastOverlay() {
    const [activeBroadcast, setActiveBroadcast] = useState<Broadcast | null>(null);
    const [fadeAnim] = useState(new Animated.Value(0));
    const [pulseAnim] = useState(new Animated.Value(1));

    useEffect(() => {
        checkBroadcasts();

        // Re-check broadcasts whenever app comes to foreground
        // This solves the "delay" when the app was suspended
        const subscriptionState = AppState.addEventListener('change', (nextAppState: string) => {
            if (nextAppState === 'active') {
                checkBroadcasts();
            }
        });

        // Realtime subscription
        const subscription = supabase
            .channel('broadcasts_overlay')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'broadcasts' }, (payload) => {
                handleNewBroadcast(payload.new as Broadcast);
            })
            .subscribe();

        return () => {
            subscriptionState.remove();
            supabase.removeChannel(subscription);
            stopVibration();
        };
    }, []);

    useEffect(() => {
        if (activeBroadcast) {
            startPulse();
            startVibration();
        } else {
            stopVibration();
        }
    }, [activeBroadcast]);

    const startPulse = () => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.5,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                })
            ])
        ).start();
    };

    const startVibration = () => {
        // Long and aggressive vibration pattern
        const pattern = [0, 500, 200, 500, 200, 500, 200, 800];
        Vibration.vibrate(pattern, true); // true = repeat
    };

    const stopVibration = () => {
        Vibration.cancel();
    };

    const handleNewBroadcast = async (broadcast: Broadcast) => {
        // Check if already acknowledged locally
        const stored = await SecureStore.getItemAsync('acknowledged_broadcasts');
        const acknowledgedIds = stored ? JSON.parse(stored) : [];

        if (!acknowledgedIds.includes(broadcast.id)) {
            setActiveBroadcast(broadcast);
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    };

    const checkBroadcasts = async () => {
        try {
            const stored = await SecureStore.getItemAsync('acknowledged_broadcasts');
            const acknowledgedIds = stored ? JSON.parse(stored) : [];

            const { data } = await supabase
                .from('broadcasts')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(1);

            if (data && data.length > 0) {
                const latest = data[0];
                // 24 hour expiration logic could go here
                if (!acknowledgedIds.includes(latest.id)) {
                    setActiveBroadcast(latest);
                    Animated.timing(fadeAnim, {
                        toValue: 1,
                        duration: 300,
                        useNativeDriver: true,
                    }).start();
                }
            }
        } catch (e) {
            console.error('Check broadcast error', e);
        }
    };

    const acknowledge = async () => {
        if (!activeBroadcast) return;

        try {
            stopVibration();
            const stored = await SecureStore.getItemAsync('acknowledged_broadcasts');
            const acknowledgedIds = stored ? JSON.parse(stored) : [];
            const newIds = [...acknowledgedIds, activeBroadcast.id];
            await SecureStore.setItemAsync('acknowledged_broadcasts', JSON.stringify(newIds));

            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start(() => setActiveBroadcast(null));
        } catch (e) {
            console.error('Ack error', e);
        }
    };

    if (!activeBroadcast) return null;

    // Determine theme based on severity or type
    // Mapping API 'severity' to our themes
    let theme = THEMES.amber;
    const severityLower = (activeBroadcast.severity || '').toLowerCase();

    if (severityLower.includes('extreme') || severityLower.includes('critical')) theme = THEMES.extreme;
    else if (severityLower.includes('severe') || severityLower.includes('high')) theme = THEMES.severe;
    else theme = THEMES.amber;

    const Icon = theme.icon;

    return (
        <Animated.View style={[styles.container, { backgroundColor: theme.bg, opacity: fadeAnim }]}>
            <StatusBar hidden />
            <SafeAreaView style={styles.content}>

                {/* Top Icon */}
                <View style={styles.iconContainer}>
                    <View style={styles.iconCircle}>
                        <Icon size={48} color={theme.bg} strokeWidth={2.5} />
                    </View>
                </View>

                {/* Header Type */}
                <Text style={styles.headerText}>{theme.type}</Text>

                {/* Central Card */}
                <View style={styles.card}>
                    {/* Pulsing Ring */}
                    <Animated.View style={[
                        styles.pulseRing,
                        {
                            transform: [{ scale: pulseAnim }],
                            opacity: pulseAnim.interpolate({
                                inputRange: [1, 1.5],
                                outputRange: [0.6, 0]
                            })
                        }
                    ]} />

                    <View style={styles.pulseContainer} />
                    <Text style={styles.cardTitle}>{activeBroadcast.title || theme.title}</Text>

                    <Text style={styles.cardBody}>
                        {activeBroadcast.message.toUpperCase()}
                    </Text>

                    <Text style={styles.footerNote}>
                        Alert active until dismissed. Move to safety immediately.
                    </Text>
                </View>

                {/* Button */}
                <View style={styles.buttonContainer}>
                    <TouchableOpacity style={styles.button} onPress={acknowledge} activeOpacity={0.9}>
                        <Text style={styles.buttonText}>ACKNOWLEDGE</Text>
                    </TouchableOpacity>
                    <Text style={styles.bottomNote}>
                        Alert active until dismissed. Move to safety immediately.
                    </Text>
                </View>

            </SafeAreaView>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999, // Highest priority
        width: width,
        height: height,
        elevation: 100,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 40,
    },
    iconContainer: {
        marginTop: 40,
        alignItems: 'center',
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerText: {
        color: 'white',
        fontSize: 28,
        fontWeight: '900',
        textAlign: 'center',
        letterSpacing: 1.5,
        marginBottom: 20,
    },
    card: {
        backgroundColor: 'rgba(0,0,0,0.15)', // Darker translucent overlay
        width: width * 0.9,
        padding: 24,
        borderRadius: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    pulseContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    pulseRing: {
        position: 'absolute',
        top: -50,
        left: -50,
        right: -50,
        bottom: -50,
        borderRadius: 200, // Make it circular
        borderWidth: 4,
        borderColor: 'rgba(255,255,255,0.5)',
        zIndex: -1,
    },
    cardTitle: {
        color: 'white',
        fontSize: 22, // Large
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 20,
        textTransform: 'uppercase',
    },
    cardBody: {
        color: 'white',
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        fontWeight: '500',
        marginBottom: 16,
    },
    footerNote: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        textAlign: 'center',
    },
    buttonContainer: {
        width: '100%',
        paddingHorizontal: 24,
        alignItems: 'center',
        marginBottom: 20,
    },
    button: {
        backgroundColor: 'white',
        width: '100%',
        paddingVertical: 18,
        borderRadius: 40,
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    buttonText: {
        color: 'black',
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    bottomNote: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 11,
        textAlign: 'center',
    },
});
