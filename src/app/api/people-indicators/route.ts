import { NextResponse } from 'next/server'
import { getPeopleIndicators } from '@/lib/repository/people-indicators'

export async function GET(request: Request) {
    try {
        const url = new URL(request.url)
        const period = url.searchParams.get('period') || '30d'

        const data = await getPeopleIndicators(period)
        return NextResponse.json(data)
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        console.error('[api/people-indicators] error', message)
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
