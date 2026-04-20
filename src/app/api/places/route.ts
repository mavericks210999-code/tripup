import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { requireAuth } from '@/lib/apiAuth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  // ── 1. Auth ────────────────────────────────────────────────────────────────
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  // ── 2. Rate limit: 20 req / 60s per user ──────────────────────────────────
  const rl = checkRateLimit(`places:${userId}`, 20, 60_000);
  if (!rl.allowed) {
    const { body, headers } = rateLimitResponse(rl.resetAt);
    return NextResponse.json(body, { status: 429, headers });
  }

  try {
    const { destination, category, nearbyLocations } = await req.json();
    if (!destination || typeof destination !== 'string') {
      return NextResponse.json({ error: 'destination required' }, { status: 400 });
    }

    // Sanitize inputs
    const safeDestination = destination.slice(0, 200);
    const safeCategory = typeof category === 'string' ? category.slice(0, 50) : '';
    const safeNearby: string[] = Array.isArray(nearbyLocations)
      ? nearbyLocations.slice(0, 10).map((s: unknown) => String(s).slice(0, 100))
      : [];

    // Fix: was incorrectly using ANTHROPIC_API_KEY — use MINERVA_API_KEY consistently
    const apiKey = process.env.MINERVA_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const client = new Anthropic({ apiKey });

    const nearbyCtx = safeNearby.length
      ? `\nThe traveler already has these spots in their itinerary: ${safeNearby.join(', ')}. Prioritise places that are nearby or complement these existing spots.`
      : '';

    const prompt = `List 6 must-visit ${safeCategory || 'places'} in ${safeDestination}.${nearbyCtx}
Return ONLY valid JSON — no markdown, no code fences:
{
  "places": [
    {
      "id": "place-1",
      "name": "Place Name",
      "category": "Attraction|Food|Shopping|Nature|Entertainment|Nightlife",
      "description": "2-sentence engaging description of why it's worth visiting",
      "location": "Neighbourhood or area name",
      "rating": 4.7,
      "reviews": 2340,
      "priceLevel": "Free|€|€€|€€€",
      "openHours": "09:00 - 18:00",
      "bestTime": "Morning|Afternoon|Evening|Anytime",
      "duration": "1-2 hours",
      "unsplashQuery": "specific search term for unsplash image e.g. 'Eiffel Tower Paris'"
    }
  ]
}`;

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = (response.content[0].type === 'text' ? response.content[0].text : '').trim();
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

    try {
      const parsed = JSON.parse(cleaned);
      const placesWithImages = parsed.places.map((p: { unsplashQuery: string; name: string; [key: string]: unknown }) => ({
        ...p,
        image: `https://source.unsplash.com/featured/800x500?${encodeURIComponent(p.unsplashQuery || p.name + ' ' + safeDestination)}`,
      }));
      return NextResponse.json({ places: placesWithImages });
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 422 });
    }
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 });
  }
}
