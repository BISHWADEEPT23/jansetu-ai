import type {
  EvidenceCoverageKPI,
  GapLevel,
  InfrastructureGapAssessment,
} from '../types/evidence.ts';

export interface GapFilterOptions {
  state?: string;
  district?: string;
  category?: string;
  gapLevel?: GapLevel | 'ALL' | 'All';
  evidenceQuality?: string;
  searchQuery?: string;
}

/**
 * Infrastructure Gap Service (Client-side)
 * Manages access to deterministic infrastructure gap assessments and coverage KPIs.
 */
export const infrastructureGapService = {
  /**
   * Retrieves all evaluated infrastructure gaps, optionally filtered.
   */
  async getGapAssessments(filters?: GapFilterOptions): Promise<InfrastructureGapAssessment[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.state && filters.state !== 'All') params.append('state', filters.state);
      if (filters?.district && filters.district !== 'All') params.append('district', filters.district);
      if (filters?.category && filters.category !== 'All') params.append('category', filters.category);
      if (filters?.gapLevel && (filters.gapLevel as string) !== 'ALL' && (filters.gapLevel as string) !== 'All') {
        params.append('gapLevel', filters.gapLevel);
      }
      if (filters?.evidenceQuality && filters.evidenceQuality !== 'ALL' && filters.evidenceQuality !== 'All') {
        params.append('evidenceQuality', filters.evidenceQuality);
      }
      if (filters?.searchQuery) params.append('searchQuery', filters.searchQuery);

      const res = await fetch(`/api/gaps?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch infrastructure gap assessments');
      const data = await res.json();
      return data.assessments || [];
    } catch (e) {
      console.warn('[InfrastructureGapService] getGapAssessments error:', e);
      return [];
    }
  },

  /**
   * Retrieves gap assessment for a single cluster.
   */
  async getClusterGapAssessment(clusterId: string): Promise<InfrastructureGapAssessment | null> {
    try {
      const res = await fetch(`/api/gaps/${encodeURIComponent(clusterId)}`);
      if (!res.ok) throw new Error(`Failed to fetch gap assessment for cluster ${clusterId}`);
      const data = await res.json();
      return data.assessment || null;
    } catch (e) {
      console.warn(`[InfrastructureGapService] getClusterGapAssessment error for ${clusterId}:`, e);
      return null;
    }
  },

  /**
   * Retrieves the deterministic Evidence Coverage KPI.
   */
  async getEvidenceCoverageKPI(): Promise<EvidenceCoverageKPI> {
    try {
      const res = await fetch('/api/gaps/kpis/coverage');
      if (!res.ok) throw new Error('Failed to fetch evidence coverage KPI');
      const data = await res.json();
      return data.kpi || {
        totalClusters: 0,
        assessedClusters: 0,
        sufficientEvidenceClusters: 0,
        insufficientEvidenceClusters: 0,
        coveragePercentage: 0,
      };
    } catch (e) {
      console.warn('[InfrastructureGapService] getEvidenceCoverageKPI error:', e);
      return {
        totalClusters: 0,
        assessedClusters: 0,
        sufficientEvidenceClusters: 0,
        insufficientEvidenceClusters: 0,
        coveragePercentage: 0,
      };
    }
  },
};
