import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Clock3, PackageCheck, ShieldCheck } from "lucide-react";

import ShipmentQuotationForm from "@/components/staff/ShipmentQuotationForm";
import { prisma } from "@/src/lib/prisma";
import { canQuoteShipmentStatus } from "@/src/services/_shared/shipment-quotation";
import {
  requireStaff,
  StaffAuthenticationRequiredError,
} from "@/src/services/_shared/require-staff";
import { getShipmentDirectionLabel } from "@/src/services/_shared/shipment-direction-presentation";
import {
  getShipmentIntakeMethodLabel,
  getStaffShipmentStatusLabel,
} from "@/src/services/_shared/staff-ui";

export const metadata: Metadata = {
  title: "Enregistrer un devis | PatExpressShipping",
  description: "Enregistrer le devis officiel d’un envoi.",
};

type ShipmentQuotationPageProps = {
  params: Promise<{ id: string }>;
};

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeStyle: "short",
});

async function findShipmentForQuotation(id: string) {
  return prisma.shipment.findUnique({
    where: { id },
    select: {
      id: true,
      trackingNumber: true,
      status: true,
      direction: true,
      senderName: true,
      recipientName: true,
      recipientCity: true,
      intakeMethod: true,
      createdAt: true,
      measuredWeightKg: true,
      ratePerKg: true,
      quotedAmount: true,
      quoteCurrency: true,
      quotedAt: true,
    },
  });
}

function hasExistingQuotation(
  shipment: NonNullable<Awaited<ReturnType<typeof findShipmentForQuotation>>>,
) {
  return [
    shipment.measuredWeightKg,
    shipment.ratePerKg,
    shipment.quotedAmount,
    shipment.quoteCurrency,
    shipment.quotedAt,
  ].some((value) => value !== null);
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <dt className="text-sm font-semibold text-slate-500">{label}</dt>
      <dd className="mt-1 font-bold text-slate-950">{value}</dd>
    </div>
  );
}

export default async function ShipmentQuotationPage({
  params,
}: ShipmentQuotationPageProps) {
  const { id } = await params;
  const quotePath = `/staff/shipments/${encodeURIComponent(id)}/quote`;
  let authenticationRequired = false;

  try {
    await requireStaff();
  } catch (error) {
    if (!(error instanceof StaffAuthenticationRequiredError)) {
      throw error;
    }

    authenticationRequired = true;
  }

  if (authenticationRequired) {
    redirect(`/staff/login?callbackUrl=${encodeURIComponent(quotePath)}`);
  }

  const shipment = await findShipmentForQuotation(id);

  if (!shipment) {
    notFound();
  }

  const existingQuotation = hasExistingQuotation(shipment);
  const quoteable = canQuoteShipmentStatus(shipment.status);
  const loginUrl = `/staff/login?callbackUrl=${encodeURIComponent(quotePath)}`;

  return (
    <main lang="fr" className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-800 bg-slate-950 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5">
          <Link
            href="/"
            className="text-xl font-black tracking-tight focus-visible:rounded focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-400/40"
          >
            <span className="text-blue-400">Pat</span>
            <span className="text-red-400">Express</span>
            <span>Shipping</span>
          </Link>
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300">
            <ShieldCheck aria-hidden="true" className="h-4 w-4 text-blue-400" />
            Espace personnel sécurisé
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-14">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg text-sm font-bold text-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Retour à l’accueil
        </Link>

        <div className="mt-7 max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-700">
            Opérations d’envoi
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
            Enregistrer le devis de l’envoi
          </h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            Vérifiez l’envoi physique avant d’enregistrer ses conditions commerciales officielles.
          </p>
        </div>

        <section className="mt-9 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">
                Résumé de l’envoi
              </p>
              <h2 className="mt-2 break-all text-2xl font-black tracking-tight">
                {shipment.trackingNumber}
              </h2>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-800 ring-1 ring-blue-200">
              <Clock3 aria-hidden="true" className="h-4 w-4" />
              {getStaffShipmentStatusLabel(shipment.status, shipment.direction)}
            </span>
          </div>

          <dl className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SummaryItem label="Numéro de suivi" value={shipment.trackingNumber} />
            <SummaryItem label="Sens de l’envoi" value={getShipmentDirectionLabel(shipment.direction)} />
            <SummaryItem label="Expéditeur" value={shipment.senderName} />
            <SummaryItem label="Destinataire" value={shipment.recipientName} />
            <SummaryItem label="Ville de retrait" value={shipment.recipientCity} />
            <SummaryItem
              label="Mode de dépôt"
              value={getShipmentIntakeMethodLabel(shipment.intakeMethod)}
            />
            <SummaryItem
              label="Date de création"
              value={dateFormatter.format(shipment.createdAt)}
            />
          </dl>
        </section>

        <div className="mt-8">
          {existingQuotation ? (
            <section className="rounded-3xl border border-blue-200 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <PackageCheck aria-hidden="true" className="h-6 w-6" />
              </div>
              <h2 className="mt-5 text-3xl font-black tracking-tight">
                Devis déjà enregistré
              </h2>
              <p className="mt-3 max-w-2xl leading-7 text-slate-600">
                Ce devis constitue l’historique commercial officiel de l’envoi et ne peut pas être remplacé depuis cet écran.
              </p>
              <dl className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <SummaryItem
                  label="Poids mesuré"
                  value={shipment.measuredWeightKg ? `${shipment.measuredWeightKg.toString()} kg` : "Non renseigné"}
                />
                <SummaryItem
                  label="Tarif par kg"
                  value={shipment.ratePerKg ? shipment.ratePerKg.toString() : "Non renseigné"}
                />
                <SummaryItem
                  label="Montant"
                  value={shipment.quotedAmount ? shipment.quotedAmount.toString() : "Non renseigné"}
                />
                <SummaryItem
                  label="Devise"
                  value={shipment.quoteCurrency ?? "Non renseignée"}
                />
                <SummaryItem
                  label="Date du devis"
                  value={shipment.quotedAt ? dateFormatter.format(shipment.quotedAt) : "Non renseignée"}
                />
              </dl>
            </section>
          ) : quoteable ? (
            <ShipmentQuotationForm shipmentId={shipment.id} loginUrl={loginUrl} />
          ) : (
            <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 sm:p-8">
              <h2 className="text-3xl font-black tracking-tight text-slate-950">
                Cet envoi ne peut pas être facturé maintenant
              </h2>
              <p className="mt-3 max-w-3xl leading-7 text-slate-700">
                L’envoi <strong>{shipment.trackingNumber}</strong> est actuellement au statut « {getStaffShipmentStatusLabel(shipment.status, shipment.direction)} ». Le devis ne devient disponible que lorsque l’envoi attend officiellement sa facturation.
              </p>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
