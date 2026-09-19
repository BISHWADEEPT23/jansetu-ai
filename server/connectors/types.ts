import type {
  DatasetSource,
  GeographicEvidence,
  PublicProject,
} from '../../src/types/evidence.ts';

export interface PublicDataConnector {
  readonly connectorId: string;
  readonly connectorName: string;
  readonly supportedGeographicLevels: string[];

  getDatasetSources(): Promise<DatasetSource[]>;
  fetchGeographicEvidence(geographyId: string): Promise<Partial<GeographicEvidence> | null>;
  fetchPublicProjects?(geographyId: string): Promise<PublicProject[]>;
}
