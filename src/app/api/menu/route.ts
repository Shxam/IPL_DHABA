import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCachedData, setCachedData } from '@/lib/cache';

const CACHE_KEY = 'cache:menu';

export async function GET() {
  // 1. Try to fetch from Upstash Redis cache first
  const cachedData = await getCachedData<{ categories: any[]; items: any[] }>(CACHE_KEY);
  if (cachedData) {
    return NextResponse.json(cachedData, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      },
    });
  }

  const supabase = await createClient();

  try {
    // 2. Fetch categories and menu items from Supabase in parallel
    const [catRes, itemsRes] = await Promise.all([
      supabase
        .from('categories')
        .select('id, name, description, emoji, sort_order')
        .eq('is_active', true)
        .order('sort_order'),
      supabase
        .from('menu_items')
        .select(`
          id,
          name,
          description,
          price,
          image_url,
          food_type,
          is_available,
          is_featured,
          sort_order,
          category_id
        `)
        .eq('is_available', true)
        .order('sort_order')
    ]);

    if (catRes.error) throw catRes.error;
    if (itemsRes.error) throw itemsRes.error;

    const responseData = { categories: catRes.data, items: itemsRes.data };

    // 3. Save to Redis cache for 5 minutes (300 seconds)
    await setCachedData(CACHE_KEY, responseData, 300);

    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      },
    });
  } catch (err: any) {
    console.error('[API Menu] Error loading menu:', err.message);
    return NextResponse.json({ error: 'Failed to load menu data' }, { status: 500 });
  }
}
