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
    title: "Créez votre envoi",
    description:
      "Renseignez simplement en ligne les coordonnées de l’expéditeur et du destinataire, ainsi que les informations sur le colis.",
    icon: ClipboardList,
  },
  {
    number: "02",
    title: "Choisissez votre mode de paiement",
    description:
      "Payez en ligne, par Zelle, par Orange Money au Burkina Faso ou en espèces après confirmation locale.",
    icon: CreditCard,
  },
  {
    number: "03",
    title: "Nous recevons et expédions votre colis",
    description:
      "Notre équipe confirme la réception de votre colis, le prépare au départ et l’expédie en toute sécurité.",
    icon: PackageCheck,
  },
  {
    number: "04",
    title: "Suivez-le jusqu’à la livraison",
    description:
      "Suivez l’évolution de votre envoi des États-Unis jusqu’au Burkina Faso, jusqu’à sa livraison.",
    icon: MapPinned,
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-slate-50 px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <span className="text-sm font-bold uppercase tracking-[0.25em] text-blue-700">
            Comment ça fonctionne
          </span>

          <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-950 md:text-5xl">
            Un envoi simple, de la demande à la livraison.
          </h2>

          <p className="mt-5 text-lg leading-8 text-slate-600">
            PatExpressShipping vous accompagne à chaque étape : créez votre
            envoi, choisissez votre mode de paiement et suivez votre colis tout
            au long de son parcours.
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
