import { COLORS, SHADOWS, SPACING } from '@/constants/Theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Shield } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PrivacyPolicyScreen() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar style="light" />

            <LinearGradient
                colors={[COLORS.primary, '#004D2C']}
                style={styles.header}
            >
                <SafeAreaView edges={['top', 'left', 'right']}>
                    <View style={styles.headerContent}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                            <ArrowLeft size={24} color={COLORS.white} />
                        </TouchableOpacity>
                        <View style={styles.titleContainer}>
                            <Text style={styles.headerTitle}>Privacy Policy</Text>
                            <Text style={styles.headerSubtitle}>Effective Date: January 2, 2026</Text>
                        </View>
                        <View style={{ width: 40 }} />
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.card}>
                    <View style={styles.iconHeader}>
                        <Shield size={32} color={COLORS.primary} />
                    </View>

                    <Text style={styles.sectionTitle}>DOCUMENT 2: PRIVACY POLICY</Text>

                    <Text style={styles.paragraph}>
                        This Privacy Policy describes how the Government of the Republic of Kenya ("Government," "We," "Us," "Our") collects, uses, discloses, stores, and protects Your personal data when You use the Kenya Incident Reporter mobile application ("Application"). This Privacy Policy is issued pursuant to the Data Protection Act, 2019 (No. 24 of 2019) and applies to all Users of the Application.
                    </Text>
                    <Text style={styles.paragraph}>
                        By using the Application, You consent to the collection, use, and disclosure of Your personal data as described in this Privacy Policy. If You do not agree with this Privacy Policy, You must not use the Application.
                    </Text>

                    <Text style={styles.sectionTitle}>1. DATA CONTROLLER INFORMATION</Text>
                    <Text style={styles.paragraph}>
                        The data controller responsible for Your personal data is:
                    </Text>
                    <Text style={styles.paragraph}>
                        <Text style={styles.bold}>Government of the Republic of Kenya</Text>{'\n'}
                        Ministry of Interior and National Administration{'\n'}
                        Registration Number: [To be completed with ODPC registration]{'\n'}
                        Harambee House, Harambee Avenue{'\n'}
                        P.O. Box 30510-00100, Nairobi, Kenya{'\n'}
                        Email: dataprotection@incidentreporter.go.ke{'\n'}
                        Telephone: +254-20-2227411
                    </Text>

                    <Text style={styles.sectionTitle}>2. TYPES OF PERSONAL DATA COLLECTED</Text>
                    <Text style={styles.subHeader}>2.1 Information You Provide Directly</Text>
                    <Text style={styles.paragraph}>
                        When You register for an account and use the Application, We collect:
                    </Text>
                    <Text style={styles.paragraph}>
                        (a) <Text style={styles.bold}>Identity Information</Text>: Full legal name, national identification number, passport number (for foreign nationals), date of birth, nationality, and photograph;
                    </Text>
                    <Text style={styles.paragraph}>
                        (b) <Text style={styles.bold}>Contact Information</Text>: Mobile telephone number, email address, physical address, and alternative contact details;
                    </Text>
                    <Text style={styles.paragraph}>
                        (c) <Text style={styles.bold}>Account Credentials</Text>: Username, password (stored in encrypted format), and biometric authentication data (fingerprint, facial recognition data stored locally on Your device);
                    </Text>
                    <Text style={styles.paragraph}>
                        (d) <Text style={styles.bold}>Incident Report Data</Text>: Description of the Incident, category classification, severity assessment, date and time of occurrence, and any additional narrative information You provide;
                    </Text>
                    <Text style={styles.paragraph}>
                        (e) <Text style={styles.bold}>Media Content</Text>: Photographs, videos, audio recordings, and documents submitted as evidence in support of Your Report;
                    </Text>
                    <Text style={styles.paragraph}>
                        (f) <Text style={styles.bold}>Location Data</Text>: Precise geographic coordinates (GPS data) of the Incident location and Your location at the time of Report submission;
                    </Text>
                    <Text style={styles.paragraph}>
                        (g) <Text style={styles.bold}>Communications</Text>: Messages, comments, updates, and any other communications You submit through the Application's messaging features.
                    </Text>

                    <Text style={styles.paragraph}>
                        <Text style={styles.subHeader}>2.2 Information Collected Automatically</Text>
                    </Text>
                    <Text style={styles.paragraph}>
                        When You use the Application, We automatically collect:
                    </Text>
                    <Text style={styles.paragraph}>
                        (a) <Text style={styles.bold}>Device Information</Text>: Device type, model, manufacturer, operating system version, unique device identifiers (IMEI, Android ID, IDFA), mobile network information, and IP address;
                    </Text>
                    <Text style={styles.paragraph}>
                        (b) <Text style={styles.bold}>Usage Data</Text>: Application features accessed, date and time of access, session duration, frequency of use, navigation patterns, and interaction with Application features;
                    </Text>
                    <Text style={styles.paragraph}>
                        (c) <Text style={styles.bold}>Technical Data</Text>: Application version, error logs, crash reports, performance data, and diagnostic information;
                    </Text>
                    <Text style={styles.paragraph}>
                        (d) <Text style={styles.bold}>Network Information</Text>: Internet service provider, connection type, network status, and quality of service metrics.
                    </Text>

                    <Text style={styles.subHeader}>2.3 Sensitive Personal Data</Text>
                    <Text style={styles.paragraph}>
                        In accordance with Section 30 of the Data Protection Act, 2019, certain categories of Reports may involve the processing of sensitive personal data, including:
                    </Text>
                    <Text style={styles.paragraph}>
                        (a) Health information (for health-related Incidents);{'\n'}
                        (b) Information relating to criminal allegations or proceedings;{'\n'}
                        (c) Information revealing ethnic or racial origin;{'\n'}
                        (d) Biometric data for authentication purposes.
                    </Text>
                    <Text style={styles.paragraph}>
                        We only process sensitive personal data where: (i) You have provided explicit consent; (ii) processing is necessary for the establishment, exercise, or defense of legal claims; (iii) processing is required by law; or (iv) processing is necessary for reasons of substantial public interest.
                    </Text>

                    <Text style={styles.sectionTitle}>3. LEGAL BASIS FOR PROCESSING</Text>
                    <Text style={styles.paragraph}>
                        We process Your personal data on the following legal bases established under the Data Protection Act, 2019:
                    </Text>
                    <Text style={styles.paragraph}>
                        (a) <Text style={styles.bold}>Consent</Text>: You have provided explicit, informed, and freely given consent for specific processing activities;{'\n'}
                        (b) <Text style={styles.bold}>Legal Obligation</Text>: Processing is necessary for compliance with legal obligations imposed on the Government under Kenyan law;{'\n'}
                        (c) <Text style={styles.bold}>Public Interest</Text>: Processing is necessary for the performance of governmental functions and the exercise of official authority vested in the Government;{'\n'}
                        (d) <Text style={styles.bold}>Vital Interests</Text>: Processing is necessary to protect Your life or the life of another person;{'\n'}
                        (e) <Text style={styles.bold}>Contractual Necessity</Text>: Processing is necessary for the performance of the Terms of Service to which You are a party.
                    </Text>

                    <Text style={styles.sectionTitle}>4. PURPOSES OF DATA PROCESSING</Text>
                    <Text style={styles.paragraph}>
                        We process Your personal data for the following purposes:
                    </Text>
                    <Text style={styles.paragraph}>
                        (a) <Text style={styles.bold}>Account Management</Text>: Creating, maintaining, authenticating, and managing Your user account;{'\n'}
                        (b) <Text style={styles.bold}>Incident Processing</Text>: Receiving, reviewing, verifying, investigating, and responding to Incident Reports;{'\n'}
                        (c) <Text style={styles.bold}>Service Delivery</Text>: Providing You with access to Application features, sending status updates, and facilitating communication with government agencies;{'\n'}
                        (d) <Text style={styles.bold}>Security and Fraud Prevention</Text>: Detecting, preventing, and investigating fraudulent Reports, security threats, and violations of Our Terms of Service;{'\n'}
                        (e) <Text style={styles.bold}>Analytics and Research</Text>: Compiling statistical data, identifying trends, assessing service performance, and informing public policy decisions;{'\n'}
                        (f) <Text style={styles.bold}>Legal Compliance</Text>: Responding to lawful requests from law enforcement agencies, courts, and regulatory authorities;{'\n'}
                        (g) <Text style={styles.bold}>Service Improvement</Text>: Enhancing Application functionality, developing new features, and improving user experience;{'\n'}
                        (h) <Text style={styles.bold}>Communications</Text>: Sending You system notifications, security alerts, policy updates, and other service-related communications.
                    </Text>

                    <Text style={styles.sectionTitle}>5. DATA SHARING AND DISCLOSURE</Text>
                    <Text style={styles.subHeader}>5.1 Government Agencies</Text>
                    <Text style={styles.paragraph}>
                        Your personal data and Incident Reports may be shared with relevant government ministries, departments, agencies, and county governments responsible for addressing the reported Incident. This sharing is necessary for the performance of governmental functions and is conducted in accordance with applicable laws.
                    </Text>

                    <Text style={styles.subHeader}>5.2 Law Enforcement</Text>
                    <Text style={styles.paragraph}>
                        We may disclose Your personal data to law enforcement agencies where: (a) required by law or court order; (b) necessary to investigate suspected criminal activity; (c) necessary to prevent imminent harm to persons or property; or (d) necessary to protect national security interests.
                    </Text>

                    <Text style={styles.subHeader}>5.3 Third-Party Service Providers</Text>
                    <Text style={styles.paragraph}>
                        We engage third-party service providers to assist in operating the Application, including cloud hosting providers, data storage services, and technical support contractors. These service providers are contractually obligated to maintain the confidentiality and security of Your personal data and may only process data in accordance with Our instructions.
                    </Text>

                    <Text style={styles.subHeader}>5.4 Anonymous and Aggregated Data</Text>
                    <Text style={styles.paragraph}>
                        We may publicly disclose or share anonymous, de-identified, or aggregated data that does not identify individual Users for purposes of public reporting, research, policy development, or transparency initiatives.
                    </Text>

                    <Text style={styles.subHeader}>5.5 Cross-Border Data Transfers</Text>
                    <Text style={styles.paragraph}>
                        Your personal data is stored on servers located within the Republic of Kenya. In limited circumstances, data may be transferred to jurisdictions outside Kenya where: (a) We have obtained Your explicit consent; (b) the destination country has been determined by the Data Commissioner to provide adequate data protection; (c) We have implemented appropriate safeguards such as Standard Contractual Clauses; or (d) the transfer is necessary for reasons of substantial public interest.
                    </Text>

                    <Text style={styles.sectionTitle}>6. DATA RETENTION</Text>
                    <Text style={styles.subHeader}>6.1 Retention Periods</Text>
                    <Text style={styles.paragraph}>
                        We retain Your personal data for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law. Specific retention periods include:
                    </Text>
                    <Text style={styles.paragraph}>
                        (a) <Text style={styles.bold}>Active Account Data</Text>: Retained for the duration of Your account's active status plus seven (7) years following account closure;{'\n'}
                        (b) <Text style={styles.bold}>Incident Reports</Text>: Retained indefinitely for governmental recordkeeping, audit, and historical purposes, unless deletion is specifically requested and approved;{'\n'}
                        (c) <Text style={styles.bold}>Communications</Text>: Retained for three (3) years from the date of communication;{'\n'}
                        (d) <Text style={styles.bold}>Technical Logs</Text>: Retained for ninety (90) days unless required for security investigations or legal proceedings.
                    </Text>

                    <Text style={styles.subHeader}>6.2 Data Deletion</Text>
                    <Text style={styles.paragraph}>
                        Upon expiration of the applicable retention period, We will securely delete or anonymize Your personal data in accordance with industry best practices and legal requirements.
                    </Text>

                    <Text style={styles.sectionTitle}>7. YOUR RIGHTS AS A DATA SUBJECT</Text>
                    <Text style={styles.paragraph}>
                        Under the Data Protection Act, 2019, You have the following rights:
                    </Text>
                    <Text style={styles.paragraph}>
                        (a) <Text style={styles.bold}>Right of Access</Text>: You may request access to Your personal data and obtain information about how it is processed;{'\n'}
                        (b) <Text style={styles.bold}>Right to Rectification</Text>: You may request correction of inaccurate or incomplete personal data;{'\n'}
                        (c) <Text style={styles.bold}>Right to Erasure</Text>: You may request deletion of Your personal data where: (i) it is no longer necessary for the purposes for which it was collected; (ii) You withdraw consent; (iii) You object to processing; or (iv) the data was unlawfully processed;{'\n'}
                        (d) <Text style={styles.bold}>Right to Restrict Processing</Text>: You may request restriction of processing in certain circumstances;{'\n'}
                        (e) <Text style={styles.bold}>Right to Data Portability</Text>: You may request Your personal data in a structured, commonly used, and machine-readable format;{'\n'}
                        (f) <Text style={styles.bold}>Right to Object</Text>: You may object to processing based on legitimate interests or for direct marketing purposes;{'\n'}
                        (g) <Text style={styles.bold}>Right to Withdraw Consent</Text>: Where processing is based on consent, You may withdraw consent at any time without affecting the lawfulness of processing before withdrawal;{'\n'}
                        (h) <Text style={styles.bold}>Right to Lodge a Complaint</Text>: You may lodge a complaint with the Office of the Data Protection Commissioner if You believe Your rights have been violated.
                    </Text>
                    <Text style={styles.paragraph}>
                        To exercise these rights, please contact Our Data Protection Officer using the contact details provided in Section 13.
                    </Text>

                    <Text style={styles.sectionTitle}>8. DATA SECURITY MEASURES</Text>
                    <Text style={styles.paragraph}>
                        We implement appropriate technical and organizational security measures to protect Your personal data against unauthorized access, alteration, disclosure, or destruction, including:
                    </Text>
                    <Text style={styles.paragraph}>
                        (a) <Text style={styles.bold}>Encryption</Text>: All data transmitted between Your device and Our servers is encrypted using TLS 1.3 protocol; personal data at rest is encrypted using AES-256 encryption;{'\n'}
                        (b) <Text style={styles.bold}>Access Controls</Text>: Role-based access controls, multi-factor authentication for government personnel, and regular access reviews;{'\n'}
                        (c) <Text style={styles.bold}>Network Security</Text>: Firewalls, intrusion detection systems, and continuous monitoring of network traffic;{'\n'}
                        (d) <Text style={styles.bold}>Regular Audits</Text>: Periodic security assessments, vulnerability testing, and compliance audits;{'\n'}
                        (e) <Text style={styles.bold}>Employee Training</Text>: Mandatory data protection and security training for all personnel with access to personal data;{'\n'}
                        (f) <Text style={styles.bold}>Incident Response</Text>: Documented procedures for detecting, responding to, and reporting data breaches in accordance with the Data Protection Act, 2019.
                    </Text>

                    <Text style={styles.sectionTitle}>9. DATA BREACH NOTIFICATION</Text>
                    <Text style={styles.paragraph}>
                        In the event of a personal data breach that is likely to result in a risk to Your rights and freedoms, We shall:
                    </Text>
                    <Text style={styles.paragraph}>
                        (a) Notify the Office of the Data Protection Commissioner within seventy-two (72) hours of becoming aware of the breach;{'\n'}
                        (b) Notify affected Users without undue delay where the breach is likely to result in a high risk to their rights and freedoms;{'\n'}
                        (c) Provide information about the nature of the breach, likely consequences, and measures taken or proposed to mitigate adverse effects.
                    </Text>

                    <Text style={styles.sectionTitle}>10. CHILDREN'S PRIVACY</Text>
                    <Text style={styles.paragraph}>
                        The Application is not intended for use by children under eighteen (18) years of age. We do not knowingly collect personal data from children without verifiable parental consent. If a parent or guardian becomes aware that their child has provided personal data without consent, they should contact Us immediately, and We will take steps to delete such data.
                    </Text>
                    <Text style={styles.paragraph}>
                        Where a child's Report is necessary for child protection purposes (e.g., reporting child abuse), such processing is conducted in accordance with Section 33 of the Data Protection Act, 2019, with appropriate safeguards to protect the child's rights and best interests.
                    </Text>

                    <Text style={styles.sectionTitle}>11. AUTOMATED DECISION-MAKING</Text>
                    <Text style={styles.paragraph}>
                        We may use automated systems to: (a) detect potentially fraudulent or duplicate Reports; (b) categorize and prioritize Incidents; (c) route Reports to appropriate agencies. However, no Report shall be rejected solely on the basis of automated decision-making. You have the right to request human review of any automated decision that significantly affects You.
                    </Text>

                    <Text style={styles.sectionTitle}>12. COOKIES AND TRACKING TECHNOLOGIES</Text>
                    <Text style={styles.paragraph}>
                        The Application may use cookies, local storage, and similar tracking technologies to enhance user experience and collect usage statistics. You may configure Your device settings to refuse cookies, though this may limit certain Application functionality.
                    </Text>

                    <Text style={styles.sectionTitle}>13. CONTACT INFORMATION AND COMPLAINTS</Text>
                    <Text style={styles.paragraph}>
                        <Text style={styles.bold}>Data Protection Officer</Text>{'\n'}
                        Kenya Incident Reporter{'\n'}
                        Ministry of Interior and National Administration{'\n'}
                        Email: dpo@incidentreporter.go.ke{'\n'}
                        Telephone: +254-20-2227411
                    </Text>
                    <Text style={styles.paragraph}>
                        <Text style={styles.bold}>Office of the Data Protection Commissioner</Text>{'\n'}
                        NCBA Loop, Karen{'\n'}
                        P.O. Box 1578-00606{'\n'}
                        Nairobi, Kenya{'\n'}
                        Email: dpo@odpc.go.ke{'\n'}
                        Website: www.odpc.go.ke{'\n'}
                        Telephone: +254-20-2628120
                    </Text>

                    <Text style={styles.sectionTitle}>14. UPDATES TO THIS PRIVACY POLICY</Text>
                    <Text style={styles.paragraph}>
                        We may update this Privacy Policy from time to time to reflect changes in Our practices, legal requirements, or Application features. We will notify You of material changes through the Application or via email. Your continued use of the Application after such notification constitutes acceptance of the updated Privacy Policy.
                    </Text>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { paddingBottom: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, ...SHADOWS.premium },
    headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingTop: 10 },
    backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },
    titleContainer: { alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.white },
    headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
    content: { padding: SPACING.lg },
    card: { backgroundColor: COLORS.white, borderRadius: 24, padding: 24, ...SHADOWS.medium },
    iconHeader: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.primary + '10', justifyContent: 'center', alignItems: 'center', marginBottom: 20, alignSelf: 'center' },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.black, marginTop: 24, marginBottom: 12 },
    subHeader: { fontSize: 16, fontWeight: '700', color: COLORS.textSecondary, marginTop: 16, marginBottom: 8 },
    paragraph: { fontSize: 15, lineHeight: 24, color: COLORS.textSecondary, marginBottom: 16, textAlign: 'justify' },
    bold: { fontWeight: '700', color: COLORS.black },
});
