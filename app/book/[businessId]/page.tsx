import { BookingForm } from "@/components/BookingForm";
import { businessFallback } from "@/lib/demo";
import { getSupabase } from "@/lib/supabase";
import type { Booking, Business } from "@/lib/types";

async function getBusinessAndBookings(businessId: string) {
  const supabase = getSupabase();

  if (!supabase) {
    return {
      business: businessFallback(businessId),
      bookings: [] as Pick<Booking, "booking_date" | "booking_time" | "status">[]
    };
  }

  const [{ data: business }, { data: bookings }] = await Promise.all([
    supabase.from("businesses").select("*").eq("id", businessId).maybeSingle(),
    supabase
      .from("bookings")
      .select("booking_date, booking_time, status")
      .eq("business_id", businessId)
      .neq("status", "cancelled")
  ]);

  return {
    business: (business as Business | null) ?? businessFallback(businessId),
    bookings: bookings ?? []
  };
}

export default async function BookPage({ params }: { params: { businessId: string } }) {
  const { business, bookings } = await getBusinessAndBookings(params.businessId);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0B0F1A] px-4 py-6 text-white sm:px-6 sm:py-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(ellipse_at_50%_0%,rgba(59,130,246,0.15)_0%,transparent_70%)]" />
      <div className="pointer-events-none absolute left-1/2 top-24 h-64 w-64 -translate-x-1/2 rounded-full bg-[#00D4FF]/10 blur-3xl" />
      <div className="relative mx-auto w-full max-w-2xl">
        <header className="mb-5 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.05] shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="p-5 sm:p-7">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.07] text-2xl font-bold text-white shadow-[0_0_24px_rgba(59,130,246,0.22)]">
                {business.logo_url ? (
                  <span
                    aria-label={`${business.name} logo`}
                    className="h-full w-full rounded-2xl bg-cover bg-center"
                    style={{ backgroundImage: `url(${business.logo_url})` }}
                  />
                ) : (
                  business.name.slice(0, 1).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#A0AEC0]">Appointment request</p>
                <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">{business.name}</h1>
              </div>
            </div>
            <p className="mt-5 text-base font-medium leading-7 text-[#A0AEC0] sm:text-lg">
              Pick a time that works for you. We will text you a confirmation after your request is received.
            </p>
          </div>
        </header>
        <BookingForm business={business} existingBookings={bookings} />
      </div>
    </main>
  );
}
