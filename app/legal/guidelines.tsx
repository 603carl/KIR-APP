import { COLORS, SHADOWS, SPACING } from '@/constants/Theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, BookOpen } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CommunityGuidelinesScreen() {
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
                            <Text style={styles.headerTitle}>Community Guidelines</Text>
                            <Text style={styles.headerSubtitle}>Effective Date: January 2, 2026</Text>
                        </View>
                        <View style={{ width: 40 }} />
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.card}>
                    <View style={styles.iconHeader}>
                        <BookOpen size={32} color={COLORS.primary} />
                    </View>

                    <Text style={styles.sectionTitle}>DOCUMENT 3: COMMUNITY GUIDELINES</Text>

                    <Text style={styles.paragraph}>
                        These Community Guidelines ("Guidelines") establish standards of conduct for all Users of the Kenya Incident Reporter Application ("Application"). These Guidelines supplement and are incorporated into the Terms of Service. Violation of these Guidelines may result in suspension or termination of Your account and referral to law enforcement where applicable.
                    </Text>

                    <Text style={styles.sectionTitle}>1. CORE PRINCIPLES</Text>
                    <Text style={styles.paragraph}>
                        The Kenya Incident Reporter Application serves the public interest by facilitating communication between citizens and government. All Users are expected to uphold the following principles:
                    </Text>
                    <Text style={styles.paragraph}>
                        <Text style={styles.bold}>Truthfulness</Text>: Report only genuine Incidents based on firsthand knowledge or credible evidence. False reporting undermines public trust and diverts limited government resources.
                    </Text>
                    <Text style={styles.paragraph}>
                        <Text style={styles.bold}>Respect</Text>: Treat all Users, government officials, and third parties with dignity and respect. Harassment, discrimination, and hate speech have no place in Our community.
                    </Text>
                    <Text style={styles.paragraph}>
                        <Text style={styles.bold}>Responsibility</Text>: Recognize that Your Reports may have significant consequences for individuals and communities. Exercise sound judgment and discretion.
                    </Text>
                    <Text style={styles.paragraph}>
                        <Text style={styles.bold}>Lawfulness</Text>: Use the Application solely for lawful purposes in compliance with all applicable laws and regulations.
                    </Text>
                    <Text style={styles.paragraph}>
                        <Text style={styles.bold}>Public Interest</Text>: Focus on matters of genuine public concern rather than private disputes or commercial interests.
                    </Text>

                    <Text style={styles.sectionTitle}>2. REPORTING STANDARDS</Text>
                    <Text style={styles.subHeader}>2.1 Accuracy and Honesty</Text>
                    <Text style={styles.paragraph}>
                        You must:{'\n'}
                        - Provide accurate, complete, and truthful information in all Reports{'\n'}
                        - Clearly distinguish between facts You have personally witnessed and information You received from others{'\n'}
                        - Update or correct Reports if You discover inaccuracies{'\n'}
                        - Not fabricate, exaggerate, or embellish Incidents for any purpose{'\n'}
                        - Not submit Reports about hypothetical, imagined, or future events (except imminent threats)
                    </Text>

                    <Text style={styles.subHeader}>2.2 Evidence and Documentation</Text>
                    <Text style={styles.paragraph}>
                        - Submit supporting evidence where available (photographs, videos, documents){'\n'}
                        - Ensure media content is authentic, unaltered, and accurately represents the Incident{'\n'}
                        - Indicate if media content was obtained from third parties or social media{'\n'}
                        - Do not stage, manipulate, or misrepresent photographic or video evidence
                    </Text>

                    <Text style={styles.subHeader}>2.3 Appropriate Use of Categories</Text>
                    <Text style={styles.paragraph}>
                        - Select the most accurate category for Your Report{'\n'}
                        - Do not deliberately miscategorize Reports to gain priority or attention{'\n'}
                        - Use the Emergency SOS feature only for genuine emergencies requiring immediate response
                    </Text>

                    <Text style={styles.sectionTitle}>3. PROHIBITED CONTENT</Text>
                    <Text style={styles.paragraph}>
                        The following types of content are strictly prohibited:
                    </Text>

                    <Text style={styles.subHeader}>3.1 False Information</Text>
                    <Text style={styles.paragraph}>
                        - False, fabricated, or deliberately misleading Reports{'\n'}
                        - Defamatory statements made with knowledge of their falsity or reckless disregard for truth{'\n'}
                        - Impersonation of government officials, agencies, or other individuals{'\n'}
                        - Fraudulent claims made for personal gain or to harm others
                    </Text>

                    <Text style={styles.subHeader}>3.2 Harmful Content</Text>
                    <Text style={styles.paragraph}>
                        - Content promoting, glorifying, or inciting violence, terrorism, or criminal activity{'\n'}
                        - Child sexual abuse material or content exploiting minors{'\n'}
                        - Content promoting self-harm or suicide{'\n'}
                        - Graphic violence or gore shared for shock value rather than legitimate documentation{'\n'}
                        - Content that doxes individuals by publishing private information without consent
                    </Text>

                    <Text style={styles.subHeader}>3.3 Hate Speech and Discrimination</Text>
                    <Text style={styles.paragraph}>
                        - Content attacking individuals or groups based on race, ethnicity, national origin, religion, caste, sexual orientation, gender identity, disability, or immigration status{'\n'}
                        - Slurs, stereotypes, or dehumanizing language targeting protected groups{'\n'}
                        - Content advocating for discrimination or exclusion of protected groups
                    </Text>

                    <Text style={styles.subHeader}>3.4 Harassment and Abuse</Text>
                    <Text style={styles.paragraph}>
                        - Targeted harassment, bullying, or intimidation of specific individuals{'\n'}
                        - Repeated unwanted contact or communications{'\n'}
                        - Threats of violence or harm against any person{'\n'}
                        - Encouraging others to harass specific individuals
                    </Text>

                    <Text style={styles.subHeader}>3.5 Sexual Content</Text>
                    <Text style={styles.paragraph}>
                        - Pornographic, sexually explicit, or obscene material{'\n'}
                        - Non-consensual intimate images or "revenge porn"{'\n'}
                        - Sexual solicitation or exploitation
                    </Text>

                    <Text style={styles.subHeader}>3.6 Spam and Manipulation</Text>
                    <Text style={styles.paragraph}>
                        - Duplicate Reports about the same Incident submitted multiple times{'\n'}
                        - Mass submission of similar Reports to overwhelm the system{'\n'}
                        - Commercial advertisements or promotional content{'\n'}
                        - Pyramid schemes, multi-level marketing, or get-rich-quick schemes{'\n'}
                        - Phishing attempts or fraudulent links
                    </Text>

                    <Text style={styles.subHeader}>3.7 Intellectual Property Infringement</Text>
                    <Text style={styles.paragraph}>
                        - Copyrighted material shared without authorization{'\n'}
                        - Counterfeit goods or services{'\n'}
                        - Unauthorized use of trademarks or protected symbols
                    </Text>

                    <Text style={styles.sectionTitle}>4. PRIVACY AND CONSENT</Text>
                    <Text style={styles.subHeader}>4.1 Personal Information</Text>
                    <Text style={styles.paragraph}>
                        - Do not publish personal information of identifiable individuals (names, addresses, phone numbers, ID numbers) unless directly relevant to the Incident and in the public interest{'\n'}
                        - Obtain consent before submitting photographs or videos depicting identifiable individuals, except where documentation of public events or matters of public interest{'\n'}
                        - Be particularly cautious with information concerning minors, victims of crime, or vulnerable persons
                    </Text>

                    <Text style={styles.subHeader}>4.2 Private Property and Spaces</Text>
                    <Text style={styles.paragraph}>
                        - Respect privacy expectations when recording or photographing on private property{'\n'}
                        - Do not submit recordings made in violation of surveillance or wiretapping laws{'\n'}
                        - Indicate when recordings were made in areas with heightened privacy expectations
                    </Text>

                    <Text style={styles.sectionTitle}>5. CONSTRUCTIVE ENGAGEMENT</Text>
                    <Text style={styles.subHeader}>5.1 Solution-Oriented Reporting</Text>
                    <Text style={styles.paragraph}>
                        - Where appropriate, suggest potential solutions or actions in Your Reports{'\n'}
                        - Engage constructively with government responses and follow-up questions{'\n'}
                        - Provide additional information promptly when requested{'\n'}
                        - Accept resolution outcomes with grace even if not Your preferred result
                    </Text>

                    <Text style={styles.subHeader}>5.2 Respectful Communication</Text>
                    <Text style={styles.paragraph}>
                        - Use civil, professional language in all communications{'\n'}
                        - Avoid inflammatory rhetoric, insults, or personal attacks{'\n'}
                        - Express disagreement respectfully and substantively{'\n'}
                        - Acknowledge the complexity of governance challenges
                    </Text>

                    <Text style={styles.subHeader}>5.3 Community Support</Text>
                    <Text style={styles.paragraph}>
                        - Support fellow Users by sharing factual information about similar Incidents{'\n'}
                        - Correct misinformation when You encounter it{'\n'}
                        - Report violations of these Guidelines when You observe them{'\n'}
                        - Contribute to a culture of responsible civic engagement
                    </Text>

                    <Text style={styles.sectionTitle}>6. SAFETY AND SECURITY</Text>
                    <Text style={styles.subHeader}>6.1 Personal Safety</Text>
                    <Text style={styles.paragraph}>
                        - Prioritize Your personal safety over documentation{'\n'}
                        - Do not place Yourself or others in danger to obtain evidence{'\n'}
                        - Use the Emergency SOS feature if You are in immediate danger{'\n'}
                        - Cooperate with law enforcement directives at Incident scenes
                    </Text>

                    <Text style={styles.subHeader}>6.2 Operational Security</Text>
                    <Text style={styles.paragraph}>
                        - Do not share information that could compromise ongoing investigations{'\n'}
                        - Do not disclose security vulnerabilities in critical infrastructure{'\n'}
                        - Do not publish sensitive government information marked as classified or confidential{'\n'}
                        - Report potential security threats through appropriate secure channels
                    </Text>

                    <Text style={styles.sectionTitle}>7. ENFORCEMENT AND CONSEQUENCES</Text>
                    <Text style={styles.subHeader}>7.1 Violations</Text>
                    <Text style={styles.paragraph}>
                        Violations of these Guidelines may result in:{'\n'}
                        - Warning notices and educational guidance{'\n'}
                        - Temporary restriction of certain Application features{'\n'}
                        - Temporary suspension of account access{'\n'}
                        - Permanent termination of account{'\n'}
                        - Removal of violating content{'\n'}
                        - Reporting to law enforcement authorities{'\n'}
                        - Civil or criminal liability under applicable law
                    </Text>

                    <Text style={styles.subHeader}>7.2 Appeals</Text>
                    <Text style={styles.paragraph}>
                        If You believe enforcement action was taken in error:{'\n'}
                        - Submit an appeal through the Application's support system{'\n'}
                        - Provide specific information explaining why the action was unwarranted{'\n'}
                        - Appeals will be reviewed by a different moderator within seven (7) business days{'\n'}
                        - Decisions on appeals are final and binding
                    </Text>

                    <Text style={styles.subHeader}>7.3 Repeated Violations</Text>
                    <Text style={styles.paragraph}>
                        Users with multiple violations may face escalating consequences, including permanent ban from the Application and referral to law enforcement for investigation of potential criminal conduct.
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
