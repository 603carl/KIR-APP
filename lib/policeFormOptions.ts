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

const NAIROBI_COUNTY_NAMES = new Set(['nairobi', 'nairobi city', 'nairobi county']);

const NAIROBI_PHASE_ONE_STATIONS = [
    'Akilla Police Station',
    'California Police Station',
    'Eastleigh Police Station',
    'Jamhuri Police Station',
    'Kahawa West Police Station',
    'Kangemi Police Station',
    'Kibra Police Station',
    'Korogocho Police Station',
    'Kware Police Station',
    'Lucky Summer Police Station',
    'Lunga Lunga Police Station',
    'Mathare Sub-County Hqs. and Police Station',
    "Mihang'o Police Station",
    'Mombasa Road Police Station',
    'Mowlem Police Station',
    'Mukuru kwa Reuben Police Station',
    'Mutuini Police Station',
    'Ngara Police Station',
    'Njathaini Police Station',
    'Obama Police Station',
    'South B Police Station',
    'Sunton Police Station',
    'Utalii Police Station',
    'Villa Police Station',
    'Waithaka Police Station',
] as const;

function normalizeArea(value: string) {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, ' ');
}

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

    if (error || !data?.length) {
        return NAIROBI_COUNTY_NAMES.has(normalizeArea(cleanCounty)) ? [...NAIROBI_PHASE_ONE_STATIONS] : [];
    }

    const cleanSubCounty = subCounty?.trim().toLowerCase();
    const stations = Array.from(new Set(
        data
            .filter((station: { name: string | null; sub_county: string | null }) => {
                if (!cleanSubCounty) return true;
                const selected = normalizeArea(cleanSubCounty);
                const stationSubCounty = normalizeArea(station.sub_county || '');
                const selectedBase = selected.split(' ')[0];
                const stationBase = stationSubCounty.split(' ')[0];
                return !stationSubCounty || stationSubCounty === selected || stationBase === selectedBase;
            })
            .map((station: { name: string | null }) => station.name?.trim())
            .filter((name): name is string => Boolean(name)),
    ));

    if (NAIROBI_COUNTY_NAMES.has(normalizeArea(cleanCounty))) {
        stations.push(...NAIROBI_PHASE_ONE_STATIONS);
    }

    return Array.from(new Set(stations)).sort((left, right) => left.localeCompare(right));
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
