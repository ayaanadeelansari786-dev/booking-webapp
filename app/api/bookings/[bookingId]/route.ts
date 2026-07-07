import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { bookingStatuses, type BookingStatus } from "@/lib/types";
import { getSupabase } from "@/lib/supabase";

export async function PATCH(
  request: Request,
  { params }: { params: { bookingId: string } }
) {
  const accessToken = cookies().get("owner_access_token")?.value;
  const supabase = getSupabase(accessToken);

  if (!accessToken || !supabase) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const body = await request.json();
  const update: {
    status?: BookingStatus;
    assigned_technician_id?: string | null;
    scheduled_at?: string | null;
  } = {};

  if ("status" in body) {
    const status = String(body.status ?? "").trim();

    if (!bookingStatuses.includes(status as BookingStatus)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }

    update.status = status as BookingStatus;
  }

  if ("assigned_technician_id" in body) {
    const technicianId = String(body.assigned_technician_id ?? "").trim();
    update.assigned_technician_id = technicianId || null;
  }

  if ("scheduled_at" in body) {
    const scheduledAt = String(body.scheduled_at ?? "").trim();
    update.scheduled_at = scheduledAt || null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid update fields provided." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("bookings")
    .update(update)
    .eq("id", params.bookingId)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Booking was not found or could not be updated." }, { status: 404 });
  }

  return NextResponse.json({ booking: data });
}

