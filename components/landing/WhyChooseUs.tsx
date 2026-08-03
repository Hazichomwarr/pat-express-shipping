// components/WhyChooseUs.tsx

import { ShieldCheck, Wallet, PackageSearch, Headset } from "lucide-react";

const reasons = [
  {
    icon: ShieldCheck,
    title: "Des envois sûrs et fiables",
    description:
      "Chaque colis est pris en charge avec soin aux États-Unis jusqu’à sa livraison au Burkina Faso.",
  },
  {
    icon: Wallet,
    title: "Des modes de paiement flexibles",
    description:
      "Payez en toute sécurité en ligne, par Zelle, par Orange Money ou en espèces au Burkina Faso.",
  },
  {
    icon: PackageSearch,
    title: "Un suivi en temps réel",
    description:
      "Restez informé de la progression de votre colis grâce aux mises à jour tout au long de son parcours.",
  },
  {
    icon: Headset,
    title: "Un accompagnement à votre écoute",
    description:
      "Notre équipe répond à vos questions et vous accompagne à chaque étape de votre envoi.",
  },
];

export default function WhyChooseUs() {
  return (
    <section id="why-us" className="bg-white px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <span className="text-sm font-bold uppercase tracking-[0.25em] text-blue-700">
            Pourquoi choisir PatExpressShipping
          </span>

          <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-950 md:text-5xl">
            La confiance, la simplicité et la sérénité au cœur de chaque envoi.
          </h2>

          <p className="mt-6 text-lg leading-8 text-slate-600">
            Cadeaux, effets personnels ou marchandises professionnelles : nous
            rendons vos envois entre les États-Unis et le Burkina Faso simples,
            transparents et fiables.
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
            Des envois de confiance des États-Unis au Burkina Faso
          </h3>

          <p className="mx-auto mt-4 max-w-3xl text-lg text-blue-100">
            De votre première demande jusqu’à la livraison, notre mission est de
            vous offrir une expérience sûre, accessible et sans stress.
          </p>
        </div>
      </div>
    </section>
  );
}
