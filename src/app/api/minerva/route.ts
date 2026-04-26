import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { requireAuth } from '@/lib/apiAuth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimit';

// Max body size: 20KB — prevents sending huge itineraries to pad token counts
const MAX_BODY_BYTES = 20_000;

const ITINERARY_SCHEMA = `Return ONLY valid JSON — no markdown, no explanation, no code fences.
Schema:
{
  "days": [
    {
      "date": "Day 1",
      "dayNumber": 1,
      "activities": [
        {
          "id": "act-1-1",
          "time": "09:00",
          "title": "Place Name",
          "category": "Sightseeing",
          "location": "Full address",
          "notes": "Tip or detail",
          "icon": "landmark"
        }
      ]
    }
  ],
  "message": "Brief summary sentence"
}
Valid icons: landmark, utensils, hotel, map-pin, shopping-bag, camera, car, coffee, music, tree`;

export async function POST(req: NextRequest) {
  // ── 1. Auth ────────────────────────────────────────────────────────────────
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  // ── 2. Rate limit: 10 req / 60s per user ──────────────────────────────────
  const rl = checkRateLimit(`minerva:${userId}`, 10, 60_000);
  if (!rl.allowed) {
    const { body, headers } = rateLimitResponse(rl.resetAt);
    return NextResponse.json(body, { status: 429, headers });
  }

  // ── 3. Body size guard ─────────────────────────────────────────────────────
  const contentLength = Number(req.headers.get('content-length') ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Request body too large' }, { status: 413 });
  }

  try {
    const body = await req.json();
    const { prompt, type, currentItinerary, context } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Trim prompt to prevent runaway token usage
    const safePrompt = prompt.slice(0, 2000);

    const apiKey = process.env.MINERVA_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Minerva API key not configured' }, { status: 500 });
    }

    const client = new Anthropic({ apiKey });
    let systemPrompt = '';

    if (type === 'generate') {
      // Sanitize context fields — treat as plain strings, never interpolate unchecked objects
      const dest = String(context?.destination ?? '').slice(0, 200);
      const days = Math.min(Math.max(Number(context?.days) || 3, 1), 30);
      const style = String(context?.style ?? 'moderate').slice(0, 100);

      systemPrompt = `You are Aurora, an expert AI travel planner. Generate a realistic ${days}-day itinerary for ${dest}.
Travel style: ${style}.
Include 3-4 activities per day: morning, afternoon, evening.
Use real place names with accurate addresses.
${ITINERARY_SCHEMA}`;

    } else if (type === 'modify') {
      // Truncate serialised itinerary to cap token spend
      const itineraryStr = JSON.stringify(currentItinerary ?? {}).slice(0, 8000);
      systemPrompt = `You are Aurora, an expert AI travel planner. Modify this itinerary based on the user request.
Current itinerary: ${itineraryStr}
${ITINERARY_SCHEMA}
Return the COMPLETE updated itinerary, preserving unchanged days.`;

    } else {
      // Chat mode
      const dest = String(context?.destination ?? '').slice(0, 200);
      systemPrompt = `You are Aurora, a friendly AI travel assistant for TripUp.
${dest ? `Current trip destination: ${dest}.` : ''}
Give concise, helpful travel advice. 2-3 sentences max unless asked for more detail.
If asked to plan/generate an itinerary, tell the user to click the sparkle button for full AI planning.`;
    }

    const model = type === 'chat' ? 'claude-haiku-4-5-20251001' : 'claude-sonnet-4-6';
    const response = await client.messages.create({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: safePrompt }],
    });

    const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : '';

    if (type === 'chat') {
      return NextResponse.json({ message: raw });
    }

    // Strip any accidental markdown fences
    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    try {
      const parsed = JSON.parse(cleaned);
      return NextResponse.json(parsed);
    } catch {
      // Try extracting JSON substring
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return NextResponse.json(JSON.parse(match[0]));
        } catch { /* fall through */ }
      }
      // Don't leak raw AI output — log server-side only
      console.error('Minerva: AI returned invalid JSON');
      return NextResponse.json({ error: 'AI returned an unexpected response. Please try again.' }, { status: 422 });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Minerva error:', msg);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
