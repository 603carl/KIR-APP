import { COLORS, SHADOWS, SPACING } from '@/constants/Theme';
import { supabase } from '@/lib/supabase';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowRight, Lock, Mail } from 'lucide-react-native';
import { MotiView } from 'moti';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

// Configure Google Sign-In for native builds
const WEB_CLIENT_ID = '751130763657-6s429sp824lsha2sdqp9ooler427hve2.apps.googleusercontent.com';

let GoogleSignin: any = null;
let statusCodes: any = null;

try {
    const googleSignInModule = require('@react-native-google-signin/google-signin');
    GoogleSignin = googleSignInModule.GoogleSignin;
    statusCodes = googleSignInModule.statusCodes;

    GoogleSignin.configure({
        webClientId: WEB_CLIENT_ID,
        offlineAccess: true,
        scopes: ['profile', 'email'],
    });
} catch (e) {
    console.log('Native Google Sign-In module not found (Required for in-app experience)');
}

export default function LoginScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [otpCode, setOtpCode] = useState('');
    const [otpLoading, setOtpLoading] = useState(false);

    useEffect(() => {
        // Only checking initial auth state if needed, browser deep links removed
    }, []);

    const syncUserProfile = async (user: any) => {
        try {
            const fullName = user.user_metadata?.full_name || user.user_metadata?.name || 'Citizen';
            const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;

            // Check if profile exists
            const { data: profile } = await supabase
                .from('profiles')
                .select('id, full_name')
                .eq('id', user.id)
                .single();

            if (!profile) {
                // Create new profile
                await supabase.from('profiles').insert({
                    id: user.id,
                    full_name: fullName,
                    email: user.email,
                    avatar_url: avatarUrl,
                    role: 'reporter'
                });
            } else if (!profile.full_name || profile.full_name === 'Citizen') {
                // Update profile if name is generic
                await supabase.from('profiles').update({
                    full_name: fullName,
                    avatar_url: avatarUrl
                }).eq('id', user.id);
            }
        } catch (e) {
            console.error('Profile sync error:', e);
        }
    };

    const handleGoogleSignIn = async () => {
        try {
            if (!GoogleSignin) {
                Alert.alert(
                    'Native Build Required',
                    'The premium "In-App" Google Sign-In experience requires a Development Build. Standard Expo Go does not support this feature.',
                    [{ text: 'Understand' }]
                );
                return;
            }

            setGoogleLoading(true);
            await handleNativeGoogleSignIn();
        } catch (error: any) {
            console.error('Google Sign-In Error:', error);
            Alert.alert('Sign-In Failed', error.message || 'Unable to sign in with Google. Please try again.');
        } finally {
            setGoogleLoading(false);
        }
    };

    const handleNativeGoogleSignIn = async () => {
        try {
            console.log('Starting native Google Sign-In...');

            // Check if Google Play Services are available
            await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

            // Sign in with Google - force account selection by signing out first
            try {
                await GoogleSignin.signOut();
            } catch (signOutError) {
                // Ignore sign out errors if not signed in
            }
            const userInfo = await GoogleSignin.signIn();
            console.log('Google Sign-In successful');

            // Get the ID token
            // Robust check: try to get from result, otherwise fetch explicitly
            let idToken = userInfo.data?.idToken || userInfo.idToken;

            if (!idToken) {
                console.log('No ID token in result, calling getTokens()...');
                try {
                    const tokens = await GoogleSignin.getTokens();
                    idToken = tokens.idToken;
                } catch (tokenError) {
                    console.error('Error fetching tokens:', tokenError);
                }
            }

            if (!idToken) {
                throw new Error('No ID token received from Google');
            }

            console.log('Got Google ID token, signing in with Supabase...');

            // Sign in to Supabase with the Google ID token
            const { data, error } = await supabase.auth.signInWithIdToken({
                provider: 'google',
                token: idToken,
            });

            if (error) {
                console.error('Supabase auth error:', error);
                throw error;
            }

            if (data.session) {
                if (data.user) {
                    await syncUserProfile(data.user);
                }
                router.replace('/(tabs)');
            }
        } catch (error: any) {
            console.error('Native sign-in error:', error);
            if (statusCodes && error.code === statusCodes.SIGN_IN_CANCELLED) {
                console.log('User cancelled the sign-in');
            } else if (statusCodes && error.code === statusCodes.IN_PROGRESS) {
                Alert.alert('Sign-In in progress', 'Please wait...');
            } else if (statusCodes && error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                Alert.alert('Play Services Missing', 'Google Play Services are required for this device/emulator.');
            } else {
                Alert.alert('Sign-In Failed', error.message || 'Unable to sign in with Google.');
            }
        }
    };


    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password: password.trim(),
        });

        if (error) {
            setLoading(false);

            // Provide better error messages
            if (error.message.includes('Invalid login credentials')) {
                Alert.alert(
                    'Login Failed',
                    'The email or password you entered is incorrect. Please check your credentials and try again.',
                    [
                        { text: 'Try Again', style: 'cancel' },
                        {
                            text: 'Reset Password',
                            onPress: () => router.push('/auth/forgot-password')
                        }
                    ]
                );
            } else if (error.message.includes('Email not confirmed')) {
                Alert.alert(
                    'Email Not Verified',
                    'Your email address has not been verified. Would you like to enter a verification code?',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Enter Code', onPress: () => setIsVerifying(true) }
                    ]
                );
            } else {
                Alert.alert('Error', error.message);
            }
        } else {
            router.replace('/(tabs)');
        }
    };

    const handleOtpVerify = async () => {
        if (!otpCode || otpCode.length < 6) {
            Alert.alert('Error', 'Please enter a valid 6-digit code');
            return;
        }

        setOtpLoading(true);
        try {
            const { data, error } = await supabase.auth.verifyOtp({
                email: email.trim().toLowerCase(),
                token: otpCode.trim(),
                type: 'signup',
            });

            if (error) throw error;

            if (data.session) {
                router.replace('/(tabs)');
            }
        } catch (error: any) {
            Alert.alert('Verification Failed', error.message);
        } finally {
            setOtpLoading(false);
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
                            {isVerifying ? (
                                <View style={styles.form}>
                                    <Text style={styles.formTitle}>Verify Email</Text>
                                    <Text style={styles.otpSubText}>
                                        Enter the 6-digit code sent to {email}
                                    </Text>
                                    <View style={styles.inputContainer}>
                                        <View style={styles.inputIconBox}>
                                            <Lock size={18} color={COLORS.white} />
                                        </View>
                                        <TextInput
                                            placeholder="6-Digit Code"
                                            style={styles.input}
                                            placeholderTextColor="rgba(255,255,255,0.6)"
                                            keyboardType="number-pad"
                                            maxLength={6}
                                            value={otpCode}
                                            onChangeText={setOtpCode}
                                        />
                                    </View>

                                    <TouchableOpacity
                                        style={[styles.loginBtn, otpLoading && { opacity: 0.7 }]}
                                        onPress={handleOtpVerify}
                                        disabled={otpLoading}
                                    >
                                        <LinearGradient colors={[COLORS.white, '#E8E8E8']} style={styles.loginGradient}>
                                            {otpLoading ? (
                                                <ActivityIndicator color={COLORS.primary} />
                                            ) : (
                                                <Text style={styles.loginBtnText}>Verify & Login</Text>
                                            )}
                                        </LinearGradient>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={() => setIsVerifying(false)}
                                        style={{ marginTop: 12, alignSelf: 'center' }}
                                    >
                                        <Text style={styles.signupText}>Back to Sign In</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <>
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

                                    <TouchableOpacity
                                        style={[styles.socialBtn, googleLoading && { opacity: 0.7 }]}
                                        onPress={handleGoogleSignIn}
                                        disabled={googleLoading || loading}
                                    >
                                        {googleLoading ? (
                                            <ActivityIndicator color={COLORS.white} />
                                        ) : (
                                            <Text style={styles.socialText}>Continue with Google</Text>
                                        )}
                                    </TouchableOpacity>

                                    <View style={styles.footer}>
                                        <Text style={styles.footerText}>Don't have an account? </Text>
                                        <TouchableOpacity onPress={() => router.push('/auth/signup')}>
                                            <Text style={styles.signupText}>Sign Up</Text>
                                        </TouchableOpacity>
                                    </View>
                                </>
                            )}
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
    form: { gap: 18 },
    otpSubText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, textAlign: 'center', marginBottom: 12, fontWeight: '500' },
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
