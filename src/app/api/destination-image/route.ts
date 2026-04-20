import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimit';

// Curated fallback images for popular destinations (Unsplash photo IDs)
const DESTINATION_FALLBACKS: Record<string, string> = {
  paris: '1502602898657-3e91760cbb34',
  london: '1513635269975-59663e0ac1ad',
  tokyo: '1540959733332-eab4deabeeaf',
  rome: '1552832230-c0197dd311b5',
  barcelona: '1539037116277-4db20889f2d4',
  amsterdam: '1534351590666-13e3e96b5702',
  dubai: '1512453979798-5ea266f8880c',
  singapore: '1508964942454-1a56651d54ac',
  bali: '1537996194471-e657df975ab4',
  newyork: '1534430480872-3498386e7856',
  'new york': '1534430480872-3498386e7856',
  sydney: '1523482580672-f109ba8cb9be',
  istanbul: '1524231757912-21f4fe3a7200',
  prague: '1541849546-216549ae216d',
  lisbon: '1585208798174-9b804a92b77c',
  berlin: '1560969184-10fe8719e047',
  vienna: '1516550893923-42d28e5677af',
  maldives: '1514282401047-d79a71a590e8',
  bangkok: '1508009603885-50cf7c8dd0d5',
  mexico: '1518105779142-d975f22f1b0a',
};

function getFallbackImage(destination: string): string {
  const key = destination.toLowerCase().replace(/[^a-z ]/g, '').trim();
  const photoId = Object.entries(DESTINATION_FALLBACKS).find(([k]) =>
    key.includes(k) || k.includes(key)
  )?.[1] || '1469854523086-cc02fe5d8800';

  return `https://images.unsplash.com/photo-${photoId}?w=800&h=500&fit=crop&q=80`;
}

export async function GET(req: NextRequest) {
  // ── 1. Auth ────────────────────────────────────────────────────────────────
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  // ── 2. Rate limit: 30 req / 60s per user ──────────────────────────────────
  const rl = checkRateLimit(`dest-image:${userId}`, 30, 60_000);
  if (!rl.allowed) {
    const { body, headers } = rateLimitResponse(rl.resetAt);
    return NextResponse.json(body, { status: 429, headers });
  }

  const { searchParams } = new URL(req.url);
  const destination = (searchParams.get('destination') ?? '').slice(0, 200);

  const accessKey = process.env.UNSPLASH_ACCESS_KEY;

  if (!accessKey) {
    return NextResponse.json({ url: getFallbackImage(destination) });
  }

  try {
    const query = encodeURIComponent(`${destination} travel cityscape`);
    const res = await fetch(
      `https://api.unsplash.com/photos/random?query=${query}&orientation=landscape&content_filter=high`,
      {
        headers: {
          Authorization: `Client-ID ${accessKey}`,
          'Accept-Version': 'v1',
        },
        next: { revalidate: 3600 },
      }
    );

    if (!res.ok) throw new Error(`Unsplash error ${res.status}`);

    const data = await res.json();
    const url = `${data.urls.regular}&w=800&h=500&fit=crop&q=80`;
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ url: getFallbackImage(destination) });
  }
}
