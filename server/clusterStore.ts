import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import type {
  DemandCluster,
  ClusterAuditEvent,
  ClusterFilterOptions,
  EmergingDemandSummary,
} from '../src/types/citizenRequest.ts';
import { cleanObject, calculateClusterTrends } from './clusteringService.ts';

let dbInstance: Firestore | null = null;

function getServerDb(): Firestore | null {
  if (dbInstance) return dbInstance;
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (!fs.existsSync(configPath)) {
      return null;
    }
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const app = !getApps().length ? initializeApp(config) : getApp();
    dbInstance = getFirestore(app, config.firestoreDatabaseId);
    return dbInstance;
  } catch {
    return null;
  }
}

// Initial benchmark clusters reflecting citizen demand aggregation
export const DEMO_BENCHMARK_CLUSTERS: DemandCluster[] = [
  {
    clusterId: 'CLUSTER-IN-2026-HC01WD',
    createdAt: '2026-09-01T08:00:00.000Z',
    updatedAt: '2026-09-18T16:30:00.000Z',
    clusterStatus: 'ACTIVE',
    countryCode: 'IN',
    state: 'Maharashtra',
    district: 'Wardha',
    locality: 'Seloo Block',
    latitude: 20.8356,
    longitude: 78.7056,
    category: 'Healthcare',
    subcategory: 'Primary Healthcare Facility Access & Emergency Transport',
    canonicalProblem:
      'Residents across Seloo Block report complete absence of functional Primary Health Centre (PHC) doctors and emergency ambulance transport, forcing patients and pregnant women to travel 30+ km to Wardha district hospital for basic care.',
    canonicalDemand:
      'Operationalization of 24x7 Primary Health Centre with medical staff, essential diagnostic kits, and dedicated emergency ambulance coverage for rural villages.',
    infrastructureEntity: 'Seloo Rural Primary Health Centre',
    requestCount: 428,
    memberRequestIds: [
      'JS-IN-2026-000018',
      'JS-IN-2026-000019',
      'JS-IN-2026-000020',
      'JS-IN-2026-000021',
    ],
    firstReportedAt: '2026-09-01T08:00:00.000Z',
    lastReportedAt: '2026-09-18T16:30:00.000Z',
    languagesRepresented: ['Marathi', 'Hindi', 'English'],
    urgencyDistribution: {
      LOW: 14,
      MEDIUM: 52,
      HIGH: 198,
      CRITICAL: 164,
    },
    averageClassificationConfidence: 0.97,
    clusteringConfidence: 0.94,
    clusteringMethod: 'SEMANTIC_EMBEDDING_HYBRID_GEO_CONSTRAINED',
    dataOrigin: 'DEMO_SYNTHETIC',
    schemaVersion: 1,
    trendSignal: 'RISING',
    growthPercentage: 115,
    reportsThisWeek: 184,
    reportsPreviousWeek: 85,
    isEmergingDemand: true,
  },
  {
    clusterId: 'CLUSTER-IN-2026-WT02WD',
    createdAt: '2026-09-03T10:00:00.000Z',
    updatedAt: '2026-09-17T11:20:00.000Z',
    clusterStatus: 'ACTIVE',
    countryCode: 'IN',
    state: 'Maharashtra',
    district: 'Wardha',
    locality: 'Deoli Taluk',
    latitude: 20.6558,
    longitude: 78.4789,
    category: 'Water',
    subcategory: 'Piped Drinking Water Supply & Pipeline Repair',
    canonicalProblem:
      'Recurring pipeline bursts and dry overhead water reservoirs leave over 350 households without potable water for days, forcing reliance on contaminated farm borewells.',
    canonicalDemand:
      'Replacement of deteriorated distribution pipelines and installation of continuous chlorination and monitoring valves.',
    infrastructureEntity: 'Deoli Gramin Piped Water Network',
    requestCount: 317,
    memberRequestIds: ['JS-IN-2026-000011', 'JS-IN-2026-000012'],
    firstReportedAt: '2026-09-03T10:00:00.000Z',
    lastReportedAt: '2026-09-17T11:20:00.000Z',
    languagesRepresented: ['Marathi', 'Hindi'],
    urgencyDistribution: {
      LOW: 10,
      MEDIUM: 62,
      HIGH: 185,
      CRITICAL: 60,
    },
    averageClassificationConfidence: 0.95,
    clusteringConfidence: 0.92,
    clusteringMethod: 'SEMANTIC_EMBEDDING_HYBRID_GEO_CONSTRAINED',
    dataOrigin: 'DEMO_SYNTHETIC',
    schemaVersion: 1,
    trendSignal: 'STABLE',
    growthPercentage: 12,
    reportsThisWeek: 48,
    reportsPreviousWeek: 43,
    isEmergingDemand: false,
  },
  {
    clusterId: 'CLUSTER-IN-2026-TR03WD',
    createdAt: '2026-09-05T12:00:00.000Z',
    updatedAt: '2026-09-18T10:30:00.000Z',
    clusterStatus: 'ACTIVE',
    countryCode: 'IN',
    state: 'Maharashtra',
    district: 'Wardha',
    locality: 'Seloo Village',
    latitude: 20.8356,
    longitude: 78.7056,
    category: 'Transport',
    subcategory: 'Culvert & Rural Bridge Reconstruction',
    canonicalProblem:
      'Severe monsoon erosion washed away the vital masonry culvert bridge on the village arterial link road, isolating schools, agricultural transport, and medical access.',
    canonicalDemand:
      'Urgent construction of reinforced concrete high-level culvert with flood-resistant retaining embankments.',
    infrastructureEntity: 'Seloo-Hinganghat Connecting Culvert Bridge',
    requestCount: 286,
    memberRequestIds: ['JS-IN-2026-000001'],
    firstReportedAt: '2026-09-05T12:00:00.000Z',
    lastReportedAt: '2026-09-18T10:30:00.000Z',
    languagesRepresented: ['Marathi'],
    urgencyDistribution: {
      LOW: 5,
      MEDIUM: 31,
      HIGH: 110,
      CRITICAL: 140,
    },
    averageClassificationConfidence: 0.96,
    clusteringConfidence: 0.96,
    clusteringMethod: 'SEMANTIC_EMBEDDING_HYBRID_GEO_CONSTRAINED',
    dataOrigin: 'DEMO_SYNTHETIC',
    schemaVersion: 1,
    trendSignal: 'RISING',
    growthPercentage: 84,
    reportsThisWeek: 92,
    reportsPreviousWeek: 50,
    isEmergingDemand: true,
  },
  {
    clusterId: 'CLUSTER-IN-2026-HC04VN',
    createdAt: '2026-09-02T14:00:00.000Z',
    updatedAt: '2026-09-17T14:15:00.000Z',
    clusterStatus: 'ACTIVE',
    countryCode: 'IN',
    state: 'Uttar Pradesh',
    district: 'Varanasi',
    locality: 'Rohania Block',
    latitude: 25.2632,
    longitude: 82.9098,
    category: 'Healthcare',
    subcategory: 'Primary Health Centre & Emergency Response',
    canonicalProblem:
      'No resident doctor or ambulance vehicle stationed at Rohania PHC for over six months, leaving maternal and emergency patients dependent on distant city hospitals.',
    canonicalDemand:
      'Immediate deployment of medical officer, obstetric care nurses, and functional emergency ambulance service.',
    infrastructureEntity: 'Rohania Community Health Centre',
    requestCount: 142,
    memberRequestIds: ['JS-IN-2026-000002'],
    firstReportedAt: '2026-09-02T14:00:00.000Z',
    lastReportedAt: '2026-09-17T14:15:00.000Z',
    languagesRepresented: ['Hindi'],
    urgencyDistribution: {
      LOW: 4,
      MEDIUM: 20,
      HIGH: 68,
      CRITICAL: 50,
    },
    averageClassificationConfidence: 0.98,
    clusteringConfidence: 0.95,
    clusteringMethod: 'SEMANTIC_EMBEDDING_HYBRID_GEO_CONSTRAINED',
    dataOrigin: 'DEMO_SYNTHETIC',
    schemaVersion: 1,
    trendSignal: 'STABLE',
    growthPercentage: 5,
    reportsThisWeek: 21,
    reportsPreviousWeek: 20,
    isEmergingDemand: false,
  },
  {
    clusterId: 'CLUSTER-IN-2026-WT05PT',
    createdAt: '2026-09-04T09:00:00.000Z',
    updatedAt: '2026-09-16T09:00:00.000Z',
    clusterStatus: 'ACTIVE',
    countryCode: 'IN',
    state: 'Bihar',
    district: 'Patna',
    locality: 'Danapur Rural',
    latitude: 25.6297,
    longitude: 85.0444,
    category: 'Water',
    subcategory: 'Piped Drinking Water Supply',
    canonicalProblem:
      'Layed piped water distribution pipes remain completely dry for over 4 months, forcing 500 households to carry drinking water from distance of 2 kilometers.',
    canonicalDemand:
      'Commissioning of deep tube well pumping machinery and repair of distribution mainline valves.',
    infrastructureEntity: 'Danapur Jal-Nal Distribution Line',
    requestCount: 215,
    memberRequestIds: ['JS-IN-2026-000003'],
    firstReportedAt: '2026-09-04T09:00:00.000Z',
    lastReportedAt: '2026-09-16T09:00:00.000Z',
    languagesRepresented: ['Hindi'],
    urgencyDistribution: {
      LOW: 12,
      MEDIUM: 43,
      HIGH: 120,
      CRITICAL: 40,
    },
    averageClassificationConfidence: 0.95,
    clusteringConfidence: 0.91,
    clusteringMethod: 'SEMANTIC_EMBEDDING_HYBRID_GEO_CONSTRAINED',
    dataOrigin: 'DEMO_SYNTHETIC',
    schemaVersion: 1,
    trendSignal: 'STABLE',
    growthPercentage: 8,
    reportsThisWeek: 31,
    reportsPreviousWeek: 29,
    isEmergingDemand: false,
  },
  {
    clusterId: 'CLUSTER-IN-2026-SN06RV',
    createdAt: '2026-09-12T10:00:00.000Z',
    updatedAt: '2026-09-18T12:00:00.000Z',
    clusterStatus: 'NEEDS_REVIEW',
    countryCode: 'IN',
    state: 'Rajasthan',
    district: 'Jodhpur',
    locality: 'Mandore Ward 4',
    latitude: 26.2389,
    longitude: 73.0243,
    category: 'Sanitation',
    subcategory: 'Stormwater Drainage & Sewer Overflow',
    canonicalProblem:
      'Unresolved drainage blockage during flash monsoon caused street inundation and potential water contamination near community market.',
    canonicalDemand:
      'Deployment of de-silting machines and concrete drain reconstruction along market alley.',
    infrastructureEntity: 'Mandore Ward 4 Stormwater Line',
    requestCount: 38,
    memberRequestIds: ['JS-IN-2026-000006'],
    firstReportedAt: '2026-09-12T10:00:00.000Z',
    lastReportedAt: '2026-09-18T12:00:00.000Z',
    languagesRepresented: ['Hindi'],
    urgencyDistribution: {
      LOW: 3,
      MEDIUM: 10,
      HIGH: 18,
      CRITICAL: 7,
    },
    averageClassificationConfidence: 0.92,
    clusteringConfidence: 0.72, // Falls within review range (0.65 to 0.80)
    clusteringMethod: 'SEMANTIC_EMBEDDING_HYBRID_GEO_CONSTRAINED',
    dataOrigin: 'DEMO_SYNTHETIC',
    schemaVersion: 1,
    trendSignal: 'RISING',
    growthPercentage: 192,
    reportsThisWeek: 26,
    reportsPreviousWeek: 9,
    isEmergingDemand: true,
  },
];

export const INITIAL_AUDIT_EVENTS: ClusterAuditEvent[] = [
  {
    eventId: 'AUDIT-2026-00001',
    clusterId: 'CLUSTER-IN-2026-HC01WD',
    timestamp: '2026-09-01T08:00:00.000Z',
    action: 'CREATE',
    actorType: 'SYSTEM',
    reason: 'Initial semantic synthesis from verified citizen intake reports.',
  },
  {
    eventId: 'AUDIT-2026-00002',
    clusterId: 'CLUSTER-IN-2026-SN06RV',
    timestamp: '2026-09-18T12:00:00.000Z',
    action: 'STATUS_CHANGE',
    previousState: 'ACTIVE',
    newState: 'NEEDS_REVIEW',
    actorType: 'SYSTEM',
    reason: 'Clustering confidence (0.72) triggered administrative review boundary.',
  },
];

export class ClusterStore {
  private inMemoryClusters: Map<string, DemandCluster> = new Map();
  private inMemoryAudit: ClusterAuditEvent[] = [];
  private isInitialized = false;

  constructor() {
    this.seedDemoClusters();
  }

  private seedDemoClusters() {
    for (const c of DEMO_BENCHMARK_CLUSTERS) {
      this.inMemoryClusters.set(c.clusterId, { ...c });
    }
    this.inMemoryAudit = [...INITIAL_AUDIT_EVENTS];
    this.isInitialized = true;
  }

  /**
   * Retrieves all demand clusters with flexible filtering
   */
  public async getAll(filters?: ClusterFilterOptions): Promise<DemandCluster[]> {
    const list = Array.from(this.inMemoryClusters.values());

    return list.filter((c) => {
      if (filters?.status && filters.status !== 'ALL') {
        if (c.clusterStatus !== filters.status) return false;
      }
      if (filters?.category && filters.category !== 'All Categories') {
        if (c.category.toLowerCase() !== filters.category.toLowerCase()) return false;
      }
      if (filters?.state && filters.state !== 'All States') {
        if ((c.state || '').toLowerCase() !== filters.state.toLowerCase()) return false;
      }
      if (filters?.district && filters.district !== 'All Districts') {
        if ((c.district || '').toLowerCase() !== filters.district.toLowerCase()) return false;
      }
      if (filters?.emergingOnly) {
        if (!c.isEmergingDemand) return false;
      }
      if (filters?.searchQuery?.trim()) {
        const q = filters.searchQuery.toLowerCase().trim();
        const matches =
          c.canonicalProblem.toLowerCase().includes(q) ||
          c.canonicalDemand.toLowerCase().includes(q) ||
          (c.infrastructureEntity || '').toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          c.subcategory.toLowerCase().includes(q) ||
          (c.locality || '').toLowerCase().includes(q) ||
          (c.district || '').toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }

  /**
   * Retrieve single cluster by ID
   */
  public async getById(clusterId: string): Promise<DemandCluster | null> {
    const cluster = this.inMemoryClusters.get(clusterId);
    if (!cluster) return null;
    return { ...cluster };
  }

  /**
   * Save or update a cluster in memory and Firestore
   */
  public async save(cluster: DemandCluster, reason?: string): Promise<DemandCluster> {
    const cleaned = cleanObject(cluster);
    this.inMemoryClusters.set(cleaned.clusterId, cleaned);

    // Record audit event
    const auditEvent: ClusterAuditEvent = {
      eventId: `AUDIT-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      clusterId: cleaned.clusterId,
      timestamp: new Date().toISOString(),
      action: 'ADD_REQUEST',
      newState: cleaned.clusterStatus,
      actorType: 'SYSTEM',
      reason: reason || 'Citizen request integrated into demand cluster.',
    };
    this.inMemoryAudit.unshift(auditEvent);

    // Sync to Firestore if available
    const db = getServerDb();
    if (db) {
      try {
        await setDoc(doc(db, 'demandClusters', cleaned.clusterId), cleaned, { merge: true });
        await setDoc(doc(db, 'clusterAuditEvents', auditEvent.eventId), auditEvent);
      } catch (err: any) {
        console.warn('[Server ClusterStore] Firestore sync notice:', err?.message || err);
      }
    }

    return cleaned;
  }

  /**
   * Administrative Action: Confirm cluster (NEEDS_REVIEW -> ACTIVE)
   */
  public async confirmCluster(
    clusterId: string,
    adminUser: string = 'ADMIN',
    reason: string = 'Administrative review confirmed cluster validity.'
  ): Promise<DemandCluster | null> {
    const cluster = this.inMemoryClusters.get(clusterId);
    if (!cluster) return null;

    const previousStatus = cluster.clusterStatus;
    cluster.clusterStatus = 'ACTIVE';
    cluster.updatedAt = new Date().toISOString();
    this.inMemoryClusters.set(clusterId, cluster);

    const auditEvent: ClusterAuditEvent = {
      eventId: `AUDIT-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      clusterId,
      timestamp: new Date().toISOString(),
      action: 'CONFIRM',
      previousState: previousStatus,
      newState: 'ACTIVE',
      actorType: 'ADMIN',
      reason: `${adminUser}: ${reason}`,
    };
    this.inMemoryAudit.unshift(auditEvent);

    const db = getServerDb();
    if (db) {
      try {
        await updateDoc(doc(db, 'demandClusters', clusterId), {
          clusterStatus: 'ACTIVE',
          updatedAt: cluster.updatedAt,
        });
        await setDoc(doc(db, 'clusterAuditEvents', auditEvent.eventId), auditEvent);
      } catch (err) {
        console.warn('[ClusterStore] Firestore confirm update error:', err);
      }
    }

    return { ...cluster };
  }

  /**
   * Administrative Action: Separate request from cluster
   */
  public async separateRequest(
    clusterId: string,
    requestId: string,
    adminUser: string = 'ADMIN',
    reason: string = 'Separated by policymaker review due to distinct operational requirements.'
  ): Promise<{ sourceCluster: DemandCluster; newCluster: DemandCluster } | null> {
    const cluster = this.inMemoryClusters.get(clusterId);
    if (!cluster) return null;

    // Remove from source
    cluster.memberRequestIds = cluster.memberRequestIds.filter((id) => id !== requestId);
    cluster.requestCount = Math.max(1, cluster.memberRequestIds.length);
    cluster.updatedAt = new Date().toISOString();
    this.inMemoryClusters.set(clusterId, cluster);

    // Create separated cluster
    const newClusterId = `CLUSTER-IN-${new Date().getFullYear()}-SEP${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const newCluster: DemandCluster = {
      ...cluster,
      clusterId: newClusterId,
      canonicalProblem: `[Separated Need] ${cluster.canonicalProblem}`,
      canonicalDemand: `[Specialized Requirement] ${cluster.canonicalDemand}`,
      memberRequestIds: [requestId],
      requestCount: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      clusterStatus: 'ACTIVE',
    };
    this.inMemoryClusters.set(newClusterId, newCluster);

    const auditEvent: ClusterAuditEvent = {
      eventId: `AUDIT-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      clusterId,
      timestamp: new Date().toISOString(),
      action: 'SEPARATE',
      previousState: { memberCount: cluster.memberRequestIds.length + 1 },
      newState: { separatedClusterId: newClusterId, memberCount: cluster.memberRequestIds.length },
      actorType: 'ADMIN',
      reason: `${adminUser}: ${reason}`,
    };
    this.inMemoryAudit.unshift(auditEvent);

    return { sourceCluster: { ...cluster }, newCluster };
  }

  /**
   * Administrative Action: Merge two clusters
   */
  public async mergeClusters(
    sourceClusterId: string,
    targetClusterId: string,
    adminUser: string = 'ADMIN',
    reason: string = 'Administrative merge of overlapping demand clusters.'
  ): Promise<DemandCluster | null> {
    const source = this.inMemoryClusters.get(sourceClusterId);
    const target = this.inMemoryClusters.get(targetClusterId);
    if (!source || !target) return null;

    // Merge members & languages
    target.memberRequestIds = Array.from(new Set([...target.memberRequestIds, ...source.memberRequestIds]));
    target.languagesRepresented = Array.from(
      new Set([...target.languagesRepresented, ...source.languagesRepresented])
    );
    target.requestCount = target.memberRequestIds.length;
    target.urgencyDistribution.LOW += source.urgencyDistribution.LOW;
    target.urgencyDistribution.MEDIUM += source.urgencyDistribution.MEDIUM;
    target.urgencyDistribution.HIGH += source.urgencyDistribution.HIGH;
    target.urgencyDistribution.CRITICAL += source.urgencyDistribution.CRITICAL;
    target.updatedAt = new Date().toISOString();

    // Archive source
    source.clusterStatus = 'ARCHIVED';
    source.updatedAt = new Date().toISOString();

    this.inMemoryClusters.set(targetClusterId, target);
    this.inMemoryClusters.set(sourceClusterId, source);

    const auditEvent: ClusterAuditEvent = {
      eventId: `AUDIT-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      clusterId: targetClusterId,
      timestamp: new Date().toISOString(),
      action: 'MERGE',
      previousState: { sourceClusterId, archived: true },
      newState: { targetRequestCount: target.requestCount },
      actorType: 'ADMIN',
      reason: `${adminUser}: ${reason}`,
    };
    this.inMemoryAudit.unshift(auditEvent);

    return { ...target };
  }

  /**
   * Get audit events for all or specific cluster
   */
  public async getAuditEvents(clusterId?: string): Promise<ClusterAuditEvent[]> {
    if (!clusterId) return [...this.inMemoryAudit];
    return this.inMemoryAudit.filter((e) => e.clusterId === clusterId);
  }

  /**
   * Emerging demands: clusters with rapid week-over-week acceleration
   */
  public async getEmergingDemands(): Promise<EmergingDemandSummary[]> {
    const clusters = Array.from(this.inMemoryClusters.values()).filter(
      (c) => c.clusterStatus !== 'ARCHIVED' && (c.isEmergingDemand || (c.growthPercentage || 0) >= 50)
    );

    return clusters
      .sort((a, b) => (b.growthPercentage || 0) - (a.growthPercentage || 0))
      .map((c) => ({
        clusterId: c.clusterId,
        title: c.subcategory || `${c.category} Access`,
        category: c.category,
        state: c.state,
        district: c.district,
        locality: c.locality,
        reportsThisWeek: c.reportsThisWeek || Math.ceil(c.requestCount * 0.4),
        reportsPreviousWeek: c.reportsPreviousWeek || Math.ceil(c.requestCount * 0.2),
        growthPercentage: c.growthPercentage || 100,
        trendLabel: 'Rapidly rising citizen demand',
        clusteringConfidence: c.clusteringConfidence,
        totalRequests: c.requestCount,
      }));
  }

  /**
   * Calculate KPIs
   */
  public async getClusterKPIs() {
    const all = Array.from(this.inMemoryClusters.values()).filter((c) => c.clusterStatus !== 'ARCHIVED');
    const activeClustersCount = all.filter((c) => c.clusterStatus === 'ACTIVE').length;
    const needsReviewClustersCount = all.filter((c) => c.clusterStatus === 'NEEDS_REVIEW').length;
    const emergingDemandsCount = all.filter((c) => c.isEmergingDemand || (c.growthPercentage || 0) >= 50).length;

    const catCounts: Record<string, number> = {};
    for (const c of all) {
      catCounts[c.category] = (catCounts[c.category] || 0) + c.requestCount;
    }

    let mostReportedCategory = 'Healthcare';
    let max = -1;
    for (const [cat, count] of Object.entries(catCounts)) {
      if (count > max) {
        max = count;
        mostReportedCategory = cat;
      }
    }

    return {
      activeClustersCount,
      needsReviewClustersCount,
      emergingDemandsCount,
      mostReportedCategory,
    };
  }
}

export const clusterStore = new ClusterStore();
