import type {
  DemandCluster,
} from '../src/types/citizenRequest.ts';
import type {
  EvidenceCoverageKPI,
  EvidenceQuality,
  GapIndicator,
  GapLevel,
  GeographicEvidence,
  InfrastructureGapAssessment,
} from '../src/types/evidence.ts';
import { clusterStore } from './clusterStore.ts';
import { evidenceStore } from './evidenceStore.ts';

/**
 * Deterministic Infrastructure Gap Engine (Build 07)
 * Strictly evaluates citizen demand against verified/synthetic infrastructure datasets.
 * DOES NOT allow AI to invent benchmarks or hallucinate statistics.
 */
export class InfrastructureGapEngine {
  /**
   * Evaluates all active clusters and generates infrastructure gap assessments.
   */
  public async assessAllClusters(): Promise<InfrastructureGapAssessment[]> {
    const clusters = await clusterStore.getClusters();
    const assessments: InfrastructureGapAssessment[] = [];

    for (const cluster of clusters) {
      const assessment = await this.assessCluster(cluster);
      assessments.push(assessment);
    }

    return assessments;
  }

  /**
   * Evaluates a single Demand Cluster against verified geographic evidence.
   */
  public async assessCluster(cluster: DemandCluster): Promise<InfrastructureGapAssessment> {
    const evidence = await evidenceStore.getEvidenceForGeography(cluster.state, cluster.district);
    const geographyId = evidence?.geographyId || (cluster.district ? `IN-${cluster.state?.slice(0, 2).toUpperCase() || 'XX'}-${cluster.district.toUpperCase().replace(/\s+/g, '-')}` : 'IN-UNKNOWN');

    // Fetch related public projects addressing this domain
    const relatedProjects = await evidenceStore.getPublicProjects(evidence?.geographyId, cluster.category);

    // Fetch conflicting data sources (if any exist for this geography & category)
    const conflictingSources = evidence?.geographyId
      ? await evidenceStore.getConflictingSources(evidence.geographyId, cluster.category)
      : [];

    // Fallback coordinates
    const latitude = cluster.latitude ?? cluster.centroidLatitude ?? null;
    const longitude = cluster.longitude ?? cluster.centroidLongitude ?? null;

    // CASE 1: No evidence available for this geography at all
    if (!evidence) {
      return {
        assessmentId: `GAP-${cluster.clusterId}`,
        geographyId,
        clusterId: cluster.clusterId,
        category: cluster.category,
        canonicalProblem: cluster.canonicalProblem || cluster.subcategory,
        state: cluster.state,
        district: cluster.district,
        latitude,
        longitude,
        evidenceAvailable: false,
        demandRequestCount: cluster.requestCount,
        trendSignal: cluster.trendSignal || 'STABLE',
        growthPercentage: cluster.growthPercentage || 0,
        indicators: [],
        gapLevel: 'INSUFFICIENT_EVIDENCE',
        rationale: 'No verified or baseline demographic/infrastructure data found for this administrative unit. In accordance with responsible governance directives, gap level cannot be assumed solely from citizen complaints.',
        evidenceQuality: 'UNKNOWN',
        relatedProjects: [],
        conflictingSources: [],
        generatedAt: new Date().toISOString(),
        schemaVersion: 1,
      };
    }

    // CASE 2: Geography exists, evaluate category-specific indicators and benchmarks
    return this.evaluateDomainGap(cluster, evidence, geographyId, relatedProjects, conflictingSources, latitude, longitude);
  }

  /**
   * Deterministic Domain Evaluator using official Indian Public Health Standards (IPHS)
   * and national mission benchmarks.
   */
  private evaluateDomainGap(
    cluster: DemandCluster,
    evidence: GeographicEvidence,
    geographyId: string,
    relatedProjects: any[],
    conflictingSources: any[],
    latitude: number | null,
    longitude: number | null
  ): InfrastructureGapAssessment {
    const category = cluster.category.toLowerCase();
    const indicators: GapIndicator[] = [];
    let gapLevel: GapLevel = 'INSUFFICIENT_EVIDENCE';
    let rationale = '';
    const pop = evidence.population;

    // -------------------------------------------------------------
    // HEALTHCARE DOMAIN BENCHMARKING (IPHS Standards)
    // -------------------------------------------------------------
    if (category.includes('health') || category.includes('hospital')) {
      const phcCount = evidence.healthcare.primaryHealthCentres;
      const hospitalCount = evidence.healthcare.hospitals;
      const bedCount = evidence.healthcare.beds;

      // Always include population context
      if (pop !== null) {
        indicators.push({
          name: 'Total District Population',
          value: pop.toLocaleString('en-IN'),
          sourceId: 'SRC-GOV-CENSUS',
          referencePeriod: `${evidence.demographicYear || 2024}`,
        });
      }

      // TEST CASE 29: Missing data remains null, NOT 0
      indicators.push({
        name: 'Operational District & Sub-District Hospitals',
        value: hospitalCount !== null ? hospitalCount : null, // If null, displays "Data unavailable"
        benchmark: pop ? Math.ceil(pop / 250000) : null, // ~1 hospital per 250k
        difference: hospitalCount !== null && pop ? hospitalCount - Math.ceil(pop / 250000) : null,
        unit: 'facilities',
        sourceId: 'SRC-GOV-HFR',
        referencePeriod: '2024-Q1',
      });

      // Primary Health Centres (IPHS Benchmark: 1 per 30,000 population in plains, 1 per 20,000 in hilly/tribal)
      const isHillyOrTribal = (evidence.populationDensity !== null && evidence.populationDensity < 150) || (evidence.state === 'Himachal Pradesh');
      const phcBenchmarkPerPop = isHillyOrTribal ? 20000 : 30000;
      const recommendedPhcs = pop ? Math.ceil(pop / phcBenchmarkPerPop) : null;
      const phcDeficit = phcCount !== null && recommendedPhcs !== null ? phcCount - recommendedPhcs : null;

      indicators.push({
        name: 'Primary Health Centres (PHCs)',
        value: phcCount !== null ? phcCount : null,
        benchmark: recommendedPhcs,
        difference: phcDeficit,
        unit: 'PHCs (IPHS: 1 per ' + (isHillyOrTribal ? '20k' : '30k') + ')',
        sourceId: 'SRC-GOV-HFR',
        referencePeriod: '2024-Q1',
      });

      // Bed ratio per 1,000 population (Benchmark: 2.0 beds per 1k)
      if (bedCount !== null && pop) {
        const bedsPerThousand = Number(((bedCount / pop) * 1000).toFixed(2));
        indicators.push({
          name: 'Hospital Beds per 1,000 Population',
          value: bedsPerThousand,
          benchmark: 2.0,
          difference: Number((bedsPerThousand - 2.0).toFixed(2)),
          unit: 'beds / 1,000 residents',
          sourceId: 'SRC-GOV-HFR',
          referencePeriod: '2024-Q1',
        });
      }

      // Deterministic Gap Evaluation
      if (phcDeficit !== null && recommendedPhcs !== null) {
        const deficitPercent = (Math.abs(phcDeficit) / recommendedPhcs) * 100;
        if (phcDeficit < 0) {
          if (deficitPercent >= 45 || cluster.requestCount > 300) {
            gapLevel = 'SEVERE';
            rationale = `Severe primary healthcare deficit: Existing ${phcCount} PHCs serve ${pop?.toLocaleString()} residents against an IPHS benchmark of ${recommendedPhcs} facilities (${deficitPercent.toFixed(1)}% deficit). Strong alignment with ${cluster.requestCount} citizen reports.`;
          } else if (deficitPercent >= 20 || cluster.requestCount > 100) {
            gapLevel = 'HIGH';
            rationale = `High healthcare infrastructure gap: Deficit of ${Math.abs(phcDeficit)} Primary Health Centres (${deficitPercent.toFixed(1)}% below IPHS benchmark). Corroborated by ${cluster.requestCount} citizen demand reports.`;
          } else {
            gapLevel = 'MODERATE';
            rationale = `Moderate gap: Facility baseline is slightly below benchmark (${deficitPercent.toFixed(1)}% deficit) alongside consistent localized community requests.`;
          }
        } else {
          gapLevel = cluster.requestCount > 150 ? 'MODERATE' : 'LOW';
          rationale = `Facility capacity aligns with national population norms (${phcCount} PHCs vs ${recommendedPhcs} benchmark). Citizen demands appear driven by localized staffing, medicines, or equipment rather than physical facility shortfall.`;
        }
      } else {
        gapLevel = 'INSUFFICIENT_EVIDENCE';
        rationale = 'Essential healthcare indicators are incomplete or unavailable for this administrative region. Gap level cannot be computed without verified facility counts.';
      }
    }

    // -------------------------------------------------------------
    // WATER DOMAIN BENCHMARKING (Jal Jeevan Mission 100% Target)
    // -------------------------------------------------------------
    else if (category.includes('water')) {
      const waterCoverage = evidence.water.coveragePercent;

      if (pop !== null) {
        indicators.push({
          name: 'Total District Population',
          value: pop.toLocaleString('en-IN'),
          sourceId: 'SRC-GOV-CENSUS',
          referencePeriod: `${evidence.demographicYear || 2024}`,
        });
      }

      if (waterCoverage !== null) {
        const benchmark = 100.0;
        const deficit = Number((waterCoverage - benchmark).toFixed(1));
        indicators.push({
          name: 'Functional Household Tap Connection (FHTC) Coverage',
          value: `${waterCoverage}%`,
          benchmark: `${benchmark}%`,
          difference: deficit,
          unit: '% households',
          sourceId: 'SRC-GOV-JJM',
          referencePeriod: '2024-05',
        });

        if (waterCoverage < 50.0) {
          gapLevel = 'SEVERE';
          rationale = `Severe drinking water deficit: Official JJMIS data indicates only ${waterCoverage}% tap coverage (${Math.abs(deficit)}% gap from national mandate). Strongly validates ${cluster.requestCount} citizen shortage reports.`;
        } else if (waterCoverage < 75.0 || cluster.requestCount > 120) {
          gapLevel = 'HIGH';
          rationale = `High water access deficit: Household tap coverage of ${waterCoverage}% leaves an unserved population gap of ${Math.abs(deficit)}%, correlating directly with community demands.`;
        } else if (waterCoverage < 90.0) {
          gapLevel = 'MODERATE';
          rationale = `Moderate water supply gap: District coverage is ${waterCoverage}%. Community reports indicate distribution intermittent supply or localized pipeline contamination.`;
        } else {
          gapLevel = 'LOW';
          rationale = `High baseline tap coverage (${waterCoverage}%). Community requests likely reflect maintenance or distribution pressure issues rather than systemic access shortfall.`;
        }
      } else {
        gapLevel = 'INSUFFICIENT_EVIDENCE';
        rationale = 'Official tap water coverage metrics are unavailable for this district.';
      }
    }

    // -------------------------------------------------------------
    // TRANSPORT / ROAD CONNECTIVITY BENCHMARKING (PMGSY 100% Target)
    // -------------------------------------------------------------
    else if (category.includes('transport') || category.includes('road')) {
      const roadCoverage = evidence.transport.roadIndicator;

      if (roadCoverage !== null) {
        const benchmark = 100.0;
        const deficit = Number((roadCoverage - benchmark).toFixed(1));
        indicators.push({
          name: 'All-Weather Road Habitation Connectivity',
          value: `${roadCoverage}%`,
          benchmark: `${benchmark}%`,
          difference: deficit,
          unit: '% habitations connected',
          sourceId: 'SRC-GOV-PMGSY',
          referencePeriod: '2023-11',
        });

        if (roadCoverage < 70.0) {
          gapLevel = 'HIGH';
          rationale = `High road connectivity deficit: Only ${roadCoverage}% of habitations possess all-weather road access (${Math.abs(deficit)}% deficit), compounding ${cluster.requestCount} citizen transit complaints.`;
        } else if (roadCoverage < 85.0) {
          gapLevel = 'MODERATE';
          rationale = `Moderate transport gap: ${roadCoverage}% connectivity rate. Citizen requests focus on arterial bridge culverts and post-monsoon pothole resurfacing.`;
        } else {
          gapLevel = 'LOW';
          rationale = `Good baseline road connectivity (${roadCoverage}%). Citizen requests reflect spot repairs rather than lack of road network.`;
        }
      } else {
        gapLevel = 'INSUFFICIENT_EVIDENCE';
        rationale = 'Road network inventory not registered for this district.';
      }
    }

    // -------------------------------------------------------------
    // DIGITAL CONNECTIVITY BENCHMARKING (DoT Telecom Portal)
    // TEST CASE 27: Kamrup has digitalConnectivity.indicator = null -> INSUFFICIENT_EVIDENCE
    // -------------------------------------------------------------
    else if (category.includes('digital') || category.includes('telecom') || category.includes('internet')) {
      const digitalIndicator = evidence.digitalConnectivity.indicator;

      if (digitalIndicator !== null) {
        indicators.push({
          name: '4G/5G Cellular & Fiber Optical Coverage',
          value: `${digitalIndicator}%`,
          benchmark: '95.0%',
          difference: Number((digitalIndicator - 95.0).toFixed(1)),
          unit: '% geographic area',
          sourceId: 'SRC-GOV-DOT',
          referencePeriod: '2024-01',
        });

        if (digitalIndicator < 70.0) {
          gapLevel = 'HIGH';
          rationale = `High digital divide: Area network penetration is ${digitalIndicator}%, corroborating community complaints regarding connectivity blackspots.`;
        } else {
          gapLevel = 'MODERATE';
          rationale = `Adequate baseline coverage (${digitalIndicator}%), but localized signal shadow zones present.`;
        }
      } else {
        // TEST CASE 27: System MUST NOT infer HIGH GAP simply because many citizens complained!
        gapLevel = 'INSUFFICIENT_EVIDENCE';
        rationale = 'No verified telecommunication or optical fiber coverage data found in government portals for this district. In compliance with strict governance directives, high gap level cannot be assumed without verified technical baseline.';
      }
    }

    // -------------------------------------------------------------
    // EDUCATION BENCHMARKING
    // -------------------------------------------------------------
    else if (category.includes('education') || category.includes('school')) {
      const schoolCount = evidence.education.schools;
      if (schoolCount !== null && pop !== null) {
        const schoolsPerTenThousand = Number(((schoolCount / pop) * 10000).toFixed(1));
        indicators.push({
          name: 'Operational Schools',
          value: schoolCount,
          sourceId: 'SRC-GOV-CENSUS',
          referencePeriod: '2023',
        });
        indicators.push({
          name: 'Schools per 10,000 Residents',
          value: schoolsPerTenThousand,
          benchmark: 18.0,
          difference: Number((schoolsPerTenThousand - 18.0).toFixed(1)),
          unit: 'schools / 10k',
          sourceId: 'SRC-DEMO-SYNTHETIC',
          referencePeriod: '2023',
        });

        gapLevel = schoolsPerTenThousand < 12.0 ? 'HIGH' : schoolsPerTenThousand < 16.0 ? 'MODERATE' : 'LOW';
        rationale = `School density is ${schoolsPerTenThousand} per 10k residents. Citizen demands focus on classroom infrastructure and teacher availability.`;
      } else {
        gapLevel = 'INSUFFICIENT_EVIDENCE';
        rationale = 'Insufficient public education facility dataset for this district.';
      }
    }

    // -------------------------------------------------------------
    // OTHER DOMAINS
    // -------------------------------------------------------------
    else {
      gapLevel = 'INSUFFICIENT_EVIDENCE';
      rationale = `Official baseline indicators for category "${cluster.category}" are not currently loaded in the Public Evidence Registry.`;
    }

    return {
      assessmentId: `GAP-${cluster.clusterId}`,
      geographyId,
      clusterId: cluster.clusterId,
      category: cluster.category,
      canonicalProblem: cluster.canonicalProblem || cluster.subcategory,
      state: cluster.state,
      district: cluster.district,
      latitude,
      longitude,
      evidenceAvailable: indicators.length > 0 && gapLevel !== 'INSUFFICIENT_EVIDENCE',
      demandRequestCount: cluster.requestCount,
      trendSignal: cluster.trendSignal || 'STABLE',
      growthPercentage: cluster.growthPercentage || 0,
      indicators,
      gapLevel,
      rationale,
      evidenceQuality: evidence.dataQuality as EvidenceQuality,
      conflictingSources,
      relatedProjects,
      generatedAt: new Date().toISOString(),
      schemaVersion: 1,
    };
  }

  /**
   * Computes the Evidence Coverage KPI deterministically across all demand clusters.
   */
  public async getEvidenceCoverageKPI(): Promise<EvidenceCoverageKPI> {
    const clusters = await clusterStore.getClusters();
    const totalClusters = clusters.length;

    if (totalClusters === 0) {
      return {
        totalClusters: 0,
        assessedClusters: 0,
        sufficientEvidenceClusters: 0,
        insufficientEvidenceClusters: 0,
        coveragePercentage: 0,
      };
    }

    let sufficientEvidenceCount = 0;
    let insufficientCount = 0;

    for (const cluster of clusters) {
      const evidence = await evidenceStore.getEvidenceForGeography(cluster.state, cluster.district);
      if (!evidence) {
        insufficientCount++;
        continue;
      }

      // Check if domain-specific evidence exists for the category
      const cat = cluster.category.toLowerCase();
      let hasDomainEvidence = false;
      if (cat.includes('health') && (evidence.healthcare.primaryHealthCentres !== null || evidence.healthcare.hospitals !== null)) {
        hasDomainEvidence = true;
      } else if (cat.includes('water') && evidence.water.coveragePercent !== null) {
        hasDomainEvidence = true;
      } else if (cat.includes('transport') && evidence.transport.roadIndicator !== null) {
        hasDomainEvidence = true;
      } else if (cat.includes('education') && evidence.education.schools !== null) {
        hasDomainEvidence = true;
      } else if (cat.includes('digital') && evidence.digitalConnectivity.indicator !== null) {
        hasDomainEvidence = true;
      }

      if (hasDomainEvidence) {
        sufficientEvidenceCount++;
      } else {
        insufficientCount++;
      }
    }

    const coveragePercentage = Number(((sufficientEvidenceCount / totalClusters) * 100).toFixed(1));

    return {
      totalClusters,
      assessedClusters: totalClusters,
      sufficientEvidenceClusters: sufficientEvidenceCount,
      insufficientEvidenceClusters: insufficientCount,
      coveragePercentage,
    };
  }
}

export const infrastructureGapEngine = new InfrastructureGapEngine();
