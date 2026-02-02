import { COUNTIES } from '@/constants/Counties';
import { COLORS, SHADOWS, SPACING } from '@/constants/Theme';
import { supabase } from '@/lib/supabase';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, ArrowRight, Check, Lock, Mail, MapPin, Search, User } from 'lucide-react-native';
import { MotiView } from 'moti';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

export default function SignupScreen() {
    const router = useRouter();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [agree, setAgree] = useState(false);
    const [county, setCounty] = useState('');
    const [isCountyModalVisible, setIsCountyModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [otpCode, setOtpCode] = useState('');
    const [verificationLoading, setVerificationLoading] = useState(false);

    const filteredCounties = COUNTIES.filter(c =>
        c.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSignUp = async () => {
        if (!email || !password || !fullName || !county) {
            Alert.alert('Error', 'Please fill in all fields including your County');
            return;
        }
        if (!agree) {
            Alert.alert('Legal Agreement Required', 'You must agree to the Terms of Service and Privacy Policy to create an account.');
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        setLoading(true);
        const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
                data: {
                    full_name: fullName.trim(),
                    county: county
                }
            }
        });

        if (error) {
            Alert.alert('Error', error.message);
            setLoading(false);
        } else {
            // Instead of redirecting, show OTP verification stage
            setIsVerifying(true);
            setLoading(false);
            Alert.alert('Verify Your Email', 'We have sent a 6-digit verification code to your email.');
        }
    };

    const handleVerifyOtp = async () => {
        if (otpCode.length !== 6) {
            Alert.alert('Error', 'Please enter the 6-digit code');
            return;
        }

        setVerificationLoading(true);
        const { data, error } = await supabase.auth.verifyOtp({
            email: email.trim(),
            token: otpCode,
            type: 'signup'
        });

        if (error) {
            Alert.alert('Verification Failed', error.message);
            setVerificationLoading(false);
        } else {
            Alert.alert('Success', 'Your email has been verified!');
            router.replace('/(tabs)');
        }
    };

    const handleResendOtp = async () => {
        const { error } = await supabase.auth.resend({
            type: 'signup',
            email: email.trim(),
        });
        if (error) Alert.alert('Error', error.message);
        else Alert.alert('Sent', 'A new verification code has been sent to your email.');
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
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <ArrowLeft size={24} color={COLORS.white} />
                </TouchableOpacity>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
                    <MotiView
                        from={{ opacity: 0, translateY: 30 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'timing', duration: 1000 }}
                        style={styles.header}
                    >
                        <Text style={styles.title}>Create Account</Text>
                        <Text style={styles.subtitle}>Join the network and help build a safer Kenya.</Text>
                    </MotiView>

                    <MotiView
                        from={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 200 }}
                    >
                        <BlurView intensity={40} tint="light" style={styles.glassCard}>
                            {!isVerifying ? (
                                <View style={styles.form}>
                                    <View style={styles.inputContainer}>
                                        <View style={styles.inputIconBox}>
                                            <User size={18} color={COLORS.white} />
                                        </View>
                                        <TextInput
                                            placeholder="Full Name"
                                            style={styles.input}
                                            placeholderTextColor="rgba(255,255,255,0.6)"
                                            value={fullName}
                                            onChangeText={setFullName}
                                        />
                                    </View>

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

                                    <TouchableOpacity
                                        style={styles.inputContainer}
                                        onPress={() => setIsCountyModalVisible(true)}
                                    >
                                        <View style={styles.inputIconBox}>
                                            <MapPin size={18} color={COLORS.white} />
                                        </View>
                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                            <Text style={[styles.inputFieldText, !county && { color: 'rgba(255,255,255,0.6)' }]}>
                                                {county || 'Select Your County'}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>

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

                                    <View style={styles.inputContainer}>
                                        <View style={styles.inputIconBox}>
                                            <Lock size={18} color={COLORS.white} />
                                        </View>
                                        <TextInput
                                            placeholder="Confirm Password"
                                            secureTextEntry={!showConfirmPassword}
                                            style={styles.input}
                                            placeholderTextColor="rgba(255,255,255,0.6)"
                                            value={confirmPassword}
                                            onChangeText={setConfirmPassword}
                                        />
                                        <TouchableOpacity
                                            style={styles.monkeyToggle}
                                            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                        >
                                            <Text style={styles.monkeyEmoji}>{showConfirmPassword ? '🙈' : '🐵'}</Text>
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.termsWrapper}>
                                        <TouchableOpacity
                                            style={styles.termsRow}
                                            onPress={() => setAgree(!agree)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={[styles.checkbox, agree && styles.checkboxActive]}>
                                                {agree && <Check size={12} color={COLORS.white} strokeWidth={4} />}
                                            </View>
                                            <Text style={styles.termsText}>
                                                I agree to the{' '}
                                                <Text
                                                    style={styles.legalLink}
                                                    onPress={() => router.push('/legal/terms')}
                                                >Terms of Service</Text>
                                                {' '}and{' '}
                                                <Text
                                                    style={styles.legalLink}
                                                    onPress={() => router.push('/legal/privacy')}
                                                >Privacy Policy</Text>
                                            </Text>
                                        </TouchableOpacity>
                                    </View>

                                    <TouchableOpacity
                                        style={[styles.signupBtn, loading && { opacity: 0.7 }]}
                                        onPress={handleSignUp}
                                        disabled={loading}
                                    >
                                        <LinearGradient colors={[COLORS.white, '#E8E8E8']} style={styles.gradient}>
                                            {loading ? (
                                                <ActivityIndicator color={COLORS.primary} />
                                            ) : (
                                                <>
                                                    <Text style={styles.signupBtnText}>Get Started</Text>
                                                    <ArrowRight size={20} color={COLORS.primary} />
                                                </>
                                            )}
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={styles.form}>
                                    <Text style={styles.otpLabel}>Verify your account</Text>
                                    <Text style={styles.otpSub}>Enter the 6-digit code sent to {email}</Text>

                                    <View style={styles.inputContainer}>
                                        <View style={styles.inputIconBox}>
                                            <Lock size={18} color={COLORS.white} />
                                        </View>
                                        <TextInput
                                            placeholder="000000"
                                            style={[styles.input, { letterSpacing: 8, fontSize: 24 }]}
                                            placeholderTextColor="rgba(255,255,255,0.4)"
                                            keyboardType="number-pad"
                                            maxLength={6}
                                            value={otpCode}
                                            onChangeText={setOtpCode}
                                        />
                                    </View>

                                    <TouchableOpacity
                                        style={[styles.signupBtn, verificationLoading && { opacity: 0.7 }]}
                                        onPress={handleVerifyOtp}
                                        disabled={verificationLoading}
                                    >
                                        <LinearGradient colors={[COLORS.white, '#E8E8E8']} style={styles.gradient}>
                                            {verificationLoading ? (
                                                <ActivityIndicator color={COLORS.primary} />
                                            ) : (
                                                <>
                                                    <Text style={styles.signupBtnText}>Verify Code</Text>
                                                    <Check size={20} color={COLORS.primary} />
                                                </>
                                            )}
                                        </LinearGradient>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.resendBtn}
                                        onPress={handleResendOtp}
                                    >
                                        <Text style={styles.resendText}>Didn't receive a code? Resend</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={() => setIsVerifying(false)}
                                        style={{ marginTop: 12 }}
                                    >
                                        <Text style={[styles.loginText, { textAlign: 'center' }]}>Back to Signup</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </BlurView>
                    </MotiView>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Already have an account? </Text>
                        <TouchableOpacity onPress={() => router.back()}>
                            <Text style={styles.loginText}>Sign In</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>

                {/* County Selection Modal */}
                <Modal
                    visible={isCountyModalVisible}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setIsCountyModalVisible(false)}
                >
                    <BlurView intensity={90} tint="dark" style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Select County</Text>
                                <TouchableOpacity onPress={() => setIsCountyModalVisible(false)}>
                                    <Text style={styles.closeText}>Close</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.searchContainer}>
                                <Search size={20} color="rgba(255,255,255,0.5)" />
                                <TextInput
                                    placeholder="Search county..."
                                    style={styles.searchInput}
                                    placeholderTextColor="rgba(255,255,255,0.4)"
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    autoFocus
                                />
                            </View>

                            <FlatList
                                data={filteredCounties}
                                keyExtractor={(item: string) => item}
                                contentContainerStyle={{ paddingBottom: 40 }}
                                renderItem={({ item }: { item: string }) => (
                                    <TouchableOpacity
                                        style={[styles.countyItem, county === item && styles.countyItemActive]}
                                        onPress={() => {
                                            setCounty(item);
                                            setIsCountyModalVisible(false);
                                            setSearchQuery('');
                                        }}
                                    >
                                        <Text style={[styles.countyText, county === item && styles.countyTextActive]}>{item}</Text>
                                        {county === item && <Check size={18} color={COLORS.primary} />}
                                    </TouchableOpacity>
                                )}
                            />
                        </View>
                    </BlurView>
                </Modal>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.black },
    safe: { flex: 1 },
    backBtn: { padding: SPACING.lg },
    scroll: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.xxl },
    header: { marginBottom: 40, marginTop: 20 },
    title: { fontSize: 40, fontWeight: '900', color: COLORS.white, letterSpacing: -1 },
    subtitle: { fontSize: 18, color: 'rgba(255,255,255,0.7)', marginTop: 12, lineHeight: 26, fontWeight: '500' },
    glassCard: { borderRadius: 32, padding: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', ...SHADOWS.premium },
    form: { gap: 18 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', height: 64, borderRadius: 20, paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    inputIconBox: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    input: { flex: 1, fontSize: 16, color: COLORS.white, marginLeft: 12, fontWeight: '600' },
    monkeyToggle: { padding: 4 },
    monkeyEmoji: { fontSize: 24 },
    termsWrapper: { marginTop: 8 },
    termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    checkbox: { width: 22, height: 22, borderRadius: 8, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center', marginTop: 2 },
    checkboxActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    termsText: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 20, fontWeight: '600' },
    legalLink: { color: COLORS.white, textDecorationLine: 'underline', fontWeight: '800' },
    signupBtn: { height: 64, borderRadius: 24, overflow: 'hidden', marginTop: 16, ...SHADOWS.premium },
    gradient: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
    signupBtnText: { color: COLORS.primary, fontSize: 18, fontWeight: '900' },
    inputFieldText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
    footerText: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '600' },
    loginText: { color: COLORS.white, fontWeight: '800', fontSize: 14, textDecorationLine: 'underline' },
    otpLabel: { fontSize: 22, fontWeight: '900', color: COLORS.white, marginBottom: 8, textAlign: 'center' },
    otpSub: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 24, fontWeight: '500' },
    resendBtn: { marginTop: 24, alignSelf: 'center' },
    resendText: { color: COLORS.white, fontSize: 14, fontWeight: '700', opacity: 0.8 },
    // Modal Styles
    modalContainer: { flex: 1, justifyContent: 'flex-end' },
    modalContent: { backgroundColor: 'rgba(20,20,20,0.95)', borderTopLeftRadius: 32, borderTopRightRadius: 32, height: '80%', padding: 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 24, fontWeight: '900', color: COLORS.white },
    closeText: { color: COLORS.primary, fontWeight: '800', fontSize: 16 },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', height: 56, borderRadius: 16, paddingHorizontal: 16, marginBottom: 16 },
    searchInput: { flex: 1, marginLeft: 12, color: COLORS.white, fontSize: 16, fontWeight: '600' },
    countyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    countyItemActive: { backgroundColor: 'rgba(23,163,74,0.1)', paddingHorizontal: 12, borderRadius: 12 },
    countyText: { fontSize: 17, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
    countyTextActive: { color: COLORS.primary, fontWeight: '800' },
});
