import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Clock,
  Eye,
  Filter,
  Flame,
  Globe,
  Info,
  Layers,
  MapPin,
  Maximize2,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
  ShieldAlert,
  Scale,
} from 'lucide-react';
import {
  aggregateRequestsByDistrict,
  DISTRICT_CENTROIDS,
  filterRequestsByTime,
  loadGoogleMapsApi,
  STATE_CENTROIDS,
} from '../services/geoService.ts';
import { infrastructureGapService } from '../services/infrastructureGapService.ts';
import type {
  CitizenRequest,
  DemandCluster,
  InfrastructureCategory,
  RequestUrgency,
} from '../types/citizenRequest.ts';
import type { InfrastructureGapAssessment, GapLevel } from '../types/evidence.ts';

interface DemandMapProps {
  requests: CitizenRequest[];
  clusters?: DemandCluster[];
  selectedState?: string;
  selectedDistrict?: string;
  selectedCategory?: string;
  selectedUrgency?: string;
  onSelectState?: (state: string) => void;
  onSelectDistrict?: (district: string) => void;
  onSelectCategory?: (category: string) => void;
  onSelectUrgency?: (urgency: string) => void;
  onInspectRequest?: (request: CitizenRequest) => void;
  onInspectCluster?: (cluster: DemandCluster) => void;
  isDemoDataEnabled?: boolean;
}

type MapDisplayMode = 'MARKERS' | 'HEATMAP' | 'DEMAND_CLUSTERS' | 'INFRASTRUCTURE_GAPS';
type ViewByMode = 'ALL' | 'CATEGORY' | 'URGENCY';
type TimeRange = '7d' | '30d' | '90d' | 'all';

// Marker color coding by category
const CATEGORY_COLORS: Record<string, string> = {
  'Water': '#0284c7', // Sky Blue
  'Sanitation': '#0d9488', // Teal
  'Healthcare': '#e11d48', // Rose
  'Education': '#7c3aed', // Purple
  'Transport': '#d97706', // Amber
  'Electricity': '#eab308', // Yellow
  'Digital Connectivity': '#2563eb', // Blue
  'Housing': '#b45309', // Brown
  'Agriculture': '#16a34a', // Green
  'Environment': '#059669', // Emerald
  'Public Safety': '#dc2626', // Red
  'Social Infrastructure': '#9333ea', // Violet
  'Other': '#64748b', // Slate
};

// Urgency color coding
const URGENCY_COLORS: Record<string, string> = {
  'Critical': '#e11d48', // Red
  'High': '#ea580c', // Orange
  'Medium': '#2563eb', // Blue
  'Low': '#10b981', // Green
};

// Gap level color coding (Build 07)
const GAP_COLORS: Record<string, string> = {
  'SEVERE': '#dc2626', // Red
  'HIGH': '#ea580c', // Orange
  'MODERATE': '#d97706', // Amber
  'LOW': '#16a34a', // Green
  'INSUFFICIENT_EVIDENCE': '#64748b', // Slate
};

export const DemandMap: React.FC<DemandMapProps> = ({
  requests,
  clusters = [],
  selectedState = 'All',
  selectedDistrict = 'All',
  selectedCategory = 'All',
  selectedUrgency = 'All',
  onSelectState,
  onSelectDistrict,
  onSelectCategory,
  onSelectUrgency,
  onInspectRequest,
  onInspectCluster,
  isDemoDataEnabled = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const heatmapLayerRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);

  // Local map state
  const [mapMode, setMapMode] = useState<MapDisplayMode>('MARKERS');
  const [gapAssessments, setGapAssessments] = useState<InfrastructureGapAssessment[]>([]);
  const [viewBy, setViewBy] = useState<ViewByMode>('ALL');
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [isMapLoaded, setIsMapLoaded] = useState<boolean>(false);
  const [mapLoadError, setMapLoadError] = useState<string | null>(null);
  const [showUnresolvedModal, setShowUnresolvedModal] = useState<boolean>(false);
  const [activePopupRequest, setActivePopupRequest] = useState<CitizenRequest | null>(null);
  const [activePopupCluster, setActivePopupCluster] = useState<DemandCluster | null>(null);

  // Load gap assessments when in INFRASTRUCTURE_GAPS mode
  useEffect(() => {
    if (mapMode === 'INFRASTRUCTURE_GAPS' && gapAssessments.length === 0) {
      infrastructureGapService
        .getAllGapAssessments()
        .then((data) => {
          setGapAssessments(data);
        })
        .catch((err) => {
          console.error('Failed to load map gap assessments:', err);
        });
    }
  }, [mapMode]);

  // 1. Time-filtered requests
  const timeFilteredRequests = useMemo(() => {
    return filterRequestsByTime(requests, timeRange);
  }, [requests, timeRange]);

  // 2. Further filtered by category, urgency, state, district
  const filteredRequests = useMemo(() => {
    return timeFilteredRequests.filter((r) => {
      if (selectedState && selectedState !== 'All' && r.state !== selectedState) return false;
      if (selectedDistrict && selectedDistrict !== 'All' && r.district !== selectedDistrict)
        return false;
      if (selectedCategory && selectedCategory !== 'All' && r.category !== selectedCategory)
        return false;
      if (selectedUrgency && selectedUrgency !== 'All' && r.urgency !== selectedUrgency)
        return false;
      return true;
    });
  }, [timeFilteredRequests, selectedState, selectedDistrict, selectedCategory, selectedUrgency]);

  // Filter clusters by state, district, category
  const filteredClusters = useMemo(() => {
    return clusters.filter((c) => {
      if (selectedState && selectedState !== 'All' && c.state !== selectedState) return false;
      if (selectedDistrict && selectedDistrict !== 'All' && c.district !== selectedDistrict)
        return false;
      if (selectedCategory && selectedCategory !== 'All' && c.category !== selectedCategory)
        return false;
      return true;
    });
  }, [clusters, selectedState, selectedDistrict, selectedCategory]);

  // 3. Separate Mapped vs Unresolved requests
  const { mappedRequests, unresolvedRequests } = useMemo(() => {
    const mapped: CitizenRequest[] = [];
    const unresolved: CitizenRequest[] = [];

    for (const r of filteredRequests) {
      if (
        r.latitude !== null &&
        r.latitude !== undefined &&
        r.longitude !== null &&
        r.longitude !== undefined &&
        r.geoStatus !== 'UNRESOLVED'
      ) {
        mapped.push(r);
      } else {
        unresolved.push(r);
      }
    }

    return { mappedRequests: mapped, unresolvedRequests: unresolved };
  }, [filteredRequests]);

  // 4. District aggregated demand
  const districtAggregations = useMemo(() => {
    return aggregateRequestsByDistrict(filteredRequests, selectedState);
  }, [filteredRequests, selectedState]);

  // Initialize Google Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    let isMounted = true;

    loadGoogleMapsApi()
      .then((google) => {
        if (!isMounted || !google || !mapContainerRef.current) {
          if (isMounted) setMapLoadError('Google Maps API Key not loaded. Fallback enabled.');
          return;
        }

        // Center on India by default
        const initialCenter = { lat: 21.7679, lng: 78.8718 };
        const map = new google.maps.Map(mapContainerRef.current, {
          center: initialCenter,
          zoom: 5,
          mapTypeId: 'roadmap',
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          styles: [
            {
              featureType: 'administrative.country',
              elementType: 'geometry.stroke',
              stylers: [{ color: '#3b82f6' }, { weight: 1.5 }],
            },
            {
              featureType: 'administrative.province',
              elementType: 'geometry.stroke',
              stylers: [{ color: '#94a3b8' }, { weight: 1.2 }],
            },
            {
              featureType: 'poi',
              stylers: [{ visibility: 'off' }],
            },
          ],
        });

        mapInstanceRef.current = map;
        infoWindowRef.current = new google.maps.InfoWindow();
        setIsMapLoaded(true);
      })
      .catch((err) => {
        console.error('Error mounting Google Map:', err);
        if (isMounted) setMapLoadError('Failed to initialize Google Maps.');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Pan / Zoom map when state or district filter changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.google) return;

    if (selectedDistrict && selectedDistrict !== 'All' && DISTRICT_CENTROIDS[selectedDistrict]) {
      const cent = DISTRICT_CENTROIDS[selectedDistrict];
      map.setCenter({ lat: cent.latitude, lng: cent.longitude });
      map.setZoom(cent.zoom || 11);
    } else if (selectedState && selectedState !== 'All' && STATE_CENTROIDS[selectedState]) {
      const cent = STATE_CENTROIDS[selectedState];
      map.setCenter({ lat: cent.latitude, lng: cent.longitude });
      map.setZoom(cent.zoom || 7);
    } else {
      map.setCenter({ lat: 21.7679, lng: 78.8718 });
      map.setZoom(5);
    }
  }, [selectedState, selectedDistrict]);

  // Update Markers & Heatmap layers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.google) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    // Clear existing heatmap
    if (heatmapLayerRef.current) {
      heatmapLayerRef.current.setMap(null);
      heatmapLayerRef.current = null;
    }

    if (mapMode === 'HEATMAP') {
      // SECTION 15: Heatmap Layer
      // Heatmap intensity represents: NUMBER / CONCENTRATION OF CITIZEN REQUESTS
      const heatmapData = mappedRequests.map((r) => ({
        location: new google.maps.LatLng(r.latitude!, r.longitude!),
        weight: r.urgency === 'Critical' ? 4 : r.urgency === 'High' ? 3 : r.urgency === 'Medium' ? 2 : 1,
      }));

      // @ts-ignore
      const heatmap = new google.maps.visualization.HeatmapLayer({
        data: heatmapData,
        map,
        radius: 35,
        opacity: 0.8,
        gradient: [
          'rgba(0, 255, 255, 0)',
          'rgba(0, 255, 255, 1)',
          'rgba(0, 191, 255, 1)',
          'rgba(0, 127, 255, 1)',
          'rgba(0, 63, 255, 1)',
          'rgba(0, 0, 255, 1)',
          'rgba(0, 0, 223, 1)',
          'rgba(0, 0, 191, 1)',
          'rgba(0, 0, 159, 1)',
          'rgba(0, 0, 127, 1)',
          'rgba(63, 0, 91, 1)',
          'rgba(127, 0, 63, 1)',
          'rgba(191, 0, 31, 1)',
          'rgba(255, 0, 0, 1)',
        ],
      });

      heatmapLayerRef.current = heatmap;
    } else if (mapMode === 'DEMAND_CLUSTERS') {
      // SECTION BUILD 06: Demand Clusters Layer
      filteredClusters.forEach((c) => {
        const lat = c.latitude ?? c.centroidLatitude;
        const lng = c.longitude ?? c.centroidLongitude;
        if (!lat || !lng) return;

        const radiusMultiplier = Math.min(34, Math.max(16, 12 + Math.log2(c.requestCount + 1) * 3));
        const markerColor = CATEGORY_COLORS[c.category] || '#7c3aed';
        const isRising = c.trendSignal === 'RISING';

        const svgIcon = {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: markerColor,
          fillOpacity: 0.9,
          strokeWeight: isRising ? 3.5 : 2,
          strokeColor: isRising ? '#dc2626' : '#ffffff',
          scale: radiusMultiplier,
        };

        const marker = new google.maps.Marker({
          position: { lat, lng },
          map,
          icon: svgIcon,
          label: {
            text: String(c.requestCount),
            color: '#ffffff',
            fontSize: '11px',
            fontWeight: 'bold',
          },
          title: `${c.canonicalDemand} (${c.requestCount} requests)`,
        });

        marker.addListener('click', () => {
          setActivePopupCluster(c);
          setActivePopupRequest(null);
        });

        markersRef.current.push(marker);
      });
    } else if (mapMode === 'INFRASTRUCTURE_GAPS') {
      // BUILD 07: Infrastructure Gap Map Layer
      gapAssessments.forEach((gap) => {
        if (selectedState && selectedState !== 'All' && gap.state !== selectedState) return;
        if (selectedDistrict && selectedDistrict !== 'All' && gap.district !== selectedDistrict)
          return;
        if (selectedCategory && selectedCategory !== 'All' && gap.category !== selectedCategory)
          return;

        const cluster = clusters.find((c) => c.clusterId === gap.clusterId);
        const lat =
          cluster?.latitude ??
          cluster?.centroidLatitude ??
          (gap.district && DISTRICT_CENTROIDS[gap.district]?.latitude);
        const lng =
          cluster?.longitude ??
          cluster?.centroidLongitude ??
          (gap.district && DISTRICT_CENTROIDS[gap.district]?.longitude);
        if (!lat || !lng) return;

        const gapColor = GAP_COLORS[gap.gapLevel] || '#64748b';
        const radiusMultiplier =
          gap.gapLevel === 'SEVERE'
            ? 24
            : gap.gapLevel === 'HIGH'
            ? 20
            : gap.gapLevel === 'MODERATE'
            ? 17
            : 14;

        const svgIcon = {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: gapColor,
          fillOpacity: 0.95,
          strokeWeight: 3,
          strokeColor: '#ffffff',
          scale: radiusMultiplier,
        };

        const labelChar =
          gap.gapLevel === 'SEVERE'
            ? '!'
            : gap.gapLevel === 'HIGH'
            ? 'H'
            : gap.gapLevel === 'MODERATE'
            ? 'M'
            : gap.gapLevel === 'LOW'
            ? 'L'
            : '?';

        const marker = new google.maps.Marker({
          position: { lat, lng },
          map,
          icon: svgIcon,
          label: {
            text: labelChar,
            color: '#ffffff',
            fontSize: '12px',
            fontWeight: 'bold',
          },
          title: `[${gap.gapLevel}] ${gap.canonicalProblem} (${gap.district})`,
        });

        marker.addListener('click', () => {
          if (cluster) {
            setActivePopupCluster(cluster);
            setActivePopupRequest(null);
          }
        });

        markersRef.current.push(marker);
      });
    } else {
      // SECTION 12 & 13: Markers & District Aggregation
      // If we have many requests and zoom is low (or user selected district bubbles), show aggregated circles
      const currentZoom = map.getZoom() || 5;

      if (currentZoom < 7 && districtAggregations.length > 0 && selectedDistrict === 'All') {
        // District Concentration Bubbles (Section 13)
        districtAggregations.forEach((dist) => {
          const markerColor =
            viewBy === 'URGENCY'
              ? (dist.urgencyBreakdown['Critical'] || 0) > 0
                ? '#e11d48'
                : '#ea580c'
              : CATEGORY_COLORS[dist.topCategory] || '#1d4ed8';

          const radiusMultiplier = Math.min(28, Math.max(16, 12 + dist.totalRequests * 2));

          const svgIcon = {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: markerColor,
            fillOpacity: 0.85,
            strokeWeight: 2,
            strokeColor: '#ffffff',
            scale: radiusMultiplier,
          };

          const marker = new google.maps.Marker({
            position: { lat: dist.latitude, lng: dist.longitude },
            map,
            icon: svgIcon,
            label: {
              text: String(dist.totalRequests),
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 'bold',
            },
            title: `${dist.district}, ${dist.state} — ${dist.totalRequests} Requests`,
          });

          marker.addListener('click', () => {
            if (onSelectDistrict) onSelectDistrict(dist.district);
            if (onSelectState) onSelectState(dist.state);
            map.setCenter({ lat: dist.latitude, lng: dist.longitude });
            map.setZoom(10);
          });

          markersRef.current.push(marker);
        });
      } else {
        // Individual Request Markers (Section 12)
        mappedRequests.forEach((req) => {
          const pinColor =
            viewBy === 'URGENCY'
              ? URGENCY_COLORS[req.urgency] || '#2563eb'
              : CATEGORY_COLORS[req.category] || '#2563eb';

          const pinSvg = {
            path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
            fillColor: pinColor,
            fillOpacity: 0.95,
            strokeWeight: 1.5,
            strokeColor: '#ffffff',
            scale: 1.4,
            anchor: new google.maps.Point(12, 22),
          };

          const marker = new google.maps.Marker({
            position: { lat: req.latitude!, lng: req.longitude! },
            map,
            icon: pinSvg,
            title: `${req.category}: ${req.summary}`,
          });

          marker.addListener('click', () => {
            setActivePopupRequest(req);
            if (infoWindowRef.current) {
              const contentString = `
                <div style="max-width: 260px; font-family: sans-serif; padding: 4px;">
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                    <span style="font-size: 10px; font-weight: bold; background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px;">
                      ${req.category}
                    </span>
                    <span style="font-size: 10px; font-weight: bold; color: ${
                      req.urgency === 'Critical' ? '#e11d48' : '#ea580c'
                    }">
                      ${req.urgency} Urgency
                    </span>
                  </div>
                  <div style="font-size: 11px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">
                    ${req.requestId}
                  </div>
                  <div style="font-size: 11px; color: #334155; line-height: 1.4; margin-bottom: 6px;">
                    ${req.summary}
                  </div>
                  <div style="font-size: 10px; color: #64748b; margin-bottom: 8px;">
                    📍 ${req.locality || req.district}, ${req.state}
                  </div>
                  <div style="font-size: 9px; color: #94a3b8; margin-bottom: 6px;">
                    Submitted: ${new Date(req.timestamp).toLocaleDateString()}
                  </div>
                </div>
              `;
              infoWindowRef.current.setContent(contentString);
              infoWindowRef.current.open(map, marker);
            }
          });

          markersRef.current.push(marker);
        });
      }
    }
  }, [
    mappedRequests,
    districtAggregations,
    mapMode,
    viewBy,
    selectedDistrict,
    selectedState,
    selectedCategory,
    filteredClusters,
    gapAssessments,
  ]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs flex flex-col">
      {/* Top Map Controls Toolbar */}
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left: View By & Layer Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Layer Mode Toggle: [ Markers ] [ Heatmap ] [ Demand Clusters ] [ Infrastructure Gaps ] */}
          <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setMapMode('MARKERS')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                mapMode === 'MARKERS'
                  ? 'bg-blue-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Markers
            </button>
            <button
              type="button"
              onClick={() => setMapMode('HEATMAP')}
              className={`flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                mapMode === 'HEATMAP'
                  ? 'bg-rose-700 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Flame className="w-3 h-3" />
              <span>Heatmap</span>
            </button>
            <button
              type="button"
              onClick={() => setMapMode('DEMAND_CLUSTERS')}
              className={`flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                mapMode === 'DEMAND_CLUSTERS'
                  ? 'bg-purple-800 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>Demand Clusters ({filteredClusters.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setMapMode('INFRASTRUCTURE_GAPS')}
              className={`flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                mapMode === 'INFRASTRUCTURE_GAPS'
                  ? 'bg-rose-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldAlert className="w-3 h-3" />
              <span>Infrastructure Gaps</span>
            </button>
          </div>

          {/* View By Toggle */}
          <div className="hidden sm:flex items-center gap-1 text-xs text-slate-500 ml-2">
            <span>View By:</span>
            <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 shadow-2xs">
              {(['ALL', 'CATEGORY', 'URGENCY'] as ViewByMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewBy(mode)}
                  className={`px-2 py-1 text-[11px] font-semibold rounded transition-colors cursor-pointer ${
                    viewBy === mode
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {mode === 'ALL' ? 'All' : mode === 'CATEGORY' ? 'Category' : 'Urgency'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Time Filter & Unresolved Geography Counter */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Time Filter (Section 17) */}
          <div className="flex items-center gap-1 text-xs">
            <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              className="px-2.5 py-1 rounded-md bg-white border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-hidden"
            >
              <option value="all">All Time</option>
              <option value="90d">Last 90 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="7d">Last 7 Days</option>
            </select>
          </div>

          {/* Section 22: Unresolved Geography Indicator */}
          <button
            type="button"
            onClick={() => setShowUnresolvedModal(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors cursor-pointer ${
              unresolvedRequests.length > 0
                ? 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
                : 'bg-white border-slate-200 text-slate-600'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
            <span>Unresolved: {unresolvedRequests.length}</span>
          </button>

          {/* Dataset Status Badge */}
          {isDemoDataEnabled && (
            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[11px] font-bold">
              Demo Dataset Active
            </span>
          )}
        </div>
      </div>

      {/* Main Map Container */}
      <div className="relative min-h-[520px] bg-slate-100 flex-1">
        {/* Google Map Div */}
        <div ref={mapContainerRef} className="w-full h-full min-h-[520px]" />

        {/* Fallback if map fails or API key not yet loaded */}
        {mapLoadError && (
          <div className="absolute inset-0 bg-slate-900/90 text-white flex flex-col items-center justify-center p-6 text-center z-20">
            <Globe className="w-12 h-12 text-blue-400 mb-3 animate-pulse" />
            <h4 className="text-base font-bold">Geographic Intelligence Engine</h4>
            <p className="text-xs text-slate-300 max-w-md mt-1 mb-4">
              Google Maps Platform visual layer connecting citizen demands to administrative coordinates.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left max-w-2xl w-full">
              {districtAggregations.slice(0, 4).map((d, i) => (
                <div key={i} className="p-3 bg-slate-800 rounded-lg border border-slate-700">
                  <div className="text-[10px] text-slate-400">{d.state}</div>
                  <div className="text-sm font-bold">{d.district}</div>
                  <div className="text-xs text-blue-400 mt-1 font-semibold">
                    {d.totalRequests} demands
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Legend Overlay */}
        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-xs p-3 rounded-xl border border-slate-200 shadow-md text-xs space-y-1.5 z-10 max-w-xs">
          <div className="font-bold text-slate-900 flex items-center justify-between">
            <span>
              {mapMode === 'HEATMAP'
                ? 'Citizen Demand Heatmap'
                : mapMode === 'INFRASTRUCTURE_GAPS'
                ? 'Infrastructure Deficits'
                : mapMode === 'DEMAND_CLUSTERS'
                ? 'Demand Clusters'
                : 'Demand Density'}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {mapMode === 'INFRASTRUCTURE_GAPS'
                ? `${gapAssessments.length} assessed`
                : mapMode === 'DEMAND_CLUSTERS'
                ? `${filteredClusters.length} clusters`
                : `${mappedRequests.length} mapped`}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 leading-tight">
            {mapMode === 'HEATMAP'
              ? 'Heat intensity represents number and concentration of citizen requests — not poverty or administrative rating.'
              : mapMode === 'INFRASTRUCTURE_GAPS'
              ? 'Pins indicate deterministic deficit level calculated against official standards and verified asset registries.'
              : mapMode === 'DEMAND_CLUSTERS'
              ? 'Grouped citizen demands by geographic proximity and semantic infrastructure topic.'
              : 'Colored markers indicate infrastructure sector or urgency.'}
          </p>
          {mapMode === 'INFRASTRUCTURE_GAPS' && (
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1 text-[10px] font-semibold">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" /> Severe Gap
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" /> High Gap
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Moderate
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" /> Low Gap
              </span>
            </div>
          )}
          {mapMode === 'MARKERS' && viewBy === 'URGENCY' && (
            <div className="flex items-center gap-2 pt-1 text-[10px] font-semibold">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" /> Critical
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" /> High
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" /> Medium
              </span>
            </div>
          )}
        </div>

        {/* Active Marker Inspector Card (Drawer-like overlay) */}
        {activePopupRequest && (
          <div className="absolute top-4 right-4 bg-white rounded-xl border border-slate-200 p-4 shadow-xl z-20 max-w-sm w-full animate-fadeIn">
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="text-xs font-bold font-mono text-blue-900">
                {activePopupRequest.requestId}
              </span>
              <button
                type="button"
                onClick={() => setActivePopupRequest(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-900">
                {activePopupRequest.category}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  activePopupRequest.urgency === 'Critical'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {activePopupRequest.urgency} Urgency
              </span>
            </div>

            <div className="text-xs text-slate-800 font-semibold mb-1">
              {activePopupRequest.subcategory}
            </div>

            <p className="text-xs text-slate-600 mb-3 line-clamp-3">
              "{activePopupRequest.summary}"
            </p>

            <div className="text-[11px] text-slate-500 space-y-1 mb-3 bg-slate-50 p-2 rounded-lg">
              <div>📍 {activePopupRequest.locality || 'Community Point'}, {activePopupRequest.district}, {activePopupRequest.state}</div>
              <div>📅 {new Date(activePopupRequest.timestamp).toLocaleDateString()}</div>
              {activePopupRequest.latitude && activePopupRequest.longitude && (
                <div className="font-mono text-[10px] text-slate-400">
                  Coordinates: {activePopupRequest.latitude.toFixed(4)}, {activePopupRequest.longitude.toFixed(4)}
                </div>
              )}
            </div>

            {onInspectRequest && (
              <button
                type="button"
                onClick={() => {
                  onInspectRequest(activePopupRequest);
                  setActivePopupRequest(null);
                }}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>View Full Request Details</span>
              </button>
            )}
          </div>
        )}

        {/* Active Cluster Inspector Card (Drawer-like overlay for Demand Clusters) */}
        {activePopupCluster && (
          <div className="absolute top-4 right-4 bg-white rounded-xl border border-purple-200 p-4 shadow-xl z-20 max-w-sm w-full animate-fadeIn ring-2 ring-purple-500/20">
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="text-xs font-bold font-mono text-purple-900">
                {activePopupCluster.clusterId}
              </span>
              <button
                type="button"
                onClick={() => setActivePopupCluster(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-900">
                {activePopupCluster.category}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  (activePopupCluster.status || activePopupCluster.clusterStatus) === 'CONFIRMED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : (activePopupCluster.status || activePopupCluster.clusterStatus) === 'NEEDS_REVIEW'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {activePopupCluster.status || activePopupCluster.clusterStatus}
              </span>
              {activePopupCluster.trendSignal === 'RISING' && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 flex items-center gap-1">
                  🔥 Rising {activePopupCluster.growthPercentage ? `+${activePopupCluster.growthPercentage}%` : ''}
                </span>
              )}
            </div>

            <div className="text-xs text-slate-900 font-bold mb-1">
              {activePopupCluster.canonicalDemand}
            </div>

            <p className="text-xs text-slate-600 mb-3 line-clamp-3">
              "{activePopupCluster.canonicalProblem}"
            </p>

            <div className="text-[11px] text-slate-600 space-y-1 mb-3 bg-purple-50/60 p-2.5 rounded-lg border border-purple-100">
              <div className="flex items-center justify-between">
                <span>📍 {activePopupCluster.locality || 'Locality Hub'}, {activePopupCluster.district}, {activePopupCluster.state}</span>
              </div>
              <div className="flex items-center justify-between font-semibold text-slate-800">
                <span>Citizen Reports Clustered:</span>
                <span className="text-purple-900 font-bold">{activePopupCluster.requestCount}</span>
              </div>
              <div className="flex items-center gap-1 flex-wrap pt-1">
                <span className="text-[10px] text-slate-500">Languages:</span>
                {activePopupCluster.languagesRepresented?.map((lang) => (
                  <span key={lang} className="text-[9px] px-1.5 py-0.2 rounded bg-white text-slate-700 border border-slate-200">
                    {lang}
                  </span>
                ))}
              </div>
            </div>

            {onInspectCluster && (
              <button
                type="button"
                onClick={() => {
                  onInspectCluster(activePopupCluster);
                  setActivePopupCluster(null);
                }}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-purple-900 hover:bg-purple-800 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Open Cluster Analytics & Actions</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal: Unresolved Locations Inspector (Section 22) */}
      {showUnresolvedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <div>
                  <h4 className="text-base font-bold text-slate-900">
                    Unresolved Geographic Locations ({unresolvedRequests.length})
                  </h4>
                  <p className="text-xs text-slate-500">
                    Requests with missing or incomplete geographic coordinates. They remain fully recorded and accessible.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUnresolvedModal(false)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
              {unresolvedRequests.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  All requests currently have mapped geographic coordinates!
                </div>
              ) : (
                unresolvedRequests.map((req) => (
                  <div
                    key={req.requestId}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold font-mono text-slate-800">
                          {req.requestId}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-semibold text-[10px]">
                          {req.category}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-600 font-medium">
                          {req.locality || 'Unknown Locality'}, {req.district || 'Unknown District'}, {req.state || 'Unknown State'}
                        </span>
                      </div>
                      <p className="text-slate-600 line-clamp-1">{req.summary}</p>
                    </div>

                    {onInspectRequest && (
                      <button
                        type="button"
                        onClick={() => {
                          onInspectRequest(req);
                          setShowUnresolvedModal(false);
                        }}
                        className="px-2.5 py-1 rounded bg-white hover:bg-blue-50 border border-slate-200 text-blue-900 font-semibold text-[11px] shrink-0 cursor-pointer"
                      >
                        Inspect
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 text-right">
              <button
                type="button"
                onClick={() => setShowUnresolvedModal(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
