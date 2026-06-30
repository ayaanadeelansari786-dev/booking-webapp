import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-5 py-10">
      <div className="rounded-lg border border-line bg-white p-6 shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">
          Booking Webapp
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal text-ink">
          Simple scheduling for missed-call follow-up.
        </h1>
        <p className="mt-3 text-base leading-7 text-gray-600">
          Use a business ID in the URL to open the customer booking flow or the owner dashboard.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href="/book/demo-service-co" className="rounded-md bg-brand px-4 py-3 text-center font-semibold text-white hover:bg-brand-dark">
            Open demo booking
          </Link>
          <Link href="/dashboard/demo-service-co" className="rounded-md border border-line px-4 py-3 text-center font-semibold text-ink hover:bg-mist">
            Open demo dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
