import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function DELETE(
  _request: Request,
  { params }: { params: { technicianId: string } }
) {
  const accessToken = cookies().get("owner_access_token")?.value;
  const supabase = getSupabase(accessToken);

  if (!accessToken || !supabase) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const technicianId = String(params.technicianId ?? "").trim();

  if (!technicianId) {
    return NextResponse.json({ error: "Team member id is required." }, { status: 400 });
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
    .eq("id", technicianId)
    .maybeSingle();

  if (technicianError) {
    return NextResponse.json({ error: technicianError.message }, { status: 500 });
  }

  if (!technician || technician.business_id !== businessAuth.business_id) {
    return NextResponse.json({ error: "Team member was not found." }, { status: 404 });
  }

  const unassignResult = await supabase
    .from("bookings")
    .update({ assigned_technician_id: null })
    .eq("business_id", businessAuth.business_id)
    .eq("assigned_technician_id", technicianId);

  if (unassignResult.error) {
    return NextResponse.json({ error: unassignResult.error.message }, { status: 500 });
  }

  const deleteResult = await supabase
    .from("technicians")
    .delete()
    .eq("id", technicianId)
    .eq("business_id", businessAuth.business_id);

  if (deleteResult.error) {
    return NextResponse.json({ error: deleteResult.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, technicianId });
}
