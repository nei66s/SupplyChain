import { NextResponse } from 'next/server';
import { getInventorySnapshot } from '@/lib/repository/inventory';

export async function GET() {
  try {
    const snapshot = await getInventorySnapshot();
    return NextResponse.json(snapshot);
  } catch (err) {
    console.error('inventory API error', err);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}
