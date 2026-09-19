import type {
  CitizenRequest,
  DashboardKPIData,
  RequestFilterOptions,
  RequestStatus,
} from '../types/citizenRequest.ts';

export interface SubmitRequestPayload {
  country: string;
  state: string | null;
  district: string | null;
  locality: string | null;
  originalLanguage: string;
  originalRequest: string;
  translatedRequest: string;
  category: any;
  subcategory: string;
  requestType: any;
  urgency: any;
  summary: string;
  problemStatement?: string;
  requestedIntervention?: string;
  classificationRationale?: string;
  clarificationHistory?: any[];
  confidenceScore: number;
  inputMethod?: 'TEXT' | 'VOICE';
  originalTranscript?: string | null;
  selectedLanguage?: string | null;
  affectedPopulationMentioned?: number | null;
  populationMentioned?: number | null;
  distanceMentionedKm?: number | null;
  householdsMentioned?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  geoStatus?: any;
  geoSource?: any;
  location?: any;
}

/**
 * Interface definition for pluggable backend adapters (e.g. Firebase Firestore).
 * Enables drop-in replacement of REST API with Firestore SDK without changing UI components.
 */
export interface IRequestRepository {
  getRequests(filters?: RequestFilterOptions): Promise<CitizenRequest[]>;
  createRequest(payload: SubmitRequestPayload): Promise<CitizenRequest>;
  createBatchRequests(payloads: SubmitRequestPayload[]): Promise<{ requests: CitizenRequest[]; parentMultiRequestId: string }>;
  updateStatus(id: string, status: RequestStatus): Promise<CitizenRequest>;
  getKPIs(): Promise<DashboardKPIData>;
}

class ApiRequestService implements IRequestRepository {
  async getRequests(filters?: RequestFilterOptions): Promise<CitizenRequest[]> {
    const params = new URLSearchParams();
    if (filters?.state && filters.state !== 'All') params.append('state', filters.state);
    if (filters?.district && filters.district !== 'All') params.append('district', filters.district);
    if (filters?.category && filters.category !== 'All') params.append('category', filters.category);
    if (filters?.urgency && filters.urgency !== 'All') params.append('urgency', filters.urgency);
    if (filters?.status && filters.status !== 'All') params.append('status', filters.status);
    if (filters?.dataOrigin && filters.dataOrigin !== 'All') params.append('dataOrigin', filters.dataOrigin);
    if (filters?.geoStatus && filters.geoStatus !== 'All') params.append('geoStatus', filters.geoStatus);
    if (filters?.searchQuery) params.append('searchQuery', filters.searchQuery);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`/api/requests${queryString}`);

    if (!res.ok) {
      throw new Error(`Failed to fetch requests: ${res.statusText}`);
    }

    const data = await res.json();
    return data.requests || [];
  }

  async createRequest(payload: SubmitRequestPayload): Promise<CitizenRequest> {
    const res = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to submit citizen request');
    }

    const data = await res.json();
    return data.request;
  }

  async createBatchRequests(
    payloads: SubmitRequestPayload[]
  ): Promise<{ requests: CitizenRequest[]; parentMultiRequestId: string }> {
    const res = await fetch('/api/requests/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: payloads }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to submit batch citizen requests');
    }

    const data = await res.json();
    return {
      requests: data.requests || [],
      parentMultiRequestId: data.parentMultiRequestId || '',
    };
  }

  async updateStatus(id: string, status: RequestStatus): Promise<CitizenRequest> {
    const res = await fetch(`/api/requests/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      throw new Error(`Failed to update status for ${id}`);
    }

    const data = await res.json();
    return data.request;
  }

  async getKPIs(): Promise<DashboardKPIData> {
    const res = await fetch('/api/kpis');
    if (!res.ok) {
      throw new Error('Failed to load dashboard KPIs');
    }
    const data = await res.json();
    return data.kpis;
  }
}

export const requestService = new ApiRequestService();
