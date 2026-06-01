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
import { getSessionSafely, supabase } from '@/lib/supabase';
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
    // Bug #7: Parent passes a ref so Dashboard can queue a message typed
    // during the 'pending' window. The modal auto-sends it once sosId resolves.
    pendingMessageRef?: React.MutableRefObject<string | null>;
}

export const SOSChatModal: React.FC<SOSChatModalProps> = ({ isVisible, onClose, sosId, onCancelSOS, pendingMessageRef }) => {
    const { profile } = useProfile();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [sosStatus, setSosStatus] = useState<'active' | 'responded' | 'acknowledged' | 'resolved' | 'cancelled'>('active');
    const isResolved = sosStatus === 'resolved' || sosStatus === 'cancelled';
    const isPendingLink = sosId === 'pending';
    const hasEstablishedLink = !!sosId && sosId !== 'pending' && sosId.length >= 20;
    const canTypeMessage = !sending && (isPendingLink || hasEstablishedLink);
    const sendDisabled = !newMessage.trim() || sending || (!isPendingLink && !hasEstablishedLink);
    const flatListRef = useRef<FlatList>(null);

    // ─── Bug #6 Fix: Both channels tracked via refs ────────────────────
    // Previously, statusSub was a bare local variable. When the effect cleanup
    // ran before subscribe() completed (e.g. user closed modal mid-handshake),
    // the server kept the socket open — a zombie subscription. On each re-open,
    // a new channel was stacked on top, multiplying subscriptions until the
    // device ran out of socket file descriptors and froze.
    const channelRef = useRef<any>(null);
    const statusSubRef = useRef<any>(null);

    const confirmCancelSOS = () => {
        if (!onCancelSOS || isResolved) return;
        Alert.alert(
            'Cancel SOS?',
            'Only cancel if you no longer need emergency assistance. Watch Command will be notified when an active SOS is cancelled.',
            [
                { text: 'Keep Active', style: 'cancel' },
                {
                    text: 'Cancel SOS',
                    style: 'destructive',
                    onPress: onCancelSOS,
                },
            ]
        );
    };

    // ─── Bug #7 Fix: Auto-flush queued message on sosId resolution ────
    // If the user typed a message while sosId was 'pending', it was blocked.
    // This effect fires when sosId transitions to a real UUID, auto-sending
    // any queued message without requiring user interaction.
    const handleSendMessageWithText = async (text: string) => {
        if (!text.trim() || !profile) return;
        const msgId = require('expo-crypto').randomUUID();
        const newMsg: Message = {
            id: msgId, sos_id: sosId, content: text,
            sender_role: 'citizen',
            sender_name: profile.full_name || 'Citizen',
            created_at: new Date().toISOString()
        };
        try {
            const { data, error } = await supabase.rpc('send_sos_message', {
                p_sos_id: sosId,
                p_message_id: msgId,
                p_content: text,
            });
            if (error) throw error;
            const persistedMessage = (data || newMsg) as Message;
            setMessages(current => current.some(message => message.id === persistedMessage.id)
                ? current
                : [...current, persistedMessage]);
            if (channelRef.current) {
                channelRef.current.send({ type: 'broadcast', event: 'message', payload: persistedMessage });
            }
        } catch (e) {
            console.error('[SOSChat] Auto-flush send error:', e);
        }
    };

    useEffect(() => {
        // Only fire when transitioning from 'pending' to a real UUID
        if (sosId && sosId !== 'pending' && sosId.length >= 20 && pendingMessageRef?.current) {
            const queuedMsg = pendingMessageRef.current;
            pendingMessageRef.current = null;
            console.log('[SOSChat] Flushing queued message after SOS ID resolved:', queuedMsg);
            handleSendMessageWithText(queuedMsg);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sosId]);

    useEffect(() => {
        if (!isVisible || !sosId) return;

        // ─── Bug #6 Fix: isActive guard ─────────────────────────────────
        // Prevents stale async operations (fetch, subscribe callbacks) from
        // writing state after the component has unmounted or the effect has
        // been cleaned up. Without this, a slow fetchHistory() completing
        // after modal close would still call setMessages() on an unmounted
        // component, causing React state update warnings and memory leaks.
        let isActive = true;

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
            if (!sosId || sosId.length < 20) {
                if (isActive) setLoading(false);
                return;
            }
            try {
                const { data: sosData } = await supabase
                    .from('sos_alerts')
                    .select('status')
                    .eq('id', sosId)
                    .single();
                if (isActive && sosData) setSosStatus(sosData.status);

                const { data, error } = await supabase
                    .from('sos_messages')
                    .select('*')
                    .eq('sos_id', sosId)
                    .order('created_at', { ascending: true });
                if (error) throw error;
                if (isActive) {
                    setMessages(data || []);
                    markMessagesAsRead();
                }
            } catch (e) {
                console.error('[SOSChat] Error fetching history:', e);
            } finally {
                if (isActive) setLoading(false);
            }
        };

        fetchHistory();

        // ─── Bug #5 Fix: Status channel with error handling & reconnect ─
        // Previously .subscribe() had no callback. On CHANNEL_ERROR or
        // TIMED_OUT, the channel silently failed — status updates from Watch
        // Command never arrived. Now we detect failures and reconnect with
        // exponential backoff (capped at 8s).
        let statusReconnectAttempts = 0;
        const subscribeStatusChannel = () => {
            if (!isActive) return;
            const statusSub = supabase
                .channel(`sos_status:${sosId}`)
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sos_alerts', filter: `id=eq.${sosId}` }, (payload) => {
                    const updated = payload.new as any;
                    if (isActive) setSosStatus(updated.status);
                })
                .subscribe((status, err) => {
                    if (status === 'SUBSCRIBED') {
                        console.log('[SOSChat] Status channel live');
                        statusReconnectAttempts = 0;
                    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                        console.warn(`[SOSChat] Status channel ${status}. Reconnecting...`, err);
                        if (isActive) {
                            const delay = Math.min(1000 * Math.pow(2, statusReconnectAttempts), 8000);
                            statusReconnectAttempts++;
                            setTimeout(subscribeStatusChannel, delay);
                        }
                    }
                });
            statusSubRef.current = statusSub;
        };
        subscribeStatusChannel();

        // ─── Bug #5 Fix: Message channel with error handling & reconnect ─
        let msgReconnectAttempts = 0;
        const subscribeMsgChannel = () => {
            if (!isActive) return;
            const channel = supabase.channel(`sos_chat:${sosId}`);
            channel
                .on(
                    'postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'sos_messages', filter: `sos_id=eq.${sosId}` },
                    (payload) => {
                        if (!isActive) return;
                        const msg = payload.new as Message;
                        setMessages(current => {
                            if (current.some(m => m.id === msg.id)) return current;
                            return [...current, msg];
                        });
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
                .on('broadcast', { event: 'message' }, (payload) => {
                    if (!isActive) return;
                    const msg = payload.payload as Message;
                    if (msg.sos_id === sosId) {
                        setMessages(current => {
                            if (current.some(m => m.id === msg.id)) return current;
                            return [...current, msg];
                        });
                    }
                })
                .subscribe((status, err) => {
                    if (status === 'SUBSCRIBED') {
                        console.log('[SOSChat] Message channel live');
                        msgReconnectAttempts = 0;
                    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                        console.warn(`[SOSChat] Message channel ${status}. Reconnecting...`, err);
                        if (isActive) {
                            const delay = Math.min(1000 * Math.pow(2, msgReconnectAttempts), 8000);
                            msgReconnectAttempts++;
                            setTimeout(subscribeMsgChannel, delay);
                        }
                    }
                });
            channelRef.current = channel;
        };
        subscribeMsgChannel();

        return () => {
            // ─── Bug #6 Fix: Null-safe cleanup with isActive guard ───────
            isActive = false;
            if (statusSubRef.current) {
                supabase.removeChannel(statusSubRef.current);
                statusSubRef.current = null;
            }
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [isVisible, sosId]);


    const handleSendMessage = async () => {
        if (!newMessage.trim()) return;
        
        // \u2500\u2500\u2500 Bug #7 Fix: Queue instead of discard \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
        // Previously an Alert blocked the user and discarded their message.
        // Now we store the text in pendingMessageRef — the modal's useEffect
        // watching sosId will auto-send it the moment a real UUID arrives.
        if (sosId === 'pending') {
            if (pendingMessageRef) {
                pendingMessageRef.current = newMessage.trim();
                setNewMessage('');
                console.log('[SOSChat] Message queued — waiting for SOS ID to resolve.');
            }
            return;
        }

        let activeProfile = profile;
        
        // Safety Fallback: If profile context is stale, try to get fresh session
        if (!activeProfile) {
            console.warn('[SOSChat] Profile missing in context, attempting session recovery...');
            const { data: { session } } = await getSessionSafely();
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

            const { data, error } = await supabase.rpc('send_sos_message', {
                p_sos_id: sosId,
                p_message_id: msgId,
                p_content: text,
            });

            if (error) throw error;

            const persistedMessage = (data || newMsg) as Message;
            if (channelRef.current) {
                const status = channelRef.current.send({
                    type: 'broadcast',
                    event: 'message',
                    payload: persistedMessage
                });
                console.log('[SOSChat] Broadcast status:', status);
            }
            console.log('[SOSChat] DB Persist successful');
        } catch (error) {
            console.error('[SOSChat] Transmission Critical Failure:', error);
            setMessages(current => current.filter(message => message.id !== msgId));
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
            transparent={false}
            statusBarTranslucent={false}
            navigationBarTranslucent={false}
            onRequestClose={onClose}
        >
            <SafeAreaView edges={['top', 'bottom']} style={styles.modalContainer}>
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
                            {onCancelSOS && !isResolved && (
                                <TouchableOpacity onPress={confirmCancelSOS} style={styles.cancelSOSButton}>
                                    <AlertCircle color={COLORS.white} size={14} />
                                    <Text style={styles.cancelSOSText}>CANCEL SOS</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <X color={COLORS.textSecondary} size={24} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Chat Area */}
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.chatContainer}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                    >
                        {loading ? (
                            <View style={styles.centerContent}>
                                <ActivityIndicator size="large" color={COLORS.accent} />
                                <Text style={styles.loadingText}>Establishing Secure Connection...</Text>
                            </View>
                        ) : !hasEstablishedLink ? (
                            <View style={styles.connectingContainer}>
                                <ActivityIndicator color={COLORS.error} size="large" />
                                <Text style={styles.connectingText}>CONNECTING TACTICAL LINK...</Text>
                                <Text style={styles.connectingSub}>STABILIZING ENCRYPTED TUNNEL</Text>
                                {isPendingLink && pendingMessageRef?.current && (
                                    <Text style={styles.queuedMessageText}>MESSAGE QUEUED FOR TRANSMISSION</Text>
                                )}
                            </View>
                        ) : (
                            <FlatList
                                ref={flatListRef}
                                data={messages}
                                renderItem={renderMessage}
                                keyExtractor={(item) => item.id}
                                style={styles.messagesList}
                                contentContainerStyle={styles.listContent}
                                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                                ListEmptyComponent={
                                    <View style={styles.emptyState}>
                                        <MessageSquare size={48} color={COLORS.border} />
                                        <Text style={styles.emptyText}>Waiting for Command Center instructions...</Text>
                                    </View>
                                }
                            />
                        )}

                        {/* Composer Area */}
                        <View style={{ backgroundColor: COLORS.white }}>
                            <View style={styles.composerWrapper}>
                                <View style={styles.inputContainer}>
                                    <TextInput
                                        style={[styles.input, (!canTypeMessage && !isPendingLink) && styles.disabledInput]}
                                        placeholder={isPendingLink ? "Type now. Message queues until linked..." : (!hasEstablishedLink ? "Establishing link..." : "Type emergency message...")}
                                        value={newMessage}
                                        onChangeText={setNewMessage}
                                        multiline
                                        placeholderTextColor={COLORS.textMuted}
                                        editable={canTypeMessage}
                                    />
                                    <TouchableOpacity 
                                        onPress={handleSendMessage} 
                                        disabled={sendDisabled}
                                        style={[styles.sendBtn, sendDisabled && styles.sendBtnDisabled]}
                                    >
                                        {sending ? <ActivityIndicator color={COLORS.white} size="small" /> : <Send size={20} color={COLORS.white} />}
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.safetyNotice}>
                                    <Shield color={COLORS.textSecondary} size={10} />
                                    <Text style={styles.safetyText}>
                                        {isPendingLink ? 'Message will send automatically once the SOS link is established' : 'Authenticated Secure Command Channel'}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </SafeAreaView>
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
        flexGrow: 1,
    },
    messagesList: {
        flex: 1,
        minHeight: 0,
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
        textAlign: 'center',
        flexShrink: 1,
    },
    queuedMessageText: {
        marginTop: 16,
        fontSize: 10,
        color: COLORS.accent,
        fontWeight: '900',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
});
