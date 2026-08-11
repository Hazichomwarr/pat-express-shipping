import type { Metadata } from "next";
import { ClipboardCheck, PackageCheck, Scale, Send } from "lucide-react";

import Footer from "@/components/landing/Footer";
import Navbar from "@/components/landing/Navbar";
import CreateShipmentRequestForm from "@/components/shipments/CreateShipmentRequestForm";

export const metadata: Metadata = {
  title: "Créer un envoi | PatExpressShipping",
  description:
    "Créez votre demande d’envoi entre les États-Unis et le Burkina Faso et recevez votre numéro de suivi.",
};

const processSteps = [
  {
    icon: ClipboardCheck,
    title: "Vous soumettez votre demande",
  },
  {
    icon: Send,
    title: "Vous apportez ou envoyez le colis",
  },
  {
    icon: Scale,
    title: "Notre équipe le vérifie et le pèse",
  },
  {
    icon: PackageCheck,
    title: "Le prix final vous est communiqué",
  },
];

export default function CreateShipmentPage() {
  return (
    <div lang="fr" className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar language="fr" />

      <main>
        <section className="relative overflow-hidden bg-slate-950 px-6 py-16 text-white sm:py-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.35),transparent_38%)]" />
          <div className="relative mx-auto max-w-6xl">
            <p className="text-sm font-black uppercase tracking-[0.24em] text-blue-300">
              Créer un envoi
            </p>
            <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
              Préparez votre prochain envoi entre les États-Unis et le Burkina
              Faso
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
              Renseignez les informations de l’expéditeur, du destinataire et
              du contenu du colis. Notre équipe vous contactera après réception
              et pesée du colis.
            </p>
          </div>
        </section>

        <section className="px-6 py-10 sm:py-12">
          <div className="mx-auto max-w-6xl rounded-3xl border border-blue-200 bg-blue-50 p-6 sm:p-8">
            <div className="max-w-3xl">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-700">
                Comment cela fonctionne
              </p>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                Le prix est fixé après réception du colis
              </h2>
              <p className="mt-3 leading-7 text-slate-700">
                Votre demande ne déclenche aucun paiement immédiat. Après avoir
                reçu et pesé votre colis, PatExpressShipping vous communiquera
                le montant final à payer.
              </p>
            </div>

            <ol className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {processSteps.map((step, index) => {
                const Icon = step.icon;

                return (
                  <li
                    key={step.title}
                    className="rounded-2xl border border-blue-100 bg-white p-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-white">
                        <Icon aria-hidden="true" className="h-5 w-5" />
                      </span>
                      <div>
                        <span className="text-xs font-bold text-blue-700">
                          Étape {index + 1}
                        </span>
                        <p className="mt-0.5 text-sm font-bold leading-5 text-slate-900">
                          {step.title}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="mt-6 grid gap-3 text-sm leading-6 text-slate-700 md:grid-cols-2">
              <p>
                <strong className="text-slate-950">Dépôt :</strong> vous
                apportez le colis directement à PatExpressShipping.
              </p>
              <p>
                <strong className="text-slate-950">Envoi par courrier :</strong>{" "}
                vous envoyez le colis à l’adresse qui vous sera confirmée.
              </p>
            </div>
          </div>
        </section>

        <section className="px-6 pb-20 sm:pb-28">
          <div className="mx-auto max-w-6xl">
            <CreateShipmentRequestForm />
          </div>
        </section>
      </main>

      <Footer language="fr" />
    </div>
  );
}
