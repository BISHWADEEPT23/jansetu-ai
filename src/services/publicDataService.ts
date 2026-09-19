import type {
  DatasetSource,
  GeographicEvidence,
  PublicProject,
} from '../types/evidence.ts';

/**
 * Public Data Service (Client-side)
 * Connects to the server-side Public Data Connectors and Dataset Registry.
 */
export const publicDataService = {
  /**
   * Retrieves registered dataset sources (Government Open Data, Census, JJMIS, Synthetic Demo).
   */
  async getDatasetSources(): Promise<DatasetSource[]> {
    try {
      const res = await fetch('/api/datasets');
      if (!res.ok) throw new Error('Failed to fetch dataset sources');
      const data = await res.json();
      return data.sources || [];
    } catch (e) {
      console.warn('[PublicDataService] getDatasetSources error:', e);
      return [];
    }
  },

  /**
   * Retrieves geographic evidence for a specific state and district.
   */
  async getGeographicEvidence(state?: string, district?: string): Promise<GeographicEvidence | null> {
    try {
      const params = new URLSearchParams();
      if (state && state !== 'All') params.append('state', state);
      if (district && district !== 'All') params.append('district', district);

      const res = await fetch(`/api/evidence?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch geographic evidence');
      const data = await res.json();
      return data.evidence || null;
    } catch (e) {
      console.warn('[PublicDataService] getGeographicEvidence error:', e);
      return null;
    }
  },

  /**
   * Retrieves registered public capital projects.
   */
  async getPublicProjects(geographyId?: string, category?: string): Promise<PublicProject[]> {
    try {
      const params = new URLSearchParams();
      if (geographyId) params.append('geographyId', geographyId);
      if (category && category !== 'All') params.append('category', category);

      const res = await fetch(`/api/evidence/projects?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch public projects');
      const data = await res.json();
      return data.projects || [];
    } catch (e) {
      console.warn('[PublicDataService] getPublicProjects error:', e);
      return [];
    }
  },
};
