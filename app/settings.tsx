import { BORDER_RADIUS, COLORS, SHADOWS, SPACING } from '@/constants/Theme';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/context/ProfileContext';
import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { 
    Bell, 
    ChevronRight, 
    Eye, 
    Shield, 
    Smartphone, 
    Trash2, 
    User as UserIcon, 
    ShieldCheck, 
    LogOut, 
    Mail, 
    MapPin,
    Phone,
    Trophy,
    CheckCircle,
    TrendingUp
} from 'lucide-react-native';
import React, { useState, useEffect } from 'react';
import { 
    ScrollView, 
    StyleSheet, 
    Switch, 
    Text, 
    TouchableOpacity, 
    View, 
    Alert,
    ActivityIndicator,
    Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { MotiView } from 'moti';

export default function SettingsScreen() {
    const router = useRouter();
    const { profile, loading: profileLoading } = useProfile();
    const [notifications, setNotifications] = useState(true);
    const [darkMode, setDarkMode] = useState(false);
    const [biometrics, setBiometrics] = useState(true);
    const [stats, setStats] = useState({ reports: 0, resolved: 0 });

    useEffect(() => {
        const fetchStats = async () => {
            if (!profile?.id) return;
            try {
                const [reportsRes, resolvedRes] = await Promise.all([
                    supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('user_id', profile.id),
                    supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('user_id', profile.id).in('status', ['Resolved', 'Closed', 'resolved', 'closed'])
                ]);
                setStats({
                    reports: reportsRes.count || 0,
                    resolved: resolvedRes.count || 0
                });
            } catch (err) {
                console.error('Error fetching stats:', err);
            }
        };
        fetchStats();
    }, [profile?.id]);

    const handleLogout = async () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Logout', 
                    style: 'destructive',
                    onPress: async () => {
                        await supabase.auth.signOut();
                        router.replace('/auth/login');
                    }
                }
            ]
        );
    };

    const SettingRow = ({ icon: Icon, title, value, onValueChange, type = 'switch', onPress, subValue }: any) => (
        <TouchableOpacity 
            style={styles.settingRow} 
            onPress={onPress} 
            disabled={type === 'switch'}
            activeOpacity={0.7}
        >
            <View style={styles.iconBox}>
                <Icon size={20} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={styles.settingTitle}>{title}</Text>
                {subValue && <Text style={styles.settingSubValue}>{subValue}</Text>}
            </View>
            {type === 'switch' ? (
                <Switch
                    value={value}
                    onValueChange={onValueChange}
                    trackColor={{ false: COLORS.border, true: COLORS.primary }}
                    thumbColor={COLORS.white}
                />
            ) : (
                <ChevronRight size={18} color={COLORS.textMuted} />
            )}
        </TouchableOpacity>
    );

    // If profile is still loading on first-ever mount
    if (profileLoading && !profile) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ 
                headerShown: true,
                title: 'Account Settings',
                headerTitleStyle: { fontWeight: '900' },
                headerShadowVisible: false,
                headerStyle: { backgroundColor: COLORS.background }
            }} />
            
            <SafeAreaView style={styles.safe} edges={['bottom']}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
                    
                    {/* Profile Aero Ultra Header - Floating Glass */}
                    <View style={styles.headerWrapper}>
                        <LinearGradient 
                            colors={[COLORS.primary, '#064e3b']} 
                            start={{ x: 0, y: 0 }} 
                            end={{ x: 1, y: 1 }} 
                            style={styles.headerGradient} 
                        />
                        
                        <MotiView 
                            from={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ type: 'spring', damping: 15 }}
                            style={styles.floatingGlass}
                        >
                            <BlurView intensity={Platform.OS === 'ios' ? 70 : 100} tint="light" style={styles.glassContent}>
                                <View style={styles.headerTop}>
                                    <View style={styles.avatarWrapper}>
                                        <View style={styles.avatarBackground}>
                                            <UserIcon size={40} color={COLORS.primary} />
                                        </View>
                                        <View style={styles.premiumBadge}>
                                            <ShieldCheck size={12} color={COLORS.white} />
                                        </View>
                                    </View>
                                    
                                    <View style={styles.userInfo}>
                                        <Text style={styles.userNameText}>{profile?.full_name || 'Kenya Citizen'}</Text>
                                        <View style={styles.badgeRow}>
                                            <View style={styles.verifiedTag}>
                                                <Text style={styles.verifiedText}>VERIFIED CITIZEN</Text>
                                            </View>
                                            <View style={styles.activeTag}>
                                                <Text style={styles.activeText}>ACTIVE</Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.statsGrid}>
                                    <View style={styles.statBox}>
                                        <Text style={styles.statNumber}>{stats.reports}</Text>
                                        <Text style={styles.statLabel}>REPORTS</Text>
                                    </View>
                                    <View style={styles.statBorder} />
                                    <View style={styles.statBox}>
                                        <Text style={styles.statNumber}>{stats.resolved}</Text>
                                        <Text style={styles.statLabel}>RESOLVED</Text>
                                    </View>
                                    <View style={styles.statBorder} />
                                    <View style={styles.statBox}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                            <Text style={styles.statNumber}>{profile?.accuracy_score || 0}</Text>
                                            <TrendingUp size={14} color={COLORS.success} />
                                        </View>
                                        <Text style={styles.statLabel}>IMPACT SCORE</Text>
                                    </View>
                                </View>
                            </BlurView>
                        </MotiView>
                    </View>

                    <Text style={styles.sectionHeader}>Civic Achievements</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.achievementScroll}>
                        {[
                            { title: 'First Responder', icon: Trophy, status: 'LOCKED', color: '#94a3b8' },
                            { title: 'Action Hero', icon: CheckCircle, status: 'EARNED', color: COLORS.success },
                            { title: 'Verifier', icon: Shield, status: 'LOCKED', color: '#94a3b8' }
                        ].map((item, i) => (
                            <View key={i} style={styles.achievementCard}>
                                <View style={[styles.achievementIcon, { backgroundColor: item.color + '15' }]}>
                                    <item.icon size={24} color={item.color} />
                                </View>
                                <Text style={styles.achievementTitle}>{item.title}</Text>
                                <View style={[styles.statusBadge, { backgroundColor: item.color + '10' }]}>
                                    <Text style={[styles.statusText, { color: item.color }]}>{item.status}</Text>
                                </View>
                            </View>
                        ))}
                    </ScrollView>

                    <Text style={styles.sectionHeader}>Contact Information</Text>
                    <View style={styles.card}>
                         <SettingRow 
                            icon={Phone} 
                            title="Phone Number" 
                            type="link" 
                            subValue={profile?.phone || 'Not linked'}
                        />
                         <View style={styles.divider} />
                         <SettingRow 
                            icon={MapPin} 
                            title="Residential County" 
                            type="link" 
                            subValue={profile?.county || 'Set your location'}
                        />
                    </View>

                    <Text style={styles.sectionHeader}>Preferences</Text>
                    <View style={styles.card}>
                        <SettingRow icon={Bell} title="Push Notifications" value={notifications} onValueChange={setNotifications} />
                        <View style={styles.divider} />
                        <SettingRow icon={Smartphone} title="Aero Dark Mode" value={darkMode} onValueChange={setDarkMode} />
                        <View style={styles.divider} />
                        <SettingRow icon={Eye} title="Low Data Usage" value={false} />
                    </View>

                    <Text style={styles.sectionHeader}>Security</Text>
                    <View style={styles.card}>
                        <SettingRow icon={Shield} title="Biometric Access" value={biometrics} onValueChange={setBiometrics} />
                        <View style={styles.divider} />
                        <SettingRow icon={Shield} title="Update Password" type="link" />
                    </View>

                    <Text style={styles.sectionHeader}>System</Text>
                    <View style={styles.card}>
                        <TouchableOpacity style={styles.logoutRow} onPress={handleLogout}>
                            <View style={[styles.iconBox, { backgroundColor: COLORS.error + '10' }]}>
                                <LogOut size={20} color={COLORS.error} />
                            </View>
                            <Text style={styles.logoutText}>Sign Out</Text>
                        </TouchableOpacity>
                        <View style={styles.divider} />
                        <TouchableOpacity style={styles.dangerRow}>
                            <View style={[styles.iconBox, { backgroundColor: COLORS.error + '10' }]}>
                                <Trash2 size={20} color={COLORS.error} />
                            </View>
                            <Text style={styles.dangerText}>Delete Account Data</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.footer}>
                        <Text style={styles.versionText}>KIR App Production v2.4.0</Text>
                        <Text style={styles.infoText}>In partnership with Kenya Public Safety Authorities</Text>
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    safe: { flex: 1 },
    scroll: { paddingBottom: 100 },
    
    // Aero Ultra Header
    headerWrapper: {
        height: 200,
        marginBottom: 80,
    },
    headerGradient: {
        height: 160,
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
    },
    floatingGlass: {
        position: 'absolute',
        top: 60,
        left: 20,
        right: 20,
        borderRadius: 32,
        overflow: 'hidden',
        ...SHADOWS.premium,
        backgroundColor: COLORS.white + '90',
        borderWidth: 1,
        borderColor: COLORS.white,
    },
    glassContent: {
        padding: 24,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    avatarWrapper: {
        position: 'relative',
    },
    avatarBackground: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.soft,
    },
    premiumBadge: {
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
    userInfo: {
        marginLeft: 16,
        flex: 1,
    },
    userNameText: {
        fontSize: 22,
        fontWeight: '900',
        color: COLORS.black,
        marginBottom: 6,
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
        backgroundColor: COLORS.white + '50',
        borderRadius: 20,
        padding: 16,
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 18,
        fontWeight: '900',
        color: COLORS.black,
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 9,
        fontWeight: '800',
        color: COLORS.textMuted,
        letterSpacing: 0.5,
    },
    statBorder: {
        width: 1,
        height: 24,
        backgroundColor: COLORS.border,
    },

    achievementScroll: {
        paddingLeft: 20,
        paddingRight: 20,
        gap: 16,
        marginBottom: 32,
    },
    achievementCard: {
        width: 140,
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 20,
        alignItems: 'center',
        ...SHADOWS.soft,
        borderWidth: 1,
        borderColor: COLORS.white,
    },
    achievementIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    achievementTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: COLORS.black,
        textAlign: 'center',
        marginBottom: 8,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 9,
        fontWeight: '900',
    },

    sectionHeader: { 
        fontSize: 12, 
        fontWeight: '900', 
        color: COLORS.textMuted, 
        textTransform: 'uppercase', 
        marginBottom: 12, 
        marginLeft: 8, 
        letterSpacing: 1.5 
    },
    card: { 
        backgroundColor: COLORS.white, 
        borderRadius: 24, 
        paddingVertical: 8, 
        ...SHADOWS.soft, 
        marginBottom: 32,
        borderWidth: 1,
        borderColor: COLORS.white + '50',
    },
    settingRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    iconBox: { 
        width: 44, 
        height: 44, 
        borderRadius: 14, 
        backgroundColor: COLORS.primary + '10', 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    settingTitle: { fontSize: 16, fontWeight: '700', color: COLORS.black },
    settingSubValue: { fontSize: 13, color: COLORS.textMuted, fontWeight: '500', marginTop: 2 },
    divider: { height: 1, backgroundColor: COLORS.background, marginLeft: 72 },
    
    logoutRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    logoutText: { marginLeft: 16, fontSize: 16, fontWeight: '700', color: COLORS.error },
    dangerRow: { flexDirection: 'row', alignItems: 'center', padding: 16, opacity: 0.6 },
    dangerText: { marginLeft: 16, fontSize: 16, fontWeight: '700', color: COLORS.error },
    
    footer: { marginTop: 0, alignItems: 'center', paddingBottom: 20 },
    versionText: { fontSize: 12, fontWeight: '800', color: COLORS.textMuted, marginBottom: 4 },
    infoText: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 40 },
});
