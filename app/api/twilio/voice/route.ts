// app/api/twilio/voice/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { global: { fetch } }
)

export async function POST(req: NextRequest) {
  const formData    = await req.formData()
  const callerNumber = '+' + (formData.get('From') as string).replace(/\D/g, '')
  const twilioNumber = '+' + (formData.get('To') as string).replace(/\D/g, '')

  console.log(`[Twilio] Call from ${callerNumber} to ${twilioNumber}`)

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('twilio_number', twilioNumber)
    .single()

  if (business) {
    const bookingUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/book/${business.id}`
    const body = `Hi! Sorry we missed your call to ${business.name}. Book a time here 👇\n${bookingUrl}`

    // Send SMS via plain fetch — no SDK needed
    const sid  = process.env.TWILIO_ACCOUNT_SID!
    const auth = process.env.TWILIO_AUTH_TOKEN!
    const params = new URLSearchParams({ To: callerNumber, From: twilioNumber, Body: body })

    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${sid}:${auth}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    const json = await res.json()
    console.log('[Twilio] SMS result:', json.sid ?? json.message ?? JSON.stringify(json))
  } else {
    console.warn('[Twilio] No business found for:', twilioNumber)
  }

  return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`, {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  })
}
