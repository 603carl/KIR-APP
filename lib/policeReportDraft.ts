import * as SecureStore from 'expo-secure-store';
import { supabase } from './supabase';
import type { PoliceCaseModule } from './policeReports';

const DRAFT_PREFIX = 'kir.policeReportDraft.v1';
const CHUNK_SIZE = 1800;
const MAX_CHUNKS = 80;

export interface PoliceReportDraftAsset {
    uri: string;
    fileName?: string | null;
    mimeType?: string | null;
}

export interface PoliceReportDraft {
    step: number;
    module: PoliceCaseModule;
    fields: Record<string, string>;
    flags: {
        danger: boolean;
        injury: boolean;
        suspectKnown: boolean;
        witnessAvailable: boolean;
        previouslyReported: boolean;
        declaration: boolean;
        consent: boolean;
        sameAsReporterLocation: boolean;
    };
    assets: PoliceReportDraftAsset[];
    idempotencyKey: string;
}

interface DraftMeta {
    savedAt: number;
    chunkCount: number;
}

function sanitizeKeyPart(value: string): string {
    return value.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 80) || 'unknown';
}

async function draftBaseKey(): Promise<string | null> {
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id;
    if (!userId) return null;
    return `${DRAFT_PREFIX}.${sanitizeKeyPart(userId)}`;
}

async function removeChunks(baseKey: string, chunkCount: number): Promise<void> {
    const deletes: Promise<void>[] = [];
    for (let index = 0; index < Math.min(chunkCount, MAX_CHUNKS); index += 1) {
        deletes.push(SecureStore.deleteItemAsync(`${baseKey}.chunk.${index}`).catch(() => undefined));
    }
    await Promise.all(deletes);
}

export async function readPoliceReportDraft(maxAgeMs = 1000 * 60 * 60 * 24 * 14): Promise<{ draft: PoliceReportDraft; savedAt: number } | null> {
    const baseKey = await draftBaseKey();
    if (!baseKey) return null;

    try {
        const rawMeta = await SecureStore.getItemAsync(`${baseKey}.meta`);
        if (!rawMeta) return null;
        const meta = JSON.parse(rawMeta) as DraftMeta;
        if (!meta.savedAt || !meta.chunkCount || meta.chunkCount > MAX_CHUNKS || Date.now() - meta.savedAt > maxAgeMs) {
            await removePoliceReportDraft();
            return null;
        }

        const chunks = await Promise.all(Array.from({ length: meta.chunkCount }, (_, index) => SecureStore.getItemAsync(`${baseKey}.chunk.${index}`)));
        if (chunks.some((chunk) => chunk === null)) {
            await removePoliceReportDraft();
            return null;
        }

        return { draft: JSON.parse(chunks.join('')) as PoliceReportDraft, savedAt: meta.savedAt };
    } catch {
        await removePoliceReportDraft();
        return null;
    }
}

export async function writePoliceReportDraft(draft: PoliceReportDraft): Promise<void> {
    const baseKey = await draftBaseKey();
    if (!baseKey) return;

    const serialized = JSON.stringify(draft);
    const chunks = serialized.match(new RegExp(`.{1,${CHUNK_SIZE}}`, 'g')) ?? [''];
    if (chunks.length > MAX_CHUNKS) {
        throw new Error('Police Report draft is too large to save securely on this device.');
    }

    const rawMeta = await SecureStore.getItemAsync(`${baseKey}.meta`).catch(() => null);
    let previousChunkCount = 0;
    try {
        previousChunkCount = rawMeta ? (JSON.parse(rawMeta) as DraftMeta).chunkCount || 0 : 0;
    } catch {
        previousChunkCount = MAX_CHUNKS;
    }
    await removeChunks(baseKey, previousChunkCount);
    await Promise.all(chunks.map((chunk, index) => SecureStore.setItemAsync(`${baseKey}.chunk.${index}`, chunk)));
    await SecureStore.setItemAsync(`${baseKey}.meta`, JSON.stringify({ savedAt: Date.now(), chunkCount: chunks.length } satisfies DraftMeta));
}

export async function removePoliceReportDraft(): Promise<void> {
    const baseKey = await draftBaseKey();
    if (!baseKey) return;

    const rawMeta = await SecureStore.getItemAsync(`${baseKey}.meta`).catch(() => null);
    let chunkCount = MAX_CHUNKS;
    try {
        chunkCount = rawMeta ? (JSON.parse(rawMeta) as DraftMeta).chunkCount || MAX_CHUNKS : MAX_CHUNKS;
    } catch {
        chunkCount = MAX_CHUNKS;
    }
    await removeChunks(baseKey, chunkCount);
    await SecureStore.deleteItemAsync(`${baseKey}.meta`).catch(() => undefined);
}
