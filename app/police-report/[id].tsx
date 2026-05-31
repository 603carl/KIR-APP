import { COLORS, SHADOWS, SPACING } from '@/constants/Theme';
import { getPoliceDocumentDownload, sendPoliceReportMessage, uploadPoliceEvidence, type PoliceDocument, type PoliceEvent, type PoliceItem, type PoliceMessage, type PoliceReport } from '@/lib/policeReports';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Camera, Download, FileLock2, MessageCircle, Send, ShieldCheck } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PoliceReportDetail() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const [report, setReport] = useState<PoliceReport | null>(null);
    const [documents, setDocuments] = useState<PoliceDocument[]>([]);
    const [messages, setMessages] = useState<PoliceMessage[]>([]);
    const [events, setEvents] = useState<PoliceEvent[]>([]);
    const [items, setItems] = useState<PoliceItem[]>([]);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [uploadingEvidence, setUploadingEvidence] = useState(false);

    const load = useCallback(async () => {
        if (!id) return;
        const [caseResult, documentResult, messageResult, eventResult, itemResult] = await Promise.all([
            supabase.from('police_reports').select('*').eq('id', id).single(),
            supabase.from('police_report_documents').select('id,police_report_id,document_type,version,created_at,sha256').eq('police_report_id', id).order('created_at', { ascending: false }),
            supabase.from('police_report_messages').select('*').eq('police_report_id', id).order('created_at'),
            supabase.from('police_report_events').select('id,event_type,actor_kind,created_at').eq('police_report_id', id).order('created_at', { ascending: false }).limit(20),
            supabase.from('police_report_items').select('id,item_type,description,created_at').eq('police_report_id', id).order('created_at'),
        ]);
        if (caseResult.error) throw caseResult.error;
        setReport(caseResult.data as PoliceReport);
        setDocuments((documentResult.data || []) as PoliceDocument[]);
        setMessages((messageResult.data || []) as PoliceMessage[]);
        setEvents((eventResult.data || []) as PoliceEvent[]);
        setItems((itemResult.data || []) as PoliceItem[]);
        await supabase.rpc('mark_police_report_messages_read', { p_case_id: id });
        setLoading(false);
    }, [id]);

    useEffect(() => {
        load().catch((error) => { console.error(error); setLoading(false); });
        if (!id) return;
        const channel = supabase.channel(`private_police_case_${id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'police_reports', filter: `id=eq.${id}` }, () => load().catch(console.error))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'police_report_messages', filter: `police_report_id=eq.${id}` }, () => load().catch(console.error))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'police_report_documents', filter: `police_report_id=eq.${id}` }, () => load().catch(console.error))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'police_report_events', filter: `police_report_id=eq.${id}` }, () => load().catch(console.error))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'police_report_items', filter: `police_report_id=eq.${id}` }, () => load().catch(console.error))
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [id, load]);

    const download = async (document: PoliceDocument) => {
        try {
            const url = await getPoliceDocumentDownload(document.id);
            await WebBrowser.openBrowserAsync(url);
        } catch (error: unknown) {
            Alert.alert('Document Unavailable', error instanceof Error ? error.message : 'Unable to issue the confidential download.');
        }
    };

    const send = async () => {
        if (!message.trim() || !id) return;
        setSending(true);
        try {
            await sendPoliceReportMessage(id, message.trim());
            setMessage('');
            await load();
        } catch (error: unknown) {
            Alert.alert('Message Failed', error instanceof Error ? error.message : 'Unable to send the secure message.');
        } finally { setSending(false); }
    };

    const pickEvidence = async () => {
        if (!id) return;
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], allowsMultipleSelection: true, quality: 0.8 });
        if (result.canceled) return;
        setUploadingEvidence(true);
        let failed = 0;
        try {
            for (const asset of result.assets) {
                try {
                    await uploadPoliceEvidence(id, asset, 'Evidence attachment submitted after case creation');
                } catch (error) {
                    console.error('[PoliceReport] Private evidence retry upload failed:', error);
                    failed += 1;
                }
            }
            await load();
            if (failed) {
                Alert.alert('Evidence Upload Incomplete', `${failed} attachment(s) could not upload. Check your connection and try again from this screen.`);
            } else {
                Alert.alert('Evidence Uploaded', 'Your private evidence attachment(s) were added to this confidential case.');
            }
        } finally {
            setUploadingEvidence(false);
        }
    };

    if (loading) return <SafeAreaView style={styles.safe}><ActivityIndicator style={{ marginTop: 80 }} color={COLORS.primary} /></SafeAreaView>;
    if (!report) return <SafeAreaView style={styles.safe}><Text style={styles.unavailable}>This Police Report is unavailable.</Text></SafeAreaView>;

    return <SafeAreaView style={styles.safe}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}><ArrowLeft color={COLORS.text} /></TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 14 }}><Text style={styles.title}>Confidential Case</Text><Text style={styles.ref}>{report.submission_reference}</Text></View>
            <ShieldCheck color={COLORS.primary} />
        </View>
        <ScrollView contentContainerStyle={styles.body}>
            <View style={styles.caseCard}>
                <Text style={styles.caseTitle}>{report.title}</Text>
                <Text style={styles.status}>{report.status.replace(/_/g, ' ').toUpperCase()}</Text>
                <Text style={styles.ob}>OB Number: {report.ob_number || 'Pending Official Recording'}</Text>
                <Text style={styles.small}>{report.current_station || report.preferred_station}{report.current_division ? ` / ${report.current_division}` : ''} | {new Date(report.created_at).toLocaleString('en-KE')}</Text>
            </View>
            <Section title="Your Statement"><Text style={styles.paragraph}>{report.detailed_statement}</Text><Text style={styles.small}>Occurrence: {report.occurrence_location}</Text></Section>
            <Section title="Current Handling">
                <Text style={styles.listText}>Station: {report.current_station || report.receiving_station || report.preferred_station}</Text>
                <Text style={styles.listText}>Division: {report.current_division || report.receiving_division || 'Pending assignment'}</Text>
                <Text style={styles.listText}>Referral: {report.referred_to_station ? `${report.referred_to_station}${report.referred_to_division ? ` / ${report.referred_to_division}` : ''}` : 'No referral recorded'}</Text>
                {report.referral_reason ? <Text style={styles.small}>Referral note: {report.referral_reason}</Text> : null}
            </Section>
            <Section title="Confidential Documents">
                {documents.map((document) => <TouchableOpacity key={document.id} style={styles.document} onPress={() => download(document)}>
                    <FileLock2 color={COLORS.primary} size={20} /><View style={{ flex: 1 }}><Text style={styles.documentName}>{document.document_type.replace(/_/g, ' ')}</Text><Text style={styles.small}>Version {document.version}</Text></View><Download color={COLORS.primary} size={18} />
                </TouchableOpacity>)}
            </Section>
            <Section title="Private Evidence">
                {items.length > 0
                    ? items.map((item) => <Text style={styles.listText} key={item.id}>{item.item_type}: {item.description}</Text>)
                    : <Text style={styles.small}>No private evidence attachments are recorded yet.</Text>}
                <TouchableOpacity style={styles.evidenceButton} onPress={pickEvidence} disabled={uploadingEvidence}>
                    {uploadingEvidence ? <ActivityIndicator color={COLORS.primary} /> : <Camera color={COLORS.primary} size={18} />}
                    <Text style={styles.evidenceButtonText}>{uploadingEvidence ? 'Uploading private evidence...' : 'Add Private Evidence'}</Text>
                </TouchableOpacity>
            </Section>
            <Section title="Secure Messages">
                {messages.length === 0 && <Text style={styles.small}>No confidential messages yet.</Text>}
                {messages.map((entry) => <View key={entry.id} style={[styles.bubble, entry.sender_kind === 'citizen' && styles.myBubble]}><Text style={styles.bubbleBy}>{entry.sender_kind === 'citizen' ? 'You' : 'Watch Command'}</Text><Text style={styles.bubbleText}>{entry.content}</Text></View>)}
                <View style={styles.composer}><TextInput value={message} onChangeText={setMessage} placeholder="Send confidential information..." placeholderTextColor={COLORS.textMuted} style={styles.messageInput} multiline /><TouchableOpacity style={styles.send} onPress={send} disabled={sending}>{sending ? <ActivityIndicator color={COLORS.white} /> : <Send size={18} color={COLORS.white} />}</TouchableOpacity></View>
            </Section>
            <Section title="Status Timeline">
                {events.map((event) => <View key={event.id} style={styles.event}><MessageCircle size={14} color={COLORS.primary} /><Text style={styles.eventText}>{event.event_type.replace(/_/g, ' ')} | {new Date(event.created_at).toLocaleString('en-KE')}</Text></View>)}
            </Section>
        </ScrollView>
    </SafeAreaView>;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) { return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>; }
const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: COLORS.background }, header: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, padding: SPACING.lg, borderBottomColor: COLORS.border, borderBottomWidth: 1 },
    title: { fontSize: 19, fontWeight: '900', color: COLORS.text }, ref: { color: COLORS.primary, fontSize: 12, fontWeight: '800', marginTop: 3 }, body: { padding: SPACING.lg, paddingBottom: 38 },
    caseCard: { backgroundColor: COLORS.primary, padding: 18, borderRadius: 18, marginBottom: 14, ...SHADOWS.soft }, caseTitle: { color: COLORS.white, fontWeight: '900', fontSize: 19 },
    status: { color: '#C9F3DD', fontWeight: '900', fontSize: 11, marginTop: 10 }, ob: { color: COLORS.white, fontWeight: '800', marginTop: 13 },
    small: { color: COLORS.textSecondary, fontSize: 12, marginTop: 7 },
    section: { backgroundColor: COLORS.white, padding: 16, borderRadius: 17, marginBottom: 13, ...SHADOWS.soft }, sectionTitle: { fontSize: 13, fontWeight: '900', color: COLORS.primary, textTransform: 'uppercase', marginBottom: 13 },
    paragraph: { color: COLORS.text, fontSize: 14, lineHeight: 21, marginBottom: 8 }, document: { flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 12, marginBottom: 8 },
    documentName: { color: COLORS.text, textTransform: 'capitalize', fontWeight: '800' }, listText: { color: COLORS.textSecondary, paddingVertical: 5, textTransform: 'capitalize' },
    evidenceButton: { marginTop: 12, minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: COLORS.primary + '55', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
    evidenceButtonText: { color: COLORS.primary, fontWeight: '900' },
    bubble: { backgroundColor: COLORS.background, borderRadius: 12, padding: 11, marginBottom: 8, maxWidth: '91%' }, myBubble: { backgroundColor: COLORS.primary + '14', alignSelf: 'flex-end' },
    bubbleBy: { color: COLORS.primary, fontWeight: '900', fontSize: 10, marginBottom: 5 }, bubbleText: { color: COLORS.text, lineHeight: 19 },
    composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 9, marginTop: 8 }, messageInput: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, minHeight: 48, maxHeight: 100, padding: 12, color: COLORS.text },
    send: { width: 48, height: 48, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' }, event: { flexDirection: 'row', gap: 8, paddingVertical: 6 },
    eventText: { color: COLORS.textSecondary, fontSize: 12, textTransform: 'capitalize' }, unavailable: { margin: 24, color: COLORS.text },
});
