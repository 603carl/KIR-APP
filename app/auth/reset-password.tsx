import { COLORS, SHADOWS, SPACING } from '@/constants/Theme';
import { supabase } from '@/lib/supabase';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, CheckCircle, Key, Lock } from 'lucide-react-native';
import { MotiView } from 'moti';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function ResetPasswordScreen() {
    const router = useRouter();
    const { email } = useLocalSearchParams<{ email: string }>();
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handlePasswordReset = async () => {
        if (!code || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            // 1. Verify OTP
            const { data, error: otpError } = await supabase.auth.verifyOtp({
                email,
                token: code,
                type: 'recovery',
            });

            if (otpError) throw otpError;

            // 2. Update Password
            const { error: updateError } = await supabase.auth.updateUser({
                password: password
            });

            if (updateError) throw updateError;

            Alert.alert('Success', 'Password updated successfully!', [
                { text: 'Login', onPress: () => router.replace('/auth/login') }
            ]);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar style="light" />

            <LinearGradient
                colors={[COLORS.primary, '#004D2C', '#002D1A']}
                style={StyleSheet.absoluteFill}
            />

            <SafeAreaView style={styles.safe} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <ArrowLeft size={24} color={COLORS.white} />
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.scroll}>
                    <MotiView
                        from={{ opacity: 0, translateY: 20 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'timing', duration: 800 }}
                    >
                        <BlurView intensity={40} tint="light" style={styles.glassCard}>
                            <View style={styles.iconContainer}>
                                <Key size={40} color={COLORS.primary} />
                            </View>

                            <Text style={styles.title}>Reset Password</Text>
                            <Text style={styles.subtitle}>
                                Enter the 6-digit code sent to {email} and your new password.
                            </Text>

                            <View style={styles.inputGroup}>
                                <View style={styles.inputContainer}>
                                    <View style={styles.inputIconBox}>
                                        <Key size={18} color={COLORS.white} />
                                    </View>
                                    <TextInput
                                        placeholder="6-Digit Code"
                                        style={styles.input}
                                        placeholderTextColor="rgba(255,255,255,0.6)"
                                        keyboardType="number-pad"
                                        maxLength={6}
                                        value={code}
                                        onChangeText={setCode}
                                    />
                                </View>

                                <View style={styles.inputContainer}>
                                    <View style={styles.inputIconBox}>
                                        <Lock size={18} color={COLORS.white} />
                                    </View>
                                    <TextInput
                                        placeholder="New Password"
                                        secureTextEntry={!showPassword}
                                        style={styles.input}
                                        placeholderTextColor="rgba(255,255,255,0.6)"
                                        value={password}
                                        onChangeText={setPassword}
                                        autoCapitalize="none"
                                    />
                                    <TouchableOpacity
                                        style={styles.monkeyToggle}
                                        onPress={() => setShowPassword(!showPassword)}
                                    >
                                        <Text style={styles.monkeyEmoji}>{showPassword ? '🙈' : '🐵'}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[styles.submitBtn, loading && { opacity: 0.7 }]}
                                onPress={handlePasswordReset}
                                disabled={loading}
                            >
                                <LinearGradient colors={[COLORS.white, '#E8E8E8']} style={styles.btnGradient}>
                                    {loading ? (
                                        <ActivityIndicator color={COLORS.primary} />
                                    ) : (
                                        <>
                                            <Text style={styles.btnText}>Update Password</Text>
                                            <CheckCircle size={20} color={COLORS.primary} />
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </BlurView>
                    </MotiView>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.black },
    safe: { flex: 1 },
    header: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
    backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12 },
    scroll: { flexGrow: 1, paddingHorizontal: SPACING.lg, justifyContent: 'center', paddingBottom: 100 },
    glassCard: { borderRadius: 32, padding: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', ...SHADOWS.premium },
    iconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 24, ...SHADOWS.medium },
    title: { fontSize: 28, fontWeight: '900', color: COLORS.white, textAlign: 'center', marginBottom: 12 },
    subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: 32, lineHeight: 22 },
    inputGroup: { gap: 16, marginBottom: 24 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', height: 60, borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    inputIconBox: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    input: { flex: 1, fontSize: 16, color: COLORS.white, marginLeft: 12, fontWeight: '600' },
    monkeyToggle: { padding: 4 },
    monkeyEmoji: { fontSize: 24 },
    submitBtn: { height: 60, borderRadius: 20, overflow: 'hidden', ...SHADOWS.premium },
    btnGradient: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
    btnText: { color: COLORS.primary, fontSize: 17, fontWeight: '800' },
});
