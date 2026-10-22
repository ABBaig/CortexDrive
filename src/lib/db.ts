// Lightweight DB shim for phase 1: avoid pg until DB is wired
// This file keeps the same interface but throws a helpful error when used.

export async function query(text: string, params?: any[]) {
  throw new Error('Database not configured in Phase 1. This project uses in-memory or supabase later. Do not call src/lib/db.ts yet.');
}

export default null;

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });

export async function query(text: string, params?: any[]) {
  const res = await pool.query(text, params);
  return res;
}

export default pool;
