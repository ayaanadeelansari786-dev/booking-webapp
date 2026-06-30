import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { isValidUsPhone } from "@/lib/phone";
import { timeSlots } from "@/lib/dates";

const doubleBookedMessage = "That time was just booked by someone else. Please pick another slot.";

export async function GET(request: Request) {
  const supabase = getSupabase();

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured yet." },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const businessId = String(searchParams.get("businessId") ?? "").trim();
  const bookingDate = String(searchParams.get("date") ?? "").trim();

  if (!businessId || !bookingDate) {
    return NextResponse.json(
      { error: "Business and date are required." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("bookings")
    .select("booking_date, booking_time, status")
    .eq("business_id", businessId)
    .eq("booking_date", bookingDate)
    .neq("status", "cancelled");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ bookings: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = getSupabase();

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured yet." },
      { status: 500 }
    );
  }

  const body = await request.json();
  const businessId = String(body.businessId ?? "").trim();
  const customerName = String(body.customerName ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  const email = String(body.email ?? "").trim();
  const issueDescription = String(body.issueDescription ?? "").trim();
  const bookingDate = String(body.bookingDate ?? "").trim();
  const bookingTime = String(body.bookingTime ?? "").trim();

  if (!businessId || !customerName || !phone || !bookingDate || !bookingTime) {
    return NextResponse.json(
      { error: "Name, phone, date, and time are required." },
      { status: 400 }
    );
  }

  if (!isValidUsPhone(phone)) {
    return NextResponse.json(
      { error: "Enter a valid US phone number." },
      { status: 400 }
    );
  }

  if (!timeSlots.includes(bookingTime)) {
    return NextResponse.json({ error: "Choose a valid time slot." }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("bookings")
    .select("id")
    .eq("business_id", businessId)
    .eq("booking_date", bookingDate)
    .eq("booking_time", bookingTime)
    .neq("status", "cancelled")
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: doubleBookedMessage, reason: "slot_taken" },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from("bookings")
    .insert({
      business_id: businessId,
      customer_name: customerName,
      customer_phone: phone,
      customer_email: email || null,
      issue_description: issueDescription || null,
      booking_date: bookingDate,
      booking_time: bookingTime,
      status: "new"
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: doubleBookedMessage, reason: "slot_taken" },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ booking: data });
}

