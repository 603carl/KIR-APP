import { BORDER_RADIUS, COLORS, SHADOWS, SPACING } from '@/constants/Theme';
import { Ionicons } from '@expo/vector-icons';
import * as expoAudio from 'expo-av';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import React, { useEffect, useState } from 'react';
import {
    Dimensions,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    Vibration,
    View
} from 'react-native';

const { width, height } = Dimensions.get('window');

export interface BroadcastAlert {
    id: string;
    title: string;
    message: string;
    severity: 'extreme' | 'severe' | 'amber';
    created_at: string;
}

interface EmergencyBroadcastOverlayProps {
    alert: BroadcastAlert | null;
    onAcknowledge: (id: string) => void;
}

export const EmergencyBroadcastOverlay: React.FC<EmergencyBroadcastOverlayProps> = ({
    alert,
    onAcknowledge,
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [sound, setSound] = useState<expoAudio.Audio.Sound | null>(null);

    useEffect(() => {
        if (alert) {
            setIsVisible(true);
            triggerExtremeAlertSequence();
            playSound();
        } else {
            setIsVisible(false);
            stopSound();
        }
        return () => {
            stopSound();
        };
    }, [alert]);

    async function playSound() {
        try {
            await expoAudio.Audio.setAudioModeAsync({
                playsInSilentModeIOS: true,
                shouldDuckAndroid: true,
                staysActiveInBackground: true,
            });

            // Tiered loading strategy: Local Asset (Preloaded) -> Reliable GitHub -> Backups
            const remoteLinks = [
                'https://github.com/rafaelreis-hotmart/Emergency-Alert-System-EAS-Sounds/raw/master/EAS%20Attention%20Signal.mp3',
                'https://raw.githubusercontent.com/zanderev/emergency-alert-system/master/assets/eas.mp3',
                'https://archive.org/download/EmergencyAlertSystemAttentionSignal/EmergencyAlertSystemAttentionSignal.mp3'
            ];

            let loaded = false;

            // 1. Try Local Asset First (This is now preloaded in _layout.tsx)
            try {
                console.log('Attempting to load PRELOADED local EAS asset...');
                const localAsset = require('../../assets/sounds/emergency_alert.mp3');
                const { sound: localSound } = await expoAudio.Audio.Sound.createAsync(
                    localAsset,
                    { shouldPlay: true, isLooping: true, volume: 1.0 }
                );
                setSound(localSound);
                await localSound.playAsync();
                console.log('SUCCESS: Preloaded local EAS sound is playing.');
                loaded = true;
            } catch (error) {
                const localError = error as Error;
                console.log('Local EAS asset failed after preloading:', localError.message);
            }

            // 2. Fallback to Remote Links
            if (!loaded) {
                for (const link of remoteLinks) {
                    try {
                        console.log(`Attempting remote EAS fallback: ${link}`);
                        const { sound: remoteSound } = await expoAudio.Audio.Sound.createAsync(
                            { uri: link },
                            { shouldPlay: true, isLooping: true, volume: 1.0 }
                        );
                        setSound(remoteSound);
                        await remoteSound.playAsync();
                        console.log(`SUCCESS: Remote EAS sound playing from: ${link}`);
                        loaded = true;
                        break;
                    } catch (error) {
                        const remoteError = error as Error;
                        console.log(`Remote source failed (${link}):`, remoteError.message);
                    }
                }
            }

            if (!loaded) {
                console.error('CRITICAL ERROR: All EAS audio sources failed to load.');
            }
        } catch (globalError) {
            console.error('Global EAS Audio Error:', globalError);
        }
    }

    async function stopSound() {
        if (sound) {
            try {
                await sound.stopAsync();
                await sound.unloadAsync();
                setSound(null);
            } catch (e) {
                console.log('Error stopping sound:', e);
            }
        }
    }

    const triggerExtremeAlertSequence = () => {
        if (alert?.severity === 'extreme') {
            Vibration.vibrate([0, 1000, 500, 1000, 500, 1000, 500, 2000], true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } else if (alert?.severity === 'severe') {
            Vibration.vibrate([0, 800, 400, 800], true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } else {
            Vibration.vibrate([0, 500], true);
            Haptics.selectionAsync();
        }
    };

    if (!alert) return null;

    const getColors = () => {
        switch (alert.severity) {
            case 'extreme': return ['#990000', '#FF0000'];
            case 'severe': return ['#C05600', '#FF8C00'];
            case 'amber': return ['#B8860B', '#FFBF00'];
            default: return ['#444', '#666'];
        }
    };

    const handleAcknowledge = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        Vibration.cancel();
        setIsVisible(false);
        onAcknowledge(alert.id);
    };

    return (
        <Modal visible={isVisible} transparent animationType="fade" statusBarTranslucent>
            <View style={styles.container}>
                <LinearGradient colors={getColors() as any} style={StyleSheet.absoluteFill} />
                <MotiView
                    from={{ scale: 0.8, opacity: 0.2 }}
                    animate={{ scale: 2, opacity: 0 }}
                    transition={{ type: 'timing', duration: 2000, loop: true }}
                    style={[styles.pulseCircle, { borderColor: COLORS.white }]}
                />
                <View style={styles.content}>
                    <MotiView
                        from={{ translateY: -50, opacity: 0 }}
                        animate={{ translateY: 0, opacity: 1 }}
                        transition={{ type: 'spring', delay: 200 }}
                        style={styles.header}
                    >
                        <Ionicons
                            name={alert.severity === 'extreme' ? "warning" : "alert-circle"}
                            size={80}
                            color={COLORS.white}
                        />
                        <Text style={styles.emergencyTitle}>
                            {alert.severity === 'extreme' ? 'EXTREME EMERGENCY' :
                                alert.severity === 'severe' ? 'SEVERE ALERT' : 'AMBER ALERT'}
                        </Text>
                    </MotiView>
                    <MotiView
                        from={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 500 }}
                        style={styles.body}
                    >
                        <Text style={styles.titleText}>{alert.title}</Text>
                        <Text style={styles.messageText}>{alert.message}</Text>
                    </MotiView>
                    <MotiView
                        from={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', delay: 800 }}
                        style={styles.footer}
                    >
                        <TouchableOpacity style={styles.acknowledgeButton} onPress={handleAcknowledge}>
                            <Text style={styles.buttonText}>ACKNOWLEDGE</Text>
                        </TouchableOpacity>
                        <Text style={styles.disclaimer}>
                            Alert active until dismissed. Move to safety immediately.
                        </Text>
                    </MotiView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    pulseCircle: { position: 'absolute', width: width * 0.8, height: width * 0.8, borderRadius: width * 0.4, borderWidth: 4 },
    content: { width: '90%', alignItems: 'center', paddingVertical: SPACING.xxl },
    header: { alignItems: 'center', marginBottom: SPACING.xl },
    emergencyTitle: { color: COLORS.white, fontSize: 32, fontWeight: '900', marginTop: SPACING.sm, textAlign: 'center', letterSpacing: 2 },
    body: { backgroundColor: 'rgba(0,0,0,0.3)', padding: SPACING.xl, borderRadius: BORDER_RADIUS.lg, width: '100%', marginBottom: SPACING.xxl, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    titleText: { color: COLORS.white, fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: SPACING.md },
    messageText: { color: COLORS.white, fontSize: 18, textAlign: 'center', lineHeight: 26 },
    footer: { width: '100%', alignItems: 'center' },
    acknowledgeButton: { backgroundColor: COLORS.white, paddingHorizontal: SPACING.huge, paddingVertical: SPACING.lg, borderRadius: BORDER_RADIUS.full, ...SHADOWS.premium, width: '100%' },
    buttonText: { color: '#000', fontSize: 20, fontWeight: '900', textAlign: 'center' },
    disclaimer: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: SPACING.md, textAlign: 'center' },
});
