import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import type {
  CitizenRequest,
  GeoSource,
  GeoStatus,
  LocationGeoData,
} from '../types/citizenRequest.ts';

// Get API key from Vite environment
export const getGoogleMapsApiKey = (): string => {
  return (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || '';
};

// Singleton loader instance
let googleMapsPromise: Promise<any> | null = null;

export const loadGoogleMapsApi = async (): Promise<any> => {
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    console.warn('VITE_GOOGLE_MAPS_API_KEY is not configured.');
    return null;
  }

  if (typeof window !== 'undefined' && (window as any).google && (window as any).google.maps) {
    return (window as any).google;
  }

  if (!googleMapsPromise) {
    googleMapsPromise = (async () => {
      try {
        setOptions({
          key: apiKey,
          v: 'weekly',
        });
        await Promise.all([
          importLibrary('maps'),
          importLibrary('places'),
          importLibrary('marker'),
          importLibrary('visualization'),
        ]);
        return (window as any).google;
      } catch (err) {
        console.error('Failed to load Google Maps libraries:', err);
        return null;
      }
    })();
  }

  try {
    return await googleMapsPromise;
  } catch (err) {
    console.error('Failed to load Google Maps API:', err);
    googleMapsPromise = null;
    return null;
  }
};

// ==========================================
// Verified Administrative Centroid Database
// (Administrative boundaries and coordinates)
// ==========================================

export interface CentroidCoordinate {
  latitude: number;
  longitude: number;
  zoom?: number;
}

export const STATE_CENTROIDS: Record<string, CentroidCoordinate> = {
  'Maharashtra': { latitude: 19.7515, longitude: 75.7139, zoom: 7 },
  'Uttar Pradesh': { latitude: 26.8467, longitude: 80.9462, zoom: 7 },
  'Tamil Nadu': { latitude: 11.1271, longitude: 78.6569, zoom: 7 },
  'Karnataka': { latitude: 15.3173, longitude: 75.7139, zoom: 7 },
  'Rajasthan': { latitude: 27.0238, longitude: 74.2179, zoom: 7 },
  'Bihar': { latitude: 25.0961, longitude: 85.3131, zoom: 7 },
  'Assam': { latitude: 26.2006, longitude: 92.9376, zoom: 7 },
  'Odisha': { latitude: 20.9517, longitude: 85.0985, zoom: 7 },
  'Madhya Pradesh': { latitude: 22.9734, longitude: 78.6569, zoom: 7 },
  'West Bengal': { latitude: 22.9868, longitude: 87.855, zoom: 7 },
  'Gujarat': { latitude: 22.2587, longitude: 71.1924, zoom: 7 },
  'Kerala': { latitude: 10.8505, longitude: 76.2711, zoom: 7 },
  'Punjab': { latitude: 31.1471, longitude: 75.3412, zoom: 7 },
  'Haryana': { latitude: 29.0588, longitude: 76.0856, zoom: 7 },
  'Telangana': { latitude: 18.1124, longitude: 79.0193, zoom: 7 },
  'Andhra Pradesh': { latitude: 15.9129, longitude: 79.74, zoom: 7 },
  'Jharkhand': { latitude: 23.6102, longitude: 85.2799, zoom: 7 },
  'Uttarakhand': { latitude: 30.0668, longitude: 79.0193, zoom: 7 },
  'Himachal Pradesh': { latitude: 31.1048, longitude: 77.1734, zoom: 7 },
};

export const DISTRICT_CENTROIDS: Record<string, CentroidCoordinate> = {
  // Maharashtra
  'Wardha': { latitude: 20.7453, longitude: 78.6022, zoom: 10 },
  'Pune': { latitude: 18.5204, longitude: 73.8567, zoom: 10 },
  'Nagpur': { latitude: 21.1458, longitude: 79.0882, zoom: 10 },
  'Nashik': { latitude: 19.9975, longitude: 73.7898, zoom: 10 },
  'Chhatrapati Sambhajinagar': { latitude: 19.8762, longitude: 75.3433, zoom: 10 },
  'Amravati': { latitude: 20.932, longitude: 77.7523, zoom: 10 },
  'Solapur': { latitude: 17.6599, longitude: 75.9064, zoom: 10 },
  'Thane': { latitude: 19.2183, longitude: 72.9781, zoom: 10 },

  // Uttar Pradesh
  'Varanasi': { latitude: 25.3176, longitude: 82.9739, zoom: 11 },
  'Lucknow': { latitude: 26.8467, longitude: 80.9462, zoom: 11 },
  'Gorakhpur': { latitude: 26.7606, longitude: 83.3732, zoom: 11 },
  'Prayagraj': { latitude: 25.4358, longitude: 81.8463, zoom: 11 },
  'Kanpur': { latitude: 26.4499, longitude: 80.3319, zoom: 11 },
  'Agra': { latitude: 27.1767, longitude: 78.0081, zoom: 11 },
  'Ayodhya': { latitude: 26.7922, longitude: 82.1998, zoom: 11 },
  'Bareilly': { latitude: 28.367, longitude: 79.4304, zoom: 11 },

  // Tamil Nadu
  'Madurai': { latitude: 9.9252, longitude: 78.1198, zoom: 11 },
  'Chennai': { latitude: 13.0827, longitude: 80.2707, zoom: 11 },
  'Coimbatore': { latitude: 11.0168, longitude: 76.9558, zoom: 11 },
  'Tiruchirappalli': { latitude: 10.7905, longitude: 78.7047, zoom: 11 },
  'Salem': { latitude: 11.6643, longitude: 78.146, zoom: 11 },
  'Tirunelveli': { latitude: 8.7139, longitude: 77.7567, zoom: 11 },
  'Thanjavur': { latitude: 10.787, longitude: 79.1378, zoom: 11 },

  // Karnataka
  'Kalaburagi': { latitude: 17.3297, longitude: 76.8343, zoom: 11 },
  'Bengaluru Urban': { latitude: 12.9716, longitude: 77.5946, zoom: 11 },
  'Mysuru': { latitude: 12.2958, longitude: 76.6394, zoom: 11 },
  'Belagavi': { latitude: 15.8497, longitude: 74.4977, zoom: 11 },
  'Hubballi-Dharwad': { latitude: 15.3647, longitude: 75.124, zoom: 11 },
  'Ballari': { latitude: 15.1394, longitude: 76.9214, zoom: 11 },
  'Shimoga': { latitude: 13.9299, longitude: 75.5681, zoom: 11 },

  // Rajasthan
  'Alwar': { latitude: 27.553, longitude: 76.6346, zoom: 11 },
  'Jaipur': { latitude: 26.9124, longitude: 75.7873, zoom: 11 },
  'Jodhpur': { latitude: 26.2389, longitude: 73.0243, zoom: 11 },
  'Kota': { latitude: 25.2138, longitude: 75.8648, zoom: 11 },
  'Udaipur': { latitude: 24.5854, longitude: 73.7125, zoom: 11 },
  'Bikaner': { latitude: 28.0229, longitude: 73.3119, zoom: 11 },
  'Ajmer': { latitude: 26.4499, longitude: 74.6399, zoom: 11 },
  'Barmer': { latitude: 25.7521, longitude: 71.3967, zoom: 11 },

  // Bihar
  'Muzaffarpur': { latitude: 26.1209, longitude: 85.3647, zoom: 11 },
  'Patna': { latitude: 25.5941, longitude: 85.1376, zoom: 11 },
  'Gaya': { latitude: 24.7914, longitude: 85.0002, zoom: 11 },
  'Bhagalpur': { latitude: 25.2425, longitude: 86.9842, zoom: 11 },
  'Darbhanga': { latitude: 26.1542, longitude: 85.8918, zoom: 11 },
  'Purnia': { latitude: 25.7771, longitude: 87.4753, zoom: 11 },
  'Rohtas': { latitude: 24.9542, longitude: 84.015, zoom: 11 },

  // Assam
  'Dibrugarh': { latitude: 27.4728, longitude: 94.912, zoom: 11 },
  'Guwahati (Kamrup)': { latitude: 26.1445, longitude: 91.7362, zoom: 11 },
  'Silchar (Cachar)': { latitude: 24.8333, longitude: 92.7789, zoom: 11 },
  'Jorhat': { latitude: 26.7509, longitude: 94.2037, zoom: 11 },
  'Tezpur (Sonitpur)': { latitude: 26.6528, longitude: 92.7926, zoom: 11 },
  'Nagaon': { latitude: 26.3452, longitude: 92.684, zoom: 11 },

  // West Bengal
  'Bankura': { latitude: 23.2324, longitude: 87.0715, zoom: 11 },
  'Kolkata': { latitude: 22.5726, longitude: 88.3639, zoom: 11 },
  'Howrah': { latitude: 22.5958, longitude: 88.2636, zoom: 11 },
  'Darjeeling': { latitude: 27.041, longitude: 88.2663, zoom: 11 },
  'Murshidabad': { latitude: 24.1759, longitude: 88.2802, zoom: 11 },
  'North 24 Parganas': { latitude: 22.723, longitude: 88.4802, zoom: 11 },

  // Odisha
  'Kalahandi': { latitude: 19.9011, longitude: 83.1649, zoom: 10 },
  'Bhubaneswar (Khurda)': { latitude: 20.2961, longitude: 85.8245, zoom: 11 },
  'Cuttack': { latitude: 20.4625, longitude: 85.8828, zoom: 11 },
  'Sambalpur': { latitude: 21.4669, longitude: 83.9812, zoom: 11 },

  // Madhya Pradesh
  'Bhopal': { latitude: 23.2599, longitude: 77.4126, zoom: 11 },
  'Indore': { latitude: 22.7196, longitude: 75.8577, zoom: 11 },
  'Jabalpur': { latitude: 23.1815, longitude: 79.9864, zoom: 11 },

  // Gujarat
  'Ahmedabad': { latitude: 23.0225, longitude: 72.5714, zoom: 11 },
  'Surat': { latitude: 21.1702, longitude: 72.8311, zoom: 11 },

  // Kerala
  'Thiruvananthapuram': { latitude: 8.5241, longitude: 76.9366, zoom: 11 },
  'Kochi (Ernakulam)': { latitude: 9.9312, longitude: 76.2673, zoom: 11 },

  // Punjab & Haryana
  'Amritsar': { latitude: 31.634, longitude: 74.8723, zoom: 11 },
  'Gurugram': { latitude: 28.4595, longitude: 77.0266, zoom: 11 },

  // Telangana & Andhra Pradesh
  'Hyderabad': { latitude: 17.385, longitude: 78.4867, zoom: 11 },
  'Visakhapatnam': { latitude: 17.6868, longitude: 83.2185, zoom: 11 },

  // Jharkhand, Uttarakhand, Himachal Pradesh
  'Ranchi': { latitude: 23.3441, longitude: 85.3096, zoom: 11 },
  'Dehradun': { latitude: 30.3165, longitude: 78.0322, zoom: 11 },
  'Shimla': { latitude: 31.1048, longitude: 77.1734, zoom: 11 },
};

export const getDistrictCentroid = (district?: string | null): CentroidCoordinate | null => {
  if (!district) return null;
  return DISTRICT_CENTROIDS[district] || null;
};

export const getStateCentroid = (state?: string | null): CentroidCoordinate | null => {
  if (!state) return null;
  return STATE_CENTROIDS[state] || null;
};

// ==========================================
// Ambiguous Locality Disambiguation Registry
// Handled to satisfy User Requirement 7
// ==========================================

export interface AmbiguousLocationOption {
  locality: string;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  description: string;
}

export const AMBIGUOUS_LOCALITIES_REGISTRY: Record<string, AmbiguousLocationOption[]> = {
  'rampur': [
    {
      locality: 'Rampur',
      district: 'Varanasi',
      state: 'Uttar Pradesh',
      latitude: 25.324,
      longitude: 82.982,
      description: 'Rural block near Rohania, Varanasi district',
    },
    {
      locality: 'Rampur',
      district: 'Shimla',
      state: 'Himachal Pradesh',
      latitude: 31.448,
      longitude: 77.632,
      description: 'Historic town on the Satluj River, Shimla district',
    },
    {
      locality: 'Rampur',
      district: 'Alwar',
      state: 'Rajasthan',
      latitude: 27.562,
      longitude: 76.614,
      description: 'Gram Panchayat area in Alwar rural',
    },
  ],
  'phoolpur': [
    {
      locality: 'Phoolpur',
      district: 'Varanasi',
      state: 'Uttar Pradesh',
      latitude: 25.485,
      longitude: 82.825,
      description: 'Phoolpur market area, Varanasi district',
    },
    {
      locality: 'Phulpur',
      district: 'Prayagraj',
      state: 'Uttar Pradesh',
      latitude: 25.551,
      longitude: 82.083,
      description: 'Tehsil and parliamentary constituency, Prayagraj district',
    },
  ],
  'phulpur': [
    {
      locality: 'Phoolpur',
      district: 'Varanasi',
      state: 'Uttar Pradesh',
      latitude: 25.485,
      longitude: 82.825,
      description: 'Phoolpur block, Varanasi district',
    },
    {
      locality: 'Phulpur',
      district: 'Prayagraj',
      state: 'Uttar Pradesh',
      latitude: 25.551,
      longitude: 82.083,
      description: 'Tehsil and industrial cluster, Prayagraj district',
    },
  ],
  'civil lines': [
    {
      locality: 'Civil Lines',
      district: 'Nagpur',
      state: 'Maharashtra',
      latitude: 21.152,
      longitude: 79.071,
      description: 'Central administrative precinct, Nagpur',
    },
    {
      locality: 'Civil Lines',
      district: 'Prayagraj',
      state: 'Uttar Pradesh',
      latitude: 25.452,
      longitude: 81.833,
      description: 'Urban commercial & civic hub, Prayagraj',
    },
    {
      locality: 'Civil Lines',
      district: 'Jaipur',
      state: 'Rajasthan',
      latitude: 26.904,
      longitude: 75.783,
      description: 'Secretariat residential sector, Jaipur',
    },
  ],
  'shivaji nagar': [
    {
      locality: 'Shivaji Nagar',
      district: 'Pune',
      state: 'Maharashtra',
      latitude: 18.531,
      longitude: 73.844,
      description: 'Transit and institutional ward, Pune',
    },
    {
      locality: 'Shivajinagar',
      district: 'Bengaluru Urban',
      state: 'Karnataka',
      latitude: 12.986,
      longitude: 77.604,
      description: 'Commercial cantonment district, Bengaluru Urban',
    },
  ],
  'bilaspur': [
    {
      locality: 'Bilaspur',
      district: 'Gurugram',
      state: 'Haryana',
      latitude: 28.324,
      longitude: 76.871,
      description: 'Industrial logistics corridor, Gurugram',
    },
    {
      locality: 'Bilaspur',
      district: 'Shimla',
      state: 'Himachal Pradesh',
      latitude: 31.332,
      longitude: 76.756,
      description: 'Township near Gobind Sagar reservoir',
    },
  ],
};

// Check if locality query is ambiguous
export const checkLocalityAmbiguity = (
  localityInput: string,
  currentState?: string,
  currentDistrict?: string
): AmbiguousLocationOption[] | null => {
  if (!localityInput || localityInput.trim().length < 3) return null;
  const normalized = localityInput.trim().toLowerCase();

  for (const [key, options] of Object.entries(AMBIGUOUS_LOCALITIES_REGISTRY)) {
    if (normalized === key || normalized.includes(key) || key.includes(normalized)) {
      // If the user already locked in a state AND district that unambiguously matches one option, it's resolved.
      if (currentState && currentDistrict) {
        const matchesInCurrent = options.filter(
          (o) =>
            o.state.toLowerCase() === currentState.toLowerCase() &&
            o.district.toLowerCase() === currentDistrict.toLowerCase()
        );
        if (matchesInCurrent.length === 1) {
          return null; // Not ambiguous in this specific district
        }
      }
      return options;
    }
  }
  return null;
};

// ==========================================
// Verified Location Resolution
// Adheres strictly to Section 1 & 6 Principles
// ==========================================

export interface LocationResolutionResult {
  location: LocationGeoData;
  isAmbiguous: boolean;
  ambiguousOptions?: AmbiguousLocationOption[];
  resolutionMethod: 'MAP_PIN' | 'GEOCODED' | 'ADMIN_CENTROID' | 'AMBIGUOUS' | 'UNRESOLVED';
}

export const resolveLocationCoordinates = async (
  state: string | null | undefined,
  district: string | null | undefined,
  locality: string | null | undefined,
  mapPin?: { lat: number; lng: number } | null
): Promise<LocationResolutionResult> => {
  const country = 'India';
  const countryCode = 'IN';

  // 1. If citizen manually selected a point on the map (Section 3: Optional Map Selection)
  if (mapPin && typeof mapPin.lat === 'number' && typeof mapPin.lng === 'number') {
    return {
      location: {
        countryCode,
        country,
        state: state || null,
        stateCode: null,
        district: district || null,
        districtCode: null,
        locality: locality || 'Selected Map Point',
        latitude: Number(mapPin.lat.toFixed(6)),
        longitude: Number(mapPin.lng.toFixed(6)),
        geoStatus: 'VERIFIED',
        geoSource: 'USER_MAP_SELECTION',
      },
      isAmbiguous: false,
      resolutionMethod: 'MAP_PIN',
    };
  }

  // 2. Check for Ambiguous Locality Names (Section 7)
  if (locality) {
    const ambiguity = checkLocalityAmbiguity(locality, state || undefined, district || undefined);
    if (ambiguity && ambiguity.length > 1) {
      // Default to district centroid if known while flagging ambiguity
      const fallbackCentroid = district ? DISTRICT_CENTROIDS[district] : null;
      return {
        location: {
          countryCode,
          country,
          state: state || null,
          stateCode: null,
          district: district || null,
          districtCode: null,
          locality: locality || null,
          latitude: fallbackCentroid ? fallbackCentroid.latitude : null,
          longitude: fallbackCentroid ? fallbackCentroid.longitude : null,
          geoStatus: fallbackCentroid ? 'APPROXIMATE' : 'UNRESOLVED',
          geoSource: fallbackCentroid ? 'ADMINISTRATIVE_CENTROID' : 'UNKNOWN',
        },
        isAmbiguous: true,
        ambiguousOptions: ambiguity,
        resolutionMethod: 'AMBIGUOUS',
      };
    }
  }

  // 3. Attempt Google Maps Geocoding if API is available
  if (locality && locality.trim() !== '') {
    const queryParts = [locality];
    if (district) queryParts.push(district);
    if (state) queryParts.push(state);
    queryParts.push('India');

    const addressQuery = queryParts.join(', ');

    try {
      const google = await loadGoogleMapsApi();
      if (google && google.maps && google.maps.Geocoder) {
        const geocoder = new google.maps.Geocoder();
        const response = await new Promise<any[] | null>((resolve) => {
          geocoder.geocode(
            {
              address: addressQuery,
              componentRestrictions: { country: 'IN' },
            },
            (results: any, status: any) => {
              if (status === 'OK' && results && results.length > 0) {
                resolve(results);
              } else {
                resolve(null);
              }
            }
          );
        });

        if (response && response.length > 0) {
          // If multiple very distinct results are returned and no district matched, ask citizen
          if (response.length > 1 && !district) {
            const options: AmbiguousLocationOption[] = response.slice(0, 3).map((r) => ({
              locality: r.formatted_address,
              district: district || 'Unspecified',
              state: state || 'Unspecified',
              latitude: r.geometry.location.lat(),
              longitude: r.geometry.location.lng(),
              description: r.formatted_address,
            }));

            return {
              location: {
                countryCode,
                country,
                state: state || null,
                stateCode: null,
                district: district || null,
                districtCode: null,
                locality: locality || null,
                latitude: response[0].geometry.location.lat(),
                longitude: response[0].geometry.location.lng(),
                geoStatus: 'APPROXIMATE',
                geoSource: 'GEOCODED_LOCATION',
              },
              isAmbiguous: true,
              ambiguousOptions: options,
              resolutionMethod: 'AMBIGUOUS',
            };
          }

          const topResult = response[0];
          return {
            location: {
              countryCode,
              country,
              state: state || null,
              stateCode: null,
              district: district || null,
              districtCode: null,
              locality: locality || topResult.formatted_address,
              latitude: Number(topResult.geometry.location.lat().toFixed(6)),
              longitude: Number(topResult.geometry.location.lng().toFixed(6)),
              geoStatus: 'VERIFIED',
              geoSource: 'GEOCODED_LOCATION',
            },
            isAmbiguous: false,
            resolutionMethod: 'GEOCODED',
          };
        }
      }
    } catch (e) {
      console.warn('Google Maps Geocoding service skipped/failed:', e);
    }
  }

  // 4. District Centroid (Section 6: Approximate precision when locality is missing or unverified)
  if (district && DISTRICT_CENTROIDS[district]) {
    const centroid = DISTRICT_CENTROIDS[district];
    return {
      location: {
        countryCode,
        country,
        state: state || null,
        stateCode: null,
        district,
        districtCode: null,
        locality: locality || null,
        latitude: centroid.latitude,
        longitude: centroid.longitude,
        geoStatus: 'APPROXIMATE',
        geoSource: 'ADMINISTRATIVE_CENTROID',
      },
      isAmbiguous: false,
      resolutionMethod: 'ADMIN_CENTROID',
    };
  }

  // 5. State Centroid (Approximate fallback)
  if (state && STATE_CENTROIDS[state]) {
    const centroid = STATE_CENTROIDS[state];
    return {
      location: {
        countryCode,
        country,
        state,
        stateCode: null,
        district: district || null,
        districtCode: null,
        locality: locality || null,
        latitude: centroid.latitude,
        longitude: centroid.longitude,
        geoStatus: 'APPROXIMATE',
        geoSource: 'ADMINISTRATIVE_CENTROID',
      },
      isAmbiguous: false,
      resolutionMethod: 'ADMIN_CENTROID',
    };
  }

  // 6. Section 22: Unresolved Geography (must not disappear)
  return {
    location: {
      countryCode,
      country,
      state: state || null,
      stateCode: null,
      district: district || null,
      districtCode: null,
      locality: locality || null,
      latitude: null,
      longitude: null,
      geoStatus: 'UNRESOLVED',
      geoSource: 'UNKNOWN',
    },
    isAmbiguous: false,
    resolutionMethod: 'UNRESOLVED',
  };
};

// ==========================================
// Reverse Geocoding Helper
// ==========================================
export const reverseGeocodeCoordinates = async (
  lat: number,
  lng: number
): Promise<{ address: string; state?: string; district?: string; locality?: string } | null> => {
  try {
    const google = await loadGoogleMapsApi();
    if (!google || !google.maps || !google.maps.Geocoder) return null;

    const geocoder = new google.maps.Geocoder();
    const result = await new Promise<any[] | null>((resolve) => {
      geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
        if (status === 'OK' && results && results.length > 0) {
          resolve(results);
        } else {
          resolve(null);
        }
      });
    });

    if (!result || result.length === 0) return null;
    const top = result[0];

    let state: string | undefined;
    let district: string | undefined;
    let locality: string | undefined;

    for (const comp of top.address_components) {
      if (comp.types.includes('administrative_area_level_1')) {
        state = comp.long_name;
      }
      if (comp.types.includes('administrative_area_level_2') || comp.types.includes('administrative_area_level_3')) {
        district = comp.long_name.replace(/ District/i, '');
      }
      if (
        comp.types.includes('sublocality') ||
        comp.types.includes('locality') ||
        comp.types.includes('neighborhood')
      ) {
        locality = comp.long_name;
      }
    }

    return {
      address: top.formatted_address,
      state,
      district,
      locality,
    };
  } catch (e) {
    console.error('Reverse geocode failed:', e);
    return null;
  }
};

// ==========================================
// Aggregation & Hotspot Foundation Helpers
// (Section 13, 14, 16, 17)
// ==========================================

export interface DistrictAggregation {
  district: string;
  state: string;
  totalRequests: number;
  latitude: number;
  longitude: number;
  categoryBreakdown: Record<string, number>;
  urgencyBreakdown: Record<string, number>;
  topCategory: string;
  topSubcategory: string;
  mappedCount: number;
  unresolvedCount: number;
}

export interface StateAggregation {
  state: string;
  totalRequests: number;
  latitude: number;
  longitude: number;
  districtsCount: number;
  topCategories: { category: string; count: number; percentage: number }[];
}

export const filterRequestsByTime = (
  requests: CitizenRequest[],
  timeRange?: '7d' | '30d' | '90d' | 'all'
): CitizenRequest[] => {
  if (!timeRange || timeRange === 'all') return requests;

  const now = new Date().getTime();
  const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
  const threshold = now - days * 24 * 60 * 60 * 1000;

  return requests.filter((r) => {
    const reqTime = new Date(r.timestamp).getTime();
    return reqTime >= threshold;
  });
};

export const aggregateRequestsByDistrict = (
  requests: CitizenRequest[],
  stateFilter?: string
): DistrictAggregation[] => {
  const districtMap: Record<string, DistrictAggregation> = {};

  for (const r of requests) {
    if (stateFilter && stateFilter !== 'All' && r.state !== stateFilter) {
      continue;
    }

    const distName = r.district || 'Unspecified District';
    const stateName = r.state || 'Unspecified State';
    const key = `${distName}__${stateName}`;

    if (!districtMap[key]) {
      const centroid = DISTRICT_CENTROIDS[distName] ||
        STATE_CENTROIDS[stateName] || { latitude: 20.5937, longitude: 78.9629 };

      districtMap[key] = {
        district: distName,
        state: stateName,
        totalRequests: 0,
        latitude: centroid.latitude,
        longitude: centroid.longitude,
        categoryBreakdown: {},
        urgencyBreakdown: {},
        topCategory: r.category,
        topSubcategory: r.subcategory,
        mappedCount: 0,
        unresolvedCount: 0,
      };
    }

    const entry = districtMap[key];
    entry.totalRequests += 1;

    if (r.latitude && r.longitude && r.geoStatus !== 'UNRESOLVED') {
      entry.mappedCount += 1;
    } else {
      entry.unresolvedCount += 1;
    }

    entry.categoryBreakdown[r.category] = (entry.categoryBreakdown[r.category] || 0) + 1;
    entry.urgencyBreakdown[r.urgency] = (entry.urgencyBreakdown[r.urgency] || 0) + 1;
  }

  // Calculate top category and subcategory
  return Object.values(districtMap).map((d) => {
    let topCat = 'Other';
    let maxCatCount = 0;
    for (const [cat, count] of Object.entries(d.categoryBreakdown)) {
      if (count > maxCatCount) {
        maxCatCount = count;
        topCat = cat;
      }
    }
    return {
      ...d,
      topCategory: topCat,
    };
  });
};

export interface GeographicDemandSummary {
  locationTitle: string;
  state: string;
  district?: string;
  totalRequests: number;
  mappedRequests: number;
  unresolvedRequests: number;
  topCategories: { category: string; count: number; percentage: number }[];
  urgencyDistribution: { urgency: string; count: number; percentage: number }[];
  topSubcategories: { subcategory: string; count: number; category: string }[];
  recentTrend: { period: string; count: number }[];
}

export const computeGeographicSummary = (
  requests: CitizenRequest[],
  selectedState?: string,
  selectedDistrict?: string
): GeographicDemandSummary => {
  const filtered = requests.filter((r) => {
    if (selectedState && selectedState !== 'All' && r.state !== selectedState) return false;
    if (selectedDistrict && selectedDistrict !== 'All' && r.district !== selectedDistrict) return false;
    return true;
  });

  const total = filtered.length;
  let mapped = 0;
  let unresolved = 0;
  const catCounts: Record<string, number> = {};
  const urgencyCounts: Record<string, number> = {};
  const subcatCounts: Record<string, { count: number; category: string }> = {};

  for (const r of filtered) {
    if (r.latitude && r.longitude && r.geoStatus !== 'UNRESOLVED') {
      mapped += 1;
    } else {
      unresolved += 1;
    }

    catCounts[r.category] = (catCounts[r.category] || 0) + 1;
    urgencyCounts[r.urgency] = (urgencyCounts[r.urgency] || 0) + 1;

    if (!subcatCounts[r.subcategory]) {
      subcatCounts[r.subcategory] = { count: 0, category: r.category };
    }
    subcatCounts[r.subcategory].count += 1;
  }

  const topCategories = Object.entries(catCounts)
    .map(([cat, count]) => ({
      category: cat,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const urgencyDistribution = ['Critical', 'High', 'Medium', 'Low'].map((urg) => {
    const count = urgencyCounts[urg] || 0;
    return {
      urgency: urg,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    };
  });

  const topSubcategories = Object.entries(subcatCounts)
    .map(([subcat, data]) => ({
      subcategory: subcat,
      count: data.count,
      category: data.category,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const title =
    selectedDistrict && selectedDistrict !== 'All'
      ? `${selectedDistrict}, ${selectedState}`
      : selectedState && selectedState !== 'All'
      ? `${selectedState}, India`
      : 'National Overview (India)';

  return {
    locationTitle: title,
    state: selectedState || 'All',
    district: selectedDistrict !== 'All' ? selectedDistrict : undefined,
    totalRequests: total,
    mappedRequests: mapped,
    unresolvedRequests: unresolved,
    topCategories,
    urgencyDistribution,
    topSubcategories,
    recentTrend: [
      { period: 'Last 7 Days', count: filterRequestsByTime(filtered, '7d').length },
      { period: 'Last 30 Days', count: filterRequestsByTime(filtered, '30d').length },
      { period: 'Last 90 Days', count: filterRequestsByTime(filtered, '90d').length },
    ],
  };
};
