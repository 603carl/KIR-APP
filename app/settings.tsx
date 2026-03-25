import { BORDER_RADIUS, COLORS, SHADOWS, SPACING } from '@/constants/Theme';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/context/ProfileContext';
import { Stack, useRouter } from 'expo-router';
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
    Phone
} from 'lucide-react-native';
import React, { useState } from 'react';
import { 
    ScrollView, 
    StyleSheet, 
    Switch, 
    Text, 
    TouchableOpacity, 
    View, 
    Alert,
    ActivityIndicator 
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
                    
                    {/* Profile Aero Ultra Header */}
                    <MotiView 
                        from={{ opacity: 0, translateY: 20 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        style={styles.profileHeader}
                    >
                        <BlurView intensity={80} tint="light" style={styles.blurHeader}>
                            <View style={styles.headerContent}>
                                <View style={styles.avatarContainer}>
                                    <View style={styles.avatar}>
                                        <UserIcon size={44} color={COLORS.primary} />
                                    </View>
                                    <View style={styles.verifyBadge}>
                                        <ShieldCheck size={14} color={COLORS.white} />
                                    </View>
                                </View>
                                
                                <View style={styles.headerInfo}>
                                    <Text style={styles.userName}>{profile?.full_name || 'Kenya Citizen'}</Text>
                                    <View style={styles.roleBadge}>
                                        <Text style={styles.roleText}>{profile?.role?.toUpperCase() || 'CITIZEN'}</Text>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.profileStats}>
                                <View style={styles.statItem}>
                                    <Mail size={14} color={COLORS.textMuted} />
                                    <Text style={styles.statText} numberOfLines={1}>{profile?.email || 'No email'}</Text>
                                </View>
                                <View style={styles.statDivider} />
                                <View style={styles.statItem}>
                                    <MapPin size={14} color={COLORS.textMuted} />
                                    <Text style={styles.statText}>{profile?.county || 'Kenya'}</Text>
                                </View>
                            </View>
                        </BlurView>
                    </MotiView>

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
    scroll: { padding: SPACING.lg },
    
    // Profile Header Aero Ultra
    profileHeader: {
        borderRadius: 32,
        marginBottom: 32,
        overflow: 'hidden',
        ...SHADOWS.premium,
        backgroundColor: COLORS.white + '80',
        borderWidth: 1,
        borderColor: COLORS.white,
    },
    blurHeader: {
        padding: 24,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: COLORS.white,
    },
    verifyBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: COLORS.primary,
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.white,
    },
    headerInfo: {
        marginLeft: 20,
        flex: 1,
    },
    userName: { 
        fontSize: 22, 
        fontWeight: '900', 
        color: COLORS.black,
        marginBottom: 4,
    },
    roleBadge: {
        backgroundColor: COLORS.primary + '20',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 6,
        alignSelf: 'flex-start',
    },
    roleText: {
        fontSize: 10,
        fontWeight: '900',
        color: COLORS.primary,
        letterSpacing: 1,
    },
    profileStats: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white + '60',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 20,
        width: '100%',
    },
    statItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        justifyContent: 'center',
    },
    statText: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.textSecondary,
    },
    statDivider: {
        width: 1,
        height: 16,
        backgroundColor: COLORS.border,
        marginHorizontal: 8,
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
