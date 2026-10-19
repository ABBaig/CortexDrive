import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { query } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { events, lastLocation } = body;
    // attach to demo user id=1
    const u = await query('SELECT id FROM users LIMIT 1');
    let userId: number;
    if (u.rowCount === 0) {
      const r = await query("INSERT INTO users (email, display_name, verification_status) VALUES ($1,$2,$3) RETURNING id", ['demo@example.com','Demo User','unverified']);
      userId = r.rows[0].id;
    } else userId = u.rows[0].id;

    // If bookings table exists, find latest booking for user and update telematics
    const b = await query("SELECT id FROM bookings WHERE user_id=$1 ORDER BY id DESC LIMIT 1", [userId]).catch(()=>({rowCount:0, rows:[]}));
    if (b.rowCount===0) {
      // fallback: store in license_progress updated_at as JSON note (demo)
      await query('INSERT INTO verifications (user_id, doc_type, doc_url, ocr_payload, face_match_score, ai_decision) VALUES ($1,$2,$3,$4,$5,$6)', [userId,'telematics','local', JSON.stringify({events,lastLocation}), null, 'telematics_saved']).catch(()=>{});
      return NextResponse.json({ success: true });
    }

    const bookingId = b.rows[0].id;
    await query('UPDATE bookings SET telematics=$1 WHERE id=$2', [JSON.stringify({ events, lastLocation }), bookingId]).catch(()=>{});
    return NextResponse.json({ success: true });
  } catch (e:any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
