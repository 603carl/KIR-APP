// Kenya Counties GeoJSON data with coordinates
export interface CountyGeoData {
  name: string;
  lat: number;
  lng: number;
  population: number;
  area: number; // km²
  bounds?: [[number, number], [number, number]]; // SW, NE corners
}

export const kenyaCountiesGeoData: CountyGeoData[] = [
  { name: 'Mombasa', lat: -4.0435, lng: 39.6682, population: 1208333, area: 212.5 },
  { name: 'Kwale', lat: -4.1816, lng: 39.4606, population: 866820, area: 8270.3 },
  { name: 'Kilifi', lat: -3.5107, lng: 39.9093, population: 1453787, area: 12609.7 },
  { name: 'Tana River', lat: -1.8, lng: 40.0, population: 315943, area: 35375.8 },
  { name: 'Lamu', lat: -2.2686, lng: 40.9020, population: 143920, area: 6474.7 },
  { name: 'Taita Taveta', lat: -3.3160, lng: 38.4850, population: 340671, area: 17084.1 },
  { name: 'Garissa', lat: -0.4536, lng: 39.6461, population: 841353, area: 45720.2 },
  { name: 'Wajir', lat: 1.7471, lng: 40.0573, population: 781263, area: 55840.6 },
  { name: 'Mandera', lat: 3.9373, lng: 41.8569, population: 867457, area: 25939.9 },
  { name: 'Marsabit', lat: 2.3284, lng: 37.9910, population: 459785, area: 66923.1 },
  { name: 'Isiolo', lat: 0.3556, lng: 37.5822, population: 268002, area: 25336.1 },
  { name: 'Meru', lat: 0.0474, lng: 37.6479, population: 1545714, area: 6936.2 },
  { name: 'Tharaka Nithi', lat: -0.3074, lng: 37.8009, population: 393177, area: 2609.5 },
  { name: 'Embu', lat: -0.5375, lng: 37.4597, population: 608599, area: 2555.9 },
  { name: 'Kitui', lat: -1.3667, lng: 38.0167, population: 1136187, area: 24385.1 },
  { name: 'Machakos', lat: -1.5177, lng: 37.2634, population: 1421932, area: 5952.9 },
  { name: 'Makueni', lat: -1.8039, lng: 37.6206, population: 987653, area: 8008.9 },
  { name: 'Nyandarua', lat: -0.1803, lng: 36.5233, population: 638289, area: 3107.7 },
  { name: 'Nyeri', lat: -0.4197, lng: 36.9553, population: 759164, area: 3337.1 },
  { name: 'Kirinyaga', lat: -0.5274, lng: 37.2861, population: 610411, area: 1205.4 },
  { name: "Murang'a", lat: -0.7839, lng: 37.1511, population: 1056640, area: 2558.8 },
  { name: 'Kiambu', lat: -1.1714, lng: 36.8354, population: 2417735, area: 2449.2 },
  { name: 'Turkana', lat: 3.1191, lng: 35.5972, population: 926976, area: 68223.9 },
  { name: 'West Pokot', lat: 1.6210, lng: 35.1180, population: 621241, area: 9169.4 },
  { name: 'Samburu', lat: 1.2151, lng: 36.9541, population: 310327, area: 20826.3 },
  { name: 'Trans Nzoia', lat: 1.0567, lng: 35.0062, population: 990341, area: 2469.9 },
  { name: 'Uasin Gishu', lat: 0.5143, lng: 35.2698, population: 1163186, area: 2955.3 },
  { name: 'Elgeyo Marakwet', lat: 0.8047, lng: 35.5198, population: 454480, area: 3029.6 },
  { name: 'Nandi', lat: 0.1836, lng: 35.1269, population: 885711, area: 2884.5 },
  { name: 'Baringo', lat: 0.4913, lng: 35.9683, population: 666763, area: 11075.3 },
  { name: 'Laikipia', lat: 0.2725, lng: 36.8590, population: 518560, area: 9462 },
  { name: 'Nakuru', lat: -0.3031, lng: 36.0800, population: 2162202, area: 7509.5 },
  { name: 'Narok', lat: -1.0918, lng: 35.8600, population: 1157873, area: 17921.2 },
  { name: 'Kajiado', lat: -2.0981, lng: 36.7820, population: 1117840, area: 21292.7 },
  { name: 'Kericho', lat: -0.3692, lng: 35.2863, population: 901777, area: 2454.5 },
  { name: 'Bomet', lat: -0.7813, lng: 35.3419, population: 875689, area: 1997.9 },
  { name: 'Kakamega', lat: 0.2827, lng: 34.7519, population: 1867579, area: 3033.8 },
  { name: 'Vihiga', lat: 0.0837, lng: 34.7229, population: 590013, area: 531.3 },
  { name: 'Bungoma', lat: 0.5636, lng: 34.5584, population: 1670570, area: 2206.9 },
  { name: 'Busia', lat: 0.4608, lng: 34.1115, population: 893681, area: 1694.5 },
  { name: 'Siaya', lat: -0.0617, lng: 34.2422, population: 993183, area: 2530.5 },
  { name: 'Kisumu', lat: -0.1022, lng: 34.7617, population: 1155574, area: 2009.5 },
  { name: 'Homa Bay', lat: -0.5273, lng: 34.4571, population: 1131950, area: 3154.7 },
  { name: 'Migori', lat: -1.0634, lng: 34.4731, population: 1116436, area: 2586.4 },
  { name: 'Kisii', lat: -0.6817, lng: 34.7796, population: 1266860, area: 1317.9 },
  { name: 'Nyamira', lat: -0.5633, lng: 34.9358, population: 605576, area: 912.5 },
  { name: 'Nairobi', lat: -1.2864, lng: 36.8172, population: 4397073, area: 694.9 },
];

// Kenya bounding box for map initialization
export const KENYA_BOUNDS = {
  center: { lat: 0.0236, lng: 37.9062 },
  zoom: 6,
  minZoom: 5,
  maxZoom: 18,
  bounds: {
    south: -4.8,
    north: 5.0,
    west: 33.9,
    east: 42.0
  }
};

// Simplified Kenya boundary polygon for visualization
export const kenyaBoundaryPolygon: [number, number][] = [
  [4.62, 35.99], [4.44, 35.76], [3.75, 35.76], [3.40, 35.98], 
  [2.60, 35.95], [1.80, 35.65], [1.18, 35.04], [0.60, 34.02],
  [-0.14, 34.07], [-0.60, 34.37], [-1.05, 34.00], [-1.65, 33.90],
  [-1.65, 34.05], [-2.05, 34.35], [-2.15, 34.48], [-2.48, 34.48],
  [-3.08, 37.62], [-3.50, 37.58], [-4.03, 37.64], [-4.67, 39.18],
  [-4.05, 39.93], [-3.48, 39.98], [-2.04, 40.12], [-1.70, 40.98],
  [-0.90, 41.00], [-0.02, 41.00], [0.48, 41.00], [1.48, 41.00],
  [3.00, 41.60], [3.95, 41.85], [4.62, 41.85], [4.62, 41.00],
  [4.62, 40.00], [4.62, 39.00], [4.62, 37.99], [4.62, 35.99]
];

// Generate incident coordinates clustered around county centers
export function generateIncidentCoordinates(
  county: CountyGeoData,
  count: number = 10,
  spread: number = 0.3
): { lat: number; lng: number }[] {
  const coords: { lat: number; lng: number }[] = [];
  for (let i = 0; i < count; i++) {
    coords.push({
      lat: county.lat + (Math.random() - 0.5) * spread,
      lng: county.lng + (Math.random() - 0.5) * spread
    });
  }
  return coords;
}

// Get color based on incident count
export function getHeatColor(count: number, max: number): string {
  const ratio = count / max;
  if (ratio > 0.75) return '#ef4444'; // red - critical
  if (ratio > 0.5) return '#f97316'; // orange - high
  if (ratio > 0.25) return '#eab308'; // yellow - medium
  return '#22c55e'; // green - low
}
