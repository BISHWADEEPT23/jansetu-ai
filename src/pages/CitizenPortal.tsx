import React, { useState, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Edit3,
  RotateCcw,
  MapPin,
  Copy,
  Check,
  Languages,
  HelpCircle,
  GitFork,
  MessageSquare,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import type {
  CitizenRequestAnalysis,
  LocationData,
  LocationGeoData,
  InfrastructureCategory,
  CitizenRequestType,
  RequestUrgency,
  CitizenRequest,
  ClarificationTurn,
  DetectedSubIssue,
} from '../types/citizenRequest.ts';
import { analyzeCitizenRequest } from '../services/geminiService.ts';
import { requestService, type SubmitRequestPayload } from '../services/requestService.ts';
import {
  INDIAN_STATES_DISTRICTS,
  SAMPLE_PROMPT_PRESETS,
  BENCHMARK_TEST_CASES,
} from '../data/indiaLocations.ts';
import { VoiceIntakePanel } from '../components/VoiceIntakePanel.tsx';
import { LocationSelector } from '../components/LocationSelector.tsx';
import { getDistrictCentroid } from '../services/geoService.ts';

type PortalStep = 'INPUT' | 'CLARIFICATION' | 'MULTI_ISSUE_CHOICE' | 'CONFIRMATION' | 'SUCCESS';

interface CitizenPortalProps {
  onReturnHome: () => void;
  onViewDashboard: () => void;
}

const CATEGORIES: InfrastructureCategory[] = [
  'Water',
  'Sanitation',
  'Healthcare',
  'Education',
  'Transport',
  'Electricity',
  'Digital Connectivity',
  'Housing',
  'Agriculture',
  'Environment',
  'Public Safety',
  'Social Infrastructure',
  'Other',
];

const REQUEST_TYPES: CitizenRequestType[] = [
  'New Infrastructure',
  'Repair',
  'Upgrade',
  'Service Improvement',
  'Accessibility',
  'Emergency',
  'Other',
];

const URGENCIES: RequestUrgency[] = ['Low', 'Medium', 'High', 'Critical'];

export const CitizenPortal: React.FC<CitizenPortalProps> = ({
  onReturnHome,
  onViewDashboard,
}) => {
  const [step, setStep] = useState<PortalStep>('INPUT');

  // Input fields
  const [requestText, setRequestText] = useState('');
  const [activeInputTab, setActiveInputTab] = useState<'TEXT' | 'VOICE'>('TEXT');
  const [currentInputMethod, setCurrentInputMethod] = useState<'TEXT' | 'VOICE'>('TEXT');
  const [originalVoiceTranscript, setOriginalVoiceTranscript] = useState<string | null>(null);
  const [voiceSelectedLanguage, setVoiceSelectedLanguage] = useState<string | null>(null);

  const [location, setLocation] = useState<LocationGeoData>({
    countryCode: 'IN',
    country: 'India',
    state: 'Maharashtra',
    stateCode: 'MH',
    district: 'Wardha',
    districtCode: null,
    locality: 'Seloo Village',
    latitude: 20.8356,
    longitude: 78.7056,
    geoStatus: 'VERIFIED',
    geoSource: 'GEOCODED_LOCATION',
  });

  // Voice recognition state
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null);

  // Analysis result & edit state
  const [analysis, setAnalysis] = useState<CitizenRequestAnalysis | null>(null);
  const [isEditingAnalysis, setIsEditingAnalysis] = useState(false);
  const [editedAnalysis, setEditedAnalysis] = useState<CitizenRequestAnalysis | null>(null);

  // Clarification state (Up to 2 turns)
  const [clarificationHistory, setClarificationHistory] = useState<ClarificationTurn[]>([]);
  const [currentClarificationAnswer, setCurrentClarificationAnswer] = useState('');
  const [clarificationTurnCount, setClarificationTurnCount] = useState(0);

  // Multi-issue decision state
  const [multiIssueDecision, setMultiIssueDecision] = useState<'SPLIT' | 'COMBINED' | null>(null);

  // Submission state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [submittedRequests, setSubmittedRequests] = useState<CitizenRequest[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Active benchmark pill
  const [activeBenchmarkId, setActiveBenchmarkId] = useState<string | null>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      setSpeechSupported(true);
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'hi-IN';

        recognition.onresult = (event: any) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          if (transcript) {
            setRequestText((prev) => (prev ? `${prev} ${transcript}` : transcript));
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('[SpeechRecognition] error:', event.error);
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        setRecognitionInstance(recognition);
      } catch (e) {
        console.warn('SpeechRecognition failed initialization', e);
      }
    }
  }, []);

  const toggleVoiceRecording = () => {
    if (!speechSupported) {
      alert(
        'Voice recording uses Web Speech API which is not supported in this browser window. Please type your request or select one of the presets.'
      );
      return;
    }

    if (isRecording) {
      try {
        recognitionInstance?.stop();
      } catch (e) {}
      setIsRecording(false);
    } else {
      try {
        recognitionInstance?.start();
        setIsRecording(true);
      } catch (e) {
        console.warn('Recognition start error:', e);
        setIsRecording(true);
      }
    }
  };

  // Handle Preset selection
  const handleSelectPreset = (preset: (typeof SAMPLE_PROMPT_PRESETS)[0]) => {
    setRequestText(preset.text);
    const centroid = getDistrictCentroid(preset.district);
    setLocation({
      countryCode: 'IN',
      country: 'India',
      state: preset.state,
      stateCode: null,
      district: preset.district,
      districtCode: null,
      locality: preset.locality,
      latitude: centroid ? centroid.latitude : null,
      longitude: centroid ? centroid.longitude : null,
      geoStatus: centroid ? 'APPROXIMATE' : 'UNRESOLVED',
      geoSource: centroid ? 'ADMINISTRATIVE_CENTROID' : 'UNKNOWN',
    });
    setActiveBenchmarkId(null);
    setAnalysisError(null);
  };

  // Handle Benchmark Test Case selection
  const handleSelectBenchmark = (tc: (typeof BENCHMARK_TEST_CASES)[0]) => {
    setRequestText(tc.text);
    const centroid = getDistrictCentroid(tc.district);
    setLocation({
      countryCode: 'IN',
      country: 'India',
      state: tc.state,
      stateCode: null,
      district: tc.district,
      districtCode: null,
      locality: tc.locality,
      latitude: centroid ? centroid.latitude : null,
      longitude: centroid ? centroid.longitude : null,
      geoStatus: centroid ? 'APPROXIMATE' : 'UNRESOLVED',
      geoSource: centroid ? 'ADMINISTRATIVE_CENTROID' : 'UNKNOWN',
    });
    setActiveBenchmarkId(tc.id);
    setAnalysisError(null);
  };

  // Handle Confirmed Transcript from Voice Intake Panel
  const handleVoiceConfirmed = async (data: {
    transcript: string;
    detectedLanguage: string;
    selectedLanguage: string;
    locationHint?: Partial<LocationData>;
  }) => {
    setRequestText(data.transcript);
    setCurrentInputMethod('VOICE');
    setOriginalVoiceTranscript(data.transcript);
    setVoiceSelectedLanguage(data.selectedLanguage);

    if (data.locationHint) {
      setLocation((prev) => ({
        ...prev,
        ...data.locationHint,
      }));
    }

    // Immediately trigger analysis pipeline on the confirmed transcript
    await handleAnalyzeRequest(undefined, data.transcript, undefined, {
      inputMethod: 'VOICE',
      originalTranscript: data.transcript,
      selectedLanguage: data.selectedLanguage,
    });
  };

  // Step 1: Submit text or voice transcript to server-side Gemini
  const handleAnalyzeRequest = async (
    e?: React.FormEvent,
    customText?: string,
    history?: ClarificationTurn[],
    inputMeta?: {
      inputMethod?: 'TEXT' | 'VOICE';
      originalTranscript?: string | null;
      selectedLanguage?: string | null;
    }
  ) => {
    if (e) e.preventDefault();

    const textToAnalyze = customText || requestText;

    if (!textToAnalyze.trim()) {
      setAnalysisError('Please enter a description of the infrastructure or development need.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);

    const effectiveMethod = inputMeta?.inputMethod || currentInputMethod;
    const effectiveOrigTrans =
      inputMeta?.originalTranscript !== undefined
        ? inputMeta.originalTranscript
        : originalVoiceTranscript;
    const effectiveLang =
      inputMeta?.selectedLanguage !== undefined
        ? inputMeta.selectedLanguage
        : voiceSelectedLanguage;

    try {
      const activeHistory = history || clarificationHistory;
      const result = await analyzeCitizenRequest({
        text: textToAnalyze.trim(),
        location,
        clarificationHistory: activeHistory.length > 0 ? activeHistory : undefined,
        inputMethod: effectiveMethod,
        originalTranscript: effectiveOrigTrans,
        selectedLanguage: effectiveLang,
      });

      setAnalysis(result);
      setEditedAnalysis(result);
      setIsEditingAnalysis(false);

      // Check if Clarification is requested and we haven't hit the 2-turn maximum
      if (
        result.clarificationRequired &&
        clarificationTurnCount < 2 &&
        result.clarificationQuestions &&
        result.clarificationQuestions.length > 0
      ) {
        setStep('CLARIFICATION');
        return;
      }

      // Check if Multiple Issues were detected and need citizen direction
      if (
        result.multipleIssuesDetected &&
        result.detectedIssues &&
        result.detectedIssues.length > 1 &&
        multiIssueDecision === null
      ) {
        setStep('MULTI_ISSUE_CHOICE');
        return;
      }

      // Standard single issue or settled clarification -> move to review
      setStep('CONFIRMATION');
    } catch (err: any) {
      console.error('Analyze error:', err);
      setAnalysisError(
        err?.message || 'Failed to analyze demand. Please review your input or retry.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Clarification Step: Submit Citizen's answer to the AI's question
  const handleClarificationSubmit = async () => {
    if (!currentClarificationAnswer.trim()) {
      setAnalysisError('Please select or provide a clarification answer, or click "Skip".');
      return;
    }

    const nextTurnCount = clarificationTurnCount + 1;
    const currentQuestion =
      analysis?.clarificationQuestions?.[0] || 'Please specify the exact infrastructure need.';

    const newHistory: ClarificationTurn[] = [
      ...clarificationHistory,
      {
        turn: nextTurnCount,
        question: currentQuestion,
        answer: currentClarificationAnswer.trim(),
      },
    ];

    setClarificationHistory(newHistory);
    setClarificationTurnCount(nextTurnCount);

    // Combine original text with clarification answer for full conversational context
    const augmentedText = `${requestText}\n[Citizen Clarification: ${currentClarificationAnswer.trim()}]`;
    setRequestText(augmentedText);
    setCurrentClarificationAnswer('');

    // Re-run analysis with augmented context and history
    await handleAnalyzeRequest(undefined, augmentedText, newHistory);
  };

  // Skip clarification and move directly to confirmation
  const handleSkipClarification = () => {
    setStep('CONFIRMATION');
  };

  // Multi-Issue Choice: User chooses to split into separate requests
  const handleChooseSplitRequests = async () => {
    setMultiIssueDecision('SPLIT');
    if (!analysis || !analysis.detectedIssues || analysis.detectedIssues.length === 0) {
      setStep('CONFIRMATION');
      return;
    }

    setIsSubmitting(true);
    setAnalysisError(null);

    try {
      const payloads: SubmitRequestPayload[] = analysis.detectedIssues.map(
        (issue: DetectedSubIssue) => ({
          country: location.country,
          state: location.state,
          district: location.district,
          locality: location.locality || 'Community Centre',
          latitude: location.latitude,
          longitude: location.longitude,
          geoStatus: location.geoStatus,
          geoSource: location.geoSource,
          location: {
            countryCode: location.countryCode || 'IN',
            country: location.country,
            state: location.state,
            district: location.district,
            locality: location.locality || 'Community Centre',
            latitude: location.latitude,
            longitude: location.longitude,
            geoStatus: location.geoStatus,
            geoSource: location.geoSource,
          },
          originalLanguage: analysis.detectedLanguage,
          originalRequest: issue.problemStatement || analysis.originalRequest,
          translatedRequest: issue.summary,
          category: issue.category,
          subcategory: issue.subcategory,
          requestType: issue.requestType,
          urgency: issue.urgency,
          summary: issue.summary,
          problemStatement: issue.problemStatement,
          requestedIntervention: issue.requestedIntervention,
          classificationRationale: `Split from multi-issue demand: ${analysis.classificationRationale}`,
          clarificationHistory: clarificationHistory.length > 0 ? clarificationHistory : undefined,
          confidenceScore: analysis.confidenceScore,
          inputMethod: analysis.inputMethod || currentInputMethod,
          originalTranscript: analysis.originalTranscript || originalVoiceTranscript,
          selectedLanguage: analysis.selectedLanguage || voiceSelectedLanguage,
          affectedPopulationMentioned: analysis.affectedPopulationMentioned,
          populationMentioned: analysis.populationMentioned,
          distanceMentionedKm: analysis.distanceMentionedKm,
          householdsMentioned: analysis.householdsMentioned,
        })
      );

      const result = await requestService.createBatchRequests(payloads);
      setSubmittedRequests(result.requests);
      setStep('SUCCESS');
    } catch (err: any) {
      console.error('Batch submit error:', err);
      setAnalysisError(err?.message || 'Failed to record split requests. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Multi-Issue Choice: User chooses to keep as 1 combined request
  const handleChooseCombinedRequest = () => {
    setMultiIssueDecision('COMBINED');
    setStep('CONFIRMATION');
  };

  // Step 2: Confirm & Submit to storage (Single Request)
  const handleConfirmSubmit = async () => {
    const finalData = isEditingAnalysis && editedAnalysis ? editedAnalysis : analysis;
    if (!finalData) return;

    setIsSubmitting(true);
    setAnalysisError(null);

    try {
      const saved = await requestService.createRequest({
        country: location.country,
        state: location.state,
        district: location.district,
        locality: location.locality || 'Community Centre',
        latitude: location.latitude,
        longitude: location.longitude,
        geoStatus: location.geoStatus,
        geoSource: location.geoSource,
        location: {
          countryCode: location.countryCode || 'IN',
          country: location.country,
          state: location.state,
          district: location.district,
          locality: location.locality || 'Community Centre',
          latitude: location.latitude,
          longitude: location.longitude,
          geoStatus: location.geoStatus,
          geoSource: location.geoSource,
        },
        originalLanguage: finalData.detectedLanguage,
        originalRequest: finalData.originalRequest,
        translatedRequest: finalData.translatedRequest,
        category: finalData.category,
        subcategory: finalData.subcategory,
        requestType: finalData.requestType,
        urgency: finalData.urgency,
        summary: finalData.summary,
        problemStatement: finalData.problemStatement,
        requestedIntervention: finalData.requestedIntervention,
        classificationRationale: finalData.classificationRationale,
        clarificationHistory: clarificationHistory.length > 0 ? clarificationHistory : undefined,
        confidenceScore: finalData.confidenceScore,
        inputMethod: finalData.inputMethod || currentInputMethod,
        originalTranscript: finalData.originalTranscript || originalVoiceTranscript,
        selectedLanguage: finalData.selectedLanguage || voiceSelectedLanguage,
        affectedPopulationMentioned: finalData.affectedPopulationMentioned,
        populationMentioned: finalData.populationMentioned,
        distanceMentionedKm: finalData.distanceMentionedKm,
        householdsMentioned: finalData.householdsMentioned,
      });

      setSubmittedRequests([saved]);
      setStep('SUCCESS');
    } catch (err: any) {
      console.error('Submit error:', err);
      setAnalysisError(err?.message || 'Failed to record request. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForNewRequest = () => {
    setRequestText('');
    setActiveInputTab('TEXT');
    setCurrentInputMethod('TEXT');
    setOriginalVoiceTranscript(null);
    setVoiceSelectedLanguage(null);
    setAnalysis(null);
    setEditedAnalysis(null);
    setIsEditingAnalysis(false);
    setClarificationHistory([]);
    setCurrentClarificationAnswer('');
    setClarificationTurnCount(0);
    setMultiIssueDecision(null);
    setSubmittedRequests([]);
    setActiveBenchmarkId(null);
    setStep('INPUT');
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // State district list helper
  const availableDistricts = (location.state && INDIAN_STATES_DISTRICTS[location.state]) || [
    'Central District',
    'North District',
    'South District',
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumb / Step Indicator */}
      <div className="flex items-center justify-between pb-6 mb-8 border-b border-slate-200">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-blue-900 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
            Citizen Public Ingestion
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2">
            Citizen Demand Portal
          </h1>
        </div>

        {/* Step Progress Indicator */}
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span
            className={`px-3 py-1 rounded-full ${
              step === 'INPUT'
                ? 'bg-blue-900 text-white'
                : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            1. Report
          </span>
          <span className="text-slate-300">→</span>
          <span
            className={`px-3 py-1 rounded-full ${
              step === 'CLARIFICATION' || step === 'MULTI_ISSUE_CHOICE'
                ? 'bg-amber-600 text-white animate-pulse'
                : step === 'CONFIRMATION'
                ? 'bg-blue-900 text-white'
                : step === 'SUCCESS'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-slate-100 text-slate-400'
            }`}
          >
            2. Review
          </span>
          <span className="text-slate-300">→</span>
          <span
            className={`px-3 py-1 rounded-full ${
              step === 'SUCCESS'
                ? 'bg-emerald-700 text-white'
                : 'bg-slate-100 text-slate-400'
            }`}
          >
            3. Recorded
          </span>
        </div>
      </div>

      {/* STEP 1: INPUT FORM */}
      {step === 'INPUT' && (
        <div className="space-y-8">
          {/* Main Conversational Header */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                What does your community need?
              </h2>
              <span className="text-xs px-3 py-1 rounded-full bg-blue-800/80 border border-blue-600 text-blue-100 font-medium">
                Multilingual Voice & Text Intake
              </span>
            </div>
            <p className="text-blue-100 text-sm sm:text-base leading-relaxed max-w-3xl">
              Report public infrastructure needs—drinking water, roads, clinics, schools, power, or drainage. Speak naturally in your regional language or type. JanSetu AI transcribes, translates, and structures your demand for public planning.
            </p>
          </div>

          {/* Input Method Selector Tabs: Text vs Voice */}
          <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="tab-mode-text"
                  onClick={() => setActiveInputTab('TEXT')}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                    activeInputTab === 'TEXT'
                      ? 'bg-blue-900 text-white shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Type Request (लिखित)</span>
                </button>

                <button
                  type="button"
                  id="tab-mode-voice"
                  onClick={() => setActiveInputTab('VOICE')}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                    activeInputTab === 'VOICE'
                      ? 'bg-orange-600 text-white shadow-sm ring-2 ring-orange-400/40'
                      : 'bg-orange-50 hover:bg-orange-100 text-orange-900 border border-orange-200'
                  }`}
                >
                  <Mic className="w-4 h-4 text-white" />
                  <span>Speak Request (बोलकर बताएं)</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/20 font-mono font-semibold uppercase tracking-wider">
                    Voice Intake
                  </span>
                </button>
              </div>

              <div className="text-xs text-slate-500 font-medium px-2">
                {activeInputTab === 'VOICE' ? (
                  <span className="text-orange-900 font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-orange-600 animate-pulse" />
                    Record in your native language → Review transcript → Structure with AI
                  </span>
                ) : (
                  <span>Both voice and text inputs feed the same verified intelligence engine</span>
                )}
              </div>
            </div>
          </div>

          {/* Conditional Input Rendering: Voice Intake Panel vs Text Form */}
          {activeInputTab === 'VOICE' ? (
            <VoiceIntakePanel
              currentLocation={location}
              onConfirmVoiceTranscript={handleVoiceConfirmed}
              onCancel={() => setActiveInputTab('TEXT')}
            />
          ) : (
            <div className="space-y-8">
              {/* Benchmark Test Cases Suite (Interactive 6 Benchmark Scenarios) */}
              <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                    <Languages className="w-4 h-4 text-blue-800" />
                    Benchmark Test Scenarios (1-Click Test Suite):
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Click any case to test multilingual parsing, ambiguity, or multi-issue split
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {BENCHMARK_TEST_CASES.map((tc) => {
                    const isSelected = activeBenchmarkId === tc.id;
                    return (
                      <button
                        key={tc.id}
                        type="button"
                        onClick={() => handleSelectBenchmark(tc)}
                        className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50/80 border-blue-600 shadow-2xs ring-2 ring-blue-500/20'
                            : 'bg-slate-50/60 hover:bg-blue-50/40 border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-slate-900">{tc.title}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-white border border-slate-200 text-slate-700">
                            {tc.badge}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-2 italic mb-1.5">
                          "{tc.text}"
                        </p>
                        <div className="text-[11px] text-blue-950/80 font-medium">
                          Expected: <span className="font-semibold text-blue-900">{tc.expectedCategory}</span> • {tc.expectedUrgency} Urgency
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Regional Quick Presets */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                    Additional Regional Presets:
                  </span>
                  <span className="text-[11px] text-slate-500 hidden sm:inline">
                    Hindi, Marathi, Tamil, Bengali, English
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {SAMPLE_PROMPT_PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectPreset(p)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-white hover:bg-blue-50 hover:border-blue-300 border border-slate-200 text-slate-700 hover:text-blue-900 font-medium transition-colors cursor-pointer shadow-2xs"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleAnalyzeRequest} className="space-y-6">
                {/* Large Text Area & Microphone Input */}
                <div className="bg-white rounded-2xl border-2 border-slate-200 focus-within:border-blue-900 p-4 sm:p-6 shadow-xs transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <label
                      htmlFor="citizen-request-input"
                      className="text-sm font-bold text-slate-900"
                    >
                      Describe the Development Need:
                    </label>

                    {/* Speak / Microphone Button */}
                    <button
                      type="button"
                      id="btn-speak-mic"
                      onClick={() => setActiveInputTab('VOICE')}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-50 hover:bg-orange-100 text-orange-900 border border-orange-200 transition-all cursor-pointer"
                      title="Switch to Voice Intake"
                    >
                      <Mic className="w-4 h-4 text-orange-600" />
                      <span>Switch to Voice Input (बोलकर बताएं)</span>
                    </button>
                  </div>

              {isRecording && (
                <div className="mb-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
                    <span>Listening in your native language... Speak clearly into microphone.</span>
                  </div>
                  <span className="text-[10px] text-rose-600 font-medium">Web Speech API</span>
                </div>
              )}

              <textarea
                id="citizen-request-input"
                rows={5}
                value={requestText}
                onChange={(e) => setRequestText(e.target.value)}
                placeholder="Describe the development need in your area (any language or script)..."
                className="w-full text-base sm:text-lg text-slate-900 placeholder:text-slate-400 focus:outline-hidden resize-y min-h-[130px] leading-relaxed"
                required
              />

              <div className="flex items-center justify-between text-xs text-slate-400 mt-2 pt-2 border-t border-slate-100">
                <span>{requestText.length} characters</span>
                <span>Supports any Indian language, script, or Hinglish</span>
              </div>
            </div>

            {/* Location Selector (Geographic Intelligence & Demand Mapping) */}
            <LocationSelector
              value={location}
              onChange={(newLoc) => setLocation(newLoc as LocationGeoData)}
            />

            {/* Error Notice */}
            {analysisError && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
                <div>
                  <p className="font-semibold">Analysis Notice</p>
                  <p>{analysisError}</p>
                </div>
              </div>
            )}

            {/* Submit Action Button */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <div className="text-xs text-slate-500">
                <span className="font-semibold text-slate-700">Digital Public Good Guarantee:</span>{' '}
                You will review and confirm the AI categorization before final recording.
              </div>

              <button
                type="submit"
                id="btn-analyse-request"
                disabled={isAnalyzing || !requestText.trim()}
                className={`w-full sm:w-auto min-w-[220px] flex items-center justify-center gap-2 py-4 px-8 rounded-xl font-bold text-base transition-all cursor-pointer shadow-md ${
                  isAnalyzing || !requestText.trim()
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-blue-900 hover:bg-blue-800 text-white hover:shadow-lg'
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Analyzing Demand...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-amber-300" />
                    <span>Analyse Request</span>
                  </>
                )}
              </button>
            </div>
          </form>
            </div>
          )}
        </div>
      )}

      {/* STEP: CLARIFICATION INTERACTION (Up to 2 Turns) */}
      {step === 'CLARIFICATION' && analysis && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border-2 border-amber-300 p-6 sm:p-8 shadow-xs">
            <div className="flex items-start gap-4 pb-6 border-b border-slate-200">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <HelpCircle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-bold tracking-wider text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                    Clarification Required • Turn {clarificationTurnCount + 1} of 2
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    (Needs specific infrastructure detail)
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">
                  Could you provide a little more detail?
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Your request was: <span className="italic font-medium text-slate-800">"{requestText}"</span>. To route this to the correct government department, JanSetu AI needs to know the specific infrastructure involved.
                </p>
              </div>
            </div>

            {/* Questions from AI */}
            <div className="py-6 space-y-4">
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200">
                <div className="text-xs font-bold text-amber-900 uppercase tracking-wide mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-amber-700" />
                  AI Assistant's Clarification Questions:
                </div>
                <ul className="space-y-2">
                  {(analysis.clarificationQuestions || [
                    'Could you clarify which specific infrastructure needs attention?',
                  ]).map((q, idx) => (
                    <li key={idx} className="text-sm font-semibold text-amber-950 flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Quick Select Pills */}
              <div>
                <span className="text-xs font-semibold text-slate-700 block mb-2">
                  Or select a common infrastructure need to add immediately:
                </span>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Drinking Water Supply / Pipeline',
                    'Road Pothole Repair / Highway Link',
                    'Primary Health Centre / Clinic Doctor',
                    'Primary School Roof & Desks',
                    'Street Lighting / Solar Lamps',
                    'Drainage & Sewage Overflow',
                  ].map((option, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrentClarificationAnswer(option)}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all cursor-pointer ${
                        currentClarificationAnswer === option
                          ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                          : 'bg-slate-50 hover:bg-amber-50 text-slate-700 border-slate-200 hover:border-amber-300'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              {/* Citizen Answer Input */}
              <div className="space-y-2 pt-2">
                <label className="block text-xs font-bold text-slate-800">
                  Your Clarification Answer:
                </label>
                <textarea
                  rows={3}
                  value={currentClarificationAnswer}
                  onChange={(e) => setCurrentClarificationAnswer(e.target.value)}
                  placeholder="e.g. Specifically, the main drinking water pipeline is broken and we need it repaired..."
                  className="w-full p-3.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>
            </div>

            {analysisError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs mb-4">
                {analysisError}
              </div>
            )}

            {/* Actions */}
            <div className="pt-4 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-center justify-between gap-4">
              <button
                type="button"
                onClick={handleSkipClarification}
                className="w-full sm:w-auto px-5 py-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs transition-colors cursor-pointer"
              >
                Proceed Without Further Clarification
              </button>

              <button
                type="button"
                onClick={handleClarificationSubmit}
                disabled={isAnalyzing || !currentClarificationAnswer.trim()}
                className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                  isAnalyzing || !currentClarificationAnswer.trim()
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-amber-600 hover:bg-amber-700 text-white'
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Analyzing Clarification...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Clarification (Turn {clarificationTurnCount + 1}/2)</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP: MULTI-ISSUE SPLIT CHOICE */}
      {step === 'MULTI_ISSUE_CHOICE' && analysis && analysis.detectedIssues && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border-2 border-indigo-200 p-6 sm:p-8 shadow-xs">
            <div className="flex items-start gap-4 pb-6 border-b border-slate-200">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center shrink-0">
                <GitFork className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <span className="text-xs uppercase font-bold tracking-wider text-indigo-900 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200">
                  Multiple Demands Detected • Clean Governance Routing
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">
                  Your request contains {analysis.detectedIssues.length} distinct public needs
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  In your original submission: <span className="italic font-medium text-slate-800">"{analysis.originalRequest}"</span>
                </p>
              </div>
            </div>

            {/* Individual Sub-Issues Preview */}
            <div className="py-6 space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Detected Sub-Issues:
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysis.detectedIssues.map((issue, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-xl border border-slate-200 bg-slate-50/70 shadow-2xs space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-900 bg-blue-100 px-2.5 py-1 rounded">
                        Issue #{idx + 1}: {issue.category}
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                          issue.urgency === 'High' || issue.urgency === 'Critical'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {issue.urgency} Urgency
                      </span>
                    </div>

                    <div>
                      <div className="text-xs text-slate-500 font-semibold">Subcategory:</div>
                      <div className="text-sm font-bold text-slate-900">{issue.subcategory}</div>
                    </div>

                    <div>
                      <div className="text-xs text-slate-500 font-semibold">Problem:</div>
                      <p className="text-xs text-slate-800 leading-relaxed">
                        {issue.problemStatement}
                      </p>
                    </div>

                    <div>
                      <div className="text-xs text-slate-500 font-semibold">Requested Intervention:</div>
                      <p className="text-xs text-blue-900 font-medium leading-relaxed">
                        {issue.requestedIntervention}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Guidance callout */}
            <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200 text-xs text-indigo-950 flex items-start gap-3 mb-6">
              <Sparkles className="w-5 h-5 text-indigo-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Why split into separate requests?</p>
                <p className="mt-0.5 text-indigo-900 leading-relaxed">
                  Different infrastructure needs are managed by distinct ministries (e.g. Public Works vs Jal Shakti / Water Resources). Splitting them ensures each department receives a clean, actionable ticket with independent tracking.
                </p>
              </div>
            </div>

            {analysisError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs mb-4">
                {analysisError}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={handleChooseCombinedRequest}
                className="w-full sm:w-auto px-5 py-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
              >
                Keep As 1 Combined Request
              </button>

              <button
                type="button"
                onClick={handleChooseSplitRequests}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Submitting 2 Separate Requests...</span>
                  </>
                ) : (
                  <>
                    <GitFork className="w-4 h-4" />
                    <span>Submit as 2 Separate Requests (Recommended)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: CONFIRMATION SCREEN */}
      {step === 'CONFIRMATION' && analysis && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                  Citizen In-the-Loop Review
                </span>
                <h2 className="text-2xl font-bold text-slate-900 mt-2">
                  "We understood your request as:"
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Please verify that JanSetu AI accurately interpreted your community demand.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-700" />
                  <span>
                    AI Confidence: {Math.round((analysis.confidenceScore || 0.9) * 100)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Display Fields Grid */}
            <div className="py-6 space-y-6">
              {/* Input Method Banner & Spoken Transcript */}
              <div className="p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border-slate-200">
                <div className="flex items-center gap-2.5">
                  {analysis.inputMethod === 'VOICE' || currentInputMethod === 'VOICE' ? (
                    <>
                      <div className="w-8 h-8 rounded-lg bg-orange-100 border border-orange-200 flex items-center justify-center text-orange-700">
                        <Mic className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-orange-950 uppercase tracking-wide">
                            Voice Intake Method (बोलकर दर्ज)
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-200/80 text-orange-900 font-semibold">
                            Audio Transcribed
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Spoken in{' '}
                          <span className="font-semibold text-slate-800">
                            {analysis.selectedLanguage || analysis.detectedLanguage}
                          </span>{' '}
                          • Citizen reviewed transcript prior to AI processing
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-8 h-8 rounded-lg bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700">
                        <Edit3 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-blue-950 uppercase tracking-wide">
                            Written Ingestion Method (लिखित प्रारूप)
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-200/80 text-blue-900 font-semibold">
                            Direct Text
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Typed in{' '}
                          <span className="font-semibold text-slate-800">
                            {analysis.detectedLanguage}
                          </span>
                        </p>
                      </div>
                    </>
                  )}
                </div>

                <div className="text-[11px] text-slate-500 font-mono bg-white px-2.5 py-1.5 rounded-md border border-slate-200 shrink-0">
                  Input Stream: {analysis.inputMethod || currentInputMethod}
                </div>
              </div>

              {/* Original & Translated Request */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                      Original Request / Citizen Transcript
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 font-medium">
                      Language: {analysis.detectedLanguage}
                    </span>
                  </div>
                  <p className="text-sm text-slate-800 italic leading-relaxed whitespace-pre-wrap">
                    "{analysis.originalRequest}"
                  </p>
                  {analysis.originalTranscript && analysis.originalTranscript !== analysis.originalRequest && (
                    <div className="mt-2 pt-2 border-t border-slate-200/80 text-xs text-slate-600">
                      <span className="font-semibold">Raw Spoken Transcript:</span> "{analysis.originalTranscript}"
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-blue-900 uppercase tracking-wide">
                      English Translation
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-200 text-blue-900 font-medium">
                      Standardized for Planning
                    </span>
                  </div>
                  <p className="text-sm text-slate-900 font-medium leading-relaxed whitespace-pre-wrap">
                    "{analysis.translatedRequest}"
                  </p>
                </div>
              </div>

              {/* Quantitative Extraction Card (Build 03 Verification) */}
              <div className="p-4 sm:p-5 rounded-xl bg-slate-900 text-white shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                      Extracted Numerical Data Points
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                      Governance Rule Compliant
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Affected population isolated from total settlement population to prevent fabrication
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Affected Population */}
                  <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700">
                    <span className="text-[11px] text-slate-400 block mb-0.5">
                      Affected Citizens Mentioned
                    </span>
                    {isEditingAnalysis && editedAnalysis ? (
                      <input
                        type="number"
                        value={editedAnalysis.affectedPopulationMentioned ?? ''}
                        onChange={(e) =>
                          setEditedAnalysis({
                            ...editedAnalysis,
                            affectedPopulationMentioned: e.target.value
                              ? Number(e.target.value)
                              : null,
                          })
                        }
                        placeholder="e.g. 100"
                        className="w-full px-2 py-1 rounded bg-slate-700 text-white text-sm font-bold border border-slate-600 focus:outline-hidden"
                      />
                    ) : (
                      <div className="text-lg font-bold text-amber-300">
                        {analysis.affectedPopulationMentioned !== null &&
                        analysis.affectedPopulationMentioned !== undefined
                          ? `${analysis.affectedPopulationMentioned.toLocaleString()} citizens`
                          : 'Not stated'}
                      </div>
                    )}
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Specific affected subgroup
                    </span>
                  </div>

                  {/* Total Population */}
                  <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700">
                    <span className="text-[11px] text-slate-400 block mb-0.5">
                      Total Settlement Population
                    </span>
                    {isEditingAnalysis && editedAnalysis ? (
                      <input
                        type="number"
                        value={editedAnalysis.populationMentioned ?? ''}
                        onChange={(e) =>
                          setEditedAnalysis({
                            ...editedAnalysis,
                            populationMentioned: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        placeholder="e.g. 5000"
                        className="w-full px-2 py-1 rounded bg-slate-700 text-white text-sm font-bold border border-slate-600 focus:outline-hidden"
                      />
                    ) : (
                      <div className="text-lg font-bold text-emerald-400">
                        {analysis.populationMentioned !== null &&
                        analysis.populationMentioned !== undefined
                          ? `${analysis.populationMentioned.toLocaleString()} total`
                          : 'Not stated'}
                      </div>
                    )}
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Explicitly stated settlement count
                    </span>
                  </div>

                  {/* Distance Barrier */}
                  <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700">
                    <span className="text-[11px] text-slate-400 block mb-0.5">
                      Distance Barrier
                    </span>
                    {isEditingAnalysis && editedAnalysis ? (
                      <input
                        type="number"
                        step="0.5"
                        value={editedAnalysis.distanceMentionedKm ?? ''}
                        onChange={(e) =>
                          setEditedAnalysis({
                            ...editedAnalysis,
                            distanceMentionedKm: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        placeholder="e.g. 30"
                        className="w-full px-2 py-1 rounded bg-slate-700 text-white text-sm font-bold border border-slate-600 focus:outline-hidden"
                      />
                    ) : (
                      <div className="text-lg font-bold text-cyan-300">
                        {analysis.distanceMentionedKm !== null &&
                        analysis.distanceMentionedKm !== undefined
                          ? `${analysis.distanceMentionedKm} km`
                          : 'Not stated'}
                      </div>
                    )}
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Transit distance to facility
                    </span>
                  </div>

                  {/* Households */}
                  <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700">
                    <span className="text-[11px] text-slate-400 block mb-0.5">
                      Households Mentioned
                    </span>
                    {isEditingAnalysis && editedAnalysis ? (
                      <input
                        type="number"
                        value={editedAnalysis.householdsMentioned ?? ''}
                        onChange={(e) =>
                          setEditedAnalysis({
                            ...editedAnalysis,
                            householdsMentioned: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        placeholder="e.g. 50"
                        className="w-full px-2 py-1 rounded bg-slate-700 text-white text-sm font-bold border border-slate-600 focus:outline-hidden"
                      />
                    ) : (
                      <div className="text-lg font-bold text-purple-300">
                        {analysis.householdsMentioned !== null &&
                        analysis.householdsMentioned !== undefined
                          ? `${analysis.householdsMentioned.toLocaleString()} homes`
                          : 'Not stated'}
                      </div>
                    )}
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Homes or families impacted
                    </span>
                  </div>
                </div>
              </div>

              {/* Neutral Demand Summary */}
              <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200">
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wide block mb-1">
                  Neutral Demand Summary
                </span>
                <p className="text-sm text-amber-950 font-semibold leading-relaxed">
                  {isEditingAnalysis && editedAnalysis ? (
                    <input
                      type="text"
                      value={editedAnalysis.summary}
                      onChange={(e) =>
                        setEditedAnalysis({ ...editedAnalysis, summary: e.target.value })
                      }
                      className="w-full px-3 py-1.5 rounded-md bg-white border border-amber-300 text-sm font-normal text-slate-900 focus:outline-hidden"
                    />
                  ) : (
                    analysis.summary
                  )}
                </p>
              </div>

              {/* Problem Statement & Requested Intervention (New Intelligence Fields) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1">
                    Problem Statement (Issue Identified)
                  </span>
                  <p className="text-xs text-slate-800 leading-relaxed">
                    {analysis.problemStatement || analysis.summary}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200">
                  <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide block mb-1">
                    Requested Intervention (Action Required)
                  </span>
                  <p className="text-xs text-emerald-950 leading-relaxed font-medium">
                    {analysis.requestedIntervention || 'Civil works and departmental inspection.'}
                  </p>
                </div>
              </div>

              {/* Classification Rationale: "Why was this classified this way?" */}
              {analysis.classificationRationale && (
                <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-700" />
                    <span className="text-xs font-bold text-indigo-950 uppercase tracking-wide">
                      Why was this classified this way? (Explainable AI Rationale)
                    </span>
                  </div>
                  <p className="text-xs text-indigo-900 leading-relaxed">
                    {analysis.classificationRationale}
                  </p>
                </div>
              )}

              {/* Taxonomy Classifications */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Category */}
                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-xs text-slate-500 block mb-1 font-medium">
                    Infrastructure Category
                  </span>
                  {isEditingAnalysis && editedAnalysis ? (
                    <select
                      value={editedAnalysis.category}
                      onChange={(e) =>
                        setEditedAnalysis({
                          ...editedAnalysis,
                          category: e.target.value as InfrastructureCategory,
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded bg-slate-50 border border-slate-300 text-xs font-semibold"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="inline-block px-2.5 py-1 rounded-md bg-blue-100 text-blue-900 text-sm font-bold">
                      {analysis.category}
                    </span>
                  )}
                </div>

                {/* Subcategory */}
                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-xs text-slate-500 block mb-1 font-medium">
                    Subcategory
                  </span>
                  {isEditingAnalysis && editedAnalysis ? (
                    <input
                      type="text"
                      value={editedAnalysis.subcategory}
                      onChange={(e) =>
                        setEditedAnalysis({
                          ...editedAnalysis,
                          subcategory: e.target.value,
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded bg-slate-50 border border-slate-300 text-xs font-semibold"
                    />
                  ) : (
                    <span className="text-sm font-semibold text-slate-900">
                      {analysis.subcategory}
                    </span>
                  )}
                </div>

                {/* Request Type */}
                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-xs text-slate-500 block mb-1 font-medium">
                    Request Type
                  </span>
                  {isEditingAnalysis && editedAnalysis ? (
                    <select
                      value={editedAnalysis.requestType}
                      onChange={(e) =>
                        setEditedAnalysis({
                          ...editedAnalysis,
                          requestType: e.target.value as CitizenRequestType,
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded bg-slate-50 border border-slate-300 text-xs font-semibold"
                    >
                      {REQUEST_TYPES.map((rt) => (
                        <option key={rt} value={rt}>
                          {rt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="inline-block px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 text-xs font-semibold">
                      {analysis.requestType}
                    </span>
                  )}
                </div>

                {/* Urgency */}
                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-xs text-slate-500 block mb-1 font-medium">
                    Estimated Urgency
                  </span>
                  {isEditingAnalysis && editedAnalysis ? (
                    <select
                      value={editedAnalysis.urgency}
                      onChange={(e) =>
                        setEditedAnalysis({
                          ...editedAnalysis,
                          urgency: e.target.value as RequestUrgency,
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded bg-slate-50 border border-slate-300 text-xs font-semibold"
                    >
                      {URGENCIES.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span
                      className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold ${
                        analysis.urgency === 'Critical'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : analysis.urgency === 'High'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}
                    >
                      {analysis.urgency}
                    </span>
                  )}
                </div>
              </div>

              {/* Location Badge with Coordinates & Resolution Status */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-900 shrink-0" />
                  <span className="font-semibold text-slate-900">Registered Location:</span>
                  <span>
                    {location.locality ? `${location.locality}, ` : ''}
                    {location.district}, {location.state}, {location.country}
                  </span>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {location.latitude && location.longitude && (
                    <span className="font-mono text-[11px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                    </span>
                  )}
                  {location.geoStatus === 'VERIFIED' && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Verified Coordinates
                    </span>
                  )}
                  {location.geoStatus === 'APPROXIMATE' && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                      District Centroid
                    </span>
                  )}
                  {location.geoStatus === 'UNRESOLVED' && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300">
                      Unresolved Geo
                    </span>
                  )}
                </div>
              </div>
            </div>

            {analysisError && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm mb-4">
                {analysisError}
              </div>
            )}

            {/* Two Action Buttons: Confirm & Submit vs Edit */}
            <div className="pt-6 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-center justify-between gap-4">
              <button
                type="button"
                id="btn-edit-analysis"
                onClick={() => {
                  if (isEditingAnalysis) {
                    setIsEditingAnalysis(false);
                  } else {
                    setIsEditingAnalysis(true);
                  }
                }}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
                <span>{isEditingAnalysis ? 'Finish Editing' : 'Edit Interpretation'}</span>
              </button>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setStep('INPUT')}
                  className="px-4 py-3.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 text-sm font-medium cursor-pointer"
                >
                  Back
                </button>

                <button
                  type="button"
                  id="btn-confirm-submit"
                  onClick={handleConfirmSubmit}
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-none min-w-[200px] px-8 py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-base flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Recording Demand...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Confirm & Submit</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: SUCCESS SCREEN (Handles both single and multiple recorded requests) */}
      {step === 'SUCCESS' && submittedRequests.length > 0 && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border-2 border-emerald-200 p-8 sm:p-12 text-center shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center mb-6">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
              {submittedRequests.length > 1
                ? 'Both development requests have been recorded.'
                : 'Your development request has been recorded.'}
            </h2>

            <p className="text-slate-600 text-base max-w-lg mx-auto mb-6">
              "Your request will contribute to aggregated development demand analysis."
            </p>

            {/* Tracking ID Cards */}
            <div className="max-w-xl mx-auto space-y-3 mb-8 text-left">
              {submittedRequests.map((req, idx) => (
                <div
                  key={req.requestId || idx}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] uppercase font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded">
                        {req.category} • {req.subcategory}
                      </span>
                      <span className="text-xs text-slate-500">Tracking ID:</span>
                    </div>
                    <span className="font-mono text-base sm:text-lg font-bold text-slate-900 block mt-1">
                      {req.requestId}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                      Persisted to Firestore Registry (Public Demand Archive)
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopyId(req.requestId)}
                    className="self-start sm:self-center px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedId === req.requestId ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy ID</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                type="button"
                id="btn-submit-another"
                onClick={handleResetForNewRequest}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Submit Another Request</span>
              </button>

              <button
                type="button"
                id="btn-return-home"
                onClick={onReturnHome}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-colors cursor-pointer"
              >
                <span>Return Home</span>
              </button>

              <button
                type="button"
                id="btn-view-in-dashboard"
                onClick={onViewDashboard}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-colors cursor-pointer"
              >
                <span>View in Policymaker Dashboard →</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
