import type { Metadata } from "next";
import { AlertTriangle, PackageSearch, ShieldCheck } from "lucide-react";

import Footer from "@/components/landing/Footer";
import Navbar from "@/components/landing/Navbar";
import PublicTrackingForm from "@/components/tracking/PublicTrackingForm";
import PublicTrackingResult from "@/components/tracking/PublicTrackingResult";
import {
  getPublicShipmentTracking,
  InvalidShipmentTrackingNumberError,
  PublicShipmentNotFoundError,
  type PublicShipmentTrackingResult,
} from "@/src/services/public-shipment-tracking.service";

export const metadata: Metadata = {
  title: "Suivre un colis | PatExpressShipping",
  description:
    "Suivez l’évolution de votre envoi PatExpressShipping entre les États-Unis et le Burkina Faso à l’aide de votre numéro de suivi.",
};

type PublicTrackingPageProps = {
  searchParams: Promise<{
    numero?: string | string[];
  }>;
};

type TrackingViewState =
  | { kind: "initial" }
  | {
      kind: "success";
      result: PublicShipmentTrackingResult;
    }
  | {
      kind: "error";
      title: string;
      message: string;
    };

async function resolveTrackingViewState(
  trackingNumber: unknown,
): Promise<TrackingViewState> {
  if (trackingNumber === undefined) {
    return { kind: "initial" };
  }

  try {
    const lookupValue =
      typeof trackingNumber === "string"
        ? trackingNumber.trim()
        : trackingNumber;
    const result = await getPublicShipmentTracking(lookupValue);

    return { kind: "success", result };
  } catch (error) {
    if (error instanceof InvalidShipmentTrackingNumberError) {
      return {
        kind: "error",
        title: "Numéro de suivi invalide",
        message:
          "Vérifiez le numéro saisi et réessayez. Un numéro PatExpressShipping ressemble à PAT-2026-XXXXXXXX.",
      };
    }

    if (error instanceof PublicShipmentNotFoundError) {
      return {
        kind: "error",
        title: "Envoi introuvable",
        message:
          "Aucun envoi ne correspond à ce numéro de suivi. Vérifiez le numéro et réessayez.",
      };
    }

    return {
      kind: "error",
      title: "Impossible d’afficher le suivi",
      message:
        "Une erreur est survenue lors de la recherche de votre envoi. Veuillez réessayer.",
    };
  }
}

export default async function PublicTrackingPage({
  searchParams,
}: PublicTrackingPageProps) {
  const { numero } = await searchParams;
  const inputValue = typeof numero === "string" ? numero : "";
  const viewState = await resolveTrackingViewState(numero);

  return (
    <div lang="fr" className="flex min-h-screen flex-col bg-slate-50 text-slate-950">
      <Navbar language="fr" />

      <main className="flex-1">
        <section className="relative overflow-hidden bg-slate-950 px-5 py-14 text-white sm:px-6 sm:py-16">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.3),transparent_42%)]" />
          <div className="relative mx-auto max-w-4xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-300">
              Suivi de colis
            </p>
            <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
              Où est votre colis&nbsp;?
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-300">
              Saisissez votre numéro de suivi PatExpressShipping pour consulter
              l’état actuel de votre envoi.
            </p>
          </div>
        </section>

        <section className="px-5 py-10 sm:px-6 sm:py-14">
          <div className="mx-auto max-w-4xl">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <PackageSearch aria-hidden="true" className="h-6 w-6" />
                </span>
                <div>
                  <h2 className="text-2xl font-black tracking-tight">
                    Rechercher un envoi
                  </h2>
                  <p className="mt-2 leading-7 text-slate-600">
                    Consultez les dernières étapes enregistrées sans créer de
                    compte.
                  </p>
                </div>
              </div>
              <PublicTrackingForm defaultValue={inputValue} />
            </div>

            {viewState.kind === "error" ? (
              <section
                role="alert"
                aria-labelledby="tracking-error-title"
                className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-6 sm:p-8"
              >
                <div className="flex items-start gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
                    <AlertTriangle aria-hidden="true" className="h-6 w-6" />
                  </span>
                  <div>
                    <h2
                      id="tracking-error-title"
                      className="text-2xl font-black tracking-tight"
                    >
                      {viewState.title}
                    </h2>
                    <p className="mt-3 leading-7 text-slate-700">
                      {viewState.message}
                    </p>
                  </div>
                </div>
              </section>
            ) : viewState.kind === "success" ? (
              <PublicTrackingResult result={viewState.result} />
            ) : (
              <div className="mt-8 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-5 text-sm leading-6 text-slate-700">
                <ShieldCheck
                  aria-hidden="true"
                  className="mt-0.5 h-5 w-5 shrink-0 text-blue-700"
                />
                <p>
                  Le suivi public affiche uniquement le statut et les étapes
                  enregistrées de votre envoi.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer language="fr" />
    </div>
  );
}
