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

  const bookingId = String(params.bookingId ?? "").trim();

  if (!bookingId) {
    return NextResponse.json({ error: "Booking id is required." }, { status: 400 });
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

  const isArchiveUpdate = update.status === "archived";

  if (isArchiveUpdate) {
    console.log("[booking update] Archive requested", { bookingId, status: update.status });
  }

  const existingResult = await supabase
    .from("bookings")
    .select("id,status")
    .eq("id", bookingId)
    .maybeSingle();

  if (existingResult.error) {
    if (isArchiveUpdate) {
      console.error("[booking update] Archive preflight failed", { bookingId, error: existingResult.error });
    }

    return NextResponse.json({ error: existingResult.error.message }, { status: 500 });
  }

  if (!existingResult.data) {
    if (isArchiveUpdate) {
      console.error("[booking update] Archive target not found", { bookingId });
    }

    return NextResponse.json({ error: "Booking was not found." }, { status: 404 });
  }

  const updateResult = await supabase
    .from("bookings")
    .update(update)
    .eq("id", bookingId)
    .select("*")
    .maybeSingle();

  if (updateResult.error) {
    if (isArchiveUpdate) {
      console.error("[booking update] Archive write failed", { bookingId, update, error: updateResult.error });
    }

    return NextResponse.json({ error: updateResult.error.message }, { status: 500 });
  }

  if (updateResult.data) {
    if (isArchiveUpdate && updateResult.data.status !== "archived") {
      console.error("[booking update] Archive write returned unexpected status", {
        bookingId,
        expected: "archived",
        actual: updateResult.data.status
      });

      return NextResponse.json({ error: "Archive update did not persist." }, { status: 500 });
    }

    return NextResponse.json({ booking: updateResult.data });
  }

  const refreshedResult = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .maybeSingle();

  if (refreshedResult.error) {
    if (isArchiveUpdate) {
      console.error("[booking update] Archive reload failed", { bookingId, error: refreshedResult.error });
    }

    return NextResponse.json({ error: refreshedResult.error.message }, { status: 500 });
  }

  if (!refreshedResult.data) {
    if (isArchiveUpdate) {
      console.error("[booking update] Archive reload returned no row", { bookingId });
    }

    return NextResponse.json({ error: "Booking was updated but could not be reloaded." }, { status: 500 });
  }

  if (isArchiveUpdate && refreshedResult.data.status !== "archived") {
    console.error("[booking update] Archive reload returned unexpected status", {
      bookingId,
      expected: "archived",
      actual: refreshedResult.data.status
    });

    return NextResponse.json({ error: "Archive update did not persist." }, { status: 500 });
  }

  return NextResponse.json({ booking: refreshedResult.data });
}
