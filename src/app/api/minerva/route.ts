import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

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
  try {
    const body = await req.json();
    const { prompt, type, currentItinerary, context } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const apiKey = process.env.MINERVA_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Minerva API key not configured' }, { status: 500 });
    }

    const client = new Anthropic({ apiKey });
    let systemPrompt = '';

    if (type === 'generate') {
      const dest = context?.destination || '';
      const days = context?.days || 3;
      const style = context?.style || 'moderate';
      systemPrompt = `You are Minerva, an expert AI travel planner. Generate a realistic ${days}-day itinerary for ${dest}.
Travel style: ${style}.
Include 3-4 activities per day: morning, afternoon, evening.
Use real place names with accurate addresses.
${ITINERARY_SCHEMA}`;

    } else if (type === 'modify') {
      systemPrompt = `You are Minerva, an expert AI travel planner. Modify this itinerary based on the user request.
Current itinerary: ${JSON.stringify(currentItinerary)}
${ITINERARY_SCHEMA}
Return the COMPLETE updated itinerary, preserving unchanged days.`;

    } else {
      // Chat mode
      systemPrompt = `You are Minerva, a friendly AI travel assistant for TripUp.
${context?.destination ? `Current trip destination: ${context.destination}.` : ''}
Give concise, helpful travel advice. 2-3 sentences max unless asked for more detail.
If asked to plan/generate an itinerary, tell the user to click the sparkle button for full AI planning.`;
    }

    const model = type === 'chat' ? 'claude-haiku-4-5-20251001' : 'claude-sonnet-4-6';
    const response = await client.messages.create({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
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
      console.error('Minerva raw response:', raw);
      return NextResponse.json({ error: 'AI returned invalid JSON', raw }, { status: 422 });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Minerva error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
