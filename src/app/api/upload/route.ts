import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import fs from 'fs';

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get('file') as File | null;
  if (!file) return NextResponse.json({ message: 'No file' }, { status: 400 });

  // For preview we store files in /tmp and return a fake URL. In production
  // this should upload to Supabase Storage 'documents' private bucket under the user folder.
  const buf = Buffer.from(await file.arrayBuffer());
  const name = `${Date.now()}-${randomUUID()}.jpg`;
  const path = `/tmp/${name}`;
  await fs.promises.writeFile(path, buf);

  return NextResponse.json({ url: `/_uploads/${name}` });
}
