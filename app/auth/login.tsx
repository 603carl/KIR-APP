import { COLORS, SHADOWS, SPACING } from '@/constants/Theme';
import { supabase } from '@/lib/supabase';
import { BlurView } from 'expo-blur';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { ArrowRight, Lock, Mail } from 'lucide-react-native';
import { MotiView } from 'moti';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

// Check if we're running in Expo Go or a development/production build
const isExpoGo = Constants.appOwnership === 'expo';

// Configure Google Sign-In for native builds only
const WEB_CLIENT_ID = '751130763657-6s429sp824lsha2sdqp9ooler427hve2.apps.googleusercontent.com';

// Dynamically import native Google Sign-In (only works in dev/prod builds)
let GoogleSignin: any = null;
let statusCodes: any = null;

if (!isExpoGo) {
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
        console.log('Native Google Sign-In not available');
    }
}

// Warm up browser for Expo Go OAuth
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        // Handle deep link callback for browser OAuth (Expo Go)
        const handleUrl = async ({ url }: { url: string }) => {
            if (url.includes('auth/callback') || url.includes('#access_token')) {
                // Try to extract tokens from URL
                const hashIndex = url.indexOf('#');
                if (hashIndex !== -1) {
                    const fragment = url.substring(hashIndex + 1);
                    const params = new URLSearchParams(fragment);
                    const accessToken = params.get('access_token');
                    const refreshToken = params.get('refresh_token');

                    if (accessToken && refreshToken) {
                        await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken,
                        });
                        router.replace('/(tabs)');
                    }
                }
            }
        };

        const subscription = Linking.addEventListener('url', handleUrl);

        // Check for initial URL (app opened via deep link)
        Linking.getInitialURL().then((url) => {
            if (url) handleUrl({ url });
        });

        return () => subscription.remove();
    }, []);

    const handleGoogleSignIn = async () => {
        try {
            setGoogleLoading(true);

            // Use native Google Sign-In for production builds
            if (GoogleSignin && !isExpoGo) {
                await handleNativeGoogleSignIn();
            } else {
                // Use browser OAuth for Expo Go
                await handleBrowserGoogleSignIn();
            }
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

            // Sign in with Google
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
                console.log('✅ Successfully signed in with Google!');
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

    const handleBrowserGoogleSignIn = async () => {
        // For Expo Go, we'll use a special flow:
        // 1. Open the browser for Google sign-in
        // 2. After sign-in, the user is created/logged in on Supabase's side
        // 3. We poll for the session or guide the user to close the browser

        const redirectUrl = Linking.createURL('auth/callback');
        console.log('Browser OAuth redirect URL:', redirectUrl);

        // Request the OAuth URL from Supabase
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectUrl,
                skipBrowserRedirect: true,
            },
        });

        if (error) throw error;

        if (data.url) {
            // Open the browser
            const result = await WebBrowser.openAuthSessionAsync(
                data.url,
                redirectUrl,
                {
                    showInRecents: true,
                    preferEphemeralSession: false,
                }
            );

            console.log('Browser result:', result.type);

            // Check for success with URL containing tokens
            if (result.type === 'success' && result.url) {
                const url = result.url;
                console.log('Return URL:', url);

                // Try to extract tokens from hash fragment
                const hashIndex = url.indexOf('#');
                if (hashIndex !== -1) {
                    const fragment = url.substring(hashIndex + 1);
                    const params = new URLSearchParams(fragment);
                    const accessToken = params.get('access_token');
                    const refreshToken = params.get('refresh_token');

                    if (accessToken && refreshToken) {
                        console.log('Got tokens from URL, setting session...');
                        await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken,
                        });
                        router.replace('/(tabs)');
                        return;
                    }
                }
            }

            // If browser was dismissed or cancelled, check if user signed in anyway
            // (User might have completed sign-in but browser didn't redirect properly)
            console.log('Checking for existing session...');

            // Wait a moment for Supabase to process
            await new Promise(resolve => setTimeout(resolve, 1000));

            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData.session) {
                console.log('Found existing session!');
                router.replace('/(tabs)');
                return;
            }

            // If still no session, try refreshing
            const { data: refreshData } = await supabase.auth.refreshSession();
            if (refreshData.session) {
                console.log('Got session after refresh!');
                router.replace('/(tabs)');
                return;
            }

            // Last resort: Show a helpful message
            Alert.alert(
                'Almost There!',
                'If you completed the Google sign-in, please tap "Continue with Google" again. Your account has been created.',
                [{ text: 'OK' }]
            );
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
                Alert.alert('Email Not Verified', 'Please check your email and click the verification link before signing in.');
            } else {
                Alert.alert('Error', error.message);
            }
        } else {
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
