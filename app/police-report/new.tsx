import { COLORS, SHADOWS, SPACING } from '@/constants/Theme';
import { DOCUMENT_TYPES, getCountyOptions, getKnownSubCounties, getPoliceStationOptions, OFFENCE_CATEGORIES } from '@/lib/policeFormOptions';
import { readPoliceReportDraft, removePoliceReportDraft, writePoliceReportDraft, type PoliceReportDraftAsset } from '@/lib/policeReportDraft';
import { submitPoliceReport, uploadPoliceEvidence, type PoliceCaseModule } from '@/lib/policeReports';
import * as Crypto from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { type Href, Stack, useRouter } from 'expo-router';
import { ArrowLeft, Camera, Check, CheckCircle2, ChevronDown, FileText, LocateFixed, Search, ShieldCheck } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, ScrollView, StyleSheet, Switch, Text, TextInput, type TextInputProps, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const MODULES: { key: PoliceCaseModule; label: string }[] = [
    { key: 'general', label: 'General Complaint' },
    { key: 'property', label: 'Theft / Lost Property' },
    { key: 'assault', label: 'Assault / Injury' },
    { key: 'road_accident', label: 'Road Accident' },
    { key: 'missing_person', label: 'Missing Person' },
    { key: 'cyber_fraud', label: 'Cybercrime / Fraud' },
];

type Fields = Record<string, string>;

export default function PoliceReportIntake() {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [module, setModule] = useState<PoliceCaseModule>('general');
    const [fields, setFields] = useState<Fields>({ occurrence_started_at: new Date().toISOString() });
    const [danger, setDanger] = useState(false);
    const [injury, setInjury] = useState(false);
    const [suspectKnown, setSuspectKnown] = useState(false);
    const [witnessAvailable, setWitnessAvailable] = useState(false);
    const [previouslyReported, setPreviouslyReported] = useState(false);
    const [sameAsReporterLocation, setSameAsReporterLocation] = useState(false);
    const [declaration, setDeclaration] = useState(false);
    const [consent, setConsent] = useState(false);
    const [assets, setAssets] = useState<ImagePicker.ImagePickerAsset[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [draftLoaded, setDraftLoaded] = useState(false);
    const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
    const [draftSaveError, setDraftSaveError] = useState<string | null>(null);
    const [countyOptions, setCountyOptions] = useState<string[]>([]);
    const [reporterSubCounties, setReporterSubCounties] = useState<string[]>([]);
    const [occurrenceSubCounties, setOccurrenceSubCounties] = useState<string[]>([]);
    const [stationOptions, setStationOptions] = useState<string[]>([]);
    const idempotencyKey = useRef(Crypto.randomUUID());

    const set = (key: string, text: string) => setFields((current) => ({ ...current, [key]: text }));
    const bind = (key: string) => (text: string) => set(key, text);
    const requiredByStep = useMemo(() => [
        ['reporter_full_name', 'reporter_document_type', 'reporter_document_number', 'reporter_phone', 'reporter_email', 'reporter_address', 'reporter_county', 'reporter_sub_county'],
        ['preferred_station', 'station_location', 'nature_of_report', 'title', 'detailed_statement'],
        ['occurrence_started_at', 'occurrence_location', 'occurrence_county', 'occurrence_sub_county'],
    ], []);
    const stationLocationOptions = useMemo(() => Array.from(new Set([
        fields.occurrence_sub_county,
        fields.reporter_sub_county,
        fields.occurrence_county,
        fields.reporter_county,
    ].map((value) => value?.trim()).filter((value): value is string => Boolean(value)))),
        [fields.occurrence_county, fields.occurrence_sub_county, fields.reporter_county, fields.reporter_sub_county]);

    useEffect(() => {
        let active = true;
        (async () => {
            const [counties, savedDraft] = await Promise.all([
                getCountyOptions().catch(() => []),
                readPoliceReportDraft().catch(() => null),
            ]);
            if (!active) return;
            setCountyOptions(counties);
            if (savedDraft) {
                const { draft, savedAt } = savedDraft;
                setStep(Math.max(0, Math.min(3, draft.step)));
                setModule(draft.module);
                setFields(draft.fields);
                setDanger(draft.flags.danger);
                setInjury(draft.flags.injury);
                setSuspectKnown(draft.flags.suspectKnown);
                setWitnessAvailable(draft.flags.witnessAvailable);
                setPreviouslyReported(draft.flags.previouslyReported);
                setDeclaration(draft.flags.declaration);
                setConsent(draft.flags.consent);
                setSameAsReporterLocation(draft.flags.sameAsReporterLocation);
                setAssets(draft.assets as ImagePicker.ImagePickerAsset[]);
                idempotencyKey.current = draft.idempotencyKey;
                setDraftSavedAt(savedAt);
                if (draft.fields.reporter_county) setReporterSubCounties(await getKnownSubCounties(draft.fields.reporter_county));
                if (draft.fields.occurrence_county) setOccurrenceSubCounties(await getKnownSubCounties(draft.fields.occurrence_county));
            }
            setDraftLoaded(true);
        })();
        return () => { active = false; };
    }, []);

    useEffect(() => {
        if (!draftLoaded || submitting) return;
        const timeout = setTimeout(() => {
            writePoliceReportDraft({
                step,
                module,
                fields,
                flags: { danger, injury, suspectKnown, witnessAvailable, previouslyReported, declaration, consent, sameAsReporterLocation },
                assets: assets.map(({ uri, fileName, mimeType }) => ({ uri, fileName, mimeType } satisfies PoliceReportDraftAsset)),
                idempotencyKey: idempotencyKey.current,
            })
                .then(() => { setDraftSavedAt(Date.now()); setDraftSaveError(null); })
                .catch((error: unknown) => setDraftSaveError(error instanceof Error ? error.message : 'Unable to save draft securely.'));
        }, 800);
        return () => clearTimeout(timeout);
    }, [assets, consent, danger, declaration, draftLoaded, fields, injury, module, previouslyReported, sameAsReporterLocation, step, submitting, suspectKnown, witnessAvailable]);

    useEffect(() => {
        if (!draftLoaded) return;
        let active = true;
        const stationCounty = fields.occurrence_county || fields.reporter_county || '';
        const stationSubCounty = fields.occurrence_sub_county || fields.reporter_sub_county || '';
        getPoliceStationOptions(stationCounty, stationSubCounty)
            .then((options) => { if (active) setStationOptions(options); })
            .catch(() => { if (active) setStationOptions([]); });
        return () => { active = false; };
    }, [draftLoaded, fields.occurrence_county, fields.occurrence_sub_county, fields.reporter_county, fields.reporter_sub_county]);

    const selectReporterCounty = async (county: string) => {
        setFields((current) => ({
            ...current,
            reporter_county: county,
            reporter_sub_county: '',
            ...(sameAsReporterLocation ? { occurrence_county: county, occurrence_sub_county: '' } : {}),
        }));
        setReporterSubCounties(await getKnownSubCounties(county));
        if (sameAsReporterLocation) setOccurrenceSubCounties(await getKnownSubCounties(county));
    };

    const selectReporterSubCounty = (subCounty: string) => {
        setFields((current) => ({
            ...current,
            reporter_sub_county: subCounty,
            ...(sameAsReporterLocation ? { occurrence_sub_county: subCounty } : {}),
        }));
    };

    const setSameLocation = async (enabled: boolean) => {
        setSameAsReporterLocation(enabled);
        if (enabled) {
            setFields((current) => ({
                ...current,
                occurrence_county: current.reporter_county || current.occurrence_county || '',
                occurrence_sub_county: current.reporter_sub_county || current.occurrence_sub_county || '',
            }));
            if (fields.reporter_county) setOccurrenceSubCounties(await getKnownSubCounties(fields.reporter_county));
        }
    };

    const selectOccurrenceCounty = async (county: string) => {
        setFields((current) => ({ ...current, occurrence_county: county, occurrence_sub_county: '' }));
        setOccurrenceSubCounties(await getKnownSubCounties(county));
    };

    const pickEvidence = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], allowsMultipleSelection: true, quality: 0.8 });
        if (!result.canceled) setAssets(result.assets);
    };

    const captureLocation = async () => {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== 'granted') return Alert.alert('Location Permission', 'Location permission is needed to capture the occurrence position.');
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        set('latitude', String(position.coords.latitude));
        set('longitude', String(position.coords.longitude));
        Alert.alert('Location Captured', 'GPS coordinates were attached securely to this Police Report.');
    };

    const next = () => {
        const missing = (requiredByStep[step] || []).find((key) => !fields[key]?.trim());
        if (missing) return Alert.alert('Required Details', 'Complete every required field before continuing.');
        if (step === 1 && (fields.detailed_statement?.trim().length || 0) < 30) {
            return Alert.alert('Full Statement Required', 'Provide a detailed statement of at least 30 characters.');
        }
        if (step === 2) {
            const moduleRequirement: Partial<Record<PoliceCaseModule, string[]>> = {
                property: ['item_description', 'property_ownership', 'property_identifier', 'estimated_value', 'property_proof_declaration'],
                assault: ['injury_description', 'treatment_facility', 'p3_availability', 'weapon_details'],
                road_accident: ['vehicle_registration', 'driver_details', 'passenger_details', 'accident_injuries', 'insurance_details', 'accident_scene_details'],
                missing_person: ['missing_person_name', 'missing_person_description', 'missing_person_last_seen', 'relationship_to_missing_person', 'missing_person_photo_declaration'],
                cyber_fraud: ['platform', 'fraud_account_identifiers', 'transaction_reference', 'amount_lost', 'digital_evidence_declaration'],
            };
            const missingModuleField = (moduleRequirement[module] || []).some((key) => !fields[key]?.trim());
            if (missingModuleField) return Alert.alert('Required Case Details', 'Complete the required details for the selected report type.');
            if (suspectKnown && !fields.suspect_name?.trim()) return Alert.alert('Suspect Details Required', 'Provide identifying details for the known suspect.');
            if (witnessAvailable && !fields.witness_name?.trim()) return Alert.alert('Witness Details Required', 'Provide the available witness details.');
            if (previouslyReported && !fields.previous_report_reference?.trim()) return Alert.alert('Previous Report Required', 'Provide the earlier OB number or reference.');
        }
        if (step === 2 && fields.reporter_full_name?.trim() && !fields.electronic_signature?.trim()) {
            set('electronic_signature', fields.reporter_full_name.trim());
        }
        setStep((current) => Math.min(current + 1, 3));
    };

    const conditionalFields = () => {
        if (module === 'property') return <>
            <Field label="Item Description *" value={fields.item_description} onChangeText={bind('item_description')} />
            <Field label="Ownership Details *" value={fields.property_ownership} onChangeText={bind('property_ownership')} />
            <Field label="Identifier / Serial Number (enter Unknown if none) *" value={fields.property_identifier} onChangeText={bind('property_identifier')} />
            <Field label="Estimated Value (KES) *" value={fields.estimated_value} onChangeText={bind('estimated_value')} keyboardType="numeric" />
            <Field label="Proof Of Ownership / Attachment Details *" value={fields.property_proof_declaration} onChangeText={bind('property_proof_declaration')} multiline />
        </>;
        if (module === 'assault') return <>
            <Field label="Injuries Sustained *" value={fields.injury_description} onChangeText={bind('injury_description')} multiline />
            <Field label="Treatment Facility / Medical Care (enter None if none) *" value={fields.treatment_facility} onChangeText={bind('treatment_facility')} />
            <Field label="Medical Report / P3 Availability *" value={fields.p3_availability} onChangeText={bind('p3_availability')} />
            <Field label="Weapon Details (enter None if none) *" value={fields.weapon_details} onChangeText={bind('weapon_details')} />
        </>;
        if (module === 'road_accident') return <>
            <Field label="Vehicle Registration(s) *" value={fields.vehicle_registration} onChangeText={bind('vehicle_registration')} />
            <Field label="Driver Details *" value={fields.driver_details} onChangeText={bind('driver_details')} multiline />
            <Field label="Passenger Details (enter None if none) *" value={fields.passenger_details} onChangeText={bind('passenger_details')} multiline />
            <Field label="Injuries (enter None if none) *" value={fields.accident_injuries} onChangeText={bind('accident_injuries')} multiline />
            <Field label="Insurance Details (enter Unknown if unavailable) *" value={fields.insurance_details} onChangeText={bind('insurance_details')} multiline />
            <Field label="Accident Scene Details *" value={fields.accident_scene_details} onChangeText={bind('accident_scene_details')} multiline />
        </>;
        if (module === 'missing_person') return <>
            <Field label="Missing Person Full Name *" value={fields.missing_person_name} onChangeText={bind('missing_person_name')} />
            <Field label="Full Identifying Description *" value={fields.missing_person_description} onChangeText={bind('missing_person_description')} multiline />
            <Field label="Last-Known Location And Time *" value={fields.missing_person_last_seen} onChangeText={bind('missing_person_last_seen')} multiline />
            <Field label="Relationship To Reporter *" value={fields.relationship_to_missing_person} onChangeText={bind('relationship_to_missing_person')} />
            <Field label="Photograph Attachment Declaration *" value={fields.missing_person_photo_declaration} onChangeText={bind('missing_person_photo_declaration')} multiline />
        </>;
        if (module === 'cyber_fraud') return <>
            <Field label="Platform / Channel *" value={fields.platform} onChangeText={bind('platform')} />
            <Field label="Phone / Account Identifiers *" value={fields.fraud_account_identifiers} onChangeText={bind('fraud_account_identifiers')} />
            <Field label="Transaction Reference *" value={fields.transaction_reference} onChangeText={bind('transaction_reference')} />
            <Field label="Amount Lost (KES) *" value={fields.amount_lost} onChangeText={bind('amount_lost')} keyboardType="numeric" />
            <Field label="Digital Evidence / Attachment Details *" value={fields.digital_evidence_declaration} onChangeText={bind('digital_evidence_declaration')} multiline />
        </>;
        return null;
    };

    const submit = async () => {
        if (!declaration || !consent || !fields.electronic_signature?.trim()) {
            return Alert.alert('Confirmation Required', 'Accept the declaration and consent, then enter your electronic confirmation.');
        }
        const details: Record<string, string> = {};
        [
            'item_description', 'property_ownership', 'property_identifier', 'estimated_value', 'property_proof_declaration',
            'injury_description', 'treatment_facility', 'p3_availability', 'weapon_details',
            'vehicle_registration', 'driver_details', 'passenger_details', 'accident_injuries', 'insurance_details', 'accident_scene_details',
            'missing_person_name', 'missing_person_description', 'missing_person_last_seen', 'relationship_to_missing_person', 'missing_person_photo_declaration',
            'platform', 'fraud_account_identifiers', 'transaction_reference', 'amount_lost', 'digital_evidence_declaration',
        ].forEach((key) => {
            if (fields[key]) details[key] = fields[key];
        });
        const people = [
            suspectKnown && fields.suspect_name?.trim() ? {
                person_role: 'suspect', full_name: fields.suspect_name, description: fields.suspect_details || 'Known suspect identified by reporter',
            } : null,
            witnessAvailable && fields.witness_name?.trim() ? {
                person_role: 'witness', full_name: fields.witness_name, phone: fields.witness_phone, description: fields.witness_details,
            } : null,
            module === 'missing_person' && fields.missing_person_name?.trim() ? {
                person_role: 'missing_person', full_name: fields.missing_person_name, description: fields.missing_person_description,
                relationship_to_reporter: fields.relationship_to_missing_person,
                details: { last_seen: fields.missing_person_last_seen, photograph_declaration: fields.missing_person_photo_declaration },
            } : null,
        ].filter(Boolean);
        const items = [
            module === 'property' && fields.item_description?.trim() ? {
                item_type: 'property', description: fields.item_description, identifier: fields.property_identifier, estimated_value: fields.estimated_value,
                details: { ownership: fields.property_ownership, proof_declaration: fields.property_proof_declaration },
            } : null,
            module === 'road_accident' && fields.vehicle_registration?.trim() ? {
                item_type: 'vehicle', description: fields.accident_scene_details, identifier: fields.vehicle_registration,
                details: { drivers: fields.driver_details, passengers: fields.passenger_details, injuries: fields.accident_injuries, insurance: fields.insurance_details },
            } : null,
            module === 'cyber_fraud' && fields.transaction_reference?.trim() ? {
                item_type: 'transaction', description: fields.digital_evidence_declaration, identifier: fields.transaction_reference, estimated_value: fields.amount_lost,
                details: { platform: fields.platform, account_identifiers: fields.fraud_account_identifiers },
            } : null,
        ].filter(Boolean);
        setSubmitting(true);
        try {
            const result = await submitPoliceReport({
                ...fields,
                case_module: module,
                module_details: details,
                immediate_danger: danger,
                injury_involved: injury,
                suspect_known: suspectKnown,
                witness_available: witnessAvailable,
                previously_reported: previouslyReported,
                evidence_declared: assets.length > 0 || fields.evidence_description?.trim().length > 0,
                declaration_accepted: declaration,
                processing_consent: consent,
                people,
                items,
            }, idempotencyKey.current);
            let evidenceWarning = false;
            for (const asset of assets) {
                try {
                    await uploadPoliceEvidence(result.case.id, asset, fields.evidence_description || 'Evidence attachment');
                } catch (uploadError) {
                    console.error('[PoliceReport] Private evidence upload failed after successful case creation:', uploadError);
                    evidenceWarning = true;
                }
            }
            await removePoliceReportDraft();
            Alert.alert(
                'Confidential Report Submitted',
                `Reference: ${result.case.submission_reference}\nOB Number: Pending Official Recording${evidenceWarning ? '\n\nYour case is saved, but one or more attachments could not upload. Open the report and use Add Private Evidence to retry securely.' : ''}`,
            );
            router.replace(`/police-report/${result.case.id}` as Href);
        } catch (error: unknown) {
            Alert.alert('Submission Failed', error instanceof Error ? error.message : 'Unable to submit the confidential Police Report.');
        } finally {
            setSubmitting(false);
        }
    };

    return <SafeAreaView style={styles.safe}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
            <TouchableOpacity onPress={() => step ? setStep(step - 1) : router.back()}><ArrowLeft color={COLORS.text} /></TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.heading}>Police Report</Text>
                <Text style={styles.subheading}>Confidential complaint intake</Text>
            </View>
            <ShieldCheck color={COLORS.primary} />
        </View>
        {draftLoaded && <Text style={[styles.draftStatus, draftSaveError && styles.draftError]}>
            {draftSaveError ? `Draft not saved: ${draftSaveError}` : draftSavedAt ? `Secure draft saved ${new Date(draftSavedAt).toLocaleTimeString('en-KE')}` : 'Secure draft enabled'}
        </Text>}
        <View style={styles.progress}><View style={[styles.progressFill, { width: `${(step + 1) * 25}%` }]} /></View>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {step === 0 && <>
                <Section title="Reporter Identification" />
                <Field label="Legal Full Name *" value={fields.reporter_full_name} onChangeText={bind('reporter_full_name')} />
                <View style={styles.row}>
                    <SearchablePicker half label="ID / Passport Type *" value={fields.reporter_document_type} options={[...DOCUMENT_TYPES]} onSelect={bind('reporter_document_type')} placeholder="Choose document type" />
                    <Field half label="Number *" value={fields.reporter_document_number} onChangeText={bind('reporter_document_number')} />
                </View>
                <Field label="Phone Number *" value={fields.reporter_phone} onChangeText={bind('reporter_phone')} keyboardType="phone-pad" />
                <Field label="Email Address *" value={fields.reporter_email} onChangeText={bind('reporter_email')} keyboardType="email-address" />
                <Field label="Residential / Current Address *" value={fields.reporter_address} onChangeText={bind('reporter_address')} />
                <View style={styles.row}>
                    <SearchablePicker half label="County *" value={fields.reporter_county} options={countyOptions} onSelect={selectReporterCounty} placeholder="Select county" />
                    <SearchablePicker half label="Sub-county *" value={fields.reporter_sub_county} options={reporterSubCounties} onSelect={selectReporterSubCounty} placeholder={fields.reporter_county ? 'Search or enter' : 'Select county first'} allowCustom disabled={!fields.reporter_county} />
                </View>
            </>}
            {step === 1 && <>
                <Section title="Complaint And Police Station" />
                <Text style={styles.label}>Report Type *</Text>
                <View style={styles.moduleGrid}>{MODULES.map((option) =>
                    <TouchableOpacity key={option.key} onPress={() => setModule(option.key)} style={[styles.module, module === option.key && styles.moduleActive]}>
                        <Text style={[styles.moduleText, module === option.key && styles.moduleTextActive]}>{option.label}</Text>
                    </TouchableOpacity>)}</View>
                <SearchablePicker label="Preferred / Relevant Police Station *" value={fields.preferred_station} options={stationOptions} onSelect={bind('preferred_station')} placeholder={stationOptions.length ? 'Search station' : 'Type police station'} allowCustom />
                <SearchablePicker label="Station Location *" value={fields.station_location} options={stationLocationOptions} onSelect={bind('station_location')} placeholder="Select or enter station location" allowCustom />
                <SearchablePicker label="Nature of Report / Offence Category *" value={fields.nature_of_report} options={[...OFFENCE_CATEGORIES]} onSelect={bind('nature_of_report')} placeholder="Select or enter offence" allowCustom />
                <Field label="Incident Title *" value={fields.title} onChangeText={bind('title')} />
                <Field label="Full Detailed Statement *" value={fields.detailed_statement} onChangeText={bind('detailed_statement')} multiline />
            </>}
            {step === 2 && <>
                <Section title="Occurrence And Supporting Details" />
                <Field label="Occurrence Date/Time (ISO format) *" value={fields.occurrence_started_at} onChangeText={bind('occurrence_started_at')} />
                <Field label="End Date/Time (if a range)" value={fields.occurrence_ended_at} onChangeText={bind('occurrence_ended_at')} />
                <Field label="Exact Occurrence Location *" value={fields.occurrence_location} onChangeText={bind('occurrence_location')} />
                <Toggle title="Occurrence county/sub-county is same as reporter address" value={sameAsReporterLocation} onValueChange={setSameLocation} />
                {sameAsReporterLocation
                    ? <View style={styles.sameLocationBox}><Text style={styles.sameLocationText}>{fields.occurrence_county || 'County not selected'} / {fields.occurrence_sub_county || 'Sub-county not selected'}</Text></View>
                    : <View style={styles.row}>
                        <SearchablePicker half label="County *" value={fields.occurrence_county} options={countyOptions} onSelect={selectOccurrenceCounty} placeholder="Select county" />
                        <SearchablePicker half label="Sub-county *" value={fields.occurrence_sub_county} options={occurrenceSubCounties} onSelect={bind('occurrence_sub_county')} placeholder={fields.occurrence_county ? 'Search or enter' : 'Select county first'} allowCustom disabled={!fields.occurrence_county} />
                    </View>}
                <Field label="Landmark" value={fields.occurrence_landmark} onChangeText={bind('occurrence_landmark')} />
                <TouchableOpacity style={styles.actionButton} onPress={captureLocation}><LocateFixed color={COLORS.primary} size={18} /><Text style={styles.actionText}>{fields.latitude ? 'GPS Position Captured' : 'Attach Device GPS Position'}</Text></TouchableOpacity>
                <Toggle title="Immediate danger exists" value={danger} onValueChange={setDanger} />
                <Toggle title="Injury involved" value={injury} onValueChange={setInjury} />
                <Toggle title="Known suspect identified" value={suspectKnown} onValueChange={setSuspectKnown} />
                {suspectKnown && <>
                    <Field label="Suspect Full Name / Identifier *" value={fields.suspect_name} onChangeText={bind('suspect_name')} />
                    <Field label="Suspect Description / Contact / Address" value={fields.suspect_details} onChangeText={bind('suspect_details')} multiline />
                </>}
                <Toggle title="Witnesses are available" value={witnessAvailable} onValueChange={setWitnessAvailable} />
                {witnessAvailable && <>
                    <Field label="Witness Full Name *" value={fields.witness_name} onChangeText={bind('witness_name')} />
                    <Field label="Witness Phone" value={fields.witness_phone} onChangeText={bind('witness_phone')} keyboardType="phone-pad" />
                    <Field label="Witness Statement / Address" value={fields.witness_details} onChangeText={bind('witness_details')} multiline />
                </>}
                <Field label="Medical Attention / Treatment Details" value={fields.medical_attention} onChangeText={bind('medical_attention')} multiline />
                <Toggle title="Previously reported to police or another authority" value={previouslyReported} onValueChange={setPreviouslyReported} />
                {previouslyReported && <Field label="Existing OB Number / Previous Reference *" value={fields.previous_report_reference} onChangeText={bind('previous_report_reference')} />}
                {conditionalFields()}
            </>}
            {step === 3 && <>
                <Section title="Evidence And Confirmation" />
                <Field label="Evidence / Attachment Declaration" value={fields.evidence_description} onChangeText={bind('evidence_description')} multiline />
                <TouchableOpacity style={styles.actionButton} onPress={pickEvidence}><Camera color={COLORS.primary} size={18} /><Text style={styles.actionText}>{assets.length ? `${assets.length} private attachment(s) selected` : 'Add Private Evidence Files'}</Text></TouchableOpacity>
                <View style={styles.notice}>
                    <FileText color={COLORS.primary} size={20} />
                    <Text style={styles.noticeText}>Your immediate receipt will use a secure submission reference. OB Number remains Pending Official Recording until authorized police handling.</Text>
                </View>
                <Toggle title="I declare this report is accurate to the best of my knowledge." value={declaration} onValueChange={setDeclaration} />
                <Toggle title="I consent to confidential police handling of this information." value={consent} onValueChange={setConsent} />
                <Field label="Electronic Confirmation - Type Your Full Name *" value={fields.electronic_signature} onChangeText={bind('electronic_signature')} />
            </>}
            {step < 3
                ? <TouchableOpacity style={styles.submit} onPress={next}><Text style={styles.submitText}>Continue</Text></TouchableOpacity>
                : <TouchableOpacity style={styles.submit} onPress={submit} disabled={submitting}>{submitting ? <ActivityIndicator color={COLORS.white} /> : <><CheckCircle2 size={18} color={COLORS.white} /><Text style={styles.submitText}>Submit Confidential Police Report</Text></>}</TouchableOpacity>}
        </ScrollView>
    </SafeAreaView>;
}

function Section({ title }: { title: string }) { return <Text style={styles.section}>{title}</Text>; }
function Field({ label, half, multiline, ...props }: TextInputProps & { label: string; half?: boolean; multiline?: boolean }) {
    return <View style={[styles.field, half && styles.half]}><Text style={styles.label}>{label}</Text><TextInput {...props} placeholderTextColor={COLORS.textMuted} multiline={multiline} textAlignVertical={multiline ? 'top' : 'center'} style={[styles.input, multiline && styles.multi]} /></View>;
}
function SearchablePicker({ label, value, options, onSelect, placeholder, allowCustom = false, disabled = false, half = false }: {
    label: string; value?: string; options: string[]; onSelect: (value: string) => void; placeholder: string; allowCustom?: boolean; disabled?: boolean; half?: boolean;
}) {
    const [visible, setVisible] = useState(false);
    const [query, setQuery] = useState('');
    const matches = options.filter((option) => option.toLowerCase().includes(query.trim().toLowerCase()));
    const custom = query.trim() && !options.some((option) => option.toLowerCase() === query.trim().toLowerCase());
    const choose = (selected: string) => { onSelect(selected); setVisible(false); setQuery(''); };
    return <View style={[styles.field, half && styles.half]}>
        <Text style={styles.label}>{label}</Text>
        <TouchableOpacity disabled={disabled} onPress={() => setVisible(true)} style={[styles.picker, disabled && styles.pickerDisabled]}>
            <Text numberOfLines={1} style={[styles.pickerText, !value && styles.placeholder]}>{value || placeholder}</Text>
            <ChevronDown size={17} color={COLORS.textMuted} />
        </TouchableOpacity>
        <Modal transparent animationType="slide" visible={visible} onRequestClose={() => setVisible(false)}>
            <View style={styles.modalShade}><View style={styles.modalCard}>
                <View style={styles.modalHeader}><Text style={styles.modalTitle}>{label.replace(' *', '')}</Text><TouchableOpacity onPress={() => setVisible(false)}><Text style={styles.close}>Close</Text></TouchableOpacity></View>
                <View style={styles.search}><Search size={18} color={COLORS.textMuted} /><TextInput autoFocus value={query} onChangeText={setQuery} placeholder="Type to search..." placeholderTextColor={COLORS.textMuted} style={styles.searchInput} /></View>
                {allowCustom && custom ? <TouchableOpacity style={styles.option} onPress={() => choose(query.trim())}><Text style={styles.optionText}>Use "{query.trim()}"</Text><Check size={17} color={COLORS.primary} /></TouchableOpacity> : null}
                <FlatList keyboardShouldPersistTaps="handled" data={matches} keyExtractor={(option) => option} renderItem={({ item }) =>
                    <TouchableOpacity style={styles.option} onPress={() => choose(item)}><Text style={styles.optionText}>{item}</Text>{value === item && <Check size={17} color={COLORS.primary} />}</TouchableOpacity>} ListEmptyComponent={<Text style={styles.noMatches}>{allowCustom ? 'Type the sub-county or station value above, then select the custom option.' : 'No matching options found.'}</Text>} />
            </View></View>
        </Modal>
    </View>;
}
function Toggle({ title, value, onValueChange }: { title: string; value: boolean; onValueChange: (value: boolean) => void }) {
    return <View style={styles.toggle}><Text style={styles.toggleText}>{title}</Text><Switch value={value} onValueChange={onValueChange} trackColor={{ true: COLORS.primary }} /></View>;
}
const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: COLORS.white }, header: { flexDirection: 'row', alignItems: 'center', padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    heading: { fontSize: 22, fontWeight: '900', color: COLORS.text }, subheading: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
    draftStatus: { paddingHorizontal: SPACING.lg, paddingVertical: 7, fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, backgroundColor: COLORS.background },
    draftError: { color: COLORS.error },
    progress: { height: 4, backgroundColor: COLORS.background }, progressFill: { height: 4, backgroundColor: COLORS.primary }, body: { padding: SPACING.lg, paddingBottom: 40 },
    section: { color: COLORS.primary, fontSize: 16, fontWeight: '900', marginBottom: 18, textTransform: 'uppercase', letterSpacing: 0.5 },
    field: { marginBottom: 14 }, half: { flex: 1 }, label: { fontSize: 12, fontWeight: '800', color: COLORS.textSecondary, marginBottom: 7 },
    input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, minHeight: 48, paddingHorizontal: 13, fontSize: 15, color: COLORS.text, backgroundColor: COLORS.surfaceVariant },
    picker: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, minHeight: 48, paddingHorizontal: 13, backgroundColor: COLORS.surfaceVariant, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    pickerDisabled: { opacity: 0.5 }, pickerText: { flex: 1, color: COLORS.text, fontSize: 14 }, placeholder: { color: COLORS.textMuted },
    multi: { minHeight: 100, paddingTop: 13 }, row: { flexDirection: 'row', gap: 10 }, moduleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
    module: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, paddingVertical: 9, paddingHorizontal: 12 }, moduleActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '12' },
    moduleText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '700' }, moduleTextActive: { color: COLORS.primary },
    actionButton: { minHeight: 50, borderRadius: 12, borderWidth: 1, borderColor: COLORS.primary + '55', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginBottom: 15 },
    sameLocationBox: { borderWidth: 1, borderColor: COLORS.primary + '40', backgroundColor: COLORS.primary + '0D', borderRadius: 12, padding: 13, marginBottom: 14 },
    sameLocationText: { color: COLORS.text, fontWeight: '800' },
    actionText: { color: COLORS.primary, fontWeight: '800' }, toggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 7, marginBottom: 5 },
    toggleText: { flex: 1, fontSize: 14, color: COLORS.text }, notice: { flexDirection: 'row', gap: 12, backgroundColor: COLORS.primary + '10', borderRadius: 14, padding: 14, marginVertical: 17 },
    noticeText: { flex: 1, color: COLORS.textSecondary, lineHeight: 20, fontSize: 13 }, submit: { minHeight: 54, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9, marginTop: 22, ...SHADOWS.soft },
    submitText: { color: COLORS.white, fontWeight: '900', fontSize: 14 },
    modalShade: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }, modalCard: { maxHeight: '72%', backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }, modalTitle: { color: COLORS.text, fontWeight: '900', fontSize: 18 }, close: { color: COLORS.primary, fontWeight: '800' },
    search: { minHeight: 49, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceVariant, marginBottom: 10 }, searchInput: { flex: 1, color: COLORS.text, fontSize: 15 },
    option: { minHeight: 49, borderBottomWidth: 1, borderBottomColor: COLORS.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 }, optionText: { color: COLORS.text, fontSize: 15, fontWeight: '600' }, noMatches: { color: COLORS.textSecondary, paddingVertical: 20, textAlign: 'center' },
});
