import { KENYA_BOUNDS, kenyaBoundaryPolygon, kenyaCountiesGeoData } from '@/lib/kenya-counties-geo';
import { Incident } from '@/types/incident';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';

// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface MapContainerProps {
  showHeatmap: boolean;
  showClusters: boolean;
  showBoundaries: boolean;
  selectedCategory: string | null;
  incidents: Incident[];
  onIncidentSelect?: (incident: Incident) => void;
  onZoomChange?: (zoom: number) => void;
  onCountyClick?: (county: string) => void;
}

const severityColors: Record<string, string> = {
  critical: '#dc2626',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
  info: '#3b82f6'
};

const categoryIcons: Record<string, string> = {
  water: '💧',
  roads: '🛣️',
  power: '⚡',
  health: '🏥',
  security: '🛡️',
  corruption: '⚖️',
  environment: '🌳',
  other: '📌'
};

export function MapContainer({
  showHeatmap,
  showClusters,
  showBoundaries,
  selectedCategory,
  incidents,
  onIncidentSelect,
  onZoomChange,
  onCountyClick
}: MapContainerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const heatmapLayerRef = useRef<L.LayerGroup | null>(null);
  const boundaryLayerRef = useRef<L.LayerGroup | null>(null);
  const countyMarkersRef = useRef<L.LayerGroup | null>(null);

  const [isMapReady, setIsMapReady] = useState(false);

  const filteredIncidents = selectedCategory
    ? incidents.filter(i => i.category === selectedCategory)
    : incidents;

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [KENYA_BOUNDS.center.lat, KENYA_BOUNDS.center.lng],
      zoom: KENYA_BOUNDS.zoom,
      minZoom: KENYA_BOUNDS.minZoom,
      maxZoom: KENYA_BOUNDS.maxZoom,
      zoomControl: false,
      attributionControl: true
    });

    // Use OpenStreetMap tiles (free)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Add zoom control to top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Create layer groups
    markersLayerRef.current = L.layerGroup().addTo(map);
    heatmapLayerRef.current = L.layerGroup().addTo(map);
    boundaryLayerRef.current = L.layerGroup().addTo(map);
    countyMarkersRef.current = L.layerGroup().addTo(map);

    // Track zoom changes
    map.on('zoomend', () => {
      onZoomChange?.(map.getZoom());
    });

    mapInstanceRef.current = map;
    setIsMapReady(true);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Draw Kenya boundary
  useEffect(() => {
    if (!isMapReady || !boundaryLayerRef.current) return;

    boundaryLayerRef.current.clearLayers();

    if (showBoundaries) {
      // Draw Kenya outline
      const kenyaPolygon = L.polygon(kenyaBoundaryPolygon.map(([lat, lng]) => [lat, lng] as L.LatLngTuple), {
        color: '#6366f1',
        weight: 2,
        fillColor: '#6366f1',
        fillOpacity: 0.05,
        dashArray: '5, 5'
      });
      boundaryLayerRef.current.addLayer(kenyaPolygon);

      // Add county circles
      kenyaCountiesGeoData.forEach(county => {
        const searchName = county.name.toLowerCase().replace(' city', '').trim();
        const incidentCount = filteredIncidents.filter(i => {
          const incLoc = (i.location.county || '').toLowerCase();
          return incLoc === county.name.toLowerCase() ||
            incLoc === searchName ||
            incLoc.includes(county.name.toLowerCase()) ||
            incLoc.includes(searchName);
        }).length;

        // County circle
        const circle = L.circle([county.lat, county.lng], {
          radius: Math.max(15000, Math.sqrt(county.population) * 50),
          color: '#8b5cf6',
          weight: 1,
          fillColor: '#8b5cf6',
          fillOpacity: 0.1
        });

        circle.on('click', () => {
          onCountyClick?.(county.name);
          mapInstanceRef.current?.flyTo([county.lat, county.lng], 9, { duration: 1 });
        });

        circle.bindTooltip(`
          <div class="p-2">
            <strong>${county.name}</strong><br/>
            Population: ${county.population.toLocaleString()}<br/>
            Incidents: ${incidentCount}
          </div>
        `, { className: 'custom-tooltip' });

        boundaryLayerRef.current?.addLayer(circle);
      });
    }
  }, [isMapReady, showBoundaries, filteredIncidents]);

  // Draw heatmap circles
  useEffect(() => {
    if (!isMapReady || !heatmapLayerRef.current) return;

    heatmapLayerRef.current.clearLayers();

    if (showHeatmap) {
      // Group incidents by approximate location
      const locationGroups: Record<string, { lat: number; lng: number; count: number; severity: string }> = {};

      filteredIncidents.forEach(incident => {
        const lat = incident.location.coordinates?.lat;
        const lng = incident.location.coordinates?.lng;
        if (!lat || !lng) return;

        // Round coordinates for grouping
        const key = `${Math.round(lat * 10) / 10},${Math.round(lng * 10) / 10}`;

        if (!locationGroups[key]) {
          locationGroups[key] = {
            lat,
            lng,
            count: 0,
            severity: 'low'
          };
        }
        locationGroups[key].count++;

        // Track highest severity
        const severityOrder = ['info', 'low', 'medium', 'high', 'critical'];
        if (severityOrder.indexOf(incident.severity) > severityOrder.indexOf(locationGroups[key].severity)) {
          locationGroups[key].severity = incident.severity;
        }
      });

      const maxCount = Math.max(...Object.values(locationGroups).map(g => g.count), 1);

      Object.values(locationGroups).forEach(group => {
        const radius = 10000 + (group.count / maxCount) * 40000;
        const color = severityColors[group.severity] || '#3b82f6';

        const heatCircle = L.circle([group.lat, group.lng], {
          radius,
          color: color,
          weight: 0,
          fillColor: color,
          fillOpacity: 0.3 + (group.count / maxCount) * 0.4
        });

        heatmapLayerRef.current?.addLayer(heatCircle);
      });
    }
  }, [isMapReady, showHeatmap, filteredIncidents]);

  // Draw incident markers
  useEffect(() => {
    if (!isMapReady || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    if (showClusters) {
      // Group nearby incidents for clustering effect
      const clusters: Record<string, Incident[]> = {};

      filteredIncidents.forEach(incident => {
        const lat = incident.location.coordinates?.lat;
        const lng = incident.location.coordinates?.lng;
        if (!lat || !lng) return;

        const key = `${Math.round(lat * 5) / 5},${Math.round(lng * 5) / 5}`;
        if (!clusters[key]) clusters[key] = [];
        clusters[key].push(incident);
      });

      Object.entries(clusters).forEach(([key, clusterIncidents]) => {
        if (clusterIncidents.length === 0) return;

        const avgLat = clusterIncidents.reduce((sum, i) => sum + (i.location.coordinates?.lat || 0), 0) / clusterIncidents.length;
        const avgLng = clusterIncidents.reduce((sum, i) => sum + (i.location.coordinates?.lng || 0), 0) / clusterIncidents.length;

        // Get highest severity in cluster
        const hasCritical = clusterIncidents.some(i => i.severity === 'critical');
        const hasHigh = clusterIncidents.some(i => i.severity === 'high');
        const color = hasCritical ? severityColors.critical : hasHigh ? severityColors.high : severityColors.medium;

        if (clusterIncidents.length > 1) {
          // Create cluster marker
          const size = Math.min(50, 20 + clusterIncidents.length * 2);
          const clusterIcon = L.divIcon({
            html: `
              <div style="
                width: ${size}px;
                height: ${size}px;
                background: ${color};
                border: 2px solid white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                color: white;
                font-size: ${size > 30 ? '14px' : '12px'};
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                ${hasCritical ? 'animation: pulse 2s infinite;' : ''}
              ">
                ${clusterIncidents.length}
              </div>
            `,
            className: 'custom-cluster-icon',
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2]
          });

          const marker = L.marker([avgLat, avgLng], { icon: clusterIcon });

          const tooltipContent = `
            <div class="p-2 min-w-[200px]">
              <strong>${clusterIncidents.length} Incidents</strong>
              <hr class="my-1 border-gray-600"/>
              ${clusterIncidents.slice(0, 5).map(i => `
                <div class="text-xs py-0.5">
                  ${categoryIcons[i.category] || '📌'} ${i.title.substring(0, 30)}${i.title.length > 30 ? '...' : ''}
                </div>
              `).join('')}
              ${clusterIncidents.length > 5 ? `<div class="text-xs text-gray-400">+${clusterIncidents.length - 5} more</div>` : ''}
            </div>
          `;

          marker.bindTooltip(tooltipContent, { className: 'custom-tooltip' });

          marker.on('click', () => {
            mapInstanceRef.current?.flyTo([avgLat, avgLng], mapInstanceRef.current.getZoom() + 2, { duration: 0.5 });
          });

          markersLayerRef.current?.addLayer(marker);
        } else {
          // Single incident marker
          const incident = clusterIncidents[0];
          addIncidentMarker(incident);
        }
      });
    } else {
      // Show all individual markers
      filteredIncidents.forEach(incident => {
        addIncidentMarker(incident);
      });
    }

    function addIncidentMarker(incident: Incident) {
      const lat = incident.location.coordinates?.lat;
      const lng = incident.location.coordinates?.lng;
      if (!lat || !lng) return;

      const color = severityColors[incident.severity] || '#3b82f6';
      const icon = categoryIcons[incident.category] || '📌';
      const isCritical = incident.severity === 'critical' || incident.severity === 'high';

      const markerIcon = L.divIcon({
        html: `
          <div style="
            width: 32px;
            height: 32px;
            background: ${color};
            border: 2px solid white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            ${isCritical ? 'animation: pulse 2s infinite;' : ''}
          ">
            ${icon}
          </div>
        `,
        className: 'custom-incident-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker(
        [lat, lng],
        { icon: markerIcon }
      );

      const popupContent = `
        <div class="p-3 min-w-[250px] max-w-[300px]">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-lg">${icon}</span>
            <span class="px-2 py-0.5 rounded text-xs font-medium text-white" style="background: ${color}">
              ${incident.severity.toUpperCase()}
            </span>
          </div>
          <h3 class="font-bold text-sm mb-1">${incident.id}</h3>
          <p class="text-sm mb-2">${incident.title}</p>
          <p class="text-xs text-gray-500 mb-2">${incident.location.address || incident.location.county}</p>
          <div class="flex gap-2 mt-2">
            <button 
              onclick="window.dispatchEvent(new CustomEvent('viewIncident', { detail: '${incident.id}' }))"
              class="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
            >
              View Details
            </button>
            <button 
              onclick="window.dispatchEvent(new CustomEvent('assignIncident', { detail: '${incident.id}' }))"
              class="px-3 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700"
            >
              Assign Team
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { maxWidth: 300 });

      marker.on('click', () => {
        onIncidentSelect?.(incident);
      });

      markersLayerRef.current?.addLayer(marker);
    }
  }, [isMapReady, showClusters, filteredIncidents, onIncidentSelect]);

  // Public methods for external control
  useEffect(() => {
    const handleFlyTo = (e: CustomEvent) => {
      const { lat, lng, zoom } = e.detail;
      mapInstanceRef.current?.flyTo([lat, lng], zoom || 10, { duration: 1 });
    };

    const handleResetView = () => {
      mapInstanceRef.current?.flyTo(
        [KENYA_BOUNDS.center.lat, KENYA_BOUNDS.center.lng],
        KENYA_BOUNDS.zoom,
        { duration: 1 }
      );
    };

    const handleZoomIn = () => {
      mapInstanceRef.current?.zoomIn();
    };

    const handleZoomOut = () => {
      mapInstanceRef.current?.zoomOut();
    };

    window.addEventListener('mapFlyTo', handleFlyTo as EventListener);
    window.addEventListener('mapResetView', handleResetView);
    window.addEventListener('mapZoomIn', handleZoomIn);
    window.addEventListener('mapZoomOut', handleZoomOut);

    return () => {
      window.removeEventListener('mapFlyTo', handleFlyTo as EventListener);
      window.removeEventListener('mapResetView', handleResetView);
      window.removeEventListener('mapZoomIn', handleZoomIn);
      window.removeEventListener('mapZoomOut', handleZoomOut);
    };
  }, []);

  return (
    <>
      <style>{`
        .custom-tooltip {
          background: rgba(0, 0, 0, 0.85) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 8px !important;
          color: white !important;
          padding: 0 !important;
        }
        .custom-tooltip .leaflet-tooltip-content {
          margin: 0 !important;
        }
        .leaflet-popup-content-wrapper {
          background: rgba(20, 20, 30, 0.95) !important;
          color: white !important;
          border-radius: 12px !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
        }
        .leaflet-popup-tip {
          background: rgba(20, 20, 30, 0.95) !important;
        }
        .leaflet-popup-content {
          margin: 0 !important;
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
        .custom-cluster-icon,
        .custom-incident-icon {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
      <div ref={mapRef} className="w-full h-full" />
    </>
  );
}
