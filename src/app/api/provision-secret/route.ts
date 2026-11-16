import { NextResponse } from 'next/server';
import {
  provisionModuleSecret,
  getRecentModuleSecrets,
} from '@/lib/vault/modules';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit')) || 5;
    const result = await getRecentModuleSecrets(limit);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }
    return NextResponse.json({ data: result.data ?? [] }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: 'Unable to retrieve recent secrets.' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body.' },
        { status: 400 },
      );
    }
    const result = await provisionModuleSecret(body);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(
      { message: result.message, data: result.data },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: 'Unable to provision secret.' },
      { status: 500 },
    );
  }
}
