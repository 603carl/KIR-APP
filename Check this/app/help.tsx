import { BORDER_RADIUS, COLORS, SHADOWS, SPACING } from '@/constants/Theme';
import { Stack, useRouter } from 'expo-router';
import { ChevronRight, Mail, MessageSquare, Phone, Search } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HelpScreen() {
    const router = useRouter();

    const FAQItem = ({ question }: { question: string }) => (
        <TouchableOpacity style={styles.faqItem}>
            <Text style={styles.faqText}>{question}</Text>
            <ChevronRight size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: 'Help & Support', headerShadowVisible: false }} />
            <SafeAreaView style={styles.safe} edges={['bottom']}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

                    <View style={styles.searchContainer}>
                        <View style={styles.searchBox}>
                            <Search size={20} color={COLORS.textMuted} />
                            <TextInput
                                placeholder="How can we help you?"
                                style={styles.searchInput}
                                placeholderTextColor={COLORS.textMuted}
                            />
                        </View>
                    </View>

                    <Text style={styles.sectionTitle}>Contact Us</Text>
                    <View style={styles.contactGrid}>
                        <TouchableOpacity style={styles.contactCard}>
                            <View style={[styles.iconBox, { backgroundColor: COLORS.info + '15' }]}>
                                <MessageSquare size={24} color={COLORS.info} />
                            </View>
                            <Text style={styles.contactTitle}>Live Chat</Text>
                            <Text style={styles.contactSub}>Avg: 2 mins</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.contactCard}>
                            <View style={[styles.iconBox, { backgroundColor: COLORS.primary + '15' }]}>
                                <Mail size={24} color={COLORS.primary} />
                            </View>
                            <Text style={styles.contactTitle}>Email Support</Text>
                            <Text style={styles.contactSub}>Avg: 4 hours</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
                    <View style={styles.card}>
                        <FAQItem question="How to report anonymously?" />
                        <View style={styles.divider} />
                        <FAQItem question="Tracking my report status" />
                        <View style={styles.divider} />
                        <FAQItem question="Emergency contact numbers" />
                        <View style={styles.divider} />
                        <FAQItem question="Data privacy and usage" />
                    </View>

                    <View style={styles.emergencyBox}>
                        <View style={styles.emergencyIcon}>
                            <Phone size={24} color={COLORS.white} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 16 }}>
                            <Text style={styles.emergencyTitle}>National Emergency Hotline</Text>
                            <Text style={styles.emergencyNumber}>Call 999 or 911</Text>
                        </View>
                        <TouchableOpacity style={styles.callBtn}>
                            <Text style={styles.callBtnText}>CALL NOW</Text>
                        </TouchableOpacity>
                    </View>

                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    safe: { flex: 1 },
    scroll: { padding: SPACING.lg },
    searchContainer: { marginBottom: 32 },
    searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, height: 60, borderRadius: 30, paddingHorizontal: 20, ...SHADOWS.soft },
    searchInput: { flex: 1, marginLeft: 12, fontSize: 16, color: COLORS.black },
    sectionTitle: { fontSize: 17, fontWeight: '800', color: COLORS.black, marginBottom: 16 },
    contactGrid: { flexDirection: 'row', gap: 16, marginBottom: 32 },
    contactCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.xl, padding: 20, alignItems: 'center', ...SHADOWS.soft },
    iconBox: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    contactTitle: { fontSize: 15, fontWeight: '800', color: COLORS.black },
    contactSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 4, fontWeight: '600' },
    card: { backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.xl, paddingVertical: 8, ...SHADOWS.soft, marginBottom: 32 },
    faqItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
    faqText: { fontSize: 15, fontWeight: '700', color: COLORS.black },
    divider: { height: 1, backgroundColor: COLORS.background, marginHorizontal: 20 },
    emergencyBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.error, borderRadius: BORDER_RADIUS.xl, padding: 20, ...SHADOWS.medium },
    emergencyIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    emergencyTitle: { fontSize: 13, fontWeight: '800', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase' },
    emergencyNumber: { fontSize: 24, fontWeight: '900', color: COLORS.white, marginTop: 2 },
    callBtn: { backgroundColor: COLORS.white, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
    callBtnText: { color: COLORS.error, fontSize: 13, fontWeight: '900' },
});
