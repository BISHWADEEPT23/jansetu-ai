export type InfrastructureCategory =
  | 'Water'
  | 'Sanitation'
  | 'Healthcare'
  | 'Education'
  | 'Transport'
  | 'Electricity'
  | 'Digital Connectivity'
  | 'Housing'
  | 'Agriculture'
  | 'Environment'
  | 'Public Safety'
  | 'Social Infrastructure'
  | 'Other';

export type CitizenRequestType =
  | 'New Infrastructure'
  | 'Repair'
  | 'Upgrade'
  | 'Service Improvement'
  | 'Accessibility'
  | 'Emergency'
  | 'Other';

export type RequestUrgency = 'Low' | 'Medium' | 'High' | 'Critical';

export type RequestStatus =
  | 'Submitted'
  | 'Under Analysis'
  | 'Clustered'
  | 'Reviewed'
  | 'SUBMITTED'
  | 'UNDER_ANALYSIS'
  | 'CLUSTERED'
  | 'REVIEWED';

export type InputMethod = 'TEXT' | 'VOICE';

export type DataOrigin = 'PROTOTYPE_USER' | 'DEMO_SYNTHETIC' | 'PUBLIC_DATASET';

export type SourceChannel = 'WEB' | 'MOBILE_WEB' | 'MESSAGING' | 'KIOSK' | 'OTHER';

export type GeoStatus = 'VERIFIED' | 'APPROXIMATE' | 'UNRESOLVED';

export type GeoSource =
  | 'USER_MAP_SELECTION'
  | 'GEOCODED_LOCATION'
  | 'ADMINISTRATIVE_CENTROID'
  | 'UNKNOWN';

export interface LocationGeoData {
  countryCode: string;
  country: string;
  state: string | null;
  stateCode: string | null;
  district: string | null;
  districtCode: string | null;
  locality: string | null;
  latitude: number | null;
  longitude: number | null;
  geoStatus: GeoStatus;
  geoSource: GeoSource;
}

export interface LocationData {
  countryCode?: string;
  country: string;
  state: string | null;
  district: string | null;
  locality: string | null;
  latitude?: number | null;
  longitude?: number | null;
  stateCode?: string | null;
  districtCode?: string | null;
  geoStatus?: GeoStatus;
  geoSource?: GeoSource;
}

export interface DetectedSubIssue {
  category: InfrastructureCategory;
  subcategory: string;
  summary: string;
  problemStatement?: string;
  requestedIntervention?: string;
  urgency: RequestUrgency;
  requestType: CitizenRequestType;
  affectedPopulationMentioned?: number | null;
  populationMentioned?: number | null;
  distanceMentionedKm?: number | null;
}

export interface ClarificationTurn {
  turn?: number;
  question: string;
  answer: string;
}

export interface CitizenRequestAnalysis {
  detectedLanguage: string;
  originalRequest: string;
  translatedRequest: string;
  category: InfrastructureCategory;
  subcategory: string;
  requestType: CitizenRequestType;
  urgency: RequestUrgency;
  summary: string;
  problemStatement: string;
  requestedIntervention: string;
  classificationRationale: string;
  clarificationRequired: boolean;
  clarificationQuestions: string[];
  multipleIssuesDetected: boolean;
  detectedIssues?: DetectedSubIssue[];
  confidenceScore: number;
  // Numerical & Demographic Extractions (Strictly distinguished)
  affectedPopulationMentioned?: number | null;
  populationMentioned?: number | null;
  distanceMentionedKm?: number | null;
  householdsMentioned?: number | null;
  // Voice Intake metadata
  inputMethod?: InputMethod;
  originalTranscript?: string | null;
  selectedLanguage?: string | null;
}

export interface CitizenRequest {
  id?: string;
  requestId: string;
  publicRequestId?: string;
  timestamp: string;
  createdAt?: string | number | any;
  updatedAt?: string | number | any;
  countryCode?: string;
  country: string;
  state: string;
  district: string;
  locality: string;
  latitude?: number | null;
  longitude?: number | null;
  originalLanguage: string;
  originalRequest: string;
  translatedRequest: string;
  category: InfrastructureCategory;
  subcategory: string;
  requestType: CitizenRequestType;
  urgency: RequestUrgency;
  summary: string;
  problemStatement?: string;
  requestedIntervention?: string;
  classificationRationale?: string;
  clarificationHistory?: ClarificationTurn[];
  confidenceScore: number;
  status: RequestStatus;
  parentMultiRequestId?: string;
  clusterId?: string | null;
  // Numerical & Demographic Extractions
  affectedPopulationMentioned?: number | null;
  populationMentioned?: number | null;
  distanceMentionedKm?: number | null;
  householdsMentioned?: number | null;
  infrastructureEntity?: string | null;
  temporalContext?: string | null;
  keywords?: string[];
  // Intake channel & origin
  inputMethod?: InputMethod;
  originalTranscript?: string | null;
  selectedLanguage?: string | null;
  sourceChannel?: SourceChannel;
  dataOrigin?: DataOrigin;
  // Governance & auditability metadata
  analysisModel?: string | null;
  analysisTimestamp?: string | null;
  schemaVersion?: number;
  // Geographic Intelligence metadata (Build 05)
  location?: LocationGeoData;
  geoStatus?: GeoStatus;
  geoSource?: GeoSource;
}

export interface RequestFilterOptions {
  state?: string;
  district?: string;
  category?: string;
  urgency?: string;
  status?: string;
  dataOrigin?: string;
  searchQuery?: string;
  timeRange?: '7d' | '30d' | '90d' | 'all';
  geoStatus?: string;
  clusterId?: string;
}

export type ClusterStatus = 'ACTIVE' | 'NEEDS_REVIEW' | 'ARCHIVED' | 'CONFIRMED';

export interface ClusterUrgencyDistribution {
  LOW: number;
  MEDIUM: number;
  HIGH: number;
  CRITICAL: number;
}

export interface DemandCluster {
  id?: string;
  clusterId: string;
  createdAt: string;
  updatedAt: string;
  clusterStatus: ClusterStatus;
  status?: ClusterStatus; // Convenience alias
  countryCode: string;
  state: string | null;
  district: string | null;
  locality: string | null;
  latitude: number | null;
  longitude: number | null;
  centroidLatitude?: number | null; // Geographic centroid alias
  centroidLongitude?: number | null;
  category: string;
  subcategory: string;
  canonicalProblem: string;
  canonicalDemand: string;
  infrastructureEntity: string | null;
  requestCount: number;
  memberRequestIds: string[];
  firstReportedAt: string;
  lastReportedAt: string;
  languagesRepresented: string[];
  urgencyDistribution: ClusterUrgencyDistribution;
  urgencyBreakdown?: Record<string, number>;
  averageClassificationConfidence: number;
  clusteringConfidence: number;
  averageSimilarityScore?: number;
  clusteringMethod: string;
  clusteringRationale?: string;
  dataOrigin: string;
  schemaVersion: number;
  // Trend signal calculations (Deterministic, not AI arithmetic)
  trendSignal?: 'RISING' | 'STABLE' | 'FALLING';
  growthPercentage?: number;
  reportsThisWeek?: number;
  reportsPreviousWeek?: number;
  isEmergingDemand?: boolean;
}

export type ClusterAuditAction =
  | 'CREATE'
  | 'ADD_REQUEST'
  | 'CONFIRM'
  | 'SEPARATE'
  | 'MERGE'
  | 'STATUS_CHANGE';

export type ClusterActorType = 'SYSTEM' | 'ADMIN';

export interface ClusterAuditEvent {
  id?: string;
  eventId: string;
  clusterId: string;
  timestamp: string;
  action: ClusterAuditAction;
  actionType?: string; // UI alias
  previousState?: any;
  newState?: any;
  actorType: ClusterActorType;
  performedBy?: string; // UI alias
  reason?: string;
  notes?: string; // UI alias
}

export interface ClusterFilterOptions {
  status?: ClusterStatus | 'ALL' | 'All';
  category?: string;
  state?: string;
  district?: string;
  searchQuery?: string;
  emergingOnly?: boolean;
  urgency?: string;
  trend?: 'RISING' | 'STABLE' | 'FALLING' | 'ALL' | 'All';
  dataOrigin?: string;
}

export interface EmergingDemandSummary {
  clusterId: string;
  title: string;
  category: string;
  state: string | null;
  district: string | null;
  locality: string | null;
  reportsThisWeek: number;
  reportsPreviousWeek: number;
  growthPercentage: number;
  trendLabel: string;
  clusteringConfidence: number;
  totalRequests: number;
}

export interface DashboardKPIData {
  totalRequests: number;
  highPriorityRequests: number;
  criticalRequests: number;
  districtsRepresented: number;
  activeClustersCount: number;
  emergingDemandsCount: number;
  needsReviewClustersCount: number;
  mostReportedCategory: string;
  categoryDistribution: { name: string; count: number }[];
  urgencyDistribution: { name: string; count: number }[];
  topNeeds: { category: string; subcategory: string; count: number; topUrgency: string }[];
}
