import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { query } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { doc_type, doc_url, selfie_url } = body;
    // Call to external Edge Function / Gemini would happen here. We mock the response.
    const mock = {
      full_name: 'Muhammad Example',
      cnic_number: '12345-6789012-3',
      dob: '1990-01-01',
      face_match_score: 0.82,
      ai_decision: 'verified',
      raw: { mock: true },
    };

    // For demo, ensure a user exists and attach to user_id=1 (create if needed)
    const u = await query('SELECT id FROM users LIMIT 1');
    let userId: number;
    if (u.rowCount === 0) {
      const r = await query("INSERT INTO users (email, display_name, verification_status) VALUES ($1,$2,$3) RETURNING id", ['demo@example.com','Demo User','unverified']);
      userId = r.rows[0].id;
    } else {
      userId = u.rows[0].id;
    }

    await query(
      `INSERT INTO verifications (user_id, doc_type, doc_url, ocr_payload, face_match_score, ai_decision) VALUES ($1,$2,$3,$4,$5,$6)`,
      [userId, doc_type, doc_url, JSON.stringify(mock.raw), mock.face_match_score, mock.ai_decision],
    );

    // Update user's verification_status
    const status = mock.ai_decision === 'verified' ? 'ai_verified' : 'pending';
    await query('UPDATE users SET verification_status = $1 WHERE id = $2', [status, userId]);

    return NextResponse.json({ ...mock });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
