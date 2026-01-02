import { COLORS, SHADOWS, SPACING } from '@/constants/Theme';
import { supabase } from '@/lib/supabase';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowRight, Github, Lock, Mail } from 'lucide-react-native';
import { MotiView } from 'moti';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        console.log('Target Project:', process.env.EXPO_PUBLIC_SUPABASE_URL);
        console.log('Attempting login with:', { email: email.trim(), passwordLength: password.length });
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
        });

        if (error) {
            console.error('Login Error Full:', JSON.stringify(error, null, 2));
            Alert.alert('Error', error.message);
            setLoading(false);
        } else {
            console.log('Login Success:', data.user?.id);
            router.replace('/(tabs)');
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
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    bounces={false}
                >
                    <MotiView
                        from={{ opacity: 0, scale: 0.8, translateY: -20 }}
                        animate={{ opacity: 1, scale: 1, translateY: 0 }}
                        transition={{ type: 'timing', duration: 1000 }}
                        style={styles.logoContainer}
                    >
                        <Image
                            source={require('@/assets/images/icon.png')}
                            style={styles.logoImage}
                            resizeMode="contain"
                        />
                        <Text style={styles.logoText}>Reporter</Text>
                        <Text style={styles.logoSubtext}>Kenya National Incident System</Text>
                    </MotiView>

                    <MotiView
                        from={{ opacity: 0, translateY: 50 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'timing', duration: 800, delay: 300 }}
                    >
                        <BlurView intensity={40} tint="light" style={styles.glassCard}>
                            <Text style={styles.formTitle}>Welcome Back</Text>

                            <View style={styles.inputGroup}>
                                <View style={styles.inputContainer}>
                                    <View style={styles.inputIconBox}>
                                        <Mail size={18} color={COLORS.white} />
                                    </View>
                                    <TextInput
                                        placeholder="Email Address"
                                        style={styles.input}
                                        placeholderTextColor="rgba(255,255,255,0.6)"
                                        autoCapitalize="none"
                                        value={email}
                                        onChangeText={setEmail}
                                    />
                                </View>

                                <View style={styles.inputContainer}>
                                    <View style={styles.inputIconBox}>
                                        <Lock size={18} color={COLORS.white} />
                                    </View>
                                    <TextInput
                                        placeholder="Password"
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
                                style={styles.forgotBtn}
                                onPress={() => router.push('/auth/forgot-password')}
                            >
                                <Text style={styles.forgotText}>Forgot Password?</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.loginBtn, loading && { opacity: 0.7 }]}
                                onPress={handleLogin}
                                disabled={loading}
                            >
                                <LinearGradient colors={[COLORS.white, '#E8E8E8']} style={styles.loginGradient}>
                                    {loading ? (
                                        <ActivityIndicator color={COLORS.primary} />
                                    ) : (
                                        <>
                                            <Text style={styles.loginBtnText}>Sign In</Text>
                                            <ArrowRight size={20} color={COLORS.primary} />
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            <View style={styles.divider}>
                                <View style={styles.line} />
                                <Text style={styles.dividerText}>SECURE ACCESS</Text>
                                <View style={styles.line} />
                            </View>

                            <TouchableOpacity style={styles.socialBtn}>
                                <Github size={20} color={COLORS.white} />
                                <Text style={styles.socialText}>Verify with Google</Text>
                            </TouchableOpacity>

                            <View style={styles.footer}>
                                <Text style={styles.footerText}>Don't have an account? </Text>
                                <TouchableOpacity onPress={() => router.push('/auth/signup')}>
                                    <Text style={styles.signupText}>Sign Up</Text>
                                </TouchableOpacity>
                            </View>
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
    scrollContent: { paddingHorizontal: SPACING.xl, paddingBottom: 40 },
    logoContainer: { alignItems: 'center', marginTop: height * 0.05, marginBottom: height * 0.05 },
    logoImage: { width: 90, height: 90 },
    logoText: { fontSize: 36, fontWeight: '900', color: COLORS.white, marginTop: 12, letterSpacing: -1 },
    logoSubtext: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
    glassCard: { borderRadius: 32, padding: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', ...SHADOWS.premium },
    formTitle: { fontSize: 26, fontWeight: '900', color: COLORS.white, marginBottom: 32, textAlign: 'center' },
    inputGroup: { gap: 18 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', height: 64, borderRadius: 20, paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    inputIconBox: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    input: { flex: 1, fontSize: 16, color: COLORS.white, marginLeft: 12, fontWeight: '600' },
    monkeyToggle: { padding: 4 },
    monkeyEmoji: { fontSize: 24 },
    forgotBtn: { alignSelf: 'flex-end', marginTop: 12, marginBottom: 28 },
    forgotText: { color: COLORS.white, fontWeight: '700', fontSize: 13, opacity: 0.8 },
    loginBtn: { height: 64, borderRadius: 24, overflow: 'hidden', ...SHADOWS.premium },
    loginGradient: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
    loginBtnText: { color: COLORS.primary, fontSize: 18, fontWeight: '900' },
    divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 32 },
    line: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
    dividerText: { color: 'rgba(255,255,255,0.4)', fontWeight: '800', fontSize: 10, letterSpacing: 1.5 },
    socialBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, height: 64, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.05)' },
    socialText: { fontSize: 16, fontWeight: '700', color: COLORS.white },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
    footerText: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '600' },
    signupText: { color: COLORS.white, fontWeight: '800', fontSize: 14, textDecorationLine: 'underline' },
});
