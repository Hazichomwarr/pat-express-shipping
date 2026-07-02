// components/HowItWorks.tsx
import {
  ClipboardList,
  CreditCard,
  PackageCheck,
  MapPinned,
} from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Create your shipment",
    description:
      "Enter your sender, receiver, destination, and package details in a simple online form.",
    icon: ClipboardList,
  },
  {
    number: "02",
    title: "Choose how to pay",
    description:
      "Pay online, by Zelle, Orange Money in Burkina Faso, or cash through local confirmation.",
    icon: CreditCard,
  },
  {
    number: "03",
    title: "We receive & ship",
    description:
      "Our team confirms your package, prepares it for departure, and ships it securely.",
    icon: PackageCheck,
  },
  {
    number: "04",
    title: "Track until delivery",
    description:
      "Follow your shipment updates from the USA to Burkina Faso until it is delivered.",
    icon: MapPinned,
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-slate-50 px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <span className="text-sm font-bold uppercase tracking-[0.25em] text-blue-700">
            How it works
          </span>

          <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-950 md:text-5xl">
            Shipping made simple from start to delivery.
          </h2>

          <p className="mt-5 text-lg leading-8 text-slate-600">
            PatExpressShipping gives customers a clear process: create a
            shipment, choose a payment option, and track the package every step
            of the way.
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => {
            const Icon = step.icon;

            return (
              <div
                key={step.number}
                className="group rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold text-slate-400">
                    {step.number}
                  </span>

                  <div className="rounded-2xl bg-blue-50 p-3 text-blue-700 transition group-hover:bg-blue-700 group-hover:text-white">
                    <Icon className="h-6 w-6" />
                  </div>
                </div>

                <h3 className="mt-8 text-xl font-bold text-slate-950">
                  {step.title}
                </h3>

                <p className="mt-4 leading-7 text-slate-600">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
