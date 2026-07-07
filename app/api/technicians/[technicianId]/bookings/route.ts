import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import type { Booking } from "@/lib/types";

export async function GET(
  _request: Request,
  { params }: { params: { technicianId: string } }
) {
  const accessToken = cookies().get("owner_access_token")?.value;
  const supabase = getSupabase(accessToken);

  if (!accessToken || !supabase) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);

  if (userError || !userData.user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { data: businessAuth } = await supabase
    .from("business_auth")
    .select("business_id")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (!businessAuth?.business_id) {
    return NextResponse.json({ error: "No business is linked to this owner account." }, { status: 403 });
  }

  const { data: technician, error: technicianError } = await supabase
    .from("technicians")
    .select("id,business_id")
    .eq("id", params.technicianId)
    .maybeSingle();

  if (technicianError) {
    return NextResponse.json({ error: technicianError.message }, { status: 500 });
  }

  if (!technician || technician.business_id !== businessAuth.business_id) {
    return NextResponse.json({ error: "Team member was not found." }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("business_id", businessAuth.business_id)
    .eq("assigned_technician_id", params.technicianId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ bookings: (data ?? []) as Booking[] });
}
