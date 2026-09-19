import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { analyzeCitizenDemand, stripUndefined } from './server/geminiService.ts';
import { transcribeCitizenAudio } from './server/voiceService.ts';
import { requestStore } from './server/requestStore.ts';
import { clusterStore } from './server/clusterStore.ts';
import { evidenceStore } from './server/evidenceStore.ts';
import { infrastructureGapEngine } from './server/gapEngine.ts';
import type { RequestStatus, ClusterFilterOptions } from './src/types/citizenRequest.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // 1. TOP-LEVEL REQUEST DESERIALIZATION (Ordering Guarantee)
  // Must be mounted before any API endpoints are registered
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Basic security and telemetry headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    next();
  });

  // 2. API ROUTES
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'JanSetu AI Platform',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  // Multilingual Speech Transcription Endpoint
  app.post('/api/transcribe-audio', async (req: Request, res: Response) => {
    try {
      const data = req.body && typeof req.body === 'object' ? req.body : {};
      const audioBase64 = typeof data.audioBase64 === 'string' ? data.audioBase64 : '';
      const mimeType = typeof data.mimeType === 'string' ? data.mimeType : 'audio/webm';
      const selectedLanguage = typeof data.selectedLanguage === 'string' ? data.selectedLanguage : 'Auto Detect';

      if (!audioBase64.trim()) {
        return res.status(400).json({
          error: 'Audio recording payload is required for transcription.',
        });
      }

      console.log(`[JanSetu AI] Received voice intake transcription request (MIME: ${mimeType}, Lang: ${selectedLanguage})`);
      const result = await transcribeCitizenAudio(audioBase64, mimeType, selectedLanguage);

      return res.json({
        success: true,
        ...result,
      });
    } catch (err: any) {
      console.error('[JanSetu AI] Voice transcription error:', err);
      return res.status(500).json({
        error: 'Unable to transcribe speech recording. Please speak clearly or use text input.',
        details: err?.message || 'Speech processing failed',
      });
    }
  });

  // Analyze citizen demand via Gemini with model fallback ladder
  app.post('/api/analyze-request', async (req: Request, res: Response) => {
    try {
      // Defensive Payload Ingestion (Null-Safe Destructuring)
      const data = req.body && typeof req.body === 'object' ? req.body : {};
      const text = typeof data.text === 'string' ? data.text : '';
      const location = data.location && typeof data.location === 'object' ? data.location : {};
      const clarificationHistory = Array.isArray(data.clarificationHistory) ? data.clarificationHistory : undefined;
      const inputMethod = data.inputMethod === 'VOICE' ? 'VOICE' : 'TEXT';
      const originalTranscript = typeof data.originalTranscript === 'string' ? data.originalTranscript : null;
      const selectedLanguage = typeof data.selectedLanguage === 'string' ? data.selectedLanguage : null;

      if (!text.trim()) {
        return res.status(400).json({
          error: 'Citizen request text is required.',
        });
      }

      const analysis = await analyzeCitizenDemand(
        text,
        {
          country: typeof location.country === 'string' ? location.country : 'India',
          state: typeof location.state === 'string' ? location.state : '',
          district: typeof location.district === 'string' ? location.district : '',
          locality: typeof location.locality === 'string' ? location.locality : '',
        },
        clarificationHistory,
        {
          inputMethod,
          originalTranscript,
          selectedLanguage,
        }
      );

      return res.json({
        success: true,
        analysis,
      });
    } catch (err: any) {
      console.error('[JanSetu AI] Analyze error:', err);
      return res.status(500).json({
        error: 'Failed to analyze citizen demand. Please try again or edit details directly.',
        details: err?.message || 'Internal processing error',
      });
    }
  });

  // List all requests with optional filtering
  app.get('/api/requests', async (req: Request, res: Response) => {
    try {
      const { state, district, category, urgency, status, searchQuery, dataOrigin } = req.query;
      const requests = await requestStore.getAll({
        state: typeof state === 'string' ? state : undefined,
        district: typeof district === 'string' ? district : undefined,
        category: typeof category === 'string' ? category : undefined,
        urgency: typeof urgency === 'string' ? urgency : undefined,
        status: typeof status === 'string' ? status : undefined,
        dataOrigin: typeof dataOrigin === 'string' ? dataOrigin : undefined,
        searchQuery: typeof searchQuery === 'string' ? searchQuery : undefined,
      });

      return res.json({
        success: true,
        count: requests.length,
        requests,
      });
    } catch (err: any) {
      console.error('[JanSetu AI] Get requests error:', err);
      return res.status(500).json({ error: 'Failed to fetch requests' });
    }
  });

  // Submit confirmed citizen request
  app.post('/api/requests', async (req: Request, res: Response) => {
    try {
      // Defensive Payload Ingestion (Null-Safe Destructuring)
      const data = req.body && typeof req.body === 'object' ? req.body : {};

      if (!data.originalRequest || !data.category) {
        return res.status(400).json({
          error: 'Invalid request payload: originalRequest and category are required.',
        });
      }

      // Strict undefined stripping before storage
      const cleaned = stripUndefined(data);
      const saved = await requestStore.create(cleaned);

      return res.status(201).json({
        success: true,
        request: saved,
      });
    } catch (err: any) {
      console.error('[JanSetu AI] Submit request error:', err);
      return res.status(500).json({ error: 'Failed to save citizen request to persistent storage' });
    }
  });

  // Submit batch of confirmed citizen requests (e.g. multi-issue split)
  app.post('/api/requests/batch', async (req: Request, res: Response) => {
    try {
      const data = req.body && typeof req.body === 'object' ? req.body : {};
      const requests = Array.isArray(data.requests) ? data.requests : [];

      if (requests.length === 0) {
        return res.status(400).json({ error: 'No requests provided in batch payload' });
      }

      const savedRequests: any[] = [];
      const parentMultiId = `MULTI-${Date.now()}`;

      for (const item of requests) {
        if (!item.originalRequest || !item.category) continue;
        const cleaned = stripUndefined({
          ...item,
          parentMultiRequestId: parentMultiId,
        });
        const saved = await requestStore.create(cleaned);
        savedRequests.push(saved);
      }

      return res.status(201).json({
        success: true,
        count: savedRequests.length,
        requests: savedRequests,
        parentMultiRequestId: parentMultiId,
      });
    } catch (err: any) {
      console.error('[JanSetu AI] Batch submit error:', err);
      return res.status(500).json({ error: 'Failed to save batch citizen requests' });
    }
  });

  // Update request status (for Policymaker review workflow)
  app.patch('/api/requests/:id/status', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data = req.body && typeof req.body === 'object' ? req.body : {};
      const status = data.status as RequestStatus;

      const allowedStatuses: RequestStatus[] = [
        'Submitted',
        'Under Analysis',
        'Clustered',
        'Reviewed',
        'SUBMITTED',
        'UNDER_ANALYSIS',
        'CLUSTERED',
        'REVIEWED',
      ];
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status provided.' });
      }

      const updated = await requestStore.updateStatus(id, status);
      if (!updated) {
        return res.status(404).json({ error: 'Request ID not found.' });
      }

      return res.json({ success: true, request: updated });
    } catch (err: any) {
      console.error('[JanSetu AI] Status update error:', err);
      return res.status(500).json({ error: 'Failed to update request status.' });
    }
  });

  // Fetch aggregated KPIs for Policymaker Dashboard
  app.get('/api/kpis', async (_req: Request, res: Response) => {
    try {
      const kpis = await requestStore.getKPIs();
      return res.json({
        success: true,
        kpis,
        notice: 'SAMPLE DATA — Aggregated from simulated and live prototype citizen submissions.',
      });
    } catch (err: any) {
      console.error('[JanSetu AI] KPI error:', err);
      return res.status(500).json({ error: 'Failed to generate KPIs' });
    }
  });

  // BUILD 06: Semantic Demand Clustering & Deduplication API Endpoints

  // Query demand clusters with filters
  app.get('/api/clusters', async (req: Request, res: Response) => {
    try {
      const filters: ClusterFilterOptions = {
        state: typeof req.query.state === 'string' ? req.query.state : undefined,
        district: typeof req.query.district === 'string' ? req.query.district : undefined,
        category: typeof req.query.category === 'string' ? req.query.category : undefined,
        status: typeof req.query.status === 'string' ? (req.query.status as any) : undefined,
        urgency: typeof req.query.urgency === 'string' ? req.query.urgency : undefined,
        trend: typeof req.query.trend === 'string' ? (req.query.trend as any) : undefined,
        searchQuery: typeof req.query.searchQuery === 'string' ? req.query.searchQuery : undefined,
        dataOrigin: typeof req.query.dataOrigin === 'string' ? req.query.dataOrigin : undefined,
      };

      const clusters = await clusterStore.getAll(filters);
      return res.json({
        success: true,
        count: clusters.length,
        clusters,
      });
    } catch (err: any) {
      console.error('[JanSetu AI] Query clusters error:', err);
      return res.status(500).json({ error: 'Failed to retrieve demand clusters' });
    }
  });

  // Get emerging demand clusters (spikes and rising trends)
  app.get('/api/clusters/emerging', async (_req: Request, res: Response) => {
    try {
      const all = await clusterStore.getAll();
      const emerging = all
        .filter((c) => c.trendSignal === 'RISING' || (c.growthPercentage && c.growthPercentage >= 50))
        .sort((a, b) => (b.growthPercentage || 0) - (a.growthPercentage || 0));

      return res.json({
        success: true,
        count: emerging.length,
        emergingClusters: emerging,
      });
    } catch (err: any) {
      console.error('[JanSetu AI] Emerging clusters error:', err);
      return res.status(500).json({ error: 'Failed to retrieve emerging clusters' });
    }
  });

  // Get cluster by ID with full citizen member requests
  app.get('/api/clusters/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const cluster = await clusterStore.getById(id);

      if (!cluster) {
        return res.status(404).json({ error: 'Demand cluster not found' });
      }

      // Resolve member requests
      const allRequests = await requestStore.getAll();
      const memberMap = new Map(allRequests.map((r) => [r.requestId, r]));
      // Also match by publicRequestId
      allRequests.forEach((r) => {
        if (r.publicRequestId) memberMap.set(r.publicRequestId, r);
      });

      const memberRequests = cluster.memberRequestIds
        .map((reqId) => memberMap.get(reqId))
        .filter(Boolean);

      return res.json({
        success: true,
        cluster,
        memberRequests,
      });
    } catch (err: any) {
      console.error('[JanSetu AI] Get cluster by ID error:', err);
      return res.status(500).json({ error: 'Failed to retrieve cluster details' });
    }
  });

  // Get cluster audit trail
  app.get('/api/clusters/:id/audit', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const auditTrail = await clusterStore.getAuditEvents(id);
      return res.json({
        success: true,
        count: auditTrail.length,
        auditTrail,
      });
    } catch (err: any) {
      console.error('[JanSetu AI] Audit trail error:', err);
      return res.status(500).json({ error: 'Failed to retrieve cluster audit trail' });
    }
  });

  // Confirm a cluster (Policymaker Human-in-the-loop action)
  app.post('/api/clusters/:id/confirm', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data = req.body && typeof req.body === 'object' ? req.body : {};
      const notes = typeof data.reviewerNotes === 'string' ? data.reviewerNotes : 'Confirmed by district officer.';
      const reviewerId = typeof data.reviewerId === 'string' ? data.reviewerId : 'POLICYMAKER-OFFICIAL-1';

      const confirmed = await clusterStore.confirmCluster(id, notes, reviewerId);
      if (!confirmed) {
        return res.status(404).json({ error: 'Cluster not found or could not be confirmed.' });
      }

      return res.json({
        success: true,
        message: 'Demand cluster confirmed successfully.',
        cluster: confirmed,
      });
    } catch (err: any) {
      console.error('[JanSetu AI] Confirm cluster error:', err);
      return res.status(500).json({ error: 'Failed to confirm demand cluster' });
    }
  });

  // Separate an erroneously grouped citizen request into a new individual cluster
  app.post('/api/clusters/:id/separate', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data = req.body && typeof req.body === 'object' ? req.body : {};
      const requestId = typeof data.requestId === 'string' ? data.requestId : '';
      const reason = typeof data.reason === 'string' ? data.reason : 'Policymaker separated request into distinct demand.';
      const reviewerId = typeof data.reviewerId === 'string' ? data.reviewerId : 'POLICYMAKER-OFFICIAL-1';

      if (!requestId) {
        return res.status(400).json({ error: 'Target requestId is required for separation.' });
      }

      const separationResult = await clusterStore.separateRequest(id, requestId, reason, reviewerId);
      if (!separationResult) {
        return res.status(400).json({ error: 'Failed to separate request. Check if request belongs to cluster.' });
      }

      return res.json({
        success: true,
        message: 'Request separated successfully into dedicated demand cluster.',
        originalCluster: separationResult.sourceCluster,
        newCluster: separationResult.newCluster,
      });
    } catch (err: any) {
      console.error('[JanSetu AI] Separate request error:', err);
      return res.status(500).json({ error: 'Failed to separate request from cluster' });
    }
  });

  // Merge two semantically overlapping demand clusters
  app.post('/api/clusters/merge', async (req: Request, res: Response) => {
    try {
      const data = req.body && typeof req.body === 'object' ? req.body : {};
      const primaryId = typeof data.primaryClusterId === 'string' ? data.primaryClusterId : '';
      const secondaryId = typeof data.secondaryClusterId === 'string' ? data.secondaryClusterId : '';
      const reason = typeof data.reason === 'string' ? data.reason : 'Merged by policymaker as duplicate demand.';
      const reviewerId = typeof data.reviewerId === 'string' ? data.reviewerId : 'POLICYMAKER-OFFICIAL-1';

      if (!primaryId || !secondaryId || primaryId === secondaryId) {
        return res.status(400).json({ error: 'Valid primaryClusterId and distinct secondaryClusterId required.' });
      }

      const merged = await clusterStore.mergeClusters(primaryId, secondaryId, reason, reviewerId);
      if (!merged) {
        return res.status(400).json({ error: 'Unable to merge clusters. Ensure both clusters exist.' });
      }

      return res.json({
        success: true,
        message: 'Clusters merged successfully.',
        cluster: merged,
      });
    } catch (err: any) {
      console.error('[JanSetu AI] Merge clusters error:', err);
      return res.status(500).json({ error: 'Failed to merge clusters' });
    }
  });

  // -------------------------------------------------------------
  // BUILD 07: VERIFIED EVIDENCE FUSION & INFRASTRUCTURE GAP ROUTES
  // -------------------------------------------------------------

  // Get Dataset Registry metadata sources
  app.get('/api/datasets', async (_req: Request, res: Response) => {
    try {
      const sources = await evidenceStore.getDatasetSources();
      return res.json({ success: true, sources });
    } catch (err: any) {
      console.error('[JanSetu AI] Fetch datasets error:', err);
      return res.status(500).json({ error: 'Failed to fetch dataset sources' });
    }
  });

  // Get geographic evidence (normalized baseline indicators)
  app.get('/api/evidence', async (req: Request, res: Response) => {
    try {
      const state = typeof req.query.state === 'string' ? req.query.state : null;
      const district = typeof req.query.district === 'string' ? req.query.district : null;

      if (district && district !== 'All') {
        const evidence = await evidenceStore.getEvidenceForGeography(state, district);
        return res.json({ success: true, evidence });
      }

      const allEvidence = await evidenceStore.getAllGeographicEvidence();
      return res.json({ success: true, evidenceList: allEvidence });
    } catch (err: any) {
      console.error('[JanSetu AI] Fetch evidence error:', err);
      return res.status(500).json({ error: 'Failed to fetch geographic evidence' });
    }
  });

  // Get public capital projects addressing infrastructure
  app.get('/api/evidence/projects', async (req: Request, res: Response) => {
    try {
      const geographyId = typeof req.query.geographyId === 'string' ? req.query.geographyId : undefined;
      const category = typeof req.query.category === 'string' ? req.query.category : undefined;
      const projects = await evidenceStore.getPublicProjects(geographyId, category);
      return res.json({ success: true, projects });
    } catch (err: any) {
      console.error('[JanSetu AI] Fetch projects error:', err);
      return res.status(500).json({ error: 'Failed to fetch public projects' });
    }
  });

  // Deterministic Evidence Coverage KPI
  app.get('/api/gaps/kpis/coverage', async (_req: Request, res: Response) => {
    try {
      const kpi = await infrastructureGapEngine.getEvidenceCoverageKPI();
      return res.json({ success: true, kpi });
    } catch (err: any) {
      console.error('[JanSetu AI] Fetch coverage KPI error:', err);
      return res.status(500).json({ error: 'Failed to compute evidence coverage KPI' });
    }
  });

  // Fetch evaluated infrastructure gap assessments
  app.get('/api/gaps', async (req: Request, res: Response) => {
    try {
      const state = typeof req.query.state === 'string' && req.query.state !== 'All' ? req.query.state : null;
      const district = typeof req.query.district === 'string' && req.query.district !== 'All' ? req.query.district : null;
      const category = typeof req.query.category === 'string' && req.query.category !== 'All' ? req.query.category : null;
      const gapLevel = typeof req.query.gapLevel === 'string' && req.query.gapLevel !== 'ALL' && req.query.gapLevel !== 'All' ? req.query.gapLevel : null;
      const evidenceQuality = typeof req.query.evidenceQuality === 'string' && req.query.evidenceQuality !== 'ALL' && req.query.evidenceQuality !== 'All' ? req.query.evidenceQuality : null;
      const searchQuery = typeof req.query.searchQuery === 'string' ? req.query.searchQuery.toLowerCase().trim() : '';

      let assessments = await infrastructureGapEngine.assessAllClusters();

      // Apply server-side filters
      if (state) {
        assessments = assessments.filter((a) => a.state?.toLowerCase() === state.toLowerCase());
      }
      if (district) {
        assessments = assessments.filter((a) => a.district?.toLowerCase() === district.toLowerCase());
      }
      if (category) {
        assessments = assessments.filter((a) => a.category.toLowerCase() === category.toLowerCase());
      }
      if (gapLevel) {
        assessments = assessments.filter((a) => a.gapLevel === gapLevel);
      }
      if (evidenceQuality) {
        assessments = assessments.filter((a) => a.evidenceQuality === evidenceQuality);
      }
      if (searchQuery) {
        assessments = assessments.filter((a) =>
          (a.canonicalProblem && a.canonicalProblem.toLowerCase().includes(searchQuery)) ||
          (a.district && a.district.toLowerCase().includes(searchQuery)) ||
          (a.category && a.category.toLowerCase().includes(searchQuery)) ||
          (a.rationale && a.rationale.toLowerCase().includes(searchQuery))
        );
      }

      return res.json({ success: true, assessments });
    } catch (err: any) {
      console.error('[JanSetu AI] Fetch gap assessments error:', err);
      return res.status(500).json({ error: 'Failed to fetch gap assessments' });
    }
  });

  // Get gap assessment for a single cluster
  app.get('/api/gaps/:clusterId', async (req: Request, res: Response) => {
    try {
      const { clusterId } = req.params;
      const cluster = await clusterStore.getClusterById(clusterId);
      if (!cluster) {
        return res.status(404).json({ error: 'Cluster not found' });
      }

      const assessment = await infrastructureGapEngine.assessCluster(cluster);
      return res.json({ success: true, assessment });
    } catch (err: any) {
      console.error('[JanSetu AI] Fetch cluster gap error:', err);
      return res.status(500).json({ error: 'Failed to evaluate cluster gap' });
    }
  });

  // 3. VITE MIDDLEWARE (Development) or STATIC SERVING (Production)
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // 4. LISTEN ON 0.0.0.0:3000
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[JanSetu AI] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[JanSetu AI] Failed to start server:', err);
  process.exit(1);
});
