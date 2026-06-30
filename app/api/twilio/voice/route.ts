// app/api/twilio/voice/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import twilio from 'twilio'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { global: { fetch } }
)

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
)

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const callerNumber   = ('+' + (formData.get('From') as string).replace(/\D/g, ''))
  const twilioNumber   = ('+' + (formData.get('To') as string).replace(/\D/g, ''))

  console.log(`[Twilio] Incoming call from ${callerNumber} to ${twilioNumber}`)

  // Look up business by Twilio number
  const { data: business } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('twilio_number', twilioNumber)
    .single()

  if (business) {
    const bookingUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/book/${business.id}`
    try {
      await twilioClient.messages.create({
        to:   callerNumber,
        from: twilioNumber,
        body: `Hi! Sorry we missed your call to ${business.name}. Book a time here 👇\n${bookingUrl}`,
      })
      console.log(`[Twilio] Text-back sent to ${callerNumber}`)
    } catch (err) {
      console.error('[Twilio] SMS failed:', err)
    }
  } else {
    console.warn('[Twilio] No business found for:', twilioNumber)
  }

  // Hang up
  return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`, {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  })
}
