import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
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
  Timestamp,
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import type {
  CitizenRequest,
  DashboardKPIData,
  RequestFilterOptions,
  RequestStatus,
} from '../../src/types/citizenRequest.ts';

let dbInstance: Firestore | null = null;

function getServerDb(): Firestore | null {
  if (dbInstance) return dbInstance;

  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (!fs.existsSync(configPath)) {
      console.warn('[Server Firestore] firebase-applet-config.json not found on server.');
      return null;
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const app = !getApps().length ? initializeApp(config) : getApp();
    dbInstance = getFirestore(app, config.firestoreDatabaseId);
    console.log('[Server Firestore] Initialized connection to Firestore database:', config.firestoreDatabaseId);
    return dbInstance;
  } catch (err) {
    console.error('[Server Firestore] Initialization error:', err);
    return null;
  }
}

/**
 * Generate human-readable public request ID without sequential leakage.
 * Example format: JS-IN-2026-X8K2M9P4
 */
export function generatePublicRequestId(countryCode: string = 'IN'): string {
  const year = new Date().getFullYear();
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let randomCode = '';
  for (let i = 0; i < 8; i++) {
    randomCode += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `JS-${countryCode.toUpperCase()}-${year}-${randomCode}`;
}

export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      result[key] = sanitizeObject(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export class ServerRequestRepository {
  private collectionName = 'citizenRequests';

  async saveRequest(payload: any): Promise<CitizenRequest> {
    const db = getServerDb();
    const publicId = payload.publicRequestId || payload.requestId || generatePublicRequestId(payload.countryCode || 'IN');

    // Strict validation & sanitization
    const now = new Date();
    const nowIso = now.toISOString();

    // Map urgency to uppercase for storage
    let urgencyStored: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM';
    const urgUpper = String(payload.urgency || 'MEDIUM').toUpperCase();
    if (urgUpper === 'CRITICAL') urgencyStored = 'CRITICAL';
    else if (urgUpper === 'HIGH') urgencyStored = 'HIGH';
    else if (urgUpper === 'LOW') urgencyStored = 'LOW';

    // Status is always strictly initialized to SUBMITTED
    const statusStored: 'SUBMITTED' | 'UNDER_ANALYSIS' | 'CLUSTERED' | 'REVIEWED' = 'SUBMITTED';

    const documentData = sanitizeObject({
      publicRequestId: publicId,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
      countryCode: payload.countryCode || 'IN',
      country: payload.country || 'India',
      state: payload.state || null,
      district: payload.district || null,
      locality: payload.locality || null,
      latitude: typeof payload.latitude === 'number' ? payload.latitude : null,
      longitude: typeof payload.longitude === 'number' ? payload.longitude : null,
      geoStatus: payload.geoStatus || (typeof payload.latitude === 'number' ? 'VERIFIED' : 'APPROXIMATE'),
      geoSource: payload.geoSource || (typeof payload.latitude === 'number' ? 'GEOCODED_LOCATION' : 'ADMINISTRATIVE_CENTROID'),
      location: payload.location || {
        countryCode: payload.countryCode || 'IN',
        country: payload.country || 'India',
        state: payload.state || null,
        stateCode: payload.stateCode || null,
        district: payload.district || null,
        districtCode: payload.districtCode || null,
        locality: payload.locality || null,
        latitude: typeof payload.latitude === 'number' ? payload.latitude : null,
        longitude: typeof payload.longitude === 'number' ? payload.longitude : null,
        geoStatus: payload.geoStatus || (typeof payload.latitude === 'number' ? 'VERIFIED' : 'APPROXIMATE'),
        geoSource: payload.geoSource || (typeof payload.latitude === 'number' ? 'GEOCODED_LOCATION' : 'ADMINISTRATIVE_CENTROID'),
      },
      inputMethod: payload.inputMethod === 'VOICE' ? 'VOICE' : 'TEXT',
      originalLanguage: String(payload.originalLanguage || 'English').slice(0, 50),
      originalRequest: String(payload.originalRequest || '').slice(0, 5000),
      originalTranscript: payload.originalTranscript ? String(payload.originalTranscript).slice(0, 5000) : null,
      translatedRequest: String(payload.translatedRequest || payload.originalRequest || '').slice(0, 5000),
      category: String(payload.category || 'Other').slice(0, 100),
      subcategory: String(payload.subcategory || 'General Infrastructure').slice(0, 150),
      requestType: String(payload.requestType || 'New Infrastructure').slice(0, 100),
      urgency: urgencyStored,
      problemStatement: String(payload.problemStatement || payload.summary || '').slice(0, 2000),
      requestedIntervention: String(payload.requestedIntervention || '').slice(0, 2000),
      infrastructureEntity: payload.infrastructureEntity ? String(payload.infrastructureEntity).slice(0, 200) : null,
      affectedPopulationMentioned: typeof payload.affectedPopulationMentioned === 'number' ? payload.affectedPopulationMentioned : null,
      distanceMentionedKm: typeof payload.distanceMentionedKm === 'number' ? payload.distanceMentionedKm : null,
      temporalContext: payload.temporalContext ? String(payload.temporalContext).slice(0, 100) : null,
      summary: String(payload.summary || '').slice(0, 1000),
      keywords: Array.isArray(payload.keywords) ? payload.keywords.slice(0, 15) : [],
      confidenceScore: typeof payload.confidenceScore === 'number' ? payload.confidenceScore : 0.9,
      status: payload.status ? (String(payload.status).toUpperCase() as any) : statusStored,
      clusterId: payload.clusterId || null,
      sourceChannel: 'WEB',
      schemaVersion: 1,
      dataOrigin: 'PROTOTYPE_USER',
      analysisModel: payload.analysisModel || 'gemini-3.8-flash',
      analysisTimestamp: nowIso,
      parentMultiRequestId: payload.parentMultiRequestId || null,
    });

    if (db) {
      const colRef = collection(db, this.collectionName);
      const docRef = doc(colRef);
      await setDoc(docRef, {
        id: docRef.id,
        ...documentData,
      });
      console.log(`[Server Firestore] Persisted confirmed request with doc ID: ${docRef.id}, public ID: ${publicId}`);

      return {
        id: docRef.id,
        requestId: publicId,
        publicRequestId: publicId,
        timestamp: nowIso,
        createdAt: nowIso,
        updatedAt: nowIso,
        countryCode: documentData.countryCode,
        country: documentData.country,
        state: documentData.state || 'Unspecified',
        district: documentData.district || 'Unspecified',
        locality: documentData.locality || 'Unspecified',
        latitude: documentData.latitude,
        longitude: documentData.longitude,
        inputMethod: (documentData.inputMethod === 'VOICE' ? 'VOICE' : 'TEXT') as 'TEXT' | 'VOICE',
        originalLanguage: documentData.originalLanguage,
        originalRequest: documentData.originalRequest,
        originalTranscript: documentData.originalTranscript,
        translatedRequest: documentData.translatedRequest,
        category: documentData.category as any,
        subcategory: documentData.subcategory,
        requestType: documentData.requestType as any,
        urgency: payload.urgency || 'Medium',
        summary: documentData.summary,
        problemStatement: documentData.problemStatement,
        requestedIntervention: documentData.requestedIntervention,
        affectedPopulationMentioned: documentData.affectedPopulationMentioned,
        distanceMentionedKm: documentData.distanceMentionedKm,
        confidenceScore: documentData.confidenceScore,
        status: 'Submitted',
        sourceChannel: 'WEB',
        dataOrigin: 'PROTOTYPE_USER',
        schemaVersion: 1,
        analysisModel: documentData.analysisModel,
        analysisTimestamp: documentData.analysisTimestamp,
        parentMultiRequestId: documentData.parentMultiRequestId,
      };
    }

    throw new Error('Firestore database is not connected on server');
  }

  async getAllRequests(filters?: RequestFilterOptions): Promise<CitizenRequest[]> {
    const db = getServerDb();
    if (!db) return [];

    try {
      const colRef = collection(db, this.collectionName);
      const q = query(colRef, orderBy('createdAt', 'desc'), limit(150));
      const snap = await getDocs(q);

      const list: CitizenRequest[] = snap.docs.map((d) => {
        const data = d.data();
        const createdAtIso = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.timestamp || new Date().toISOString();

        let statusUi: RequestStatus = 'Submitted';
        const s = (data.status || 'SUBMITTED').toUpperCase();
        if (s === 'UNDER_ANALYSIS') statusUi = 'Under Analysis';
        else if (s === 'CLUSTERED') statusUi = 'Clustered';
        else if (s === 'REVIEWED') statusUi = 'Reviewed';

        let urgencyUi: any = 'Medium';
        const u = (data.urgency || 'MEDIUM').toUpperCase();
        if (u === 'CRITICAL') urgencyUi = 'Critical';
        else if (u === 'HIGH') urgencyUi = 'High';
        else if (u === 'LOW') urgencyUi = 'Low';

        return {
          id: d.id,
          requestId: data.publicRequestId || d.id,
          publicRequestId: data.publicRequestId || d.id,
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
          geoStatus: data.geoStatus || (data.latitude != null ? 'VERIFIED' : 'APPROXIMATE'),
          geoSource: data.geoSource || (data.latitude != null ? 'GEOCODED_LOCATION' : 'ADMINISTRATIVE_CENTROID'),
          location: data.location || {
            countryCode: data.countryCode || 'IN',
            country: data.country || 'India',
            state: data.state || null,
            stateCode: data.stateCode || null,
            district: data.district || null,
            districtCode: data.districtCode || null,
            locality: data.locality || null,
            latitude: data.latitude ?? null,
            longitude: data.longitude ?? null,
            geoStatus: data.geoStatus || (data.latitude != null ? 'VERIFIED' : 'APPROXIMATE'),
            geoSource: data.geoSource || (data.latitude != null ? 'GEOCODED_LOCATION' : 'ADMINISTRATIVE_CENTROID'),
          },
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
          affectedPopulationMentioned: data.affectedPopulationMentioned ?? null,
          distanceMentionedKm: data.distanceMentionedKm ?? null,
          householdsMentioned: data.householdsMentioned ?? null,
          confidenceScore: data.confidenceScore || 0.9,
          status: statusUi,
          sourceChannel: data.sourceChannel || 'WEB',
          dataOrigin: data.dataOrigin || 'PROTOTYPE_USER',
          schemaVersion: data.schemaVersion || 1,
          analysisModel: data.analysisModel || null,
          analysisTimestamp: data.analysisTimestamp || null,
          parentMultiRequestId: data.parentMultiRequestId || null,
          clusterId: data.clusterId || null,
        };
      });

      let filtered = list;
      if (filters?.state && filters.state !== 'All') {
        filtered = filtered.filter((r) => r.state.toLowerCase() === filters.state?.toLowerCase());
      }
      if (filters?.district && filters.district !== 'All') {
        filtered = filtered.filter((r) => r.district.toLowerCase() === filters.district?.toLowerCase());
      }
      if (filters?.category && filters.category !== 'All') {
        filtered = filtered.filter((r) => r.category.toLowerCase() === filters.category?.toLowerCase());
      }
      if (filters?.urgency && filters.urgency !== 'All') {
        filtered = filtered.filter((r) => r.urgency.toLowerCase() === filters.urgency?.toLowerCase());
      }
      if (filters?.status && filters.status !== 'All') {
        filtered = filtered.filter((r) => r.status.toLowerCase() === filters.status?.toLowerCase());
      }
      if (filters?.dataOrigin && filters.dataOrigin !== 'All') {
        filtered = filtered.filter((r) => r.dataOrigin === filters.dataOrigin);
      }
      if (filters?.searchQuery && filters.searchQuery.trim()) {
        const qLower = filters.searchQuery.toLowerCase().trim();
        filtered = filtered.filter(
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

      return filtered;
    } catch (err) {
      console.error('[Server Firestore] Query failed:', err);
      return [];
    }
  }

  async updateStatus(idOrPublicId: string, newStatus: RequestStatus): Promise<boolean> {
    const db = getServerDb();
    if (!db) return false;

    let statusDb: 'SUBMITTED' | 'UNDER_ANALYSIS' | 'CLUSTERED' | 'REVIEWED' = 'SUBMITTED';
    const s = newStatus.toUpperCase();
    if (s.includes('ANALYSIS')) statusDb = 'UNDER_ANALYSIS';
    else if (s === 'CLUSTERED') statusDb = 'CLUSTERED';
    else if (s === 'REVIEWED') statusDb = 'REVIEWED';

    try {
      // Direct doc ID update attempt
      const docRef = doc(db, this.collectionName, idOrPublicId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        await updateDoc(docRef, {
          status: statusDb,
          updatedAt: Timestamp.fromDate(new Date()),
        });
        return true;
      }

      // Query by publicRequestId
      const colRef = collection(db, this.collectionName);
      const q = query(colRef, where('publicRequestId', '==', idOrPublicId), limit(1));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        const targetDoc = qSnap.docs[0];
        await updateDoc(doc(db, this.collectionName, targetDoc.id), {
          status: statusDb,
          updatedAt: Timestamp.fromDate(new Date()),
        });
        return true;
      }
      return false;
    } catch (err) {
      console.error('[Server Firestore] Update status error:', err);
      return false;
    }
  }

  async updateCluster(idOrPublicId: string, clusterId: string, newStatus: RequestStatus = 'CLUSTERED'): Promise<boolean> {
    const db = getServerDb();
    if (!db) return false;

    let statusDb: 'SUBMITTED' | 'UNDER_ANALYSIS' | 'CLUSTERED' | 'REVIEWED' = 'CLUSTERED';
    const s = newStatus.toUpperCase();
    if (s.includes('ANALYSIS')) statusDb = 'UNDER_ANALYSIS';
    else if (s === 'REVIEWED') statusDb = 'REVIEWED';

    try {
      const docRef = doc(db, this.collectionName, idOrPublicId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        await updateDoc(docRef, {
          clusterId,
          status: statusDb,
          updatedAt: Timestamp.fromDate(new Date()),
        });
        return true;
      }

      const colRef = collection(db, this.collectionName);
      const q = query(colRef, where('publicRequestId', '==', idOrPublicId), limit(1));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        const targetDoc = qSnap.docs[0];
        await updateDoc(doc(db, this.collectionName, targetDoc.id), {
          clusterId,
          status: statusDb,
          updatedAt: Timestamp.fromDate(new Date()),
        });
        return true;
      }
      return false;
    } catch (err) {
      console.error('[Server Firestore] Update cluster error:', err);
      return false;
    }
  }
}

export const serverRequestRepo = new ServerRequestRepository();
