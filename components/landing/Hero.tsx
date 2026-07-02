// src/components/Hero.tsx

import Image from "next/image";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-16 lg:grid-cols-2 lg:items-center">
        {/* Left */}

        <div>
          <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
            🇺🇸 USA → 🇧🇫 Burkina Faso
          </span>

          <h1 className="mt-6 text-7xl font-extrabold leading-tight tracking-tight text-slate-900">
            We ship with care
            <br />
            from <span className="text-blue-700">USA</span> to{" "}
            <span className="text-red-600">BF</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
            Ship packages confidently from the United States to Burkina Faso.
            Create a shipment, pay online or locally, and track every step until
            delivery.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/shipments/new"
              className="rounded-lg bg-blue-700 px-7 py-4 text-center font-semibold text-white transition hover:bg-blue-800"
            >
              Create Shipment
            </Link>

            <Link
              href="/track"
              className="rounded-lg border border-blue-700 px-7 py-4 text-center font-semibold text-blue-700 transition hover:bg-blue-50"
            >
              Track Package
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-1">
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-700">
              ✓ Weekly departures
            </span>

            <span className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-medium text-blue-700">
              ✓ Online & Local Payments
            </span>

            <span className="rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-xs font-medium text-orange-700">
              ✓ Real-time Package Tracking
            </span>
          </div>
        </div>

        {/* Right */}

        <div className="relative">
          <div className="overflow-hidden rounded-3xl shadow-2xl">
            <Image
              src="/images/pat-hero.jpg"
              alt="PatExpress Shipping"
              width={900}
              height={900}
              priority
              className="h-100 w-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
