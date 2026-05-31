import { COUNTIES } from '@/constants/Counties';
import { fallbackSubCountiesForCounty } from '@/constants/KenyaAdministrativeAreas';
import { supabase } from './supabase';

export const DOCUMENT_TYPES = ['National ID', 'Passport', 'Alien ID', 'Birth Certificate'] as const;

export const OFFENCE_CATEGORIES = [
    'Assault',
    'Burglary / House Breaking',
    'Cybercrime',
    'Fraud / Obtaining by False Pretences',
    'Lost Document',
    'Missing Person',
    'Robbery',
    'Road Traffic Accident',
    'Sexual Offence',
    'Theft',
    'Threats / Harassment',
    'Trespass',
] as const;

export async function getCountyOptions(): Promise<string[]> {
    return [...COUNTIES];
}

export async function getPoliceStationOptions(county: string, subCounty?: string): Promise<string[]> {
    const cleanCounty = county.trim();
    if (!cleanCounty) return [];

    const countyVariants = Array.from(new Set([
        cleanCounty,
        cleanCounty.replace(/\s+County$/i, '').trim(),
        cleanCounty === 'Nairobi City' ? 'Nairobi' : cleanCounty,
        cleanCounty === 'Nairobi' ? 'Nairobi City' : cleanCounty,
    ].filter(Boolean)));

    const { data, error } = await supabase
        .from('police_stations')
        .select('name, sub_county')
        .eq('is_active', true)
        .in('county', countyVariants)
        .order('name')
        .limit(500);

    if (error || !data?.length) return [];

    const cleanSubCounty = subCounty?.trim().toLowerCase();
    return Array.from(new Set(
        data
            .filter((station: { name: string | null; sub_county: string | null }) => {
                if (!cleanSubCounty) return true;
                const stationSubCounty = station.sub_county?.trim().toLowerCase();
                return !stationSubCounty || stationSubCounty === cleanSubCounty;
            })
            .map((station: { name: string | null }) => station.name?.trim())
            .filter((name): name is string => Boolean(name)),
    )).sort((left, right) => left.localeCompare(right));
}

// The current database has a county master but no authoritative sub-county
// master. Suggestions are restricted to public incident values already used
// within the selected county; manual entry remains available pending an
// approved administrative-area dataset.
export async function getKnownSubCounties(county: string): Promise<string[]> {
    if (!county.trim()) return [];
    const fallback = fallbackSubCountiesForCounty(county);
    if (fallback.length) return fallback;
    const countyVariants = Array.from(new Set([
        county.trim(),
        county.replace(/\s+County$/i, '').trim(),
        county.trim() === 'Nairobi City' ? 'Nairobi' : county.trim(),
        county.trim() === 'Nairobi' ? 'Nairobi City' : county.trim(),
    ].filter(Boolean)));
    const { data, error } = await supabase
        .from('incidents')
        .select('sub_county')
        .in('county', countyVariants)
        .not('sub_county', 'is', null)
        .limit(500);
    if (error) return fallback;
    return Array.from(new Set([
        ...fallback,
        ...(data || [])
        .map((row: { sub_county: string | null }) => row.sub_county?.trim())
        .filter((name): name is string => Boolean(name)),
    ]))
        .sort((left, right) => left.localeCompare(right));
}
