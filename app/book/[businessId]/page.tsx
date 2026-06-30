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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.18),transparent_31rem),linear-gradient(180deg,#edf7f5_0%,#f6f7fb_430px)] px-4 py-5 text-ink sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-6 overflow-hidden rounded-3xl bg-brand text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl font-black text-brand shadow-lg shadow-slate-950/10">
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
                <p className="text-sm font-black uppercase tracking-[0.22em] text-white/70">Appointment request</p>
                <h1 className="mt-1 text-3xl font-black leading-tight tracking-tight sm:text-4xl">{business.name}</h1>
              </div>
            </div>
            <p className="mt-6 text-xl font-medium leading-8 text-white/82">
              Pick a time that works for you. We will text you a confirmation after your request is received.
            </p>
          </div>
        </header>
        <BookingForm business={business} existingBookings={bookings} />
      </div>
    </main>
  );
}
