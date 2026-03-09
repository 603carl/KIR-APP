import { BORDER_RADIUS, COLORS, SHADOWS } from '@/constants/Theme';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AlertTriangle, ArrowLeft, Clock, MapPin, MessageSquare, Send, Share2, Shield, ThumbsUp } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, KeyboardAvoidingView, Platform, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function IncidentDetailsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [incident, setIncident] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [comments, setComments] = useState<any[]>([]);
    const [timeline, setTimeline] = useState<any[]>([]);
    const [verificationCount, setVerificationCount] = useState(0);
    const [hasVerified, setHasVerified] = useState(false);
    const [loading, setLoading] = useState(true);
    const [commentText, setCommentText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (id) {
            fetchIncidentDetails();
            fetchInitialState();

            const commentSub = supabase
                .channel(`incident_details_${id}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `incident_id=eq.${id}` }, () => fetchComments())
                .on('postgres_changes', { event: '*', schema: 'public', table: 'verifications', filter: `incident_id=eq.${id}` }, () => fetchVerifications())
                .on('postgres_changes', { event: '*', schema: 'public', table: 'incident_timeline', filter: `incident_id=eq.${id}` }, () => fetchTimeline())
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'incidents', filter: `id=eq.${id}` }, () => fetchIncidentOnly())
                .subscribe();

            return () => {
                supabase.removeChannel(commentSub);
            };
        }
    }, [id]);

    const fetchInitialState = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            setProfile(profileData);

            const { data } = await supabase
                .from('verifications')
                .select('id')
                .eq('incident_id', id)
                .eq('user_id', user.id)
                .single();
            setHasVerified(!!data);
        }
    };

    const fetchIncidentOnly = async () => {
        const { data } = await supabase.from('incidents').select('*').eq('id', id).single();
        if (data) setIncident(data);
    };

    const fetchComments = async () => {
        const { data } = await supabase
            .from('comments')
            .select('*, profiles(full_name, avatar_url, role)')
            .eq('incident_id', id)
            .order('created_at', { ascending: false });
        if (data) setComments(data);
    };

    const fetchVerifications = async () => {
        const { count } = await supabase
            .from('verifications')
            .select('*', { count: 'exact', head: true })
            .eq('incident_id', id);
        setVerificationCount(count || 0);
    };

    const fetchTimeline = async () => {
        const { data } = await supabase
            .from('incident_timeline')
            .select('*')
            .eq('incident_id', id)
            .order('created_at', { ascending: false });
        if (data) setTimeline(data);
    };

    const fetchIncidentDetails = async () => {
        try {
            setLoading(true);
            await Promise.all([
                fetchIncidentOnly(),
                fetchComments(),
                fetchVerifications(),
                fetchTimeline()
            ]);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to load details');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (newStatus: string) => {
        try {
            const { error } = await supabase
                .from('incidents')
                .update({ status: newStatus })
                .eq('id', id);
            if (error) throw error;
            setIncident({ ...incident, status: newStatus });
            Alert.alert('Success', `Status updated to ${newStatus}`);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    const handlePostComment = async () => {
        if (!commentText.trim()) return;
        setIsSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { error } = await supabase
                .from('comments')
                .insert([{
                    incident_id: id,
                    user_id: user?.id,
                    content: commentText.trim()
                }]);

            if (error) throw error;
            setCommentText('');
            // Manual refresh for instant feedback even with real-time subscription
            fetchComments();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to post comment');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleVerify = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                Alert.alert('Authentication Required', 'Please log in to verify incidents.');
                return;
            }

            // Optimistic update
            const newVerifiedState = !hasVerified;
            setHasVerified(newVerifiedState);
            setVerificationCount(prev => newVerifiedState ? prev + 1 : Math.max(0, prev - 1));

            if (hasVerified) {
                await supabase.from('verifications').delete().eq('incident_id', id).eq('user_id', user.id);
            } else {
                await supabase.from('verifications').insert([{ incident_id: id, user_id: user.id }]);
            }
        } catch (error: any) {
            // Revert on error
            setHasVerified(!hasVerified);
            setVerificationCount(prev => !hasVerified ? prev + 1 : Math.max(0, prev - 1));
            Alert.alert('Error', error.message);
        }
    };

    const handleShare = async () => {
        try {
            const result = await Share.share({
                message: `Check out this incident report: ${incident.title}. ${incident.location_name}. #KenyaIncidentReport`,
                url: incident.media_urls?.[0] // iOS tries to share standard format
            });
        } catch (error: any) {
            Alert.alert(error.message);
        }
    };

    const getTimeAgo = (dateString: string) => {
        const now = new Date();
        const past = new Date(dateString);
        const diffInMs = now.getTime() - past.getTime();
        const diffInMins = Math.floor(diffInMs / (1000 * 60));
        const diffInHours = Math.floor(diffInMins / 60);

        if (diffInMins < 60) return `${diffInMins}m ago`;
        if (diffInHours < 24) return `${diffInHours}h ago`;
        return past.toLocaleDateString();
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <StatusBar style="dark" />
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (!incident) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <StatusBar style="dark" />
                <Text style={{ color: COLORS.textMuted }}>Incident not found</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: COLORS.white }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 20}
        >
            <View style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />
                <StatusBar style="light" />

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                    {/* Media Gallery / Header */}
                    <View style={styles.headerImageContainer}>
                        <Image
                            source={{ uri: incident.media_urls?.[0] || 'https://images.unsplash.com/photo-1542013936693-884638332954?q=80&w=800&auto=format&fit=crop' }}
                            style={styles.headerImage}
                        />
                        <LinearGradient
                            colors={['rgba(0,0,0,0.6)', 'transparent', 'rgba(0,0,0,0.8)']}
                            style={StyleSheet.absoluteFill}
                        />

                        <SafeAreaView style={styles.headerActions} edges={['top']}>
                            <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
                                <ArrowLeft size={24} color={COLORS.white} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.iconBtn} onPress={handleShare}>
                                <Share2 size={24} color={COLORS.white} />
                            </TouchableOpacity>
                        </SafeAreaView>

                        <View style={styles.imageOverlayContent}>
                            <View style={[styles.severityBadge, { backgroundColor: (incident.severity === 'High' || incident.severity === 'Critical') ? COLORS.error : COLORS.warning }]}>
                                <AlertTriangle size={14} color={COLORS.white} />
                                <Text style={styles.severityText}>{incident.severity.toUpperCase()} SEVERITY</Text>
                            </View>
                            <Text style={styles.mainTitle}>{incident.title}</Text>
                            <View style={styles.locationTag}>
                                <MapPin size={14} color="rgba(255,255,255,0.7)" />
                                <Text style={styles.locationText}>{incident.location_name}</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.content}>
                        {/* Quick Stats */}
                        <View style={styles.statsBar}>
                            <View style={styles.statItem}>
                                <Clock size={16} color={COLORS.primary} />
                                <Text style={styles.statText}>{getTimeAgo(incident.created_at)}</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Shield size={16} color={COLORS.primary} />
                                <Text style={styles.statText}>{incident.status || 'Pending'}</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <MessageSquare size={16} color={COLORS.primary} />
                                <Text style={styles.statText}>{comments.length} Comments</Text>
                            </View>
                        </View>

                        {/* Address Display (Explicit Request) */}
                        <Text style={styles.addressLabel}>Address: {incident.location_name}</Text>

                        <Text style={styles.description}>
                            {incident.description}
                        </Text>

                        {/* Terminal State Banner */}
                        {['rejected', 'closed'].includes((incident.status || '').toLowerCase()) && (
                            <View style={{
                                backgroundColor: incident.status?.toLowerCase() === 'rejected' ? COLORS.error + '15' : COLORS.success + '15',
                                padding: 16,
                                borderRadius: 16,
                                marginBottom: 24,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 12
                            }}>
                                {incident.status?.toLowerCase() === 'rejected' ? (
                                    <AlertTriangle size={24} color={COLORS.error} />
                                ) : (
                                    <Shield size={24} color={COLORS.success} />
                                )}
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontWeight: '800', fontSize: 16, color: incident.status?.toLowerCase() === 'rejected' ? COLORS.error : COLORS.success }}>
                                        {incident.status?.toLowerCase() === 'rejected' ? 'Report Rejected' : 'Case Closed'}
                                    </Text>
                                    <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 4 }}>
                                        {incident.status?.toLowerCase() === 'rejected'
                                            ? 'This report was marked as fake by the Command Center.'
                                            : 'This incident has been resolved and officially closed.'}
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Responder Actions (Visible only to Responders) */}
                        {profile?.role === 'responder' && !['rejected', 'closed'].includes((incident.status || '').toLowerCase()) && (
                            <View style={[styles.section, { backgroundColor: COLORS.primary + '10', padding: 20, borderRadius: 24 }]}>
                                <View style={styles.rowBetween}>
                                    <Text style={[styles.sectionTitle, { color: COLORS.primary }]}>Responder Dashboard</Text>
                                    <Shield size={20} color={COLORS.primary} />
                                </View>
                                <Text style={styles.responderHint}>Current status: {incident.status}</Text>
                                <View style={styles.responderBtnRow}>
                                    {['Verified', 'Assigned', 'Resolved'].map(s => (
                                        <TouchableOpacity
                                            key={s}
                                            style={[styles.responderActionBtn, incident.status === s && { backgroundColor: COLORS.primary }]}
                                            onPress={() => handleUpdateStatus(s)}
                                        >
                                            <Text style={[styles.responderActionText, incident.status === s && { color: COLORS.white }]}>{s}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Community Verification */}
                        <View style={styles.section}>
                            <View style={styles.rowBetween}>
                                <Text style={styles.sectionTitle}>Community Verification</Text>
                                <Text style={styles.verifyCount}>{verificationCount} Local Verifications</Text>
                            </View>
                            <TouchableOpacity
                                style={[styles.verifyBtn, hasVerified && { backgroundColor: COLORS.success }]}
                                onPress={handleVerify}
                            >
                                <ThumbsUp size={20} color={COLORS.white} />
                                <Text style={styles.verifyBtnText}>{hasVerified ? 'Verified by You' : 'Verify this Incident'}</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.sectionTitle}>Response Timeline</Text>
                        <View style={styles.timeline}>
                            {timeline.length > 0 ? timeline.map((item, idx) => (
                                <View key={item.id} style={styles.timelineItem}>
                                    <View style={idx === 0 ? styles.timelineDotActive : styles.timelineDot} />
                                    {idx !== timeline.length - 1 && <View style={styles.timelineLine} />}
                                    <View style={styles.timelineContent}>
                                        <Text style={styles.timelineTime}>{getTimeAgo(item.created_at)}</Text>
                                        <Text style={styles.timelineTitle}>{item.title}</Text>
                                        <Text style={styles.timelineDesc}>{item.description}</Text>
                                    </View>
                                </View>
                            )) : (
                                <View style={styles.timelineItem}>
                                    <View style={styles.timelineDotActive} />
                                    <View style={styles.timelineContent}>
                                        <Text style={styles.timelineTime}>Just Now</Text>
                                        <Text style={styles.timelineTitle}>Incident Logged</Text>
                                        <Text style={styles.timelineDesc}>Waiting for first response update...</Text>
                                    </View>
                                </View>
                            )}
                        </View>

                        {/* Comments Section */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Comments & Feedback</Text>
                            <View style={styles.commentList}>
                                {comments.map(comment => (
                                    <View key={comment.id} style={styles.commentItem}>
                                        <View style={styles.commentHeader}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                <Text style={styles.commentUser}>{comment.profiles?.full_name || 'Anonymous'}</Text>
                                                {comment.profiles?.role === 'Official' && (
                                                    <View style={styles.officialBadge}>
                                                        <Shield size={10} color={COLORS.primary} />
                                                    </View>
                                                )}
                                            </View>
                                            <Text style={styles.commentTime}>{getTimeAgo(comment.created_at)}</Text>
                                        </View>
                                        <Text style={styles.commentText}>{comment.content}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </View>
                </ScrollView>

                {/* Premium Compose Bar - Moved outside ScrollView for absolute positioning within Safe/Keyboard view */}
                <View style={[styles.bottomBar, { backgroundColor: COLORS.white }]}>
                    <SafeAreaView edges={['bottom']}>
                        <View style={styles.composerContainer}>
                            <TextInput
                                placeholder="Share your opinion..."
                                style={styles.input}
                                placeholderTextColor={COLORS.textMuted}
                                value={commentText}
                                onChangeText={setCommentText}
                            />
                            <TouchableOpacity
                                style={[styles.sendBtn, (!commentText.trim() || isSubmitting) && { opacity: 0.5 }]}
                                onPress={handlePostComment}
                                disabled={!commentText.trim() || isSubmitting}
                            >
                                {isSubmitting ? (
                                    <ActivityIndicator color={COLORS.white} size="small" />
                                ) : (
                                    <Send size={20} color={COLORS.white} />
                                )}
                            </TouchableOpacity>
                        </View>
                    </SafeAreaView>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.white },
    headerImageContainer: { width: '100%', height: 400, position: 'relative' },
    headerImage: { width: '100%', height: '100%' },
    headerActions: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20 },
    iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
    imageOverlayContent: { position: 'absolute', bottom: 30, left: 20, right: 20 },
    severityBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: COLORS.error, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginBottom: 12 },
    severityText: { fontSize: 10, fontWeight: '900', color: COLORS.white, marginLeft: 6 },
    mainTitle: { fontSize: 30, fontWeight: '900', color: COLORS.white, marginBottom: 8 },
    locationTag: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    locationText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600' },
    content: { padding: 20 },
    statsBar: { flexDirection: 'row', backgroundColor: COLORS.background, padding: 16, borderRadius: BORDER_RADIUS.lg, justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    statItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    statText: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted },
    statDivider: { width: 1, height: 20, backgroundColor: COLORS.border },
    addressLabel: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 24, fontStyle: 'italic' },
    section: { marginBottom: 32 },
    sectionTitle: { fontSize: 20, fontWeight: '800', color: COLORS.black, marginBottom: 12 },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    verifyCount: { fontSize: 13, fontWeight: '600', color: COLORS.success },
    verifyBtn: { height: 56, backgroundColor: COLORS.primary, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, ...SHADOWS.medium },
    verifyBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
    description: { fontSize: 16, color: COLORS.textSecondary, lineHeight: 26, marginBottom: 30 },
    commentList: { gap: 16 },
    commentItem: { backgroundColor: COLORS.background, padding: 16, borderRadius: 20 },
    commentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    commentUser: { fontWeight: '800', fontSize: 14, color: COLORS.black },
    officialBadge: { width: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.primary + '20', justifyContent: 'center', alignItems: 'center' },
    commentTime: { fontSize: 12, color: COLORS.textMuted },
    commentText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 },
    bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, borderTopColor: COLORS.border },
    composerContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 12 },
    input: { flex: 1, height: 50, backgroundColor: COLORS.background, borderRadius: 25, paddingHorizontal: 20, fontSize: 15, color: COLORS.black },
    sendBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', ...SHADOWS.medium },
    timeline: { paddingLeft: 10 },
    timelineItem: { flexDirection: 'row', gap: 20, minHeight: 80 },
    timelineDotActive: { width: 14, height: 14, borderRadius: 7, backgroundColor: COLORS.primary, marginTop: 4, zIndex: 1, borderWidth: 3, borderColor: COLORS.white },
    timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.border, marginTop: 4, zIndex: 1 },
    timelineLine: { position: 'absolute', left: 5, top: 20, bottom: 0, width: 2, backgroundColor: COLORS.border },
    timelineContent: { flex: 1, paddingBottom: 24 },
    timelineTime: { fontSize: 12, fontWeight: '800', color: COLORS.primary, marginBottom: 4 },
    timelineTitle: { fontSize: 16, fontWeight: '700', color: COLORS.black },
    timelineDesc: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
    responderHint: { fontSize: 13, color: COLORS.textMuted, marginBottom: 12, fontWeight: '600' },
    responderBtnRow: { flexDirection: 'row', gap: 10 },
    responderActionBtn: { flex: 1, height: 44, borderRadius: 14, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.primary + '30' },
    responderActionText: { fontSize: 12, fontWeight: '800', color: COLORS.primary },
});
