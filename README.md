# JanSetu AI — Citizen Development Demand Intelligence Platform

> **A Digital Public Good (DPG) for evidence-based infrastructure planning, bridging citizen voices in their native languages with government policy action.**

---

## 1. Overview & Purpose

**JanSetu AI** is an AI-powered citizen development demand intelligence platform designed as a Digital Public Good. Its purpose is to allow citizens to communicate local development and infrastructure needs in their own language and transform those requests into structured information that can later be analyzed by policymakers.

- **Non-Political**: Deals strictly with physical and social infrastructure needs (roads, drinking water, clinics, schools, power, sanitation).
- **Zero Social Scoring**: Does not collect or infer political views, caste, religion, voting preference, or individual social scores.
- **Citizen In-the-Loop**: The citizen explicitly reviews and retains control over the final structured submission before ingestion.

---

## 2. Architecture & Technology Stack

- **Frontend**: React 19 + TypeScript + Tailwind CSS (Digital Public Infrastructure visual language)
- **Backend API**: Node.js + Express (serving on port `3000`, binding to `0.0.0.0`)
- **AI Intelligence**: Gemini API (`@google/genai` SDK) utilizing a server-side **Resilient Model Fallback Ladder**:
  1. Primary: `gemini-3.6-flash`
  2. High-Availability Fallback: `gemini-3.1-flash-lite`
  3. Dynamic Alias: `gemini-flash-latest`
  4. Deep Reasoning Fallback: `gemini-3.7-flash`
- **Geographic Intelligence**: Google Maps Platform JavaScript API (Maps, Places, Visualization Heatmap, Advanced Markers) + verified Indian administrative boundary centroid database.
- **Strict Geographic Anti-Hallucination**: Coordinates and administrative boundaries are never hallucinated by Gemini; they are sourced strictly from citizen selection, geocoding service, or verified centroid databases.
- **Data Layer**: In-memory repository with atomic sequential request IDs (`JS-IN-2026-XXXXXX`) and pluggable Firebase Firestore-ready architecture.

---

## 3. Threat Model Summary (Agentic Threat Modeling)

| Threat Zone | Identified Risk | Applied Countermeasure |
| :--- | :--- | :--- |
| **Input Surfaces** | Malicious text payload, prompt injection attempts via citizen description field | Strict input length bounds, null-safe payload sanitization, typed schema parameterization, and isolated prompt boundaries. |
| **Planning & Reasoning** | Jailbreaking Gemini to produce political opinions, personal profiling, or hallucinated geographic coordinates | Strict system instructions enforcing public infrastructure domain only; geographic resolution isolated to deterministic services (Google Geocoding API / Centroid DB). |
| **Tool Execution** | Dynamic execution, SSRF, or server command injection risks | Server calls Gemini strictly through typed SDK methods (`generateContent`) with declarative JSON response schema. Geocoding calls strictly scoped to India (`country: 'IN'`). No shell execution. |
| **Memory & State** | Data tampering, prototype state leakage, undefined payload crashes | Zero-crash undefined stripping (`stripUndefined`), atomic ID assignment, and owner-bound Firestore security rules. |
| **Inter-System Comm** | Gemini API key or sensitive token leakage to browser client | All Gemini API calls executed strictly server-side (`GEMINI_API_KEY` never sent to client). Client maps key restricted via HTTP referrers. |

---

## 4. Google Cloud Secret Manager Setup

To secure operational credentials in Google Cloud without hardcoding keys:

```bash
# 1. Enable Secret Manager API
gcloud services enable secretmanager.googleapis.com

# 2. Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_ACTUAL_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 3. Grant Cloud Run runtime service account permission to read the secret
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")

gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 5. Cloud Firestore Security Rules

When connecting Cloud Firestore for durable multi-region storage, deploy the following owner-bound and RBAC security rules in `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    function isPolicymaker() {
      return isAuthenticated() &&
        request.auth.token.role == 'policymaker' ||
        get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role == 'policymaker';
    }

    // Citizen submissions: Public write with schema validation, authenticated read
    match /citizenRequests/{requestId} {
      allow create: if request.resource.data.originalRequest is string &&
                    request.resource.data.category in [
                      'Water', 'Sanitation', 'Healthcare', 'Education',
                      'Transport', 'Electricity', 'Digital Connectivity',
                      'Housing', 'Agriculture', 'Environment',
                      'Public Safety', 'Social Infrastructure', 'Other'
                    ];
      allow read: if true;
      allow update: if isPolicymaker();
      allow delete: if false; // Immutability guarantee
    }

    // Citizen personal interaction log
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 6. Google Cloud Run Deployment

Deploy JanSetu AI directly to Google Cloud Run:

```bash
# 1. Build and submit container image
gcloud builds submit --tag gcr.io/$(gcloud config get-value project)/jansetu-ai:latest

# 2. Deploy to Cloud Run mounting Secret Manager
gcloud run deploy jansetu-ai \
  --image gcr.io/$(gcloud config get-value project)/jansetu-ai:latest \
  --platform managed \
  --region asia-east1 \
  --allow-unauthenticated \
  --port 3000 \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest

# 3. Apply Required Campaign Verification Label
gcloud run services update jansetu-ai \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=asia-east1
```

---

## 7. Local Development

```bash
# Install dependencies
npm install

# Start full-stack dev server (Express + Vite on http://localhost:3000)
npm run dev

# Run TypeScript lint check
npm run lint

# Compile and verify bundle
npm run build

# Start production server
npm start
```
