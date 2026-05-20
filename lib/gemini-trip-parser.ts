// lib/gemini-trip-parser.ts

import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

/** Structured trip data extracted by Gemini */
export interface ParsedTrip {
  title:           string
  destination:     string
  price_adult:     number | null   // EGP — null if not mentioned
  price_child:     number | null   // EGP — null if not mentioned
  travel_date:     string | null   // yyyy-MM-dd — null if not mentioned
  end_date:        string | null   // yyyy-MM-dd — null if not mentioned
  duration_nights: number | null
}

/** System prompt injected into every Gemini call */
function buildSystemPrompt(): string {
  const today = new Date().toISOString().split('T')[0]
  return `You are a travel trip data extractor for WHHolidays, an Egyptian travel agency.
Extract trip details from the input (Arabic or English text, image, or audio) and return ONLY valid JSON — no markdown, no explanation, nothing else.

Today's date: ${today}
Currency is always EGP (Egyptian Pounds). جنيه = EGP. ألف = 1000.

Rules:
- Return null for any field not clearly mentioned.
- All dates must be in yyyy-MM-dd format.
- If travel_date and duration are given but end_date is not, calculate end_date.
- If travel_date and end_date are both known, calculate duration_nights (calendar days difference).
- Build a descriptive English title if none is given, e.g. "Istanbul 10 Nights Package".
- Convert Arabic-Indic numerals (٤٥٠٠٠) to integers.
- For images: read all visible text then extract trip fields from it.
- For audio: transcribe speech then extract trip fields from the transcription.

Return exactly this JSON (no extra fields, no markdown):
{
  "title": "string",
  "destination": "string",
  "price_adult": number_or_null,
  "price_child": number_or_null,
  "travel_date": "yyyy-MM-dd or null",
  "end_date": "yyyy-MM-dd or null",
  "duration_nights": number_or_null
}`
}

/** Parse trip details from a plain text message */
export async function parseTripFromText(text: string): Promise<ParsedTrip> {
  const result = await model.generateContent([
    buildSystemPrompt(),
    `User message: ${text}`,
  ])
  return JSON.parse(result.response.text()) as ParsedTrip
}

/**
 * Parse trip details from a photo (JPEG/PNG).
 * Gemini Vision reads the image text and extracts trip fields in one step.
 * Works with screenshots, handwritten notes, printed documents, WhatsApp previews.
 */
export async function parseTripFromImage(
  imageBuffer: Buffer,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg',
): Promise<ParsedTrip> {
  const result = await model.generateContent([
    buildSystemPrompt(),
    {
      inlineData: {
        data:     imageBuffer.toString('base64'),
        mimeType,
      },
    },
    'Read all text visible in this image and extract the trip details as JSON.',
  ])
  return JSON.parse(result.response.text()) as ParsedTrip
}

/**
 * Parse trip details from a Telegram voice message (OGG/Opus).
 * Gemini Audio transcribes the speech and extracts trip fields in one step.
 * Handles Arabic and English naturally.
 */
export async function parseTripFromAudio(
  audioBuffer: Buffer,
  mimeType: 'audio/ogg' | 'audio/mpeg' | 'audio/wav' = 'audio/ogg',
): Promise<ParsedTrip> {
  const result = await model.generateContent([
    buildSystemPrompt(),
    {
      inlineData: {
        data:     audioBuffer.toString('base64'),
        mimeType,
      },
    },
    'Transcribe this audio and extract the trip details as JSON.',
  ])
  return JSON.parse(result.response.text()) as ParsedTrip
}
