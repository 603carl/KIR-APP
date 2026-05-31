import * as Crypto from 'expo-crypto';
import { File as ExpoFile } from 'expo-file-system';
import { supabase } from './supabase';

export type PoliceReportStatus =
    | 'submitted'
    | 'received'
    | 'under_review'
    | 'information_requested'
    | 'assigned'
    | 'investigating'
    | 'closed'
    | 'rejected'
    | 'withdrawn';

export type PoliceCaseModule =
    | 'general'
    | 'property'
    | 'assault'
    | 'road_accident'
    | 'missing_person'
    | 'cyber_fraud';

export interface PoliceReport {
    id: string;
    submission_reference: string;
    ob_number: string | null;
    status: PoliceReportStatus;
    case_module: PoliceCaseModule;
    title: string;
    nature_of_report: string;
    detailed_statement: string;
    preferred_station: string;
    current_station?: string | null;
    current_division?: string | null;
    receiving_station?: string | null;
    receiving_division?: string | null;
    referred_to_station?: string | null;
    referred_to_division?: string | null;
    referral_reason?: string | null;
    taken_over_at?: string | null;
    occurrence_location: string;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
}

export interface PoliceDocument {
    id: string;
    police_report_id: string;
    document_type: 'submission_receipt' | 'reviewed_receipt' | 'closure_report';
    version: number;
    created_at: string;
    sha256?: string | null;
}

export interface PoliceMessage {
    id: string;
    sender_id: string;
    sender_kind: 'citizen' | 'staff' | 'system';
    content: string;
    created_at: string;
}

export interface PoliceEvent {
    id: string;
    event_type: string;
    actor_kind: 'citizen' | 'staff' | 'system';
    created_at: string;
}

export interface PoliceItem {
    id: string;
    item_type: 'property' | 'vehicle' | 'transaction' | 'evidence';
    description: string;
    created_at: string;
}

export interface PoliceSubmissionPayload {
    case_module: PoliceCaseModule;
    [key: string]: unknown;
}

type PoliceEvidenceAsset = {
    uri: string;
    fileName?: string | null;
    mimeType?: string | null;
    fileSize?: number | null;
};

const EXTENSION_BY_MIME: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/heic': 'heic',
    'image/heif': 'heif',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'application/pdf': 'pdf',
};

function evidenceExtension(asset: PoliceEvidenceAsset) {
    const fromName = asset.fileName?.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (fromName) return fromName.slice(0, 12);
    const fromMime = asset.mimeType ? EXTENSION_BY_MIME[asset.mimeType.toLowerCase()] : null;
    return fromMime || 'bin';
}

async function readAssetArrayBuffer(asset: PoliceEvidenceAsset): Promise<ArrayBuffer> {
    if (!asset.uri) throw new Error('The selected evidence file is unavailable on this device.');

    try {
        const file = new ExpoFile(asset.uri);
        return await file.arrayBuffer();
    } catch (fileError) {
        try {
            const response = await fetch(asset.uri);
            if (!response.ok) throw new Error(`File read failed with status ${response.status}.`);
            return await response.arrayBuffer();
        } catch {
            throw new Error(
                fileError instanceof Error
                    ? `Unable to read the selected evidence file securely: ${fileError.message}`
                    : 'Unable to read the selected evidence file securely.',
            );
        }
    }
}

async function uploadWithRetry(path: string, body: ArrayBuffer, contentType: string) {
    let lastError: unknown;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
        const { error } = await supabase.storage
            .from('police-report-evidence')
            .upload(path, body, {
                contentType,
                cacheControl: 'private, max-age=0, no-store',
                upsert: false,
            });
        if (!error) return;
        lastError = error;
        if (!/network request failed|fetch failed|timeout|timed out/i.test(error.message)) break;
        await new Promise((resolve) => setTimeout(resolve, attempt * 900));
    }
    throw lastError instanceof Error ? lastError : new Error('Private evidence upload failed.');
}

function policeReportError(error: unknown, fallback: string): Error {
    const message = error instanceof Error ? error.message : String(error || '');
    const details = typeof error === 'object' && error && 'details' in error ? String((error as { details?: unknown }).details || '') : '';
    const hint = typeof error === 'object' && error && 'hint' in error ? String((error as { hint?: unknown }).hint || '') : '';
    const combined = [message, details, hint].filter(Boolean).join(' ');

    if (/Could not find the function|schema cache|submit_police_report|add_police_report_evidence|send_police_report_message/i.test(combined)) {
        return new Error('The confidential Police Report service is not fully deployed yet. Please update the app after the backend cutover is completed.');
    }
    if (/permission denied|row-level security|access denied|not accessible/i.test(combined)) {
        return new Error('You are not authorized to access this confidential Police Report record.');
    }
    return new Error(message || fallback);
}

export async function submitPoliceReport(payload: PoliceSubmissionPayload, idempotencyKey = Crypto.randomUUID()) {
    const { data, error } = await supabase.rpc('submit_police_report', {
        p_payload: payload,
        p_idempotency_key: idempotencyKey,
    });
    if (error) throw policeReportError(error, 'Unable to submit the confidential Police Report.');
    return data as { case: PoliceReport; document: PoliceDocument; duplicate: boolean };
}

export async function uploadPoliceEvidence(
    caseId: string,
    asset: PoliceEvidenceAsset,
    description: string,
) {
    const extension = evidenceExtension(asset);
    const path = `${caseId}/${Crypto.randomUUID()}.${extension}`;
    const contentType = asset.mimeType || 'application/octet-stream';
    const body = await readAssetArrayBuffer(asset);
    await uploadWithRetry(path, body, contentType);

    const { error: recordError } = await supabase.rpc('add_police_report_evidence', {
        p_case_id: caseId,
        p_storage_path: path,
        p_description: description || 'Evidence attachment submitted by reporter',
        p_media_type: contentType,
    });
    if (recordError) {
        await supabase.storage.from('police-report-evidence').remove([path]).catch(() => null);
        throw policeReportError(recordError, 'Unable to attach private evidence to the Police Report.');
    }
}

export async function sendPoliceReportMessage(caseId: string, content: string) {
    const { data, error } = await supabase.rpc('send_police_report_message', {
        p_case_id: caseId,
        p_message_id: Crypto.randomUUID(),
        p_content: content,
        p_attachments: [],
    });
    if (error) throw policeReportError(error, 'Unable to send the secure Police Report message.');
    return data as PoliceMessage;
}

export async function getPoliceDocumentDownload(documentId: string) {
    const { data, error } = await supabase.functions.invoke('police-document', {
        body: { documentId },
    });
    if (error) throw error;
    if (!data?.signedUrl) throw new Error('The confidential document link was not issued.');
    return data.signedUrl as string;
}
