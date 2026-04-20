import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { destination, category, nearbyLocations } = await req.json();
    if (!destination) return NextResponse.json({ error: 'destination required' }, { status: 400 });

    const nearbyCtx = nearbyLocations?.length
      ? `\nThe traveler already has these spots in their itinerary: ${nearbyLocations.join(', ')}. Prioritise places that are nearby or complement these existing spots.`
      : '';

    const prompt = `List 6 must-visit ${category || 'places'} in ${destination}.${nearbyCtx}
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
      // Attach Unsplash image URLs
      const placesWithImages = parsed.places.map((p: { unsplashQuery: string; name: string; [key: string]: unknown }) => ({
        ...p,
        image: `https://source.unsplash.com/featured/800x500?${encodeURIComponent(p.unsplashQuery || p.name + ' ' + destination)}`,
      }));
      return NextResponse.json({ places: placesWithImages });
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 422 });
    }
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 });
  }
}
