import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Volume2,
  Languages,
  ShieldCheck,
  ArrowRight,
  Info,
  Layers,
} from 'lucide-react';
import { transcribeAudio, type VoiceTranscribeResponse } from '../services/geminiService.ts';
import { VOICE_BENCHMARK_TEST_CASES } from '../data/indiaLocations.ts';
import type { LocationData } from '../types/citizenRequest.ts';

export interface VoiceIntakePanelProps {
  onConfirmVoiceTranscript: (data: {
    transcript: string;
    detectedLanguage: string;
    selectedLanguage: string;
    locationHint?: Partial<LocationData>;
  }) => void;
  onCancel: () => void;
  currentLocation: LocationData;
}

type VoiceState = 'IDLE' | 'RECORDING' | 'TRANSCRIBING' | 'REVIEW_TRANSCRIPT';

const INDIAN_LANGUAGES = [
  { code: 'Auto Detect', label: 'Auto Detect (स्वचालित पहचान)' },
  { code: 'Hindi', label: 'Hindi (हिन्दी)' },
  { code: 'Hinglish', label: 'Hinglish (Code-mixed / हिंग्लिश)' },
  { code: 'Bengali', label: 'Bengali (বাংলা)' },
  { code: 'English', label: 'English' },
  { code: 'Marathi', label: 'Marathi (मराठी)' },
  { code: 'Tamil', label: 'Tamil (தமிழ்)' },
  { code: 'Telugu', label: 'Telugu (తెలుగు)' },
  { code: 'Kannada', label: 'Kannada (ಕನ್ನಡ)' },
  { code: 'Gujarati', label: 'Gujarati (ગુજરાતી)' },
  { code: 'Punjabi', label: 'Punjabi (ਪੰਜਾਬੀ)' },
  { code: 'Odia', label: 'Odia (ଓଡ଼ିଆ)' },
];

export const VoiceIntakePanel: React.FC<VoiceIntakePanelProps> = ({
  onConfirmVoiceTranscript,
  onCancel,
  currentLocation,
}) => {
  const [voiceState, setVoiceState] = useState<VoiceState>('IDLE');
  const [selectedLanguage, setSelectedLanguage] = useState('Auto Detect');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [transcriptText, setTranscriptText] = useState('');
  const [originalVoiceTranscript, setOriginalVoiceTranscript] = useState('');
  const [detectedLanguage, setDetectedLanguage] = useState('');
  const [confidence, setConfidence] = useState<number>(0.95);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [locationHint, setLocationHint] = useState<Partial<LocationData> | undefined>(undefined);

  // Audio recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  // Format seconds into MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  // Start Audio Recording
  const startRecording = async () => {
    setErrorMessage(null);
    audioChunksRef.current = [];

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Audio recording is not supported in this browser. Please use text input or one of the test cases below.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/wav';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        // Stop all audio tracks to release microphone hardware
        stream.getTracks().forEach((track) => track.stop());

        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        await processAudioBlobForTranscription(audioBlob, recorder.mimeType || 'audio/webm');
      };

      recorder.start(250); // collect 250ms chunks
      setVoiceState('RECORDING');
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 60) {
            // Auto stop at 60 seconds
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error('[VoiceIntake] Microphone access error:', err);
      let userFriendlyMsg = 'Could not access microphone.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        userFriendlyMsg = 'Microphone permission was denied or blocked by your browser settings. You can still test voice intake using the sample voice test cases below.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        userFriendlyMsg = 'No microphone device was detected on your system. Please use the simulated test cases below or switch to text input.';
      } else {
        userFriendlyMsg = err.message || 'Microphone error. You may use the voice test cases below.';
      }
      setErrorMessage(userFriendlyMsg);
      setVoiceState('IDLE');
    }
  };

  // Stop Audio Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
        setVoiceState('TRANSCRIBING');
      } catch (e) {
        console.error('Failed to stop media recorder:', e);
      }
    }
  };

  // Convert blob to base64 and call server-side Gemini
  const processAudioBlobForTranscription = async (blob: Blob, mimeType: string) => {
    setVoiceState('TRANSCRIBING');
    setErrorMessage(null);

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const res = reader.result as string;
          resolve(res);
        };
        reader.onerror = reject;
      });

      reader.readAsDataURL(blob);
      const dataUrl = await base64Promise;

      const result: VoiceTranscribeResponse = await transcribeAudio(
        dataUrl,
        mimeType,
        selectedLanguage
      );

      if (result.noSpeechDetected || !result.transcript?.trim()) {
        setErrorMessage('No clear speech was detected in the audio. Please speak clearly or try again.');
        setVoiceState('IDLE');
        return;
      }

      setTranscriptText(result.transcript);
      setOriginalVoiceTranscript(result.transcript);
      setDetectedLanguage(result.detectedLanguage || selectedLanguage);
      setConfidence(result.confidence || 0.95);
      setVoiceState('REVIEW_TRANSCRIPT');
    } catch (err: any) {
      console.error('[VoiceIntake] Transcription failed:', err);
      setErrorMessage(err.message || 'Failed to convert speech to text. You can retry or use test cases.');
      setVoiceState('IDLE');
    }
  };

  // Select one of the 6 Benchmark Test Cases (A-F)
  const handleSelectBenchmarkTestCase = (tc: (typeof VOICE_BENCHMARK_TEST_CASES)[0]) => {
    setErrorMessage(null);
    setTranscriptText(tc.spokenText);
    setOriginalVoiceTranscript(tc.spokenText);
    setDetectedLanguage(tc.language);
    setConfidence(0.98);
    setLocationHint({
      state: tc.state,
      district: tc.district,
      locality: tc.locality,
    });
    setVoiceState('REVIEW_TRANSCRIPT');
  };

  // Confirm Transcript and forward to Gemini Citizen-in-the-Loop Analysis
  const handleConfirmAndProceed = () => {
    if (!transcriptText.trim()) {
      setErrorMessage('Transcript cannot be empty. Please speak or edit the text.');
      return;
    }

    onConfirmVoiceTranscript({
      transcript: transcriptText.trim(),
      detectedLanguage: detectedLanguage || selectedLanguage,
      selectedLanguage,
      locationHint,
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold">
            <Mic className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">Multilingual Voice Intake</h2>
              <span className="text-xs bg-orange-100 text-orange-800 font-semibold px-2 py-0.5 rounded-full">
                बोलकर बताएं
              </span>
            </div>
            <p className="text-sm text-slate-600 mt-0.5">
              Speak naturally in your mother tongue or colloquial mix (Hindi, Bengali, Hinglish, English, etc.)
            </p>
          </div>
        </div>

        {/* Language preference selector */}
        <div className="flex items-center gap-2">
          <Languages className="w-4 h-4 text-slate-500" />
          <label htmlFor="voice-language-selector" className="text-xs font-semibold text-slate-700">Language:</label>
          <select
            id="voice-language-selector"
            aria-label="Voice spoken language preference"
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            disabled={voiceState === 'RECORDING' || voiceState === 'TRANSCRIBING'}
            className="text-xs font-medium border border-slate-300 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-60"
          >
            {INDIAN_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <p className="font-semibold">Voice Intake Notice</p>
            <p className="mt-0.5 text-xs text-amber-800">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* STATE 1: IDLE / READY TO RECORD */}
      {voiceState === 'IDLE' && (
        <div className="py-10 text-center flex flex-col items-center justify-center">
          <button
            type="button"
            onClick={startRecording}
            className="group relative w-24 h-24 rounded-full bg-gradient-to-tr from-orange-600 to-amber-500 text-white shadow-lg hover:shadow-orange-300 hover:scale-105 active:scale-95 transition-all flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-orange-300"
            title="Start voice recording"
          >
            <Mic className="w-10 h-10 group-hover:animate-pulse" />
          </button>

          <p className="text-base font-bold text-slate-900 mt-5">
            Tap to Speak (बोलने के लिए टैप करें)
          </p>
          <p className="text-xs text-slate-500 max-w-md mt-1">
            Describe the civic problem, location, distance, or how many people are affected. Speak in Hindi, Bengali, Hinglish, or English.
          </p>
        </div>
      )}

      {/* STATE 2: RECORDING IN PROGRESS */}
      {voiceState === 'RECORDING' && (
        <div className="py-10 text-center flex flex-col items-center justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-75" />
            <button
              type="button"
              onClick={stopRecording}
              className="relative w-24 h-24 rounded-full bg-red-600 text-white shadow-xl hover:bg-red-700 hover:scale-105 active:scale-95 transition-all flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-red-300"
              title="Stop recording and transcribe"
            >
              <Square className="w-8 h-8 fill-current" />
            </button>
          </div>

          <div className="flex items-center gap-2 mt-5">
            <span className="w-3 h-3 rounded-full bg-red-600 animate-pulse" />
            <span className="text-lg font-mono font-bold text-red-700">
              {formatTime(recordingSeconds)}
            </span>
            <span className="text-xs text-slate-500">/ 01:00</span>
          </div>

          <p className="text-sm font-semibold text-slate-800 mt-2">
            Listening... Speak naturally (सुन रहे हैं... बोलें)
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Tap the red button when you finish speaking to generate transcript.
          </p>
        </div>
      )}

      {/* STATE 3: TRANSCRIBING */}
      {voiceState === 'TRANSCRIBING' && (
        <div className="py-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-700 mb-4 animate-bounce">
            <Volume2 className="w-8 h-8" />
          </div>
          <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mb-3" />
          <h3 className="text-base font-bold text-slate-900">
            Transcribing Spoken Speech...
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            Gemini Multilingual Speech Engine is transcribing spoken speech with verbatim fidelity...
          </p>
        </div>
      )}

      {/* STATE 4: TRANSCRIPT REVIEW (CITIZEN-IN-THE-LOOP BEFORE ANALYSIS) */}
      {voiceState === 'REVIEW_TRANSCRIPT' && (
        <div className="mt-6 space-y-6">
          <div className="bg-orange-50/70 border border-orange-200 rounded-xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-orange-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span className="text-sm font-bold text-slate-900">
                  Review Spoken Transcript (अपनी बात की समीक्षा करें)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-orange-200 text-orange-900 font-semibold px-2 py-0.5 rounded-md">
                  Detected: {detectedLanguage}
                </span>
                <span className="text-xs text-slate-600 font-medium">
                  Confidence: {Math.round(confidence * 100)}%
                </span>
              </div>
            </div>

            <div className="mt-3">
              <label htmlFor="transcript-editor" className="block text-xs font-semibold text-slate-700 mb-1">
                Edit Transcript If Any Word Was Misheard:
              </label>
              <textarea
                id="transcript-editor"
                aria-label="Editable voice transcript text"
                value={transcriptText}
                onChange={(e) => setTranscriptText(e.target.value)}
                rows={3}
                className="w-full text-base font-medium text-slate-900 bg-white border border-orange-300 rounded-lg p-3.5 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Spoken transcript will appear here..."
              />
              <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-orange-600" />
                You can correct spelling or colloquial words before submitting for AI intelligence analysis.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setTranscriptText('');
                setVoiceState('IDLE');
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-sm transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Re-record Voice (फिर से बोलें)
            </button>

            <button
              type="button"
              onClick={handleConfirmAndProceed}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-md hover:shadow-orange-200 transition-all"
            >
              <span>Confirm & Analyze with Gemini</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* TEST CASES BENCHMARK ROW (Test A - Test F) */}
      <div className="mt-8 pt-6 border-t border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-orange-600" />
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Official Benchmark Test Cases (Build 03 Voice Intake)
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            One-tap test simulations
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {VOICE_BENCHMARK_TEST_CASES.map((tc) => (
            <button
              key={tc.id}
              type="button"
              onClick={() => handleSelectBenchmarkTestCase(tc)}
              className="text-left p-3 rounded-xl border border-slate-200 hover:border-orange-400 hover:bg-orange-50/50 transition-all group focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 group-hover:text-orange-950">
                  {tc.title}
                </span>
                <span className="text-[10px] bg-slate-100 text-slate-700 group-hover:bg-orange-200 font-medium px-1.5 py-0.5 rounded">
                  {tc.tag}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1.5 line-clamp-2 italic font-serif">
                "{tc.spokenText}"
              </p>
              <p className="text-[11px] text-orange-700 mt-1 font-medium">
                Target: {tc.expectedCategory} • {tc.expectedIntervention}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* PRIVACY & ETHICS GUARANTEE */}
      <div className="mt-6 p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-600 leading-relaxed">
          <span className="font-semibold text-slate-800">Voice Privacy Guarantee: </span>
          JanSetu AI processes voice recordings purely for verbatim speech-to-text transcription.
          Raw audio is never stored permanently. No voice biometrics, emotion detection, or speaker identification is conducted.
        </div>
      </div>
    </div>
  );
};
