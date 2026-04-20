import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Verifies the Supabase JWT from the Authorization header.
 * Returns the authenticated user ID, or a 401 NextResponse.
 *
 * Usage in API routes:
 *   const auth = await requireAuth(req);
 *   if (auth instanceof NextResponse) return auth;
 *   const { userId } = auth;
 */
export async function requireAuth(
  req: NextRequest
): Promise<{ userId: string } | NextResponse> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.slice(7);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return { userId: user.id };
}
