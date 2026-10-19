import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { query } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { permit_number, test_date } = body;
    // ensure user
    const u = await query('SELECT id FROM users LIMIT 1');
    let userId: number;
    if (u.rowCount === 0) {
      const r = await query("INSERT INTO users (email, display_name, verification_status) VALUES ($1,$2,$3) RETURNING id", ['demo@example.com','Demo User','unverified']);
      userId = r.rows[0].id;
    } else userId = u.rows[0].id;

    const nextStage = test_date ? 'test_scheduled' : 'learner_permit';

    await query(`INSERT INTO license_progress (user_id, permit_number, test_date, current_stage) VALUES ($1,$2,$3,$4)`, [userId, permit_number, test_date || null, nextStage]);

    await query('UPDATE license_progress SET current_stage=$1, updated_at=now() WHERE user_id=$2', [nextStage, userId]);

    return NextResponse.json({ success: true, current_stage: nextStage });
  } catch (e:any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
