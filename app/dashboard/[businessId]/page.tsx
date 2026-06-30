import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardTable } from "@/components/DashboardTable";
import { businessFallback } from "@/lib/demo";
import { getSupabase } from "@/lib/supabase";
import type { Booking, Business, Technician } from "@/lib/types";

export const dynamic = "force-dynamic";

async function getDashboardData(businessId: string) {
  const accessToken = cookies().get("owner_access_token")?.value;

  if (!accessToken) {
    redirect("/login");
  }

  const supabase = getSupabase(accessToken);

  if (!supabase) {
    redirect("/login");
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);

  if (userError || !userData.user) {
    redirect("/login");
  }

  const { data: businessAuth } = await supabase
    .from("business_auth")
    .select("business_id")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (!businessAuth?.business_id || businessAuth.business_id !== businessId) {
    redirect("/login");
  }

  const [businessResult, bookingsResult, techniciansResult] = await Promise.all([
    supabase.from("businesses").select("*").eq("id", businessId).maybeSingle(),
    supabase
      .from("bookings")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("technicians")
      .select("*")
      .eq("business_id", businessId)
      .order("name", { ascending: true })
  ]);

  return {
    business: (businessResult.data as Business | null) ?? businessFallback(businessId),
    bookings: (bookingsResult.data ?? []) as Booking[],
    technicians: (techniciansResult.data ?? []) as Technician[]
  };
}

export default async function DashboardPage({ params }: { params: { businessId: string } }) {
  const { business, bookings, technicians } = await getDashboardData(params.businessId);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.16),transparent_34rem),linear-gradient(180deg,#eef7f5_0%,#f7f8fa_420px)] px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <DashboardTable business={business} initialBookings={bookings} initialTechnicians={technicians} />
      </div>
    </main>
  );
}
