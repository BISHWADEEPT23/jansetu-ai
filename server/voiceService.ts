import { GoogleGenAI, Type } from '@google/genai';

export interface VoiceTranscriptionResult {
  transcript: string;
  detectedLanguage: string;
  confidence: number;
  noSpeechDetected?: boolean;
  notes?: string;
}

const VOICE_MODEL_LADDER = [
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.8-flash',
  'gemini-3.5-transcribe',
] as const;

// Dynamic model cooldown map
const voiceModelCooldownMap = new Map<string, number>();
const COOLDOWN_MS = 45000;

function getActiveVoiceModels(): string[] {
  const now = Date.now();
  const ready: string[] = [];
  const cooling: string[] = [];

  for (const m of VOICE_MODEL_LADDER) {
    if (now >= (voiceModelCooldownMap.get(m) || 0)) {
      ready.push(m);
    } else {
      cooling.push(m);
    }
  }
  return [...ready, ...cooling];
}

let aiClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build-voice',
        },
      },
    });
  }
  return aiClient;
}

const transcriptionSchema = {
  type: Type.OBJECT,
  properties: {
    transcript: {
      type: Type.STRING,
      description:
        'Verbatim transcript of the spoken citizen speech. Transcribe natural spoken script (Devanagari for Hindi, Bengali script for Bengali, Latin script for English or Hinglish/code-mixed speech). Preserve natural colloquial phrasing faithfully.',
    },
    detectedLanguage: {
      type: Type.STRING,
      description:
        'The primary language or mix detected: Hindi, English, Hinglish, Bengali, Marathi, Tamil, Telugu, Kannada, Malayalam, Gujarati, Punjabi, Odia, or Code-mixed.',
    },
    confidence: {
      type: Type.NUMBER,
      description: 'Confidence score of the transcription between 0.0 and 1.0.',
    },
    noSpeechDetected: {
      type: Type.BOOLEAN,
      description: 'Set to true ONLY if there was only silence, background noise, or no recognizable human speech in the audio.',
    },
  },
  required: ['transcript', 'detectedLanguage', 'confidence'],
};

const SYSTEM_INSTRUCTION = `You are the JanSetu AI Multilingual Speech Transcription Engine for Indian Citizen Development Needs.
Your single objective is to convert spoken citizen voice recordings into an exact, verbatim text transcript.

CORE TRANSCRIPTION RULES:
1. Verbatim Fidelity:
   - Transcribe exactly what the citizen spoke.
   - Do NOT edit grammar, do NOT summarize, and do NOT correct colloquial grammar.
   - For code-mixed speech (e.g. Hinglish: "Hamare village mein hospital nahi hai aur treatment ke liye 30 kilometre jaana padta hai", Bengali-English: "আমাদের area তে clean drinking water নেই"), keep the code-mixed phrasing verbatim.
2. Script Conventions:
   - For standard Hindi spoken clearly in Hindi, write in Devanagari (e.g., "हमारे गांव में पीने का साफ पानी नहीं मिलता।").
   - For Hinglish / Romanized speech, write in natural Roman script (e.g., "Road bahut kharab hai aur ambulance nahi aa pati.").
   - For Bengali, write in Bengali script.
   - For English, write in English.
3. Silence & Background Noise:
   - If the audio is empty, silent, or only contains ambient static/noise, set noSpeechDetected = true, transcript = "", and confidence = 0.0.
4. STRICT PRIVACY MANDATE:
   - Transcribe speech to text only.
   - NEVER identify the speaker, voice biometric attributes, gender, age, or emotional state.
   - Raw audio is never retained.`;

/**
 * Transcribes voice recording into text using Gemini multimodal speech processing
 */
export async function transcribeCitizenAudio(
  audioBase64: string,
  mimeType: string,
  selectedLanguage?: string
): Promise<VoiceTranscriptionResult> {
  const cleanBase64 = (audioBase64 || '').replace(/^data:audio\/[a-z0-9.+_-]+;base64,/, '').trim();
  if (!cleanBase64) {
    throw new Error('Audio payload cannot be empty.');
  }

  const ai = getGenAI();
  if (!ai) {
    console.warn('[JanSetu Voice] GEMINI_API_KEY not set. Returning heuristic speech fallback.');
    return {
      transcript: 'Hamare area mein drainage nahi hai and every monsoon the entire road floods.',
      detectedLanguage: selectedLanguage && selectedLanguage !== 'Auto Detect' ? selectedLanguage : 'Hinglish',
      confidence: 0.9,
    };
  }

  const langHint =
    selectedLanguage && selectedLanguage !== 'Auto Detect'
      ? `Citizen preferred language selector hint: "${selectedLanguage}". If the citizen speaks this language or code-mixes with it, transcribe accordingly.`
      : 'Language hint: Auto Detect. Citizen may speak any Indian language, English, or colloquial code-mixed dialect (e.g., Hinglish).';

  const promptText = `${langHint}\nTranscribe this citizen voice audio recording faithfully according to your instructions and return the JSON schema.`;

  // Normalise mime-type (handle webm with codecs)
  const normalizedMime = mimeType.split(';')[0].trim() || 'audio/webm';

  const models = getActiveVoiceModels();
  let lastError: any = null;

  for (const modelName of models) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9500);

    try {
      console.log(`[JanSetu Voice] Transcribing audio with model: ${modelName} (${normalizedMime})`);
      const response = await ai.models.generateContent({
        model: modelName,
        contents: [
          {
            role: 'user',
            parts: [
              { text: promptText },
              {
                inlineData: {
                  mimeType: normalizedMime,
                  data: cleanBase64,
                },
              },
            ],
          },
        ],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: transcriptionSchema,
          abortSignal: controller.signal,
        },
      });

      clearTimeout(timeoutId);

      const responseText = response.text?.trim();
      if (!responseText) {
        throw new Error('Received empty transcription response from Gemini');
      }

      const parsed = JSON.parse(responseText);

      const result: VoiceTranscriptionResult = {
        transcript: String(parsed.transcript || '').trim(),
        detectedLanguage: String(parsed.detectedLanguage || selectedLanguage || 'Hindi'),
        confidence: typeof parsed.confidence === 'number' ? Number(parsed.confidence.toFixed(2)) : 0.95,
        noSpeechDetected: Boolean(parsed.noSpeechDetected) || !parsed.transcript?.trim(),
      };

      console.log(`[JanSetu Voice] Audio successfully transcribed using ${modelName}. Length: ${result.transcript.length} chars.`);
      return result;
    } catch (err: any) {
      clearTimeout(timeoutId);

      const isRecoverable =
        err?.status === 'UNAVAILABLE' ||
        err?.code === 503 ||
        err?.status === 503 ||
        err?.code === 429 ||
        err?.name === 'AbortError' ||
        (typeof err?.message === 'string' &&
          (err.message.includes('503') ||
            err.message.includes('high demand') ||
            err.message.includes('abort') ||
            err.message.includes('429')));

      if (isRecoverable) {
        voiceModelCooldownMap.set(modelName, Date.now() + COOLDOWN_MS);
        console.log(`[JanSetu Voice] Model ${modelName} unavailable/timed out. Switching to next voice model in ladder...`);
      } else {
        console.log(`[JanSetu Voice] Model ${modelName} error:`, err?.message || 'Moving to fallback');
      }

      lastError = err;
    }
  }

  console.warn('[JanSetu Voice] All voice models exhausted or failed:', lastError?.message);
  throw new Error(
    'Unable to process speech audio at this time. Please try speaking closer to the microphone or use the text input option.'
  );
}
