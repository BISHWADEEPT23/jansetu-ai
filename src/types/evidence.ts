/**
 * JanSetu AI — Verified Evidence & Infrastructure Gap Types (Build 07)
 * Strictly separates:
 * 1. Citizen Reported Data
 * 2. Verified / Public Data
 * 3. Synthetic Demo Data
 * 4. AI-Generated Interpretation
 */

export type DatasetSourceType =
  | 'GOVERNMENT'
  | 'INTERNATIONAL'
  | 'OPEN_DATA'
  | 'DEMO_SYNTHETIC';

export type GeographicLevel =
  | 'NATIONAL'
  | 'STATE'
  | 'DISTRICT'
  | 'LOCAL';

export type EvidenceQuality =
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW'
  | 'UNKNOWN';

export type GapLevel =
  | 'INSUFFICIENT_EVIDENCE'
  | 'LOW'
  | 'MODERATE'
  | 'HIGH'
  | 'SEVERE';

export type PublicProjectStatus =
  | 'PLANNED'
  | 'APPROVED'
  | 'UNDER_IMPLEMENTATION'
  | 'COMPLETED'
  | 'UNKNOWN';

/**
 * Dataset Registry Model
 * Metadata for tracking public datasets, government registries, and demo synthetic sets.
 */
export interface DatasetSource {
  sourceId: string;
  name: string;
  provider: string;
  description: string;
  sourceType: DatasetSourceType;
  sourceUrl: string | null;
  geographicLevel: GeographicLevel;
  lastUpdated: string | null;
  retrievedAt: string | null;
  license: string | null;
  methodologyNotes: string | null;
  isSynthetic: boolean;
}

/**
 * Data Provenance Model
 * Encapsulates an individual evidence field with its lineage, reference period, and quality.
 */
export interface EvidenceValue<T> {
  value: T | null;
  sourceId: string | null;
  referencePeriod: string | null;
  geographicLevel: GeographicLevel;
  isSynthetic: boolean;
  quality: EvidenceQuality;
}

/**
 * Normalized Geographic Evidence Model
 * Missing data MUST remain null, never converted to 0.
 */
export interface GeographicEvidence {
  geographyId: string; // e.g. "IN-MH-WARDHA"
  countryCode: string; // "IN"
  state: string | null;
  district: string | null;
  population: number | null;
  areaKm2: number | null;
  populationDensity: number | null;
  demographicYear: number | null;

  healthcare: {
    hospitals: number | null;
    primaryHealthCentres: number | null;
    beds: number | null;
  };

  education: {
    schools: number | null;
    higherEducationFacilities: number | null;
  };

  water: {
    coveragePercent: number | null;
  };

  sanitation: {
    coveragePercent: number | null;
  };

  electricity: {
    coveragePercent: number | null;
  };

  digitalConnectivity: {
    indicator: number | null; // e.g. 4G/5G mobile tower penetration percentage
  };

  transport: {
    roadIndicator: number | null; // e.g. all-weather road connectivity percentage
  };

  socioeconomic: {
    relevantIndicators: Record<string, any>;
  };

  sourceReferences: string[];
  dataQuality: EvidenceQuality;
  schemaVersion: number;
}

/**
 * Public Capital Investment Project
 * Answers: "Is government already addressing this demand?"
 */
export interface PublicProject {
  projectId: string;
  projectName: string;
  category: string;
  geographyId: string;
  implementingAgency: string | null;
  projectStatus: PublicProjectStatus;
  budgetAmount: number | null;
  currency: string | null;
  startDate: string | null;
  expectedCompletion: string | null;
  sourceId: string;
  isSynthetic: boolean;
}

/**
 * Disagreement / Conflicting Data representation
 */
export interface ConflictingSourceItem {
  indicator: string;
  sourceA: {
    name: string;
    value: any;
    sourceId: string;
    referencePeriod: string | null;
  };
  sourceB: {
    name: string;
    value: any;
    sourceId: string;
    referencePeriod: string | null;
  };
  notes: string;
}

/**
 * Single indicator contributing to the gap assessment
 */
export interface GapIndicator {
  name: string;
  value: number | string | null;
  benchmark?: number | string | null;
  difference?: number | string | null;
  unit?: string;
  sourceId: string;
  referencePeriod: string | null;
  isSynthetic?: boolean;
}

/**
 * Infrastructure Gap Assessment Model
 * Deterministic comparison between Citizen Demand and Verified/Synthetic Evidence.
 */
export interface InfrastructureGapAssessment {
  assessmentId: string;
  geographyId: string;
  clusterId: string;
  category: string;
  canonicalProblem?: string;
  state: string | null;
  district: string | null;
  latitude?: number | null;
  longitude?: number | null;
  evidenceAvailable: boolean;
  demandRequestCount: number;
  trendSignal?: 'RISING' | 'STABLE' | 'FALLING';
  growthPercentage?: number;

  indicators: GapIndicator[];

  gapLevel: GapLevel;
  rationale: string;
  evidenceQuality: EvidenceQuality;

  conflictingSources?: ConflictingSourceItem[];
  relatedProjects?: PublicProject[];

  generatedAt: string;
  schemaVersion: number;
}

/**
 * Evidence Coverage KPI
 */
export interface EvidenceCoverageKPI {
  totalClusters: number;
  assessedClusters: number;
  sufficientEvidenceClusters: number;
  insufficientEvidenceClusters: number;
  coveragePercentage: number;
}
