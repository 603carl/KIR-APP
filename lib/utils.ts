// Kenya's 47 counties for normalization
export const KENYA_COUNTIES = [
    'Mombasa', 'Kwale', 'Kilifi', 'Tana River', 'Lamu', 'Taita Taveta',
    'Garissa', 'Wajir', 'Mandera', 'Marsabit', 'Isiolo', 'Meru', 'Tharaka Nithi',
    'Embu', 'Kitui', 'Machakos', 'Makueni', 'Nyandarua', 'Nyeri', 'Kirinyaga',
    'Murang\'a', 'Kiambu', 'Turkana', 'West Pokot', 'Samburu', 'Trans Nzoia',
    'Uasin Gishu', 'Elgeyo Marakwet', 'Nandi', 'Baringo', 'Laikipia', 'Nakuru',
    'Narok', 'Kajiado', 'Kericho', 'Bomet', 'Kakamega', 'Vihiga', 'Bungoma',
    'Busia', 'Siaya', 'Kisumu', 'Homa Bay', 'Migori', 'Kisii', 'Nyamira', 'Nairobi'
];

// Normalize county name from geocoding result
export const normalizeCounty = (rawCounty: string): string => {
    if (!rawCounty) return '';

    const normalized = rawCounty.trim();

    // Direct match
    const directMatch = KENYA_COUNTIES.find(
        c => c.toLowerCase() === normalized.toLowerCase()
    );
    if (directMatch) return directMatch;

    // Partial match (e.g., "Nairobi County" -> "Nairobi")
    const partialMatch = KENYA_COUNTIES.find(
        c => normalized.toLowerCase().includes(c.toLowerCase()) ||
            c.toLowerCase().includes(normalized.toLowerCase())
    );
    if (partialMatch) return partialMatch;

    // Special cases for common variations
    const specialCases: Record<string, string> = {
        'nairobi city': 'Nairobi',
        'nairobi county': 'Nairobi',
        'mombasa county': 'Mombasa',
        'muranga': 'Murang\'a',
        'murang\'a': 'Murang\'a',
        'tharakanithi': 'Tharaka Nithi',
        'tharaka-nithi': 'Tharaka Nithi',
        'elgeyomarakwet': 'Elgeyo Marakwet',
        'elgeyo-marakwet': 'Elgeyo Marakwet',
        'tana-river': 'Tana River',
        'taita-taveta': 'Taita Taveta',
        'west-pokot': 'West Pokot',
        'trans-nzoia': 'Trans Nzoia',
        'uasin-gishu': 'Uasin Gishu',
        'homa-bay': 'Homa Bay',
    };

    const lowerNormalized = normalized.toLowerCase().replace(/\s+/g, '');
    for (const [key, value] of Object.entries(specialCases)) {
        if (lowerNormalized.includes(key.replace(/[\s-]/g, ''))) {
            return value;
        }
    }

    // Return original if no match found
    return normalized;
};
