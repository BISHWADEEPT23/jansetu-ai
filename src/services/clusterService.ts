import type {
  DemandCluster,
  ClusterFilterOptions,
  ClusterAuditEvent,
  CitizenRequest,
} from '../types/citizenRequest.ts';

class ClusterService {
  async getClusters(filters?: ClusterFilterOptions): Promise<DemandCluster[]> {
    const params = new URLSearchParams();
    if (filters?.state && filters.state !== 'All') params.append('state', filters.state);
    if (filters?.district && filters.district !== 'All') params.append('district', filters.district);
    if (filters?.category && filters.category !== 'All') params.append('category', filters.category);
    if (filters?.status && (filters.status as string) !== 'All' && (filters.status as string) !== 'ALL') {
      params.append('status', filters.status);
    }
    if (filters?.urgency && filters.urgency !== 'All') params.append('urgency', filters.urgency);
    if (filters?.trend && (filters.trend as string) !== 'All' && (filters.trend as string) !== 'ALL') {
      params.append('trend', filters.trend);
    }
    if (filters?.searchQuery) params.append('searchQuery', filters.searchQuery);
    if (filters?.dataOrigin && filters.dataOrigin !== 'All') params.append('dataOrigin', filters.dataOrigin);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`/api/clusters${queryString}`);

    if (!res.ok) {
      throw new Error(`Failed to fetch demand clusters: ${res.statusText}`);
    }

    const data = await res.json();
    return data.clusters || [];
  }

  async getEmergingClusters(): Promise<DemandCluster[]> {
    const res = await fetch('/api/clusters/emerging');
    if (!res.ok) {
      throw new Error(`Failed to fetch emerging clusters: ${res.statusText}`);
    }
    const data = await res.json();
    return data.emergingClusters || [];
  }

  async getClusterById(id: string): Promise<{ cluster: DemandCluster; memberRequests: CitizenRequest[] }> {
    const res = await fetch(`/api/clusters/${encodeURIComponent(id)}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch cluster details for ${id}`);
    }
    const data = await res.json();
    return {
      cluster: data.cluster,
      memberRequests: data.memberRequests || [],
    };
  }

  async getClusterAuditTrail(id: string): Promise<ClusterAuditEvent[]> {
    const res = await fetch(`/api/clusters/${encodeURIComponent(id)}/audit`);
    if (!res.ok) {
      throw new Error(`Failed to fetch cluster audit trail for ${id}`);
    }
    const data = await res.json();
    return data.auditTrail || [];
  }

  async confirmCluster(id: string, reviewerNotes?: string, reviewerId?: string): Promise<DemandCluster> {
    const res = await fetch(`/api/clusters/${encodeURIComponent(id)}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewerNotes, reviewerId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to confirm cluster ${id}`);
    }

    const data = await res.json();
    return data.cluster;
  }

  async separateRequest(
    id: string,
    requestId: string,
    reason?: string,
    reviewerId?: string
  ): Promise<{ originalCluster: DemandCluster; newCluster: DemandCluster }> {
    const res = await fetch(`/api/clusters/${encodeURIComponent(id)}/separate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, reason, reviewerId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to separate request ${requestId} from cluster ${id}`);
    }

    const data = await res.json();
    return {
      originalCluster: data.originalCluster,
      newCluster: data.newCluster,
    };
  }

  async mergeClusters(
    primaryClusterId: string,
    secondaryClusterId: string,
    reason?: string,
    reviewerId?: string
  ): Promise<DemandCluster> {
    const res = await fetch('/api/clusters/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ primaryClusterId, secondaryClusterId, reason, reviewerId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to merge clusters ${primaryClusterId} and ${secondaryClusterId}`);
    }

    const data = await res.json();
    return data.cluster;
  }
}

export const clusterService = new ClusterService();
