import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

function checkIfOpenNow(openingHours: { open: string; close: string; timezone?: string }) {
  try {
    const tz = openingHours.timezone || 'Asia/Kolkata';
    const nowStr = new Date().toLocaleString('en-US', { timeZone: tz });
    const nowInTz = new Date(nowStr);
    
    const hours = nowInTz.getHours();
    const minutes = nowInTz.getMinutes();
    const currentMinutes = hours * 60 + minutes;

    const [openH, openM] = openingHours.open.split(':').map(Number);
    const [closeH, closeM] = openingHours.close.split(':').map(Number);

    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;

    if (closeMinutes > openMinutes) {
      return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
    } else {
      // Over-midnight
      return currentMinutes >= openMinutes || currentMinutes <= closeMinutes;
    }
  } catch (e) {
    console.error('[checkIfOpenNow] error:', e);
    return true; // Fallback to true on error
  }
}

export async function GET(request: NextRequest) {
  const adminDb = createAdminClient();

  try {
    const { data } = await adminDb.from('restaurant_settings').select('*');
    const settings: Record<string, any> = {};

    if (data) {
      for (const item of data) {
        settings[item.key] = item.value;
      }
    }

    const is_open_setting = settings.is_open !== false;
    const opening_hours = settings.opening_hours || { open: '11:00', close: '23:00', timezone: 'Asia/Kolkata' };
    const isOpenNow = is_open_setting && checkIfOpenNow(opening_hours);

    return NextResponse.json({
      isOpen: isOpenNow,
      is_open_setting,
      openingHours: opening_hours,
    });
  } catch (err: any) {
    console.error('[API Restaurant Status] GET error:', err.message);
    return NextResponse.json({ error: 'Failed to fetch restaurant status' }, { status: 500 });
  }
}
