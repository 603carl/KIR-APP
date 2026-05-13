import { COLORS, SHADOWS } from '@/constants/Theme';
import { registerForPushNotificationsAsync, savePushToken, sendTestNotification } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';
import {
    AlertTriangle,
    Award,
    Bell,
    ChevronRight,
    CircleChevronRight,
    FileText,
    HelpCircle,
    LogOut,
    Shield,
    Star,
    Trash2,
    TrendingUp,
    User,
    ShieldCheck
} from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { MotiView } from 'moti';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProfileScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [profile, setProfile] = useState<any>(null);
    const [stats, setStats] = useState({
        reports: 0,
        resolved: 0,
        score: 0,
        verifications: 0,
        velocity: 0,
        isFirstResponder: false,
        isCommunitySentinel: false,
        topInterest: 'General'
    });
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Modal States
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [settingsModalVisible, setSettingsModalVisible] = useState(false);
    const [activeModal, setActiveModal] = useState<'info' | 'notifications' | 'privacy' | null>(null);

    // Form States
    const [editName, setEditName] = useState('');
    const [editBio, setEditBio] = useState('');
    const [editLocation, setEditLocation] = useState('');

    // Emergency Info States
    const [bloodGroup, setBloodGroup] = useState('');
    const [emergencyName, setEmergencyName] = useState('');
    const [emergencyPhone, setEmergencyPhone] = useState('');
    const [medicalConditions, setMedicalConditions] = useState('');

    // Security States
    const [isBiometricSupported, setIsBiometricSupported] = useState(false);
    const [isBiometricEnrolled, setIsBiometricEnrolled] = useState(false);

    // Account Deletion States
    const [deletionModalVisible, setDeletionModalVisible] = useState(false);
    const [deletionStep, setDeletionStep] = useState<'confirm' | 'otp'>('confirm');
    const [deletionOtp, setDeletionOtp] = useState('');
    const [deletionLoading, setDeletionLoading] = useState(false);

    useEffect(() => {
        fetchProfile();
        checkBiometrics();
        setupNotifications();
    }, [fetchProfile]);

    const checkBiometrics = async () => {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        setIsBiometricSupported(compatible);
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setIsBiometricEnrolled(enrolled);
    };

    const setupNotifications = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            const token = await registerForPushNotificationsAsync();
            if (token) {
                await savePushToken(session.user.id, token);
            }
        }
    };

    const handleAuthenticate = async () => {
        const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Authenticate to access security settings',
            fallbackLabel: 'Use Passcode',
        });
        return result.success;
    };

    const fetchProfile = useCallback(async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                router.replace('/auth/login');
                return;
            }

            const userId = session.user.id;

            // Fetch all data in parallel with robust error suppression
            const [profileRes, reportsRes, resolvedRes, verifyRes, iqRes] = await Promise.allSettled([
                supabase.from('profiles').select('*').eq('id', userId).single(),
                supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('user_id', userId),
                supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'Resolved'),
                supabase.from('verifications').select('*', { count: 'exact', head: true }).eq('user_id', userId),
                supabase.rpc('get_user_civic_intelligence', { target_user_id: userId })
            ]);

            // 1. Handle Profile Data (Crucial)
            if (profileRes.status === 'fulfilled' && profileRes.value.data) {
                const profileData = profileRes.value.data;
                setProfile(profileData);
                setEditName(profileData.full_name || '');
                setEditBio(profileData.bio || '');
                setEditLocation(profileData.location_name || 'Nairobi, Kenya');
                setBloodGroup(profileData.blood_group || '');
                setEmergencyName(profileData.emergency_contact_name || '');
                setEmergencyPhone(profileData.emergency_contact_phone || '');
                setMedicalConditions(profileData.medical_conditions || '');
            } else if (session.user) {
                // Fallback: Use session metadata if profile fetch fails
                const fullName = session.user.user_metadata?.full_name || 'Citizen';
                setProfile({ full_name: fullName, id: userId });
                setEditName(fullName);
            }

            // 2. Handle Stats (Resilient)
            const iq = iqRes.status === 'fulfilled' ? (iqRes.value.data?.[0] || {}) : {};
            setStats({
                reports: reportsRes.status === 'fulfilled' ? reportsRes.value.count || 0 : 0,
                resolved: resolvedRes.status === 'fulfilled' ? resolvedRes.value.count || 0 : 0,
                verifications: verifyRes.status === 'fulfilled' ? verifyRes.value.count || 0 : 0,
                score: iq.impact_score || 0,
                velocity: iq.velocity || 0,
                isFirstResponder: iq.is_first_responder || false,
                isCommunitySentinel: iq.is_community_sentinel || false,
                topInterest: iq.top_interest || 'General'
            });

        } catch (error: any) {
            console.error('[Profile] Global fetch error:', error);
            if (error.message?.includes('JWT') || error.status === 401) {
                router.replace('/auth/login');
            }
        } finally {
            setLoading(false);
        }
    }, [router]);


    const pickAvatar = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
            });

            if (!result.canceled && result.assets?.[0]) {
                uploadAvatar(result.assets[0].uri);
            }
        } catch (e) {
            Alert.alert('Permission Denied', 'Please allow access to your photos to update your profile picture.');
        }
    };

    const uploadAvatar = async (uri: string) => {
        setUploading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const fileName = `avatars/${user.id}/${Date.now()}.jpg`;
            
            // Note: In some Expo versions, fetching the blob is more reliable for Supabase uploads
            const response = await fetch(uri);
            const blob = await response.blob();

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', user.id);

            if (updateError) throw updateError;
            setProfile((prev: any) => ({ ...prev, avatar_url: publicUrl }));
            Alert.alert('Success', 'Profile picture updated!');

        } catch (error: any) {
            console.error('[Avatar] Upload Error:', error);
            Alert.alert('Upload Failed', error.message || 'Check your internet connection');
        } finally {
            setUploading(false);
        }
    };

    const handleUpdateProfile = async () => {
        if (!editName.trim()) {
            Alert.alert('Required Field', 'Please enter your full name.');
            return;
        }
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Session expired');

            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: editName.trim(),
                    bio: editBio.trim(),
                    location_name: editLocation.trim(),
                    blood_group: bloodGroup.trim(),
                    emergency_contact_name: emergencyName.trim(),
                    emergency_contact_phone: emergencyPhone.trim(),
                    medical_conditions: medicalConditions.trim(),
                })
                .eq('id', user.id);

            if (error) throw error;
            
            setProfile((prev: any) => ({
                ...prev,
                full_name: editName,
                bio: editBio,
                location_name: editLocation,
                blood_group: bloodGroup,
                emergency_contact_name: emergencyName,
                emergency_contact_phone: emergencyPhone,
                medical_conditions: medicalConditions
            }));
            
            setEditModalVisible(false);
            Alert.alert('Profile Saved', 'Your changes have been synchronized.');
        } catch (error: any) {
            Alert.alert('Update Failed', error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleUpdatePrefs = async (key: string, value: any, section: 'notifications' | 'privacy') => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const field = section === 'notifications' ? 'notification_prefs' : 'privacy_settings';
            const currentPrefs = profile?.[field] || {};
            const newPrefs = { ...currentPrefs, [key]: value };

            const { error } = await supabase
                .from('profiles')
                .update({ [field]: newPrefs })
                .eq('id', user.id);

            if (error) throw error;
            if (profile) {
                setProfile((prev: any) => ({ ...prev, [field]: newPrefs }));
            }
        } catch (error: any) {
            console.error('Update preferences error:', error);
        }
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.replace('/auth/login');
    };

    const handleRequestDeletion = async () => {
        setDeletionLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            const { data, error } = await supabase.functions.invoke('request-account-deletion', {
                headers: { Authorization: `Bearer ${session.access_token}` },
            });

            if (error) throw error;

            // If Resend is not configured, the mock OTP is returned for dev testing
            if (data?.mockOtpIfNoResend) {
                Alert.alert('Dev Mode', `Your OTP (no email provider active): ${data.mockOtpIfNoResend}`);
            } else {
                Alert.alert('Email Sent', 'A 6-digit verification code has been sent to your email.');
            }
            setDeletionStep('otp');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to initiate deletion request.');
        } finally {
            setDeletionLoading(false);
        }
    };

    const handleConfirmDeletion = async () => {
        if (deletionOtp.length !== 6) {
            Alert.alert('Invalid Code', 'Please enter the 6-digit code sent to your email.');
            return;
        }
        setDeletionLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            const { data, error } = await supabase.functions.invoke('confirm-account-deletion', {
                headers: { Authorization: `Bearer ${session.access_token}` },
                body: { token: deletionOtp },
            });

            if (error) throw error;

            Alert.alert('Account Deleted', 'Your account has been permanently removed.', [
                { text: 'OK', onPress: () => {
                    supabase.auth.signOut();
                    router.replace('/auth/login');
                }}
            ]);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Deletion failed. Check your code and try again.');
        } finally {
            setDeletionLoading(false);
        }
    };

    const MenuItem = ({ icon: Icon, title, subtitle, onPress, showSwitch, value, onValueChange, iconColor = COLORS.primary, iconBg = '#F8F9FA' }: any) => (
        <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
            <View style={[styles.menuIconContainer, { backgroundColor: iconBg }]}>
                <Icon size={20} color={iconColor} />
            </View>
            <View style={styles.menuTextContainer}>
                <Text style={styles.menuTitle}>{title}</Text>
                {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
            </View>
            {showSwitch ? (
                <Switch
                    trackColor={{ false: '#E2E8F0', true: COLORS.primary }}
                    thumbColor={COLORS.white}
                    value={value}
                    onValueChange={onValueChange}
                />
            ) : (
                <ChevronRight size={18} color="#CBD5E1" />
            )}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ backgroundColor: COLORS.background }}
            >
                {/* Profile Aero Ultra Header - Floating Glass */}
                <View style={[styles.headerWrapper, { height: 220 + insets.top }]}>
                    <LinearGradient
                        colors={[COLORS.primary, '#004D2C']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.headerGradient}
                    >
                        <SafeAreaView edges={['top']} style={styles.headerContent}>
                            <View style={styles.headerInner}>
                                <View style={styles.profileRow}>
                                    <TouchableOpacity
                                        style={styles.imageContainer}
                                        onPress={pickAvatar}
                                        disabled={uploading}
                                        activeOpacity={0.9}
                                    >
                                        {uploading || loading ? (
                                            <View style={styles.profileImageSkeleton}>
                                                <ActivityIndicator color={COLORS.white} />
                                            </View>
                                        ) : (
                                            <Image
                                                source={profile?.avatar_url ? { uri: profile.avatar_url } : { uri: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=200&auto=format&fit=crop' }}
                                                style={styles.profileImage}
                                            />
                                        )}
                                        <View style={styles.editBadge}>
                                            <ShieldCheck size={12} color={COLORS.white} />
                                        </View>
                                    </TouchableOpacity>

                                    <View style={styles.nameContainer}>
                                        <Text style={[styles.name, { color: COLORS.white }]}>
                                            {loading ? <ActivityIndicator size="small" color={COLORS.white} /> : (profile?.full_name || 'Citizen')}
                                        </Text>
                                        <View style={styles.badgeRow}>
                                            <View style={[styles.verifiedTag, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                                                <Text style={[styles.verifiedText, { color: COLORS.white }]}>VERIFIED CITIZEN</Text>
                                            </View>
                                            <View style={[styles.activeTag, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                                                <Text style={[styles.activeText, { color: COLORS.white }]}>{stats.topInterest.toUpperCase()}</Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.statsGrid}>
                                    <View style={styles.statBox}>
                                        <Text style={[styles.statNumber, { color: COLORS.white }]}>{loading ? <ActivityIndicator size="small" color={COLORS.white} /> : stats.reports}</Text>
                                        <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.7)' }]}>REPORTS</Text>
                                    </View>
                                    <View style={[styles.statBorder, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
                                    <View style={styles.statBox}>
                                        <Text style={[styles.statNumber, { color: COLORS.white }]}>{loading ? <ActivityIndicator size="small" color={COLORS.white} /> : stats.resolved}</Text>
                                        <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.7)' }]}>RESOLVED</Text>
                                    </View>
                                    <View style={[styles.statBorder, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
                                    <View style={styles.statBox}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                            <Text style={[styles.statNumber, { color: COLORS.white }]}>{loading ? <ActivityIndicator size="small" color={COLORS.white} /> : stats.score}</Text>
                                            {!loading && <TrendingUp size={14} color={COLORS.success} />}
                                        </View>
                                        <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.7)' }]}>IMPACT SCORE</Text>
                                    </View>
                                </View>
                            </View>
                        </SafeAreaView>
                    </LinearGradient>
                </View>

                <View style={styles.content}>
                    <Text style={styles.sectionTitle}>Civic Achievements</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.achievementScroll}>
                        {[
                            { id: '1', title: 'First Responder', icon: Star, color: COLORS.gold, earned: stats.isFirstResponder, subtitle: 'Elite Status' },
                            { id: '2', title: 'Action Hero', icon: Award, color: '#10B981', earned: stats.resolved >= 5, subtitle: 'Problem Solver' },
                            { id: '3', title: 'Verify Pro', icon: Shield, color: COLORS.primary, earned: stats.verifications >= 10, subtitle: 'Trustworthy' },
                            { id: '4', title: 'Civic Leader', icon: ShieldCheck, color: '#8B5CF6', earned: stats.reports >= 20, subtitle: 'Advocate' },
                            { id: '5', title: 'Community Watch', icon: User, color: '#EC4899', earned: stats.verifications >= 5, subtitle: 'Guardian' },
                            { id: '6', title: 'Pro Responder', icon: TrendingUp, color: '#F59E0B', earned: stats.resolved >= 2, subtitle: 'Expert' },
                        ].map(item => (
                            <MotiView
                                key={item.id}
                                from={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 400 + (parseInt(item.id) * 100) }}
                                style={[styles.achievementCard, !item.earned && { opacity: 0.6 }]}
                            >
                                <LinearGradient
                                    colors={item.earned ? [item.color + '15', item.color + '05'] : ['#F8F9FA', '#F1F5F9']}
                                    style={styles.achievementGradient}
                                >
                                    <View style={[styles.achievementIcon, { backgroundColor: item.earned ? item.color + '20' : '#E2E8F0' }]}>
                                        <item.icon size={26} color={item.earned ? item.color : '#94A3B8'} fill={item.earned ? item.color + '30' : 'transparent'} />
                                    </View>
                                    <Text style={styles.achievementTitle}>{item.title}</Text>
                                    <View style={styles.earnedBadge}>
                                        <Text style={[styles.earnedText, { color: item.earned ? item.color : '#94A3B8' }]}>
                                            {item.earned ? item.subtitle : 'Locked'}
                                        </Text>
                                    </View>
                                </LinearGradient>
                            </MotiView>
                        ))}
                    </ScrollView>

                    <Text style={styles.sectionTitle}>Account Settings</Text>
                    <View style={styles.card}>
                        <MenuItem
                            icon={User}
                            title="Personal & Emergency Info"
                            subtitle="Edit profile and emergency contact"
                            onPress={() => { setActiveModal('info'); setEditModalVisible(true); }}
                            iconColor="#6366F1"
                            iconBg="#EEF2FF"
                        />
                        <View style={styles.divider} />
                        <MenuItem
                            icon={Bell}
                            title="Notifications"
                            subtitle="Push, email, and emergency alerts"
                            onPress={() => { setActiveModal('notifications'); setEditModalVisible(true); }}
                            iconColor="#F59E0B"
                            iconBg="#FFFBEB"
                        />
                        <View style={styles.divider} />
                        <MenuItem
                            icon={Shield}
                            title="Privacy & Security"
                            subtitle="Anonymous reporting and app lock"
                            onPress={() => { setActiveModal('privacy'); setEditModalVisible(true); }}
                            iconColor="#10B981"
                            iconBg="#F0FDF4"
                        />
                    </View>

                    <Text style={styles.sectionTitle}>Support & Community</Text>
                    <View style={styles.card}>
                        <MenuItem
                            icon={HelpCircle}
                            title="Help Center"
                            onPress={() => router.push('/help')}
                            iconColor="#8B5CF6"
                            iconBg="#F5F3FF"
                        />
                        <View style={styles.divider} />
                        <MenuItem
                            icon={FileText}
                            title="Terms of Service"
                            onPress={() => router.push('/legal/terms')}
                            iconColor="#64748B"
                            iconBg="#F8FAFC"
                        />
                        <View style={styles.divider} />
                        <MenuItem
                            icon={Shield}
                            title="Privacy Policy"
                            onPress={() => router.push('/legal/privacy')}
                            iconColor="#64748B"
                            iconBg="#F8FAFC"
                        />
                        <View style={styles.divider} />
                        <MenuItem
                            icon={CircleChevronRight}
                            title="Community Guidelines"
                            onPress={() => router.push('/legal/guidelines')}
                            iconColor="#64748B"
                            iconBg="#F8FAFC"
                        />
                    </View>


                    <TouchableOpacity style={styles.logoutBtn} onPress={handleSignOut} activeOpacity={0.7}>
                        <MotiView
                            from={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
                        >
                            <LogOut size={20} color="#E11D48" />
                            <Text style={styles.logoutText}>Sign Out</Text>
                        </MotiView>
                    </TouchableOpacity>

                    {/* Danger Zone */}
                    <Text style={[styles.sectionTitle, { color: '#E11D48', marginTop: 24 }]}>Danger Zone</Text>
                    <View style={[styles.card, { borderColor: '#FEE2E2', borderWidth: 1 }]}>
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => {
                                Alert.alert(
                                    'Delete Account',
                                    'This action is irreversible. You will receive a verification code via email to confirm. Are you sure you want to proceed?',
                                    [
                                        { text: 'Cancel', style: 'cancel' },
                                        { text: 'Yes, Delete', style: 'destructive', onPress: () => {
                                            setDeletionStep('confirm');
                                            setDeletionOtp('');
                                            setDeletionModalVisible(true);
                                        }}
                                    ]
                                );
                            }}
                            activeOpacity={0.6}
                        >
                            <View style={[styles.menuIconContainer, { backgroundColor: '#FEF2F2' }]}>
                                <Trash2 size={20} color="#E11D48" />
                            </View>
                            <View style={styles.menuTextContainer}>
                                <Text style={[styles.menuTitle, { color: '#E11D48' }]}>Delete Account</Text>
                                <Text style={styles.menuSubtitle}>Permanently remove your account and all data</Text>
                            </View>
                            <ChevronRight size={18} color="#FCA5A5" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.versionText}>Version 1.0.0 (Premium Build)</Text>
                    <View style={{ height: 120 }} />
                </View>
            </ScrollView >

            {/* Premium Settings Modal */}
            < Modal
                visible={editModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setEditModalVisible(false)
                }
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <View style={styles.modalOverlay}>
                        <TouchableOpacity
                            style={styles.modalCloseOverlay}
                            activeOpacity={1}
                            onPress={() => setEditModalVisible(false)}
                        />
                        <View style={[styles.modalContent, { height: Dimensions.get('window').height * 0.9, paddingBottom: Math.max(20, insets.bottom) }]}>
                            <View style={styles.modalHeader}>
                                <View style={styles.modalHandle} />
                                <Text style={styles.modalTitle}>
                                    {activeModal === 'info' ? 'Edit Profile & Emergency' :
                                        activeModal === 'notifications' ? 'Notification Settings' : 'Privacy & Security'}
                                </Text>
                            </View>

                            <ScrollView
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={styles.modalScrollContent}
                                keyboardShouldPersistTaps="handled"
                            >
                                {activeModal === 'info' && (
                                    <View style={styles.modalBody}>
                                        <View style={styles.inputGroup}>
                                            <Text style={styles.modalLabel}>Full Name</Text>
                                            <TextInput
                                                style={styles.modalInput}
                                                value={editName}
                                                onChangeText={setEditName}
                                                placeholder="Enter your name"
                                            />
                                        </View>

                                        <View style={styles.row}>
                                            <View style={{ flex: 1, marginRight: 8 }}>
                                                <View style={styles.inputGroup}>
                                                    <Text style={styles.modalLabel}>Blood Group</Text>
                                                    <TextInput
                                                        style={styles.modalInput}
                                                        value={bloodGroup}
                                                        onChangeText={setBloodGroup}
                                                        placeholder="e.g. O+"
                                                    />
                                                </View>
                                            </View>
                                            <View style={{ flex: 2 }}>
                                                <View style={styles.inputGroup}>
                                                    <Text style={styles.modalLabel}>Primary Location</Text>
                                                    <TextInput
                                                        style={styles.modalInput}
                                                        value={editLocation}
                                                        onChangeText={setEditLocation}
                                                        placeholder="e.g. Nairobi"
                                                    />
                                                </View>
                                            </View>
                                        </View>

                                        <View style={styles.inputGroup}>
                                            <Text style={styles.modalLabel}>Emergency Contact Name</Text>
                                            <TextInput
                                                style={styles.modalInput}
                                                value={emergencyName}
                                                onChangeText={setEmergencyName}
                                                placeholder="Name of contact"
                                            />
                                        </View>

                                        <View style={styles.inputGroup}>
                                            <Text style={styles.modalLabel}>Emergency Contact Phone</Text>
                                            <TextInput
                                                style={styles.modalInput}
                                                value={emergencyPhone}
                                                onChangeText={setEmergencyPhone}
                                                placeholder="+254..."
                                                keyboardType="phone-pad"
                                            />
                                        </View>

                                        <View style={styles.inputGroup}>
                                            <Text style={styles.modalLabel}>Medical Conditions / Allergies</Text>
                                            <TextInput
                                                style={[styles.modalInput, { height: 100, textAlignVertical: 'top' }]}
                                                value={medicalConditions}
                                                onChangeText={setMedicalConditions}
                                                multiline
                                                placeholder="Any critical medical info..."
                                            />
                                        </View>

                                        <View style={styles.inputGroup}>
                                            <Text style={styles.modalLabel}>Bio</Text>
                                            <TextInput
                                                style={[styles.modalInput, { height: 100, textAlignVertical: 'top' }]}
                                                value={editBio}
                                                onChangeText={setEditBio}
                                                multiline
                                                placeholder="Tell us about yourself..."
                                            />
                                        </View>

                                        <TouchableOpacity
                                            style={styles.saveBtn}
                                            onPress={handleUpdateProfile}
                                            disabled={saving}
                                        >
                                            {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
                                        </TouchableOpacity>
                                    </View>
                                )}

                                {activeModal === 'notifications' && (
                                    <View style={styles.modalBody}>
                                        {[
                                            { key: 'push', title: 'Push Notifications', sub: 'Instant emergency alerts' },
                                            { key: 'email', title: 'Email Reports', sub: 'Weekly summaries of incidents' },
                                            { key: 'emergency', title: 'Critical Alerts', sub: 'Priority security warnings' },
                                        ].map(item => (
                                            <View key={item.key} style={styles.prefRow}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.prefTitle}>{item.title}</Text>
                                                    <Text style={styles.prefSub}>{item.sub}</Text>
                                                </View>
                                                <Switch
                                                    value={profile?.notification_prefs?.[item.key] ?? true}
                                                    onValueChange={(val) => handleUpdatePrefs(item.key, val, 'notifications')}
                                                    trackColor={{ false: COLORS.border, true: COLORS.primary }}
                                                />
                                            </View>
                                        ))}

                                        <TouchableOpacity
                                            style={[styles.prefRow, { backgroundColor: COLORS.primary + '10', borderColor: COLORS.primary + '30', borderWidth: 1 }]}
                                            onPress={sendTestNotification}
                                        >
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.prefTitle, { color: COLORS.primary }]}>Test Alert</Text>
                                                <Text style={styles.prefSub}>Send a test emergency notification now</Text>
                                            </View>
                                            <Bell size={20} color={COLORS.primary} />
                                        </TouchableOpacity>
                                    </View>
                                )}

                                {activeModal === 'privacy' && (
                                    <View style={styles.modalBody}>
                                        {isBiometricSupported && (
                                            <View style={[styles.prefRow, { marginBottom: 12, backgroundColor: COLORS.gold + '10' }]}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.prefTitle}>Biometric Lock</Text>
                                                    <Text style={styles.prefSub}>Require Fingerprint/FaceID to open app</Text>
                                                </View>
                                                <Switch
                                                    value={profile?.privacy_settings?.biometric_lock ?? false}
                                                    onValueChange={async (val) => {
                                                        if (val) {
                                                            const success = await handleAuthenticate();
                                                            if (!success) return;
                                                        }
                                                        handleUpdatePrefs('biometric_lock', val, 'privacy');
                                                    }}
                                                    trackColor={{ false: COLORS.border, true: COLORS.gold }}
                                                />
                                            </View>
                                        )}
                                        {[
                                            { key: 'anonymous_reporting', title: 'Anonymous by Default', sub: 'Keep your identity hidden' },
                                            { key: 'show_activity', title: 'Show My Activity', sub: 'Allow others to see your verifications' },
                                        ].map(item => (
                                            <View key={item.key} style={styles.prefRow}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.prefTitle}>{item.title}</Text>
                                                    <Text style={styles.prefSub}>{item.sub}</Text>
                                                </View>
                                                <Switch
                                                    value={profile?.privacy_settings?.[item.key] ?? false}
                                                    onValueChange={(val) => handleUpdatePrefs(item.key, val, 'privacy')}
                                                    trackColor={{ false: COLORS.border, true: COLORS.primary }}
                                                />
                                            </View>
                                        ))}

                                        <View style={[styles.prefRow, { flexDirection: 'column', alignItems: 'flex-start', gap: 16 }]}>
                                            <View>
                                                <Text style={styles.prefTitle}>Auto Sign-Out Timeout</Text>
                                                <Text style={styles.prefSub}>App will sign out after being in background</Text>
                                            </View>
                                            <View style={styles.timeoutSelector}>
                                                {[
                                                    { label: '30s', value: 30 },
                                                    { label: '1m', value: 60 },
                                                    { label: 'Never', value: -1 }
                                                ].map(opt => (
                                                    <TouchableOpacity
                                                        key={opt.value}
                                                        onPress={() => handleUpdatePrefs('auto_sign_out_timeout', opt.value, 'privacy')}
                                                        style={[
                                                            styles.timeoutOption,
                                                            (profile?.privacy_settings?.auto_sign_out_timeout ?? 30) === opt.value && styles.timeoutOptionActive
                                                        ]}
                                                    >
                                                        <Text style={[
                                                            styles.timeoutText,
                                                            (profile?.privacy_settings?.auto_sign_out_timeout ?? 30) === opt.value && styles.timeoutTextActive
                                                        ]}>{opt.label}</Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        </View>
                                    </View>
                                )}
                            </ScrollView>

                            <TouchableOpacity style={styles.closeBtn} onPress={() => setEditModalVisible(false)}>
                                <Text style={styles.closeBtnText}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal >

            {/* Account Deletion OTP Modal */}
            <Modal
                visible={deletionModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setDeletionModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={styles.modalCloseOverlay}
                        activeOpacity={1}
                        onPress={() => setDeletionModalVisible(false)}
                    />
                    <View style={[styles.modalContent, { height: 'auto', maxHeight: Dimensions.get('window').height * 0.55, paddingBottom: Math.max(20, insets.bottom) }]}>
                        <View style={styles.modalHeader}>
                            <View style={styles.modalHandle} />
                            <View style={{ alignItems: 'center', marginTop: 10 }}>
                                <View style={{ backgroundColor: '#FEF2F2', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                                    <AlertTriangle size={28} color="#E11D48" />
                                </View>
                                <Text style={[styles.modalTitle, { color: '#E11D48' }]}>Delete Account</Text>
                            </View>
                        </View>

                        {deletionStep === 'confirm' ? (
                            <View style={{ paddingHorizontal: 24, paddingBottom: 20 }}>
                                <Text style={{ fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 24 }}>
                                    A 6-digit verification code will be sent to your registered email address. You must enter this code to confirm the permanent deletion of your account.
                                </Text>
                                <TouchableOpacity
                                    style={[styles.saveBtn, { backgroundColor: '#E11D48' }]}
                                    onPress={handleRequestDeletion}
                                    disabled={deletionLoading}
                                >
                                    {deletionLoading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.saveBtnText}>Send Verification Code</Text>}
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.closeBtn} onPress={() => setDeletionModalVisible(false)}>
                                    <Text style={styles.closeBtnText}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={{ paddingHorizontal: 24, paddingBottom: 20 }}>
                                <Text style={{ fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 20 }}>
                                    Enter the 6-digit code sent to your email to permanently delete your account.
                                </Text>
                                <TextInput
                                    style={[styles.modalInput, { textAlign: 'center', fontSize: 28, letterSpacing: 12, fontWeight: '900' }]}
                                    value={deletionOtp}
                                    onChangeText={(text) => setDeletionOtp(text.replace(/[^0-9]/g, '').slice(0, 6))}
                                    keyboardType="number-pad"
                                    maxLength={6}
                                    placeholder="------"
                                    placeholderTextColor="#CBD5E1"
                                />
                                <TouchableOpacity
                                    style={[styles.saveBtn, { backgroundColor: '#E11D48', marginTop: 20 }]}
                                    onPress={handleConfirmDeletion}
                                    disabled={deletionLoading || deletionOtp.length !== 6}
                                >
                                    {deletionLoading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.saveBtnText}>Confirm Permanent Deletion</Text>}
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.closeBtn} onPress={() => { setDeletionStep('confirm'); setDeletionOtp(''); }}>
                                    <Text style={styles.closeBtnText}>Resend Code</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </View >
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    row: { flexDirection: 'row', alignItems: 'center' },
    headerWrapper: {
        marginBottom: 60,
    },
    headerGradient: {
        height: '100%',
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
    },
    headerContent: {
        paddingHorizontal: 20,
    },
    headerInner: {
        marginTop: 20,
    },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    imageContainer: {
        position: 'relative',
    },
    profileImage: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: COLORS.white,
        borderWidth: 2,
        borderColor: COLORS.white,
    },
    profileImageSkeleton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    editBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: COLORS.primary,
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.white,
    },
    nameContainer: {
        marginLeft: 16,
        flex: 1,
    },
    name: {
        fontSize: 24,
        fontWeight: '900',
        color: COLORS.white,
        marginBottom: 4,
    },
    badgeRow: {
        flexDirection: 'row',
        gap: 8,
    },
    verifiedTag: {
        backgroundColor: COLORS.primary + '15',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    verifiedText: {
        fontSize: 9,
        fontWeight: '900',
        color: COLORS.primary,
        letterSpacing: 0.5,
    },
    activeTag: {
        backgroundColor: COLORS.success + '15',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    activeText: {
        fontSize: 9,
        fontWeight: '900',
        color: COLORS.success,
        letterSpacing: 0.5,
    },
    statsGrid: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(0, 0, 0, 0.15)',
        borderRadius: 20,
        padding: 16,
    },
    statBox: {
        alignItems: 'center',
        flex: 1,
    },
    statNumber: {
        fontSize: 22,
        fontWeight: '900',
        color: COLORS.white,
    },
    statLabel: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.6)',
        fontWeight: '700',
        marginTop: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    statBorder: {
        width: 1,
        height: 24,
        backgroundColor: COLORS.border,
    },
    scoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    content: {
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: COLORS.black,
        marginBottom: 20,
        marginTop: 10,
        letterSpacing: -0.5,
    },
    achievementScroll: {
        paddingBottom: 20,
        gap: 16,
    },
    achievementCard: {
        width: 130,
        backgroundColor: COLORS.white,
        borderRadius: 24,
        overflow: 'hidden',
        ...SHADOWS.soft,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    achievementGradient: {
        padding: 16,
        alignItems: 'center',
        width: '100%',
    },
    achievementIcon: {
        width: 50,
        height: 50,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
        ...SHADOWS.soft,
    },
    achievementTitle: {
        fontSize: 14,
        fontWeight: '900',
        color: COLORS.black,
        textAlign: 'center',
        letterSpacing: -0.3,
    },
    earnedBadge: {
        backgroundColor: 'rgba(0,0,0,0.04)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
        marginTop: 8,
    },
    earnedText: {
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 24,
        paddingVertical: 8,
        ...SHADOWS.soft,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    menuIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: '#F8F9FA',
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuTextContainer: {
        flex: 1,
        marginLeft: 16,
    },
    menuTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: COLORS.black,
    },
    menuSubtitle: {
        fontSize: 13,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginLeft: 80,
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 64,
        borderRadius: 20,
        backgroundColor: '#FFF1F2',
        marginTop: 10,
        gap: 12,
    },
    logoutText: {
        fontSize: 16,
        fontWeight: '900',
        color: '#E11D48',
    },
    versionText: {
        textAlign: 'center',
        marginTop: 32,
        fontSize: 12,
        color: COLORS.textMuted,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    modalCloseOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
    modalContent: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        paddingTop: 12,
    },
    modalHeader: {
        alignItems: 'center',
        paddingBottom: 20,
    },
    modalHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#E2E8F0',
        borderRadius: 2,
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: COLORS.black,
    },
    modalScrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    modalBody: {
        gap: 20,
    },
    inputGroup: {
        gap: 8,
    },
    modalLabel: {
        fontSize: 12,
        fontWeight: '800',
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginLeft: 4,
    },
    modalInput: {
        backgroundColor: '#F8F9FA',
        borderRadius: 16,
        padding: 16,
        fontSize: 16,
        color: COLORS.black,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    saveBtn: {
        backgroundColor: COLORS.primary,
        height: 64,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        ...SHADOWS.medium,
    },
    saveBtnText: {
        color: COLORS.white,
        fontSize: 18,
        fontWeight: '900',
    },
    closeBtn: {
        paddingVertical: 20,
        alignItems: 'center',
    },
    closeBtnText: {
        color: COLORS.textMuted,
        fontWeight: '700',
        fontSize: 16,
    },
    prefRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    prefTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: COLORS.black,
    },
    prefSub: {
        fontSize: 12,
        color: COLORS.textMuted,
        marginTop: 4,
    },
    timeoutSelector: {
        flexDirection: 'row',
        backgroundColor: '#E2E8F0',
        borderRadius: 12,
        padding: 4,
        marginTop: 8,
    },
    timeoutOption: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    timeoutOptionActive: {
        backgroundColor: COLORS.white,
    },
    timeoutText: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
    timeoutTextActive: {
        color: COLORS.primary,
    },
});
