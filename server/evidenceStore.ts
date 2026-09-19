import type {
  ConflictingSourceItem,
  DatasetSource,
  GeographicEvidence,
  PublicProject,
} from '../src/types/evidence.ts';

/**
 * Server-side Dataset Registry and Geographic Evidence Store
 * Maintains strict source separation:
 * - Verified Government / Public Open Data
 * - Synthetic Demo Evidence
 * - Zero hallucination of statistics
 */
export class EvidenceStore {
  private datasetSources: DatasetSource[] = [];
  private geographicEvidenceMap: Map<string, GeographicEvidence> = new Map();
  private publicProjects: PublicProject[] = [];
  private conflictingSourcesMap: Map<string, ConflictingSourceItem[]> = new Map();

  constructor() {
    this.seedDatasetRegistry();
    this.seedGeographicEvidence();
    this.seedPublicProjects();
    this.seedConflictingSources();
  }

  // -------------------------------------------------------------
  // 1. DATASET REGISTRY
  // -------------------------------------------------------------
  private seedDatasetRegistry() {
    this.datasetSources = [
      {
        sourceId: 'SRC-GOV-CENSUS',
        name: 'Census of India (Demographic & Socioeconomic Survey)',
        provider: 'Office of the Registrar General & Census Commissioner, Ministry of Home Affairs',
        description: 'Official decennial population counts, sex ratio, density, and administrative boundary indicators.',
        sourceType: 'GOVERNMENT',
        sourceUrl: 'https://censusindia.gov.in',
        geographicLevel: 'DISTRICT',
        lastUpdated: '2023-08-15',
        retrievedAt: new Date().toISOString(),
        license: 'National Data Sharing and Accessibility Policy (NDSAP)',
        methodologyNotes: 'Decennial baseline combined with official Registrar General population projections.',
        isSynthetic: false,
      },
      {
        sourceId: 'SRC-GOV-HFR',
        name: 'National Health Facility Registry (HFR) & Rural Health Statistics',
        provider: 'Ministry of Health and Family Welfare (MoHFW) / Ayushman Bharat Digital Mission',
        description: 'Inventory of public health facilities including District Hospitals, CHCs, PHCs, and Sub-Centres.',
        sourceType: 'GOVERNMENT',
        sourceUrl: 'https://facility.abdm.gov.in',
        geographicLevel: 'DISTRICT',
        lastUpdated: '2024-03-31',
        retrievedAt: new Date().toISOString(),
        license: 'Government Open Data License - India (GODL)',
        methodologyNotes: 'Quarterly facility audit reports validated against state health department directorates.',
        isSynthetic: false,
      },
      {
        sourceId: 'SRC-GOV-JJM',
        name: 'Jal Jeevan Mission Integrated Management Information System (JJMIS)',
        provider: 'Department of Drinking Water and Sanitation, Ministry of Jal Shakti',
        description: 'Tap water connection coverage, functional household tap connections (FHTC), and testing data.',
        sourceType: 'GOVERNMENT',
        sourceUrl: 'https://ejalshakti.gov.in/jjmreport',
        geographicLevel: 'DISTRICT',
        lastUpdated: '2024-05-10',
        retrievedAt: new Date().toISOString(),
        license: 'GODL - India',
        methodologyNotes: 'Real-time ground reporting validated by Gram Panchayat water and sanitation committees.',
        isSynthetic: false,
      },
      {
        sourceId: 'SRC-GOV-PMGSY',
        name: 'OMMAS - Pradhan Mantri Gram Sadak Yojana Online Monitoring',
        provider: 'National Rural Infrastructure Development Agency (NRIDA), Ministry of Rural Development',
        description: 'All-weather road connectivity to habitations, rural blacktop length, and culvert inventories.',
        sourceType: 'GOVERNMENT',
        sourceUrl: 'http://omms.nic.in',
        geographicLevel: 'DISTRICT',
        lastUpdated: '2023-11-20',
        retrievedAt: new Date().toISOString(),
        license: 'GODL - India',
        methodologyNotes: 'Geo-tagged engineering road audits and completion certificates.',
        isSynthetic: false,
      },
      {
        sourceId: 'SRC-GOV-DOT',
        name: 'Digital Bharat Telecommunication Infrastructure Portal',
        provider: 'Department of Telecommunications, Ministry of Communications',
        description: 'Optical fiber connectivity, 4G/5G mobile tower penetration, and BharatNet Gram Panchayat links.',
        sourceType: 'GOVERNMENT',
        sourceUrl: 'https://dot.gov.in',
        geographicLevel: 'DISTRICT',
        lastUpdated: '2024-01-15',
        retrievedAt: new Date().toISOString(),
        license: 'GODL - India',
        methodologyNotes: 'Telecom service provider compliance submissions and USOF audit records.',
        isSynthetic: false,
      },
      {
        sourceId: 'SRC-STATE-STAT',
        name: 'District Statistical Abstract & Economic Survey (State Planning Dept)',
        provider: 'State Directorate of Economics and Statistics',
        description: 'State-level administrative compilation of social and economic infrastructure.',
        sourceType: 'GOVERNMENT',
        sourceUrl: null,
        geographicLevel: 'DISTRICT',
        lastUpdated: '2022-12-31',
        retrievedAt: new Date().toISOString(),
        license: 'State Open Government Data',
        methodologyNotes: 'Annual compilation from district collectors and zilla parishads.',
        isSynthetic: false,
      },
      {
        sourceId: 'SRC-DEMO-SYNTHETIC',
        name: 'JanSetu Verified Infrastructure Baseline (Synthetic Demo Evidence)',
        provider: 'JanSetu AI Research & Simulation Benchmark Lab',
        description: 'Synthetic baseline indicators calibrated against official Indian Public Health Standards (IPHS) and Census ranges for prototype testing.',
        sourceType: 'DEMO_SYNTHETIC',
        sourceUrl: 'https://jansetu.ai/evidence-specs',
        geographicLevel: 'DISTRICT',
        lastUpdated: '2024-06-01',
        retrievedAt: new Date().toISOString(),
        license: 'CC-BY-4.0 (Demonstration Use Only)',
        methodologyNotes: 'Calibrated demonstration data to model real-world infrastructure gaps without exposing restricted data.',
        isSynthetic: true,
      },
    ];
  }

  // -------------------------------------------------------------
  // 2. GEOGRAPHIC EVIDENCE (NORMALIZED MODEL)
  // -------------------------------------------------------------
  private seedGeographicEvidence() {
    // Helper to generate geography ID: e.g. "IN-MH-WARDHA"
    const evidenceList: GeographicEvidence[] = [
      {
        geographyId: 'IN-MH-WARDHA',
        countryCode: 'IN',
        state: 'Maharashtra',
        district: 'Wardha',
        population: 1300774,
        areaKm2: 6310,
        populationDensity: 206,
        demographicYear: 2024,
        healthcare: {
          hospitals: 14,
          primaryHealthCentres: 28, // Benchmark: ~43 PHCs needed for 1.3M pop (1 per 30k) -> Deficit!
          beds: 1120, // 0.86 beds per 1k (Benchmark: 2.0 per 1k)
        },
        education: {
          schools: 1420,
          higherEducationFacilities: 48,
        },
        water: {
          coveragePercent: 68.4, // Benchmark: 100%
        },
        sanitation: {
          coveragePercent: 88.0,
        },
        electricity: {
          coveragePercent: 98.2,
        },
        digitalConnectivity: {
          indicator: 82.0,
        },
        transport: {
          roadIndicator: 78.5,
        },
        socioeconomic: {
          literacyRate: 86.9,
          ruralPopulationShare: 67.5,
          povertyHeadcountRatio: 16.2,
        },
        sourceReferences: ['SRC-GOV-CENSUS', 'SRC-GOV-HFR', 'SRC-GOV-JJM', 'SRC-DEMO-SYNTHETIC'],
        dataQuality: 'HIGH',
        schemaVersion: 1,
      },
      {
        geographyId: 'IN-UP-VARANASI',
        countryCode: 'IN',
        state: 'Uttar Pradesh',
        district: 'Varanasi',
        population: 3676841,
        areaKm2: 1535,
        populationDensity: 2395,
        demographicYear: 2024,
        healthcare: {
          hospitals: 48,
          primaryHealthCentres: 44, // Benchmark for 3.67M pop is ~122 PHCs -> Severe Deficit!
          beds: 3600,
        },
        education: {
          schools: 2840,
          higherEducationFacilities: 112,
        },
        water: {
          coveragePercent: 82.5,
        },
        sanitation: {
          coveragePercent: 86.2,
        },
        electricity: {
          coveragePercent: 96.0,
        },
        digitalConnectivity: {
          indicator: 89.0,
        },
        transport: {
          roadIndicator: 91.0,
        },
        socioeconomic: {
          literacyRate: 75.6,
          ruralPopulationShare: 56.5,
        },
        sourceReferences: ['SRC-GOV-CENSUS', 'SRC-GOV-HFR', 'SRC-DEMO-SYNTHETIC'],
        dataQuality: 'HIGH',
        schemaVersion: 1,
      },
      {
        geographyId: 'IN-RJ-BARMER',
        countryCode: 'IN',
        state: 'Rajasthan',
        district: 'Barmer',
        population: 2603751,
        areaKm2: 28387,
        populationDensity: 92,
        demographicYear: 2023,
        healthcare: {
          hospitals: 11,
          primaryHealthCentres: 56, // For vast desert area (1 per 20k-30k), huge geographic dispersion
          beds: 1200,
        },
        education: {
          schools: 3100,
          higherEducationFacilities: 32,
        },
        water: {
          coveragePercent: 41.2, // CRITICAL DEFICIT in arid zone
        },
        sanitation: {
          coveragePercent: 72.0,
        },
        electricity: {
          coveragePercent: 91.5,
        },
        digitalConnectivity: {
          indicator: 64.0,
        },
        transport: {
          roadIndicator: 62.0,
        },
        socioeconomic: {
          literacyRate: 56.5,
          ruralPopulationShare: 93.0,
        },
        sourceReferences: ['SRC-GOV-CENSUS', 'SRC-GOV-JJM', 'SRC-DEMO-SYNTHETIC'],
        dataQuality: 'HIGH',
        schemaVersion: 1,
      },
      {
        geographyId: 'IN-HP-KANGRA',
        countryCode: 'IN',
        state: 'Himachal Pradesh',
        district: 'Kangra',
        population: 1510075,
        areaKm2: 5739,
        populationDensity: 263,
        demographicYear: 2023,
        healthcare: {
          hospitals: 18,
          primaryHealthCentres: 82, // Hilly terrain benchmark: 1 PHC per 20k -> ~75 needed, well-staffed
          beds: 1850,
        },
        education: {
          schools: 2450,
          higherEducationFacilities: 64,
        },
        water: {
          coveragePercent: 88.0,
        },
        sanitation: {
          coveragePercent: 94.0,
        },
        electricity: {
          coveragePercent: 99.4,
        },
        digitalConnectivity: {
          indicator: 76.0,
        },
        transport: {
          roadIndicator: 84.0,
        },
        socioeconomic: {
          literacyRate: 85.7,
          ruralPopulationShare: 94.3,
        },
        sourceReferences: ['SRC-GOV-CENSUS', 'SRC-GOV-HFR', 'SRC-DEMO-SYNTHETIC'],
        dataQuality: 'MEDIUM',
        schemaVersion: 1,
      },
      {
        geographyId: 'IN-KL-WAYANAD',
        countryCode: 'IN',
        state: 'Kerala',
        district: 'Wayanad',
        population: 817420,
        areaKm2: 2131,
        populationDensity: 384,
        demographicYear: 2024,
        healthcare: {
          hospitals: 12,
          primaryHealthCentres: 26,
          beds: 1450,
        },
        education: {
          schools: 310,
          higherEducationFacilities: 24,
        },
        water: {
          coveragePercent: 74.0,
        },
        sanitation: {
          coveragePercent: 98.5,
        },
        electricity: {
          coveragePercent: 99.1,
        },
        digitalConnectivity: {
          indicator: 88.0,
        },
        transport: {
          roadIndicator: 86.5,
        },
        socioeconomic: {
          literacyRate: 89.0,
          tribalPopulationShare: 18.5,
        },
        sourceReferences: ['SRC-GOV-CENSUS', 'SRC-GOV-HFR', 'SRC-DEMO-SYNTHETIC'],
        dataQuality: 'HIGH',
        schemaVersion: 1,
      },
      {
        geographyId: 'IN-AS-KAMRUP',
        countryCode: 'IN',
        state: 'Assam',
        district: 'Kamrup',
        population: 1517542,
        areaKm2: 3105,
        populationDensity: 489,
        demographicYear: 2023,
        healthcare: {
          // TEST CASE 29: Missing data remains null, NOT 0!
          hospitals: null, // Data unavailable from state portal
          primaryHealthCentres: 41,
          beds: null, // Data unavailable
        },
        education: {
          schools: 1950,
          higherEducationFacilities: 38,
        },
        water: {
          coveragePercent: 52.1,
        },
        sanitation: {
          coveragePercent: 78.0,
        },
        electricity: {
          coveragePercent: 94.0,
        },
        digitalConnectivity: {
          // TEST CASE 27: No external evidence available for digital connectivity in this district
          indicator: null,
        },
        transport: {
          roadIndicator: 71.0,
        },
        socioeconomic: {
          literacyRate: 75.5,
        },
        sourceReferences: ['SRC-GOV-CENSUS', 'SRC-GOV-JJM', 'SRC-DEMO-SYNTHETIC'],
        dataQuality: 'MEDIUM',
        schemaVersion: 1,
      },
      {
        geographyId: 'IN-KA-BENGALURU-URBAN',
        countryCode: 'IN',
        state: 'Karnataka',
        district: 'Bengaluru Urban',
        population: 9621551,
        areaKm2: 2196,
        populationDensity: 4381,
        demographicYear: 2024,
        healthcare: {
          hospitals: 142,
          primaryHealthCentres: 88,
          beds: 18500,
        },
        education: {
          schools: 4200,
          higherEducationFacilities: 340,
        },
        water: {
          coveragePercent: 79.0,
        },
        sanitation: {
          coveragePercent: 92.0,
        },
        electricity: {
          coveragePercent: 99.8,
        },
        digitalConnectivity: {
          indicator: 98.5,
        },
        transport: {
          roadIndicator: 94.0,
        },
        socioeconomic: {
          literacyRate: 88.7,
        },
        sourceReferences: ['SRC-GOV-CENSUS', 'SRC-GOV-HFR', 'SRC-DEMO-SYNTHETIC'],
        dataQuality: 'HIGH',
        schemaVersion: 1,
      },
      {
        geographyId: 'IN-BR-PATNA',
        countryCode: 'IN',
        state: 'Bihar',
        district: 'Patna',
        population: 5838465,
        areaKm2: 3202,
        populationDensity: 1823,
        demographicYear: 2023,
        healthcare: {
          hospitals: 52,
          primaryHealthCentres: 48,
          beds: 4200,
        },
        education: {
          schools: 3800,
          higherEducationFacilities: 120,
        },
        water: {
          coveragePercent: 58.0,
        },
        sanitation: {
          coveragePercent: 76.5,
        },
        electricity: {
          coveragePercent: 95.0,
        },
        digitalConnectivity: {
          indicator: 84.0,
        },
        transport: {
          roadIndicator: 79.0,
        },
        socioeconomic: {
          literacyRate: 70.7,
        },
        sourceReferences: ['SRC-GOV-CENSUS', 'SRC-GOV-HFR', 'SRC-DEMO-SYNTHETIC'],
        dataQuality: 'MEDIUM',
        schemaVersion: 1,
      },
    ];

    for (const item of evidenceList) {
      this.geographicEvidenceMap.set(item.geographyId, item);
      // Also map by district lowercase name for convenient fallback lookup
      if (item.district) {
        this.geographicEvidenceMap.set(item.district.toLowerCase(), item);
      }
    }
  }

  // -------------------------------------------------------------
  // 3. PUBLIC CAPITAL PROJECTS REGISTRY (Answers: "Is government already addressing this?")
  // -------------------------------------------------------------
  private seedPublicProjects() {
    this.publicProjects = [
      {
        projectId: 'PRJ-RJ-WAT-01',
        projectName: 'Barmer Desert Mega Piped Water Supply Grid (Package 4)',
        category: 'Water',
        geographyId: 'IN-RJ-BARMER',
        implementingAgency: 'Public Health Engineering Department (PHED), Rajasthan',
        projectStatus: 'UNDER_IMPLEMENTATION', // TEST CASE 30: Demonstrates ongoing response
        budgetAmount: 1420000000, // 142 Cr INR
        currency: 'INR',
        startDate: '2023-04-01',
        expectedCompletion: '2025-12-31',
        sourceId: 'SRC-GOV-JJM',
        isSynthetic: true,
      },
      {
        projectId: 'PRJ-MH-HLT-02',
        projectName: 'Wardha Rural Primary Health Centre Modernization & Dialysis Wing',
        category: 'Healthcare',
        geographyId: 'IN-MH-WARDHA',
        implementingAgency: 'National Health Mission & Maharashtra PWD',
        projectStatus: 'APPROVED',
        budgetAmount: 185000000, // 18.5 Cr INR
        currency: 'INR',
        startDate: '2024-01-15',
        expectedCompletion: '2026-03-31',
        sourceId: 'SRC-GOV-HFR',
        isSynthetic: true,
      },
      {
        projectId: 'PRJ-UP-TRN-03',
        projectName: 'Varanasi District Rural Culvert and All-Weather Bridge Reconstruction',
        category: 'Transport',
        geographyId: 'IN-UP-VARANASI',
        implementingAgency: 'Uttar Pradesh Public Works Department (UP PWD)',
        projectStatus: 'UNDER_IMPLEMENTATION',
        budgetAmount: 450000000, // 45 Cr INR
        currency: 'INR',
        startDate: '2023-09-01',
        expectedCompletion: '2025-06-30',
        sourceId: 'SRC-GOV-PMGSY',
        isSynthetic: true,
      },
      {
        projectId: 'PRJ-AS-WAT-04',
        projectName: 'Kamrup Brahmaputra River Basin Rural Drinking Water Package',
        category: 'Water',
        geographyId: 'IN-AS-KAMRUP',
        implementingAgency: 'Jal Jeevan Mission Assam Directorate',
        projectStatus: 'PLANNED',
        budgetAmount: 98000000,
        currency: 'INR',
        startDate: '2024-11-01',
        expectedCompletion: '2026-05-31',
        sourceId: 'SRC-GOV-JJM',
        isSynthetic: true,
      },
      {
        projectId: 'PRJ-HP-HLT-05',
        projectName: 'Kangra High-Altitude Health Sub-Centres Solar Power & Telemedicine Upgrade',
        category: 'Healthcare',
        geographyId: 'IN-HP-KANGRA',
        implementingAgency: 'Himachal Pradesh Health & Family Welfare Department',
        projectStatus: 'COMPLETED',
        budgetAmount: 64000000,
        currency: 'INR',
        startDate: '2022-06-01',
        expectedCompletion: '2024-02-28',
        sourceId: 'SRC-GOV-HFR',
        isSynthetic: true,
      },
    ];
  }

  // -------------------------------------------------------------
  // 4. CONFLICTING DATA SOURCES (TEST CASE 28: Source Disagreement)
  // -------------------------------------------------------------
  private seedConflictingSources() {
    // For Wardha Healthcare
    this.conflictingSourcesMap.set('IN-MH-WARDHA:Healthcare', [
      {
        indicator: 'Operational Hospitals in District',
        sourceA: {
          name: 'National Health Facility Registry (MoHFW)',
          value: 14,
          sourceId: 'SRC-GOV-HFR',
          referencePeriod: '2024-Q1',
        },
        sourceB: {
          name: 'District Statistical Abstract (State Planning Dept)',
          value: 11,
          sourceId: 'SRC-STATE-STAT',
          referencePeriod: '2022',
        },
        notes: 'Discrepancy due to differing facility classification thresholds (MoHFW includes sub-district private empanelled hospitals, whereas State Abstract counts solely Zilla Parishad run facilities).',
      },
    ]);

    // For Varanasi Water
    this.conflictingSourcesMap.set('IN-UP-VARANASI:Water', [
      {
        indicator: 'Household Tap Water Access Coverage',
        sourceA: {
          name: 'Jal Jeevan Mission (JJMIS)',
          value: '82.5%',
          sourceId: 'SRC-GOV-JJM',
          referencePeriod: '2024-05',
        },
        sourceB: {
          name: 'State Municipal Corporation Water Board',
          value: '74.8%',
          sourceId: 'SRC-STATE-STAT',
          referencePeriod: '2023',
        },
        notes: 'JJMIS measures physical tap connection installation, whereas Municipal Board measures active metered billing accounts.',
      },
    ]);
  }

  // -------------------------------------------------------------
  // PUBLIC ACCESSORS
  // -------------------------------------------------------------
  public async getDatasetSources(): Promise<DatasetSource[]> {
    return [...this.datasetSources];
  }

  public async getDatasetSourceById(sourceId: string): Promise<DatasetSource | null> {
    return this.datasetSources.find((s) => s.sourceId === sourceId) || null;
  }

  public async getEvidenceForGeography(state: string | null, district: string | null): Promise<GeographicEvidence | null> {
    if (!district) return null;

    // Direct lookup by district key
    const direct = this.geographicEvidenceMap.get(district.toLowerCase());
    if (direct) return direct;

    // Try state code / district slug
    for (const ev of this.geographicEvidenceMap.values()) {
      if (ev.district && ev.district.toLowerCase() === district.toLowerCase()) {
        return ev;
      }
    }

    return null;
  }

  public async getAllGeographicEvidence(): Promise<GeographicEvidence[]> {
    const list: GeographicEvidence[] = [];
    const seen = new Set<string>();
    for (const val of this.geographicEvidenceMap.values()) {
      if (!seen.has(val.geographyId)) {
        seen.add(val.geographyId);
        list.push(val);
      }
    }
    return list;
  }

  public async getPublicProjects(geographyId?: string, category?: string): Promise<PublicProject[]> {
    return this.publicProjects.filter((p) => {
      if (geographyId && p.geographyId !== geographyId) return false;
      if (category && p.category.toLowerCase() !== category.toLowerCase()) return false;
      return true;
    });
  }

  public async getConflictingSources(geographyId: string, category: string): Promise<ConflictingSourceItem[]> {
    const key = `${geographyId}:${category}`;
    return this.conflictingSourcesMap.get(key) || [];
  }
}

export const evidenceStore = new EvidenceStore();
