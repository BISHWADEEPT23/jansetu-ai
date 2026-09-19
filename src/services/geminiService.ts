import type { CitizenRequestAnalysis, LocationData, ClarificationTurn } from '../types/citizenRequest.ts';

export interface AnalyzeRequestPayload {
  text: string;
  location?: LocationData;
  clarificationHistory?: ClarificationTurn[];
  inputMethod?: 'TEXT' | 'VOICE';
  originalTranscript?: string | null;
  selectedLanguage?: string | null;
}

export interface VoiceTranscribeResponse {
  success: boolean;
  transcript: string;
  detectedLanguage: string;
  confidence: number;
  noSpeechDetected?: boolean;
  notes?: string;
  error?: string;
}

/**
 * Sends audio recording to server-side Gemini speech transcription pipeline.
 */
export async function transcribeAudio(
  audioBase64: string,
  mimeType: string = 'audio/webm',
  selectedLanguage?: string
): Promise<VoiceTranscribeResponse> {
  const response = await fetch('/api/transcribe-audio', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ audioBase64, mimeType, selectedLanguage }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.details || errorData.error || `Voice transcription failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Client service to request server-side Gemini demand analysis.
 * All Gemini API calls happen strictly server-side.
 */
export async function analyzeCitizenRequest(
  payload: AnalyzeRequestPayload
): Promise<CitizenRequestAnalysis> {
  const response = await fetch('/api/analyze-request', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.details || errorData.error || `Server responded with status ${response.status}`);
  }

  const data = await response.json();
  if (!data.success || !data.analysis) {
    throw new Error('Invalid analysis payload received from server');
  }

  return data.analysis;
}
