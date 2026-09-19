import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Layers,
  MapPin,
  Maximize2,
  Navigation,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { INDIAN_STATES_DISTRICTS } from '../data/indiaLocations.ts';
import {
  AmbiguousLocationOption,
  checkLocalityAmbiguity,
  DISTRICT_CENTROIDS,
  loadGoogleMapsApi,
  resolveLocationCoordinates,
  reverseGeocodeCoordinates,
  STATE_CENTROIDS,
} from '../services/geoService.ts';
import type { LocationData, LocationGeoData } from '../types/citizenRequest.ts';

interface LocationSelectorProps {
  value: LocationData;
  onChange: (location: LocationData) => void;
  disabled?: boolean;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const [showMapModal, setShowMapModal] = useState<boolean>(false);
  const [mapPin, setMapPin] = useState<{ lat: number; lng: number } | null>(
    value.latitude && value.longitude ? { lat: value.latitude, lng: value.longitude } : null
  );
  const [isResolving, setIsResolving] = useState<boolean>(false);
  const [ambiguousOptions, setAmbiguousOptions] = useState<AmbiguousLocationOption[] | null>(null);
  const [manualLocality, setManualLocality] = useState<string>(value.locality || '');
  const [isGoogleMapsReady, setIsGoogleMapsReady] = useState<boolean>(false);

  // Map modal reference
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const googleMapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);

  // Available districts for chosen state
  const availableDistricts =
    value.state && INDIAN_STATES_DISTRICTS[value.state]
      ? INDIAN_STATES_DISTRICTS[value.state]
      : ['Wardha', 'Pune', 'Nagpur'];

  // Check Google Maps availability
  useEffect(() => {
    loadGoogleMapsApi().then((g) => {
      if (g) setIsGoogleMapsReady(true);
    });
  }, []);

  // Synchronize locality input
  useEffect(() => {
    setManualLocality(value.locality || '');
  }, [value.locality]);

  // Check locality ambiguity whenever user types locality
  const handleLocalityBlur = async () => {
    if (!manualLocality.trim()) return;

    // Check pre-configured or geocoded ambiguity
    const ambiguity = checkLocalityAmbiguity(manualLocality, value.state || undefined, value.district || undefined);
    if (ambiguity && ambiguity.length > 1) {
      setAmbiguousOptions(ambiguity);
      return;
    }

    setAmbiguousOptions(null);
    setIsResolving(true);
    try {
      const res = await resolveLocationCoordinates(
        value.state,
        value.district,
        manualLocality,
        mapPin
      );

      if (res.isAmbiguous && res.ambiguousOptions && res.ambiguousOptions.length > 1) {
        setAmbiguousOptions(res.ambiguousOptions);
      } else {
        onChange({
          ...value,
          locality: manualLocality,
          latitude: res.location.latitude,
          longitude: res.location.longitude,
          geoStatus: res.location.geoStatus,
          geoSource: res.location.geoSource,
        });
      }
    } finally {
      setIsResolving(false);
    }
  };

  // State Change handler
  const handleStateChange = async (newState: string) => {
    const districts = INDIAN_STATES_DISTRICTS[newState] || ['Central District'];
    const newDistrict = districts[0] || '';
    setAmbiguousOptions(null);
    setMapPin(null);

    const res = await resolveLocationCoordinates(newState, newDistrict, manualLocality, null);
    onChange({
      ...value,
      state: newState,
      district: newDistrict,
      locality: manualLocality,
      latitude: res.location.latitude,
      longitude: res.location.longitude,
      geoStatus: res.location.geoStatus,
      geoSource: res.location.geoSource,
    });
  };

  // District Change handler
  const handleDistrictChange = async (newDistrict: string) => {
    setAmbiguousOptions(null);
    setMapPin(null);

    const res = await resolveLocationCoordinates(value.state, newDistrict, manualLocality, null);
    onChange({
      ...value,
      district: newDistrict,
      locality: manualLocality,
      latitude: res.location.latitude,
      longitude: res.location.longitude,
      geoStatus: res.location.geoStatus,
      geoSource: res.location.geoSource,
    });
  };

  // User confirms an ambiguous option selection
  const handleSelectAmbiguousOption = (opt: AmbiguousLocationOption) => {
    setAmbiguousOptions(null);
    setManualLocality(opt.locality);
    onChange({
      ...value,
      state: opt.state,
      district: opt.district,
      locality: opt.locality,
      latitude: opt.latitude,
      longitude: opt.longitude,
      geoStatus: 'VERIFIED',
      geoSource: 'GEOCODED_LOCATION',
    });
  };

  // Initialize and mount Google Map inside modal
  useEffect(() => {
    if (!showMapModal || !mapContainerRef.current) return;

    let isSubscribed = true;

    loadGoogleMapsApi().then((google) => {
      if (!isSubscribed || !google || !mapContainerRef.current) return;

      // Determine initial map center: current pin, district centroid, state centroid, or India
      const distCentroid = value.district ? DISTRICT_CENTROIDS[value.district] : null;
      const stateCentroid = value.state ? STATE_CENTROIDS[value.state] : null;

      const initialCenter = mapPin
        ? { lat: mapPin.lat, lng: mapPin.lng }
        : distCentroid
        ? { lat: distCentroid.latitude, lng: distCentroid.longitude }
        : stateCentroid
        ? { lat: stateCentroid.latitude, lng: stateCentroid.longitude }
        : { lat: 20.5937, lng: 78.9629 };

      const initialZoom = mapPin ? 13 : distCentroid ? 11 : stateCentroid ? 7 : 5;

      const map = new google.maps.Map(mapContainerRef.current, {
        center: initialCenter,
        zoom: initialZoom,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: [
          { featureType: 'poi', stylers: [{ visibility: 'simplified' }] },
          { featureType: 'transit', stylers: [{ visibility: 'simplified' }] },
        ],
      });

      googleMapInstanceRef.current = map;

      // Initial marker if pin exists
      if (mapPin) {
        markerInstanceRef.current = new google.maps.Marker({
          position: mapPin,
          map,
          title: 'Infrastructure Issue Location',
          animation: google.maps.Animation.DROP,
        });
      }

      // Map click handler to drop/move pin
      map.addListener('click', async (e: any) => {
        if (!e.latLng) return;
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        const newCoords = { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
        setMapPin(newCoords);

        if (markerInstanceRef.current) {
          markerInstanceRef.current.setPosition(e.latLng);
        } else {
          markerInstanceRef.current = new google.maps.Marker({
            position: e.latLng,
            map,
            title: 'Infrastructure Issue Location',
          });
        }

        // Optional reverse geocode to suggest locality name without overwriting user state unless empty
        const reverse = await reverseGeocodeCoordinates(lat, lng);
        if (reverse && reverse.locality && !manualLocality) {
          setManualLocality(reverse.locality);
        }
      });
    });

    return () => {
      isSubscribed = false;
      if (markerInstanceRef.current) {
        markerInstanceRef.current.setMap(null);
        markerInstanceRef.current = null;
      }
    };
  }, [showMapModal]);

  // Apply map selection
  const handleApplyMapPin = () => {
    if (!mapPin) return;

    onChange({
      ...value,
      locality: manualLocality || 'Selected Infrastructure Location',
      latitude: mapPin.lat,
      longitude: mapPin.lng,
      geoStatus: 'VERIFIED',
      geoSource: 'USER_MAP_SELECTION',
    });

    setShowMapModal(false);
  };

  // Clear map pin
  const handleClearPin = async () => {
    setMapPin(null);
    const res = await resolveLocationCoordinates(value.state, value.district, manualLocality, null);
    onChange({
      ...value,
      latitude: res.location.latitude,
      longitude: res.location.longitude,
      geoStatus: res.location.geoStatus,
      geoSource: res.location.geoSource,
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
      {/* Header & Infrastructure Location Principle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-900 shrink-0" />
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Community Infrastructure Location
            </h3>
            <p className="text-xs text-slate-500">
              Pinpoint the public issue site (bridge, road, school, water point) — not personal home residence.
            </p>
          </div>
        </div>

        {/* Optional Map Selection Trigger */}
        <button
          type="button"
          onClick={() => setShowMapModal(true)}
          disabled={disabled}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-xs font-semibold transition-all self-start sm:self-auto cursor-pointer shadow-2xs"
        >
          <Layers className="w-3.5 h-3.5 text-blue-700" />
          <span>{mapPin ? 'Edit Location on Map' : 'Select Location on Map'}</span>
        </button>
      </div>

      {/* Hierarchical Location Inputs: Country -> State -> District -> Locality */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Country (Fixed India) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Country (देश)
          </label>
          <div className="relative">
            <input
              type="text"
              value="India"
              disabled
              className="w-full px-3 py-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-sm font-medium cursor-not-allowed"
            />
            <span className="absolute right-2.5 top-2.5 text-xs text-slate-400 font-mono">
              IN
            </span>
          </div>
        </div>

        {/* State Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            State (राज्य) <span className="text-rose-600">*</span>
          </label>
          <select
            value={value.state || ''}
            onChange={(e) => handleStateChange(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm font-medium focus:ring-2 focus:ring-blue-900 focus:outline-hidden"
          >
            {Object.keys(INDIAN_STATES_DISTRICTS).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* District Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            District (जिला) <span className="text-rose-600">*</span>
          </label>
          <select
            value={value.district || ''}
            onChange={(e) => handleDistrictChange(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm font-medium focus:ring-2 focus:ring-blue-900 focus:outline-hidden"
          >
            {availableDistricts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* Locality / Village / Ward (Search/Type) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-slate-700">
              City / Village / Locality (गांव / मोहल्ला)
            </label>
            {isResolving && (
              <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" />
            )}
          </div>
          <div className="relative">
            <input
              type="text"
              value={manualLocality}
              onChange={(e) => setManualLocality(e.target.value)}
              onBlur={handleLocalityBlur}
              disabled={disabled}
              placeholder="e.g., Seloo Village, Phoolpur, Ward 12"
              className="w-full pl-8 pr-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm font-medium focus:ring-2 focus:ring-blue-900 focus:outline-hidden"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>
      </div>

      {/* AMBIGUOUS LOCATION CLARIFICATION CARD (Section 7: Handled carefully) */}
      {ambiguousOptions && ambiguousOptions.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 space-y-2.5 animate-fadeIn">
          <div className="flex items-start gap-2 text-amber-900">
            <HelpCircle className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
            <div>
              <span className="text-xs font-bold uppercase tracking-wider block">
                Which location did you mean? (कृपया सही स्थान चुनें)
              </span>
              <p className="text-xs text-amber-800">
                Multiple locations share the name "{manualLocality}". Please select your specific community infrastructure location to prevent misclassification:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            {ambiguousOptions.map((opt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectAmbiguousOption(opt)}
                className="p-3 rounded-lg bg-white hover:bg-amber-100/70 border border-amber-300 text-left transition-all cursor-pointer shadow-2xs group"
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-900 group-hover:text-blue-900">
                  <span>{opt.locality}</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-[11px] text-slate-600 mt-0.5 font-medium">
                  {opt.district}, {opt.state}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                  {opt.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Location Resolution & Confidence Status Badge (Section 6) */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs border-t border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Geographic Precision:</span>
          {value.geoStatus === 'VERIFIED' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-[11px]">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Verified ({value.geoSource === 'USER_MAP_SELECTION' ? 'Map Pin' : 'Geocoded Locality'})
            </span>
          )}

          {value.geoStatus === 'APPROXIMATE' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold text-[11px]">
              <AlertCircle className="w-3 h-3 text-amber-600" />
              District Centroid ({value.district || 'Approximate'})
            </span>
          )}

          {value.geoStatus === 'UNRESOLVED' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[11px]">
              Unresolved Coordinates
            </span>
          )}

          {value.latitude && value.longitude && (
            <span className="font-mono text-[10px] text-slate-500">
              [{value.latitude.toFixed(4)}, {value.longitude.toFixed(4)}]
            </span>
          )}
        </div>

        {mapPin && (
          <button
            type="button"
            onClick={handleClearPin}
            className="text-[11px] text-rose-600 hover:text-rose-800 font-medium underline cursor-pointer"
          >
            Clear Custom Pin
          </button>
        )}
      </div>

      {/* MODAL: Select Location on Map (Section 3 & 4) */}
      {showMapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-900" />
                <div>
                  <h4 className="text-base font-bold text-slate-900">
                    Place Infrastructure Pin on Map
                  </h4>
                  <p className="text-xs text-slate-500">
                    Click anywhere on the map to pinpoint the exact site of the problem.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMapModal(false)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Map Viewport */}
            <div className="relative flex-1 min-h-[380px] bg-slate-100">
              <div ref={mapContainerRef} className="w-full h-full min-h-[380px]" />

              {/* Pinpoint instructions overlay */}
              <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-lg shadow-md border border-slate-200 text-xs text-slate-700 font-medium flex items-center gap-1.5 pointer-events-none">
                <Navigation className="w-3.5 h-3.5 text-blue-900" />
                <span>Click to set pin for bridge, school, road, or water issue</span>
              </div>

              {mapPin && (
                <div className="absolute bottom-3 left-3 bg-slate-900/90 text-white px-3 py-1.5 rounded-lg text-xs font-mono shadow-md">
                  Pin: {mapPin.lat.toFixed(5)}, {mapPin.lng.toFixed(5)}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500">
                {mapPin
                  ? 'Pin placed. Coordinates will be recorded as VERIFIED.'
                  : 'Click on the map to drop a location pin.'}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowMapModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyMapPin}
                  disabled={!mapPin}
                  className="px-4 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-800 disabled:bg-slate-300 text-white text-xs font-semibold cursor-pointer transition-colors shadow-xs"
                >
                  Confirm Map Location
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
