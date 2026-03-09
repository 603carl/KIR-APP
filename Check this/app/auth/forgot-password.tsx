import { COLORS, SHADOWS, SPACING } from '@/constants/Theme';
import { supabase } from '@/lib/supabase';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Mail, Send } from 'lucide-react-native';
import { MotiView } from 'moti';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleResetRequest = async () => {
        if (!email.trim()) {
            Alert.alert('Error', 'Please enter your email address');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
            if (error) throw error;
            router.push({ pathname: '/auth/reset-password', params: { email: email.trim() } });
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
                                <Mail size={40} color={COLORS.primary} />
                            </View>

                            <Text style={styles.title}>Forgot Password?</Text>
                            <Text style={styles.subtitle}>
                                Enter your email address and we'll send you a code to reset your password.
                            </Text>

                            <View style={styles.inputContainer}>
                                <View style={styles.inputIconBox}>
                                    <Mail size={18} color={COLORS.white} />
                                </View>
                                <TextInput
                                    placeholder="Email Address"
                                    style={styles.input}
                                    placeholderTextColor="rgba(255,255,255,0.6)"
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    value={email}
                                    onChangeText={setEmail}
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.submitBtn, loading && { opacity: 0.7 }]}
                                onPress={handleResetRequest}
                                disabled={loading}
                            >
                                <LinearGradient colors={[COLORS.white, '#E8E8E8']} style={styles.btnGradient}>
                                    {loading ? (
                                        <ActivityIndicator color={COLORS.primary} />
                                    ) : (
                                        <>
                                            <Text style={styles.btnText}>Send Reset Code</Text>
                                            <Send size={20} color={COLORS.primary} />
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
    inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', height: 60, borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 24 },
    inputIconBox: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    input: { flex: 1, fontSize: 16, color: COLORS.white, marginLeft: 12, fontWeight: '600' },
    submitBtn: { height: 60, borderRadius: 20, overflow: 'hidden', ...SHADOWS.premium },
    btnGradient: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
    btnText: { color: COLORS.primary, fontSize: 17, fontWeight: '800' },
});
