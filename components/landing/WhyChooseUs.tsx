// components/WhyChooseUs.tsx

import { ShieldCheck, Wallet, PackageSearch, Headset } from "lucide-react";

const reasons = [
  {
    icon: ShieldCheck,
    title: "Safe & Reliable Shipping",
    description:
      "Every shipment is carefully handled from pickup in the USA to delivery in Burkina Faso.",
  },
  {
    icon: Wallet,
    title: "Flexible Payment Options",
    description:
      "Pay securely online or choose Zelle, Orange Money, or cash payment in Burkina Faso.",
  },
  {
    icon: PackageSearch,
    title: "Real-Time Tracking",
    description:
      "Know exactly where your shipment is with tracking updates throughout its journey.",
  },
  {
    icon: Headset,
    title: "Dedicated Support",
    description:
      "Our team is available to answer questions and help you throughout the shipping process.",
  },
];

export default function WhyChooseUs() {
  return (
    <section id="why-us" className="bg-white px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <span className="text-sm font-bold uppercase tracking-[0.25em] text-blue-700">
            Why Choose PatExpressShipping
          </span>

          <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-950 md:text-5xl">
            Shipping built around trust, simplicity and peace of mind.
          </h2>

          <p className="mt-6 text-lg leading-8 text-slate-600">
            Whether you're sending gifts, personal belongings, or business
            packages, we make shipping between the United States and Burkina
            Faso simple, transparent, and dependable.
          </p>
        </div>

        <div className="mt-20 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {reasons.map((reason) => {
            const Icon = reason.icon;

            return (
              <div
                key={reason.title}
                className="group rounded-3xl border border-slate-200 bg-slate-50 p-8 transition duration-300 hover:-translate-y-2 hover:border-blue-200 hover:bg-white hover:shadow-xl"
              >
                <div className="inline-flex rounded-2xl bg-blue-100 p-4 transition group-hover:bg-blue-700">
                  <Icon className="h-7 w-7 text-blue-700 transition group-hover:text-white" />
                </div>

                <h3 className="mt-8 text-2xl font-bold text-slate-900">
                  {reason.title}
                </h3>

                <p className="mt-4 leading-7 text-slate-600">
                  {reason.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-20 rounded-3xl bg-blue-700 px-8 py-10 text-center text-white lg:px-16">
          <h3 className="text-3xl font-bold">
            Trusted shipping from the USA to Burkina Faso
          </h3>

          <p className="mx-auto mt-4 max-w-3xl text-lg text-blue-100">
            From your first shipment request to the final delivery, our mission
            is to provide a secure, affordable, and stress-free shipping
            experience.
          </p>
        </div>
      </div>
    </section>
  );
}
