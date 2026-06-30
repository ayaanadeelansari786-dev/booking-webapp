import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function POST(request: Request) {
  const accessToken = cookies().get("owner_access_token")?.value;
  const supabase = getSupabase(accessToken);

  if (!accessToken || !supabase) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const body = await request.json();
  const businessId = String(body.businessId ?? "").trim();
  const name = String(body.name ?? "").trim();
  const phone = String(body.phone ?? "").trim();

  if (!businessId || !name) {
    return NextResponse.json(
      { error: "Team member name is required." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("technicians")
    .insert({
      business_id: businessId,
      name,
      phone: phone || null
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ technician: data });
}
