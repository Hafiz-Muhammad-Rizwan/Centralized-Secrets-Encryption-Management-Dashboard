import { NextResponse } from 'next/server';
import {
  listModuleSecrets,
  rotateModuleSecret,
  deleteModuleSecret,
} from '@/lib/vault/modules';

export async function GET() {
  try {
    const result = await listModuleSecrets();
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }
    return NextResponse.json({ data: result.data ?? [] }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: 'Unable to retrieve secrets directory.' },
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
    const { id, version } = body as { id?: string; version?: number };
    const result = await rotateModuleSecret(id, version);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ message: result.message }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: 'Unable to rotate secret.' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');
    if (!id) {
      const body = await request.json().catch(() => null);
      if (body && typeof body === 'object' && 'id' in body) {
        id = String((body as { id: unknown }).id);
      }
    }
    const result = await deleteModuleSecret(id);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ message: result.message }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: 'Unable to delete secret.' },
      { status: 500 },
    );
  }
}
