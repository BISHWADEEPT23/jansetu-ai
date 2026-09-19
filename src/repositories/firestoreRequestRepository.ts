import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { getDb } from '../services/firebaseClient.ts';
import type {
  CitizenRequest,
  DashboardKPIData,
  RequestFilterOptions,
  RequestStatus,
  DataOrigin,
} from '../types/citizenRequest.ts';

export const CITIZEN_REQUESTS_COLLECTION = 'citizenRequests';

export interface FirestoreCitizenRequestDoc {
  id: string;
  publicRequestId: string;
  createdAt: any;
  updatedAt: any;
  countryCode: string;
  country: string;
  state: string | null;
  district: string | null;
  locality: string | null;
  latitude: number | null;
  longitude: number | null;
  inputMethod: 'TEXT' | 'VOICE';
  originalLanguage: string;
  originalRequest: string;
  originalTranscript: string | null;
  translatedRequest: string;
  category: string;
  subcategory: string;
  requestType: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  problemStatement: string;
  requestedIntervention: string;
  infrastructureEntity: string | null;
  affectedPopulationMentioned: number | null;
  distanceMentionedKm: number | null;
  temporalContext: string | null;
  summary: string;
  keywords: string[];
  confidenceScore: number;
  status: 'SUBMITTED' | 'UNDER_ANALYSIS' | 'CLUSTERED' | 'REVIEWED';
  clusterId: string | null;
  sourceChannel: 'WEB' | 'MOBILE_WEB' | 'MESSAGING' | 'KIOSK' | 'OTHER';
  schemaVersion: number;
  dataOrigin: DataOrigin;
  analysisModel: string | null;
  analysisTimestamp: string | null;
  parentMultiRequestId?: string | null;
}

/**
 * Strips all undefined properties recursively from an object
 * to adhere strictly to Firestore zero-undefined hygiene rules.
 */
export function sanitizeFirestorePayload<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      continue;
    }
    if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      result[key] = sanitizeFirestorePayload(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Generate human-readable public request ID without sequential leakage.
 * Example format: JS-IN-2026-X8K2M9P4
 */
export function generatePublicRequestId(countryCode: string = 'IN'): string {
  const year = new Date().getFullYear();
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Base32 unambiguous
  let randomCode = '';
  for (let i = 0; i < 8; i++) {
    randomCode += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `JS-${countryCode.toUpperCase()}-${year}-${randomCode}`;
}

export function mapFirestoreDocToCitizenRequest(data: any, docId: string): CitizenRequest {
  const createdAtIso = data.createdAt?.toDate
    ? data.createdAt.toDate().toISOString()
    : typeof data.createdAt === 'string'
    ? data.createdAt
    : new Date().toISOString();

  // Normalize status for UI compatibility
  let statusUi: RequestStatus = 'Submitted';
  const rawStatus = (data.status || 'SUBMITTED').toUpperCase();
  if (rawStatus === 'SUBMITTED') statusUi = 'Submitted';
  else if (rawStatus === 'UNDER_ANALYSIS') statusUi = 'Under Analysis';
  else if (rawStatus === 'CLUSTERED') statusUi = 'Clustered';
  else if (rawStatus === 'REVIEWED') statusUi = 'Reviewed';

  // Normalize urgency
  let urgencyUi: any = 'Medium';
  const rawUrgency = (data.urgency || 'MEDIUM').toUpperCase();
  if (rawUrgency === 'CRITICAL') urgencyUi = 'Critical';
  else if (rawUrgency === 'HIGH') urgencyUi = 'High';
  else if (rawUrgency === 'LOW') urgencyUi = 'Low';
  else urgencyUi = 'Medium';

  return {
    id: docId,
    requestId: data.publicRequestId || docId,
    publicRequestId: data.publicRequestId || docId,
    timestamp: createdAtIso,
    createdAt: createdAtIso,
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : undefined,
    countryCode: data.countryCode || 'IN',
    country: data.country || 'India',
    state: data.state || 'Unspecified',
    district: data.district || 'Unspecified',
    locality: data.locality || 'Unspecified',
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
    inputMethod: data.inputMethod === 'VOICE' ? 'VOICE' : 'TEXT',
    originalLanguage: data.originalLanguage || 'English',
    originalRequest: data.originalRequest || '',
    originalTranscript: data.originalTranscript || null,
    translatedRequest: data.translatedRequest || data.originalRequest || '',
    category: data.category || 'Other',
    subcategory: data.subcategory || 'General Infrastructure',
    requestType: data.requestType || 'New Infrastructure',
    urgency: urgencyUi,
    summary: data.summary || '',
    problemStatement: data.problemStatement || data.summary || '',
    requestedIntervention: data.requestedIntervention || '',
    infrastructureEntity: data.infrastructureEntity || null,
    affectedPopulationMentioned: data.affectedPopulationMentioned ?? null,
    populationMentioned: data.populationMentioned ?? null,
    distanceMentionedKm: data.distanceMentionedKm ?? null,
    householdsMentioned: data.householdsMentioned ?? null,
    temporalContext: data.temporalContext || null,
    keywords: Array.isArray(data.keywords) ? data.keywords : [],
    confidenceScore: typeof data.confidenceScore === 'number' ? data.confidenceScore : 0.9,
    status: statusUi,
    clusterId: data.clusterId || null,
    sourceChannel: data.sourceChannel || 'WEB',
    schemaVersion: data.schemaVersion || 1,
    dataOrigin: data.dataOrigin || 'PROTOTYPE_USER',
    analysisModel: data.analysisModel || null,
    analysisTimestamp: data.analysisTimestamp || null,
    parentMultiRequestId: data.parentMultiRequestId || null,
  };
}

/**
 * Direct Client-Side Firestore Data Access Layer
 * Provides high-speed direct reads and optimistic local-first writes
 */
export class FirestoreRequestRepository {
  async getRequests(filters?: RequestFilterOptions): Promise<CitizenRequest[]> {
    const db = getDb();
    const colRef = collection(db, CITIZEN_REQUESTS_COLLECTION);

    // Build query with basic filters; complex combined sorting falls back to client filtering
    // to prevent requiring multi-field composite indexes immediately in prototype
    let q = query(colRef, orderBy('createdAt', 'desc'), limit(150));

    if (filters?.dataOrigin && filters.dataOrigin !== 'All') {
      q = query(colRef, where('dataOrigin', '==', filters.dataOrigin), orderBy('createdAt', 'desc'), limit(150));
    }

    const snapshot = await getDocs(q);
    let items: CitizenRequest[] = snapshot.docs.map((d) => mapFirestoreDocToCitizenRequest(d.data(), d.id));

    // Apply remaining client-side filters gracefully
    if (filters?.state && filters.state !== 'All') {
      items = items.filter((r) => r.state.toLowerCase() === filters.state?.toLowerCase());
    }
    if (filters?.district && filters.district !== 'All') {
      items = items.filter((r) => r.district.toLowerCase() === filters.district?.toLowerCase());
    }
    if (filters?.category && filters.category !== 'All') {
      items = items.filter((r) => r.category.toLowerCase() === filters.category?.toLowerCase());
    }
    if (filters?.urgency && filters.urgency !== 'All') {
      items = items.filter((r) => r.urgency.toLowerCase() === filters.urgency?.toLowerCase());
    }
    if (filters?.status && filters.status !== 'All') {
      items = items.filter((r) => r.status.toLowerCase() === filters.status?.toLowerCase());
    }
    if (filters?.searchQuery && filters.searchQuery.trim()) {
      const qLower = filters.searchQuery.toLowerCase().trim();
      items = items.filter(
        (r) =>
          r.requestId.toLowerCase().includes(qLower) ||
          r.originalRequest.toLowerCase().includes(qLower) ||
          r.translatedRequest.toLowerCase().includes(qLower) ||
          r.summary.toLowerCase().includes(qLower) ||
          r.district.toLowerCase().includes(qLower) ||
          r.state.toLowerCase().includes(qLower) ||
          r.subcategory.toLowerCase().includes(qLower)
      );
    }

    return items;
  }

  async getRequestById(idOrPublicId: string): Promise<CitizenRequest | null> {
    const db = getDb();

    // 1. Try directly by doc ID
    const docRef = doc(db, CITIZEN_REQUESTS_COLLECTION, idOrPublicId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return mapFirestoreDocToCitizenRequest(snap.data(), snap.id);
    }

    // 2. Query by publicRequestId
    const colRef = collection(db, CITIZEN_REQUESTS_COLLECTION);
    const q = query(colRef, where('publicRequestId', '==', idOrPublicId), limit(1));
    const qSnap = await getDocs(q);
    if (!qSnap.empty) {
      const firstDoc = qSnap.docs[0];
      return mapFirestoreDocToCitizenRequest(firstDoc.data(), firstDoc.id);
    }

    return null;
  }

  async updateRequestStatus(id: string, newStatus: RequestStatus): Promise<CitizenRequest | null> {
    const db = getDb();
    const docRef = doc(db, CITIZEN_REQUESTS_COLLECTION, id);

    let statusDb: 'SUBMITTED' | 'UNDER_ANALYSIS' | 'CLUSTERED' | 'REVIEWED' = 'SUBMITTED';
    const sUpper = newStatus.toUpperCase();
    if (sUpper === 'UNDER ANALYSIS' || sUpper === 'UNDER_ANALYSIS') statusDb = 'UNDER_ANALYSIS';
    else if (sUpper === 'CLUSTERED') statusDb = 'CLUSTERED';
    else if (sUpper === 'REVIEWED') statusDb = 'REVIEWED';
    else statusDb = 'SUBMITTED';

    await updateDoc(docRef, {
      status: statusDb,
      updatedAt: serverTimestamp(),
    });

    const updatedSnap = await getDoc(docRef);
    if (updatedSnap.exists()) {
      return mapFirestoreDocToCitizenRequest(updatedSnap.data(), updatedSnap.id);
    }
    return null;
  }

  calculateKPIs(requests: CitizenRequest[]): DashboardKPIData {
    const totalRequests = requests.length;
    const highPriorityRequests = requests.filter((r) => r.urgency === 'High' || r.urgency === 'Critical').length;
    const criticalRequests = requests.filter((r) => r.urgency === 'Critical').length;

    const districts = new Set(requests.map((r) => `${r.state}-${r.district}`));
    const districtsRepresented = districts.size;

    // Category distribution
    const catCounts: Record<string, number> = {};
    for (const r of requests) {
      catCounts[r.category] = (catCounts[r.category] || 0) + 1;
    }
    const categoryDistribution = Object.entries(catCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Urgency distribution
    const urgCounts: Record<string, number> = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    for (const r of requests) {
      urgCounts[r.urgency] = (urgCounts[r.urgency] || 0) + 1;
    }
    const urgencyDistribution = Object.entries(urgCounts).map(([name, count]) => ({
      name,
      count,
    }));

    // Top needs
    const needCounts: Record<string, { category: string; subcategory: string; count: number; urgencies: string[] }> = {};
    for (const r of requests) {
      const key = `${r.category}:${r.subcategory}`;
      if (!needCounts[key]) {
        needCounts[key] = {
          category: r.category,
          subcategory: r.subcategory,
          count: 0,
          urgencies: [],
        };
      }
      needCounts[key].count++;
      needCounts[key].urgencies.push(r.urgency);
    }

    const topNeeds = Object.values(needCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((item) => {
        let topUrgency = 'Medium';
        if (item.urgencies.includes('Critical')) topUrgency = 'Critical';
        else if (item.urgencies.includes('High')) topUrgency = 'High';
        return {
          category: item.category,
          subcategory: item.subcategory,
          count: item.count,
          topUrgency,
        };
      });

    return {
      totalRequests,
      highPriorityRequests,
      criticalRequests,
      districtsRepresented,
      activeClustersCount: 0,
      emergingDemandsCount: 0,
      needsReviewClustersCount: 0,
      mostReportedCategory: categoryDistribution[0]?.name || 'Healthcare',
      categoryDistribution,
      urgencyDistribution,
      topNeeds,
    };
  }
}

export const firestoreRequestRepo = new FirestoreRequestRepository();
