import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email } = body
    
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    // Logic to trigger rerun would go here
    console.log(`[MOCK] Triggering re-run for ${email}`)
    
    return NextResponse.json({ success: true, message: `Re-run triggered for ${email}` })
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

