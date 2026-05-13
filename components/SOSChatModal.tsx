import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
} from 'react-native';
import * as Crypto from 'expo-crypto';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Send, Shield, MessageSquare, AlertCircle } from 'lucide-react-native';
import { MotiView, AnimatePresence } from 'moti';
import { supabase } from '@/lib/supabase';
import { COLORS, BORDER_RADIUS, SPACING } from '@/constants/Theme';
import { useProfile } from '@/context/ProfileContext';

interface Message {
    id: string;
    sos_id: string;
    content: string;
    sender_role: 'citizen' | 'operator' | 'admin' | 'responder';
    sender_name: string;
    created_at: string;
}

interface SOSChatModalProps {
    isVisible: boolean;
    onClose: () => void;
    sosId: string;
    onCancelSOS?: () => void;
}

export const SOSChatModal: React.FC<SOSChatModalProps> = ({ isVisible, onClose, sosId, onCancelSOS }) => {
    const { profile } = useProfile();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [sosStatus, setSosStatus] = useState<'active' | 'responded' | 'acknowledged' | 'resolved' | 'cancelled'>('active');
    const isResolved = sosStatus === 'resolved' || sosStatus === 'cancelled';
    const flatListRef = useRef<FlatList>(null);

    const channelRef = useRef<any>(null);

    useEffect(() => {
        if (isVisible && sosId) {
            setLoading(true);
            const markMessagesAsRead = async () => {
                if (!sosId || sosId.length < 20) return;
                try {
                    await supabase
                        .from('sos_messages' as any)
                        .update({ is_read: true, read_at: new Date().toISOString() } as any)
                        .eq('sos_id', sosId)
                        .neq('sender_role', 'citizen')
                        .is('is_read', false);
                } catch (e) {
                    console.warn('[SOSChat] Mark read fail:', e);
                }
            };

            const fetchHistory = async () => {
                // Wait for real ID if still connecting
                if (sosId.length < 20) {
                    setLoading(true);
                    return;
                }

                try {
                    // Fetch SOS Details first for status
                    const { data: sosData } = await supabase
                        .from('sos_alerts')
                        .select('status')
                        .eq('id', sosId)
                        .single();
                    
                    if (sosData) setSosStatus(sosData.status);

                    const { data, error } = await supabase
                        .from('sos_messages')
                        .select('*')
                        .eq('sos_id', sosId)
                        .order('created_at', { ascending: true });

                    if (error) throw error;
                    setMessages(data || []);
                    
                    // Mark history as read once loaded
                    markMessagesAsRead();
                } catch (e) {
                    console.error('Error fetching history:', e);
                } finally {
                    setLoading(false);
                }
            };

            fetchHistory();
            
            // Listen for SOS resolution status
            const statusSub = supabase
                .channel(`sos_status:${sosId}`)
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sos_alerts', filter: `id=eq.${sosId}` }, (payload) => {
                    const updated = payload.new as any;
                    setSosStatus(updated.status);
                })
                .subscribe();

            // 2. Setup Hybrid Channels
            const channel = supabase.channel(`sos_chat:${sosId}`);
            
            channel
                // A. Listen for DB Changes (Reliability)
                .on(
                    'postgres_changes',
                    { 
                        event: 'INSERT', 
                        schema: 'public', 
                        table: 'sos_messages', 
                        filter: `sos_id=eq.${sosId}` 
                    },
                    (payload) => {
                        const msg = payload.new as Message;
                        setMessages(current => {
                            if (current.some(m => m.id === msg.id)) return current;
                            return [...current, msg];
                        });
                        // Automatically mark as read if arriving while chat is open
                        if (msg.sender_role !== 'citizen') {
                            supabase
                                .from('sos_messages' as any)
                                .update({ is_read: true, read_at: new Date().toISOString() } as any)
                                .eq('id', msg.id)
                                .then(({ error }) => {
                                    if (error) console.warn('[SOSChat] Mark read error:', error);
                                });
                        }
                    }
                )
                // C. Listen for Broadcast (Fallback Speed)
                .on(
                    'broadcast',
                    { event: 'message' },
                    (payload) => {
                        const msg = payload.payload as Message;
                        if (msg.sos_id === sosId) {
                            setMessages(current => {
                                if (current.some(m => m.id === msg.id)) return current;
                                return [...current, msg];
                            });
                        }
                    }
                )
                .subscribe();

            channelRef.current = channel;

            return () => {
                supabase.removeChannel(statusSub);
                if (channel) supabase.removeChannel(channel);
            };
        }
    }, [isVisible, sosId]);

    const handleSendMessage = async () => {
        if (!newMessage.trim()) return;
        
        if (sosId === 'pending') {
            Alert.alert('Establishing Connection', 'Please wait a moment while we secure your connection to emergency services.');
            return;
        }

        let activeProfile = profile;
        
        // Safety Fallback: If profile context is stale, try to get fresh session
        if (!activeProfile) {
            console.warn('[SOSChat] Profile missing in context, attempting session recovery...');
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                activeProfile = { id: session.user.id, full_name: 'Citizen' } as any;
            } else {
                console.error('[SOSChat] No authenticated session found. Message aborted.');
                Alert.alert('Session Error', 'Please log in again to send messages.');
                return;
            }
        }

        // Final Type Guard for TypeScript
        if (!activeProfile) return;
        const profileInstance = activeProfile;


        setSending(true);
        const text = newMessage.trim();
        const msgId = Crypto.randomUUID();
        setNewMessage('');


        const newMsg: Message = {
            id: msgId,
            sos_id: sosId,
            content: text,
            sender_role: 'citizen',
            sender_name: profileInstance.full_name || 'Citizen',
            created_at: new Date().toISOString()
        };

        // UI OPTIMISTIC UPDATE
        setMessages(current => [...current, newMsg]);

        try {
            console.log(`[SOSChat] Transmitting message ${msgId} for SOS ${sosId}`);

            // STEP 1: HYBRID BROADCAST (Immediate Fallback)
            if (channelRef.current) {
                const status = channelRef.current.send({
                    type: 'broadcast',
                    event: 'message',
                    payload: newMsg
                });
                console.log('[SOSChat] Broadcast status:', status);
            }

            // STEP 2: DB PERSISTENCE (Best-effort for history)
            const { error } = await supabase.from('sos_messages').insert({
                id: msgId,
                sos_id: sosId,
                content: text,
                sender_role: 'citizen',
                sender_name: profileInstance.full_name || 'Citizen',
                sender_id: profileInstance.id
            });

            
            if (error) {
                console.warn('[SOSChat] DB Persist error:', error.message);
                // We don't alert here because broadcast might have succeeded
            } else {
                console.log('[SOSChat] DB Persist successful');
            }
        } catch (error) {
            console.error('[SOSChat] Transmission Critical Failure:', error);
            Alert.alert('Signal Critical', 'Failed to transmit signal. Please check your internet connection and try again.');
        } finally {
            setSending(false);
        }
    };


    const renderMessage = ({ item }: { item: Message }) => {
        const isMe = item.sender_role === 'citizen';
        
        return (
            <MotiView
                from={{ opacity: 0, translateY: 10, scale: 0.95 }}
                animate={{ opacity: 1, translateY: 0, scale: 1 }}
                style={[
                    styles.messageBubble,
                    isMe ? styles.myMessage : styles.operatorMessage
                ]}
            >
                {!isMe && (
                    <View style={styles.operatorHeader}>
                        <Shield size={10} color={COLORS.accent} />
                        <Text style={styles.operatorLabel}>{item.sender_name.toUpperCase()} (WATCH COMMAND)</Text>
                    </View>
                )}
                <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.operatorMessageText]}>
                    {item.content}
                </Text>
                <Text style={[styles.messageTime, isMe ? styles.myMessageTime : styles.operatorMessageTime]}>
                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </MotiView>
        );
    };

    return (
        <Modal
            visible={isVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalContainer}>
                <View style={styles.content}>
                    {/* Tactical Header */}
                    <View style={styles.header}>
                        <View style={styles.headerTitleContainer}>
                            <Shield color={COLORS.error} size={24} />
                            <View>
                                <Text style={styles.headerTitle}>TACTICAL LINK</Text>
                                <Text style={styles.headerSubtitle}>ENCRYPTED CHANNEL</Text>
                            </View>
                        </View>
                        
                        <View style={styles.headerActions}>
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <X color={COLORS.textSecondary} size={24} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Chat Area */}
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.chatContainer}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                    >
                        {loading ? (
                            <View style={styles.centerContent}>
                                <ActivityIndicator size="large" color={COLORS.accent} />
                                <Text style={styles.loadingText}>Establishing Secure Connection...</Text>
                            </View>
                        ) : (
                            <>
                                {/* Connecting State */}
                                {(!sosId || sosId.length < 20) && (
                                    <View style={styles.connectingContainer}>
                                        <ActivityIndicator color={COLORS.error} size="large" />
                                        <Text style={styles.connectingText}>CONNECTING TACTICAL LINK...</Text>
                                        <Text style={styles.connectingSub}>STABILIZING ENCRYPTED TUNNEL</Text>
                                    </View>
                                )}

                                <FlatList
                                    ref={flatListRef}
                                    data={messages}
                                    renderItem={renderMessage}
                                    keyExtractor={(item) => item.id}
                                    contentContainerStyle={styles.listContent}
                                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                                    ListEmptyComponent={
                                        <View style={styles.emptyState}>
                                            <MessageSquare size={48} color={COLORS.border} />
                                            <Text style={styles.emptyText}>Waiting for Command Center instructions...</Text>
                                        </View>
                                    }
                                />
                            </>
                        )}

                        {/* Composer */}
                        <SafeAreaView edges={['bottom']}>
                            <View style={styles.composerWrapper}>
                                <View style={styles.inputContainer}>
                                    <TextInput
                                        placeholder={isResolved ? "Chat disabled: Case finalized." : sosId === 'pending' ? "Securing connection..." : "Transmit message to operator..."}
                                        style={[styles.input, (isResolved || sosId === 'pending') && styles.disabledInput]}
                                        value={newMessage}
                                        onChangeText={setNewMessage}
                                        multiline
                                        maxLength={500}
                                        editable={!isResolved && sosId !== 'pending'}
                                    />
                                    <TouchableOpacity
                                        onPress={handleSendMessage}
                                        disabled={!newMessage.trim() || sending || isResolved || sosId === 'pending'}
                                        style={[
                                            styles.sendBtn,
                                            (!newMessage.trim() || sending || isResolved || sosId === 'pending') && styles.sendBtnDisabled
                                        ]}
                                    >
                                        {sending ? (
                                            <ActivityIndicator size="small" color={COLORS.white} />
                                        ) : (
                                            <Send size={20} color={COLORS.white} />
                                        )}
                                    </TouchableOpacity>

                                </View>
                                <View style={styles.safetyNotice}>
                                    <Shield size={10} color={COLORS.textSecondary} />
                                    <Text style={styles.safetyText}>End-to-End Encrypted Signal</Text>
                                </View>
                            </View>
                        </SafeAreaView>
                    </KeyboardAvoidingView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        backgroundColor: COLORS.white,
    },
    content: {
        flex: 1,
        backgroundColor: COLORS.white,
        overflow: 'hidden',
    },
    connectingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.white,
    },
    connectingText: {
        marginTop: 20,
        fontSize: 16,
        fontWeight: '900',
        color: COLORS.error,
        letterSpacing: 2,
    },
    connectingSub: {
        marginTop: 8,
        fontSize: 10,
        color: COLORS.textSecondary,
        fontWeight: '700',
        letterSpacing: 1,
    },
    statusButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
    },
    statusButtonActive: {
        backgroundColor: '#ECFDF5',
        borderColor: '#10B981',
    },
    statusButtonClosed: {
        backgroundColor: '#FEF2F2',
        borderColor: '#EF4444',
    },
    statusButtonText: {
        fontSize: 10,
        fontWeight: '900',
        textTransform: 'uppercase',
        marginLeft: 6,
        color: '#1F2937',
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: SPACING.lg,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: COLORS.black,
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 10,
        color: COLORS.textSecondary,
        fontWeight: '700',
    },
    closeButton: {
        padding: 4,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    cancelSOSButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#EF4444',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    cancelSOSText: {
        color: '#FFFFFF',
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    liveIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    liveDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.accent,
    },
    liveText: {
        fontSize: 10,
        fontWeight: '900',
        color: COLORS.accent,
        letterSpacing: 1,
    },
    closeBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    chatContainer: {
        flex: 1,
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    },
    loadingText: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.textSecondary,
    },
    listContent: {
        padding: 20,
        paddingBottom: 40,
    },
    messageBubble: {
        maxWidth: '85%',
        padding: 16,
        borderRadius: 20,
        marginBottom: 16,
    },
    myMessage: {
        alignSelf: 'flex-end',
        backgroundColor: COLORS.primary,
        borderBottomRightRadius: 4,
    },
    operatorMessage: {
        alignSelf: 'flex-start',
        backgroundColor: COLORS.background,
        borderBottomLeftRadius: 4,
    },
    operatorHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 8,
    },
    operatorLabel: {
        fontSize: 9,
        fontWeight: '900',
        color: COLORS.accent,
        letterSpacing: 0.5,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 22,
    },
    myMessageText: {
        color: COLORS.white,
        fontWeight: '600',
    },
    operatorMessageText: {
        color: COLORS.text,
        fontWeight: '500',
    },
    messageTime: {
        fontSize: 10,
        marginTop: 6,
    },
    myMessageTime: {
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'right',
    },
    operatorMessageTime: {
        color: COLORS.textMuted,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 100,
        gap: 16,
    },
    emptyText: {
        fontSize: 14,
        color: COLORS.textMuted,
        textAlign: 'center',
        maxWidth: '70%',
        lineHeight: 20,
    },
    composerWrapper: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        backgroundColor: COLORS.white,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 12,
    },
    input: {
        flex: 1,
        backgroundColor: COLORS.background,
        borderRadius: 20,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 12,
        fontSize: 15,
        maxHeight: 120,
        color: COLORS.text,
    },
    disabledInput: {
        opacity: 0.5,
        backgroundColor: '#f1f5f9',
    },
    sendBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: COLORS.accent,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendBtnDisabled: {
        opacity: 0.5,
    },
    safetyNotice: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 12,
    },
    safetyText: {
        fontSize: 10,
        color: COLORS.textSecondary,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
});
