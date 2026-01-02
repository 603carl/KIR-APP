import { COLORS, SHADOWS, SPACING } from '@/constants/Theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, FileText } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TermsOfServiceScreen() {
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
                            <Text style={styles.headerTitle}>Terms of Service</Text>
                            <Text style={styles.headerSubtitle}>Effective Date: January 2, 2026</Text>
                        </View>
                        <View style={{ width: 40 }} />
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.card}>
                    <View style={styles.iconHeader}>
                        <FileText size={32} color={COLORS.primary} />
                    </View>

                    <Text style={styles.sectionTitle}>1. ACCEPTANCE OF TERMS</Text>
                    <Text style={styles.paragraph}>
                        THESE TERMS OF SERVICE ("Terms," "Agreement") constitute a legally binding contract between you ("User," "You," "Your") and the Government of the Republic of Kenya, acting through the Ministry of Interior and National Administration ("Government," "We," "Us," "Our"), governing Your access to and use of the Kenya Incident Reporter mobile application and associated services (collectively, the "Service" or "Application").
                    </Text>
                    <Text style={styles.paragraph}>
                        BY ACCESSING, DOWNLOADING, INSTALLING, OR USING THE APPLICATION, YOU EXPRESSLY ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THESE TERMS, INCLUDING OUR PRIVACY POLICY, WHICH IS INCORPORATED HEREIN BY REFERENCE. IF YOU DO NOT AGREE TO THESE TERMS IN THEIR ENTIRETY, YOU MUST NOT ACCESS OR USE THE APPLICATION.
                    </Text>
                    <Text style={styles.paragraph}>
                        Your continued use of the Application following any modifications to these Terms constitutes Your acceptance of such modifications. We reserve the right to modify these Terms at any time, and such modifications shall become effective immediately upon posting. Your responsibility is to review these Terms periodically for updates.
                    </Text>

                    <Text style={styles.sectionTitle}>2. DEFINITIONS</Text>
                    <Text style={styles.paragraph}>
                        For purposes of this Agreement, the following capitalized terms shall have the meanings set forth below:
                    </Text>
                    <Text style={styles.paragraph}>
                        <Text style={styles.bold}>"Incident"</Text> means any event, occurrence, situation, or circumstance reported through the Application, including but not limited to security threats, infrastructure defects, corruption allegations, health hazards, environmental violations, or social concerns affecting the public interest within the Republic of Kenya.
                    </Text>
                    <Text style={styles.paragraph}>
                        <Text style={styles.bold}>"Report"</Text> means the submission of an Incident through the Application, including all associated text, images, videos, audio recordings, location data, and metadata.
                    </Text>
                    <Text style={styles.paragraph}>
                        <Text style={styles.bold}>"Personal Data"</Text> shall have the meaning ascribed to it under the Data Protection Act, 2019 (No. 24 of 2019).
                    </Text>
                    <Text style={styles.paragraph}>
                        <Text style={styles.bold}>"User Content"</Text> means all data, information, photographs, videos, audio files, documents, and other materials submitted, uploaded, or transmitted by You through the Application.
                    </Text>
                    <Text style={styles.paragraph}>
                        <Text style={styles.bold}>"Verified User"</Text> means a User who has completed the identity verification process in accordance with Section 4.2 herein.
                    </Text>

                    <Text style={styles.sectionTitle}>3. ELIGIBILITY AND USER ACCOUNTS</Text>
                    <Text style={styles.subHeader}>3.1 Age Requirement</Text>
                    <Text style={styles.paragraph}>
                        You must be at least eighteen (18) years of age to create an account and use the Application. In accordance with Article 260 of the Constitution of Kenya, persons under eighteen (18) years of age are considered minors and may only use the Application with the express consent and supervision of a parent or legal guardian. The parent or legal guardian assumes full responsibility for the minor's use of the Application and compliance with these Terms.
                    </Text>

                    <Text style={styles.subHeader}>3.2 Account Registration</Text>
                    <Text style={styles.paragraph}>
                        To access certain features of the Application, You must register for an account by providing accurate, current, and complete information, including but not limited to Your legal name, mobile telephone number, email address, and national identification number. You represent and warrant that all registration information You submit is truthful, accurate, and complete, and You agree to promptly update such information to maintain its accuracy.
                    </Text>

                    <Text style={styles.subHeader}>3.3 Account Security</Text>
                    <Text style={styles.paragraph}>
                        You are solely responsible for maintaining the confidentiality of Your account credentials, including Your password, biometric authentication data, and any other security measures. You agree to immediately notify Us of any unauthorized access to or use of Your account. You acknowledge and agree that You shall be liable for all activities conducted through Your account, whether or not authorized by You.
                    </Text>

                    <Text style={styles.subHeader}>3.4 Account Termination</Text>
                    <Text style={styles.paragraph}>
                        We reserve the absolute right, in Our sole discretion, to suspend, terminate, or restrict access to Your account at any time, with or without notice, for any reason or no reason, including but not limited to: (a) violation of these Terms; (b) submission of false, misleading, or malicious Reports; (c) abuse of the Application or other Users; (d) engagement in illegal activities; (e) failure to respond to verification requests; or (f) as required by law or court order.
                    </Text>

                    <Text style={styles.sectionTitle}>4. USER OBLIGATIONS AND PROHIBITED CONDUCT</Text>
                    <Text style={styles.subHeader}>4.1 Lawful Use</Text>
                    <Text style={styles.paragraph}>
                        You agree to use the Application solely for lawful purposes and in compliance with all applicable laws, regulations, and governmental orders of the Republic of Kenya, including but not limited to the Computer Misuse and Cybercrimes Act, 2018 (No. 5 of 2018), the Data Protection Act, 2019 (No. 24 of 2019), and the Penal Code (Cap. 63).
                    </Text>

                    <Text style={styles.subHeader}>4.2 Prohibited Activities</Text>
                    <Text style={styles.paragraph}>
                        You expressly agree that You shall NOT:
                    </Text>
                    <Text style={styles.paragraph}>
                        (a) Submit false, misleading, fraudulent, or deliberately inaccurate Reports with intent to deceive, defame, or cause harm;{'\n'}
                        (b) Use the Application to harass, threaten, intimidate, stalk, or otherwise violate the legal rights of others;{'\n'}
                        (c) Upload, transmit, or distribute any content containing viruses, malware, spyware, or other malicious code designed to interrupt, destroy, or limit the functionality of the Application;{'\n'}
                        (d) Attempt to gain unauthorized access to the Application's systems, servers, databases, or any other component of the Service through hacking, password mining, or any other means;{'\n'}
                        (e) Engage in any activity that interferes with or disrupts the Application's operation or the servers and networks connected to the Application;{'\n'}
                        (f) Use automated systems, including but not limited to robots, scrapers, or spiders, to access or extract data from the Application without Our express written permission;{'\n'}
                        (g) Impersonate any person or entity, or falsely state or otherwise misrepresent Your affiliation with any person or entity;{'\n'}
                        (h) Submit Reports containing obscene, pornographic, defamatory, libelous, or otherwise offensive content;{'\n'}
                        (i) Use the Application for any commercial purpose without Our express written authorization;{'\n'}
                        (j) Violate the intellectual property rights, privacy rights, or any other rights of third parties;{'\n'}
                        (k) Submit Reports concerning matters outside the territorial jurisdiction of the Republic of Kenya except where such matters directly affect Kenyan citizens or interests;{'\n'}
                        (l) Coordinate or encourage others to violate these Terms or engage in prohibited conduct.
                    </Text>

                    <Text style={styles.subHeader}>4.3 Consequences of Violation</Text>
                    <Text style={styles.paragraph}>
                        Violation of Section 4.2 may result in: (a) immediate suspension or termination of Your account; (b) removal of Your User Content; (c) reporting to law enforcement authorities; (d) civil or criminal liability under applicable Kenyan law; and (e) forfeiture of any remedies or relief otherwise available to You.
                    </Text>

                    <Text style={styles.sectionTitle}>5. INCIDENT REPORTING AND USER CONTENT</Text>
                    <Text style={styles.subHeader}>5.1 Report Submission</Text>
                    <Text style={styles.paragraph}>
                        By submitting a Report through the Application, You represent and warrant that: (a) the information contained in the Report is true and accurate to the best of Your knowledge; (b) You have a good faith belief that the Incident reported requires governmental attention; (c) the Report is not submitted for any improper, malicious, or unlawful purpose; and (d) You possess all necessary rights to submit any media, documents, or other materials included in the Report.
                    </Text>

                    <Text style={styles.subHeader}>5.2 Anonymous Reporting</Text>
                    <Text style={styles.paragraph}>
                        The Application permits anonymous reporting for certain categories of Incidents. However, You acknowledge and agree that: (a) anonymous Reports may be subject to additional verification requirements; (b) anonymous Reports may receive lower priority or reduced follow-up compared to attributed Reports; (c) We may be compelled by law or court order to disclose technical data that could potentially identify You; and (d) certain Incidents may not be eligible for anonymous reporting due to legal requirements.
                    </Text>

                    <Text style={styles.subHeader}>5.3 License Grant</Text>
                    <Text style={styles.paragraph}>
                        By submitting User Content through the Application, You hereby grant to the Government a worldwide, perpetual, irrevocable, royalty-free, non-exclusive, transferable, and sublicensable license to use, reproduce, modify, adapt, publish, translate, create derivative works from, distribute, display, and otherwise exploit such User Content for the purposes of: (a) processing, investigating, and responding to the reported Incident; (b) compiling statistical data and analytics; (c) improving public services and policy-making; (d) training government personnel; and (e) any other governmental purpose in the public interest.
                    </Text>

                    <Text style={styles.subHeader}>5.4 No Obligation to Monitor</Text>
                    <Text style={styles.paragraph}>
                        While We reserve the right to review, edit, or remove User Content at Our sole discretion, We have no obligation to monitor User Content and assume no liability for User Content or for any failure to monitor, edit, or remove any User Content.
                    </Text>

                    <Text style={styles.subHeader}>5.5 Media Content Requirements</Text>
                    <Text style={styles.paragraph}>
                        All photographs, videos, and audio recordings submitted through the Application must: (a) be original content created by You or content for which You have obtained all necessary permissions; (b) not violate the privacy rights of identifiable individuals unless such disclosure is necessary and proportionate to the public interest; (c) comply with all applicable laws regarding recording and surveillance; and (d) be relevant to the Incident being reported.
                    </Text>

                    <Text style={styles.sectionTitle}>6. INTELLECTUAL PROPERTY RIGHTS</Text>
                    <Text style={styles.subHeader}>6.1 Government Ownership</Text>
                    <Text style={styles.paragraph}>
                        The Application, including all software, designs, text, graphics, logos, icons, images, audio clips, video clips, data compilations, and all intellectual property rights therein, is owned by the Government of the Republic of Kenya or its licensors. These Terms do not grant You any ownership rights in the Application, and all rights not expressly granted herein are reserved by the Government.
                    </Text>

                    <Text style={styles.subHeader}>6.2 Limited License</Text>
                    <Text style={styles.paragraph}>
                        Subject to Your compliance with these Terms, We grant You a limited, non-exclusive, non-transferable, non-sublicensable, revocable license to access and use the Application solely for its intended purpose of reporting Incidents to the Government.
                    </Text>

                    <Text style={styles.subHeader}>6.3 Trademark Usage</Text>
                    <Text style={styles.paragraph}>
                        The names, logos, emblems, and symbols of the Government of the Republic of Kenya, including the national coat of arms and flag, are protected trademarks and may not be used without express written permission.
                    </Text>

                    <Text style={styles.sectionTitle}>7. DISCLAIMER OF WARRANTIES</Text>
                    <Text style={styles.paragraph}>
                        TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE APPLICATION IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE. WE EXPRESSLY DISCLAIM ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, TITLE, QUIET ENJOYMENT, AND ANY WARRANTIES ARISING FROM COURSE OF DEALING OR USAGE OF TRADE.
                    </Text>
                    <Text style={styles.paragraph}>
                        WITHOUT LIMITING THE FOREGOING, WE DO NOT WARRANT THAT: (a) THE APPLICATION WILL MEET YOUR REQUIREMENTS OR EXPECTATIONS; (b) THE APPLICATION WILL BE UNINTERRUPTED, TIMELY, SECURE, OR ERROR-FREE; (c) THE RESULTS OBTAINED FROM USE OF THE APPLICATION WILL BE ACCURATE, COMPLETE, OR RELIABLE; (d) ANY ERRORS OR DEFECTS IN THE APPLICATION WILL BE CORRECTED; OR (e) REPORTS SUBMITTED THROUGH THE APPLICATION WILL RESULT IN ANY PARTICULAR GOVERNMENTAL ACTION OR RESPONSE.
                    </Text>
                    <Text style={styles.paragraph}>
                        YOU ACKNOWLEDGE THAT YOUR USE OF THE APPLICATION IS AT YOUR SOLE RISK AND THAT YOU ARE SOLELY RESPONSIBLE FOR ANY DAMAGE TO YOUR DEVICE OR LOSS OF DATA RESULTING FROM YOUR USE OF THE APPLICATION.
                    </Text>

                    <Text style={styles.sectionTitle}>8. LIMITATION OF LIABILITY</Text>
                    <Text style={styles.paragraph}>
                        TO THE FULLEST EXTENT PERMITTED BY LAW, IN NO EVENT SHALL THE GOVERNMENT OF THE REPUBLIC OF KENYA, ITS MINISTRIES, DEPARTMENTS, AGENCIES, OFFICERS, EMPLOYEES, AGENTS, OR CONTRACTORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO DAMAGES FOR LOSS OF PROFITS, GOODWILL, USE, DATA, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF OR RELATING TO YOUR USE OF OR INABILITY TO USE THE APPLICATION, REGARDLESS OF THE THEORY OF LIABILITY (CONTRACT, TORT, STRICT LIABILITY, OR OTHERWISE) AND EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
                    </Text>
                    <Text style={styles.paragraph}>
                        IN JURISDICTIONS THAT DO NOT ALLOW THE EXCLUSION OR LIMITATION OF LIABILITY FOR CONSEQUENTIAL OR INCIDENTAL DAMAGES, OUR LIABILITY SHALL BE LIMITED TO THE MAXIMUM EXTENT PERMITTED BY LAW.
                    </Text>

                    <Text style={styles.sectionTitle}>9. INDEMNIFICATION</Text>
                    <Text style={styles.paragraph}>
                        You agree to indemnify, defend, and hold harmless the Government of the Republic of Kenya, its ministries, departments, agencies, officers, employees, agents, and contractors from and against any and all claims, liabilities, damages, losses, costs, expenses, or fees (including reasonable attorneys' fees) arising from or relating to: (a) Your use of the Application; (b) Your violation of these Terms; (c) Your violation of any law or regulation; (d) Your User Content; (e) Your violation of any rights of any third party; or (f) any false, misleading, or malicious Report submitted by You.
                    </Text>

                    <Text style={styles.sectionTitle}>10. GOVERNING LAW AND DISPUTE RESOLUTION</Text>
                    <Text style={styles.subHeader}>10.1 Governing Law</Text>
                    <Text style={styles.paragraph}>
                        These Terms shall be governed by and construed in accordance with the laws of the Republic of Kenya, without regard to its conflict of law principles.
                    </Text>

                    <Text style={styles.subHeader}>10.2 Jurisdiction</Text>
                    <Text style={styles.paragraph}>
                        You irrevocably submit to the exclusive jurisdiction of the courts of the Republic of Kenya for any dispute, claim, or controversy arising out of or relating to these Terms or the Application.
                    </Text>

                    <Text style={styles.subHeader}>10.3 Alternative Dispute Resolution</Text>
                    <Text style={styles.paragraph}>
                        Before instituting any legal proceedings, the parties agree to attempt to resolve any dispute through good faith negotiations. If negotiations fail, the parties may agree to submit the dispute to mediation in accordance with the Mediation Act, 2021 (No. 31 of 2021).
                    </Text>

                    <Text style={styles.sectionTitle}>11. SEVERABILITY</Text>
                    <Text style={styles.paragraph}>
                        If any provision of these Terms is held to be invalid, illegal, or unenforceable by a court of competent jurisdiction, such provision shall be modified to the minimum extent necessary to make it valid and enforceable while preserving its intent, or if such modification is not possible, such provision shall be severed from these Terms. The invalidity, illegality, or unenforceability of any provision shall not affect the validity, legality, or enforceability of the remaining provisions.
                    </Text>

                    <Text style={styles.sectionTitle}>12. ENTIRE AGREEMENT</Text>
                    <Text style={styles.paragraph}>
                        These Terms, together with the Privacy Policy and Community Guidelines, constitute the entire agreement between You and the Government regarding Your use of the Application and supersede all prior or contemporaneous understandings, agreements, representations, and warranties, whether written or oral, regarding the subject matter hereof.
                    </Text>

                    <Text style={styles.sectionTitle}>13. CONTACT INFORMATION</Text>
                    <Text style={styles.paragraph}>
                        For questions, concerns, or notices regarding these Terms, please contact:
                    </Text>
                    <Text style={styles.paragraph}>
                        <Text style={styles.bold}>Kenya Incident Reporter Legal Department</Text>{'\n'}
                        Ministry of Interior and National Administration{'\n'}
                        Harambee House, Harambee Avenue{'\n'}
                        P.O. Box 30510-00100{'\n'}
                        Nairobi, Kenya
                    </Text>
                    <Text style={styles.paragraph}>
                        Email: legal@incidentreporter.go.ke{'\n'}
                        Telephone: +254-20-2227411
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
