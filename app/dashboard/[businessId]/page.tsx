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
    <main className="relative min-h-screen overflow-hidden bg-[#0B0F1A] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(ellipse_at_50%_0%,rgba(59,130,246,0.15)_0%,transparent_70%)]" />
      <div className="pointer-events-none absolute right-[-8rem] top-24 h-72 w-72 rounded-full bg-[#00D4FF]/10 blur-3xl" />
      <div className="pointer-events-none absolute left-[-8rem] top-56 h-72 w-72 rounded-full bg-[#3B82F6]/10 blur-3xl" />
      <div className="relative mx-auto w-full max-w-7xl">
        <DashboardTable business={business} initialBookings={bookings} initialTechnicians={technicians} />
      </div>
    </main>
  );
}
