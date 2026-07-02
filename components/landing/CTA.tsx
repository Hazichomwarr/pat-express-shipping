// components/CTA.tsx

import Link from "next/link";
import { ArrowRight, PackagePlus } from "lucide-react";

export default function CTA() {
  return (
    <section className="bg-slate-950 px-6 py-28">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-[40px] bg-linear-to-r from-blue-700 via-blue-800 to-slate-900 p-12 text-center shadow-2xl lg:p-20">
        <span className="inline-flex items-center rounded-full border border-blue-300/30 bg-white/10 px-4 py-2 text-sm font-semibold text-blue-100 backdrop-blur">
          🇺🇸 Shipping made simple • 🇧🇫 Delivered with care
        </span>

        <h2 className="mt-8 text-4xl font-extrabold leading-tight tracking-tight text-white md:text-6xl">
          Ready to send your
          <br />
          next package?
        </h2>

        <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-blue-100">
          Create your shipment in just a few minutes, choose your preferred
          payment method, and follow your package all the way to Burkina Faso.
        </p>

        <div className="mt-12 flex flex-col items-center justify-center gap-5 sm:flex-row">
          <Link
            href="/shipments/new"
            className="inline-flex items-center gap-3 rounded-xl bg-white px-8 py-5 text-lg font-bold text-blue-700 transition hover:scale-105 hover:bg-slate-100"
          >
            <PackagePlus className="h-5 w-5" />
            Create Shipment
          </Link>

          <Link
            href="/track"
            className="inline-flex items-center gap-3 rounded-xl border border-white/30 px-8 py-5 text-lg font-bold text-white transition hover:bg-white/10"
          >
            Track Package
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>

        <div className="mt-14 flex flex-wrap justify-center gap-6 text-sm text-blue-100">
          <span>✓ Weekly departures</span>
          <span>✓ Multiple payment options</span>
          <span>✓ Real-time tracking</span>
          <span>✓ Dedicated customer support</span>
        </div>
      </div>
    </section>
  );
}
