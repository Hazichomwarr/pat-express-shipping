import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  Clock3,
  FileCheck2,
  History,
  ShieldCheck,
} from "lucide-react";

import ShipmentPaymentConfirmation from "@/components/staff/ShipmentPaymentConfirmation";
import ShipmentPaymentForm from "@/components/staff/ShipmentPaymentForm";
import { prisma } from "@/src/lib/prisma";
import {
  canConfirmShipmentPaymentStatus,
  canStartShipmentPayment,
  getAllowedShipmentPaymentMethods,
  isTerminalShipmentPaymentStatus,
} from "@/src/services/_shared/shipment-payment";
import {
  requireStaff,
  StaffAuthenticationRequiredError,
} from "@/src/services/_shared/require-staff";
import { getShipmentDirectionLabel } from "@/src/services/_shared/shipment-direction-presentation";
import {
  getShipmentPaymentMethodLabel,
  getShipmentPaymentStatusLabel,
  getStaffShipmentStatusLabel,
} from "@/src/services/_shared/staff-ui";

export const metadata: Metadata = {
  title: "Gérer le paiement | PatExpressShipping",
  description: "Enregistrer et confirmer le paiement d’un envoi.",
};

type ShipmentPaymentPageProps = {
  params: Promise<{ id: string }>;
};

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeStyle: "short",
});

async function findShipmentForPayment(id: string) {
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
      measuredWeightKg: true,
      ratePerKg: true,
      quotedAmount: true,
      quoteCurrency: true,
      quotedAt: true,
      payments: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          method: true,
          status: true,
          amount: true,
          currency: true,
          zelleName: true,
          mobileMoneyPayerName: true,
          createdAt: true,
          confirmedAt: true,
          confirmedByStaffId: true,
          cancelledAt: true,
        },
      },
    },
  });
}

type ShipmentForPayment = NonNullable<
  Awaited<ReturnType<typeof findShipmentForPayment>>
>;

type ShipmentWithCompleteQuote = ShipmentForPayment & {
  measuredWeightKg: NonNullable<ShipmentForPayment["measuredWeightKg"]>;
  ratePerKg: NonNullable<ShipmentForPayment["ratePerKg"]>;
  quotedAmount: NonNullable<ShipmentForPayment["quotedAmount"]>;
  quoteCurrency: NonNullable<ShipmentForPayment["quoteCurrency"]>;
  quotedAt: NonNullable<ShipmentForPayment["quotedAt"]>;
};

function hasCompleteQuote(
  shipment: ShipmentForPayment,
): shipment is ShipmentWithCompleteQuote {
  return [
    shipment.measuredWeightKg,
    shipment.ratePerKg,
    shipment.quotedAmount,
    shipment.quoteCurrency,
    shipment.quotedAt,
  ].every((value) => value !== null);
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <dt className="text-sm font-semibold text-slate-500">{label}</dt>
      <dd className="mt-1 font-bold text-slate-950">{value}</dd>
    </div>
  );
}

function PaymentHistory({ payments }: { payments: ShipmentForPayment["payments"] }) {
  if (payments.length === 0) {
    return (
      <p className="mt-5 rounded-2xl bg-slate-50 p-5 text-slate-600">
        Aucun paiement n’a encore été enregistré pour cet envoi.
      </p>
    );
  }

  return (
    <div className="mt-5 space-y-3">
      {payments.map((payment) => {
        const terminal = isTerminalShipmentPaymentStatus(payment.status);

        return (
          <article
            key={payment.id}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-black text-slate-950">
                  {getShipmentPaymentMethodLabel(payment.method)} · {payment.amount.toString()} {payment.currency}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Enregistré le {dateFormatter.format(payment.createdAt)}
                </p>
              </div>
              <span className={`inline-flex w-fit rounded-full px-3 py-1.5 text-sm font-bold ring-1 ${terminal ? "bg-slate-200 text-slate-800 ring-slate-300" : "bg-amber-100 text-amber-900 ring-amber-200"}`}>
                {getShipmentPaymentStatusLabel(payment.status)}
              </span>
            </div>
            <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              {payment.zelleName ? (
                <div><dt className="font-semibold text-slate-500">Nom Zelle</dt><dd className="font-bold text-slate-800">{payment.zelleName}</dd></div>
              ) : null}
              {payment.mobileMoneyPayerName ? (
                <div><dt className="font-semibold text-slate-500">Nom Orange Money</dt><dd className="font-bold text-slate-800">{payment.mobileMoneyPayerName}</dd></div>
              ) : null}
              {payment.confirmedAt ? (
                <div><dt className="font-semibold text-slate-500">Confirmé le</dt><dd className="font-bold text-slate-800">{dateFormatter.format(payment.confirmedAt)}</dd></div>
              ) : null}
              {payment.cancelledAt ? (
                <div><dt className="font-semibold text-slate-500">Annulé le</dt><dd className="font-bold text-slate-800">{dateFormatter.format(payment.cancelledAt)}</dd></div>
              ) : null}
            </dl>
          </article>
        );
      })}
    </div>
  );
}

export default async function ShipmentPaymentPage({
  params,
}: ShipmentPaymentPageProps) {
  const { id } = await params;
  const paymentPath = `/staff/shipments/${encodeURIComponent(id)}/payment`;
  let authenticationRequired = false;

  try {
    await requireStaff();
  } catch (error) {
    if (!(error instanceof StaffAuthenticationRequiredError)) throw error;
    authenticationRequired = true;
  }

  if (authenticationRequired) {
    redirect(`/staff/login?callbackUrl=${encodeURIComponent(paymentPath)}`);
  }

  const shipment = await findShipmentForPayment(id);

  if (!shipment) notFound();

  const completeQuote = hasCompleteQuote(shipment) ? shipment : null;
  const pendingPayment = shipment.payments.find((payment) =>
    canConfirmShipmentPaymentStatus(payment.status),
  );
  const confirmedPayment = shipment.payments.find(
    (payment) => payment.status === "CONFIRMED",
  );
  const mayCreatePayment =
    completeQuote !== null &&
    canStartShipmentPayment(shipment.status) &&
    !pendingPayment &&
    !confirmedPayment;
  const loginUrl = `/staff/login?callbackUrl=${encodeURIComponent(paymentPath)}`;

  return (
    <main lang="fr" className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-800 bg-slate-950 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5">
          <Link href="/" className="text-xl font-black tracking-tight focus-visible:rounded focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-400/40">
            <span className="text-blue-400">Pat</span><span className="text-red-400">Express</span><span>Shipping</span>
          </Link>
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300">
            <ShieldCheck aria-hidden="true" className="h-4 w-4 text-blue-400" />
            Espace personnel sécurisé
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-14">
        <Link href={`/staff/shipments/${encodeURIComponent(id)}/quote`} className="inline-flex items-center gap-2 rounded-lg text-sm font-bold text-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Retour au devis
        </Link>

        <div className="mt-7 max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-700">Paiement de l’envoi</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Gérer le paiement</h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            Enregistrez le mode de paiement choisi, puis confirmez le paiement uniquement après réception effective des fonds.
          </p>
        </div>

        <section className="mt-9 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div><p className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">Résumé de l’envoi</p><h2 className="mt-2 break-all text-2xl font-black tracking-tight">{shipment.trackingNumber}</h2></div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-800 ring-1 ring-blue-200"><Clock3 aria-hidden="true" className="h-4 w-4" />{getStaffShipmentStatusLabel(shipment.status, shipment.direction)}</span>
          </div>
          <dl className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <SummaryItem label="Numéro de suivi" value={shipment.trackingNumber} />
            <SummaryItem label="Sens de l’envoi" value={getShipmentDirectionLabel(shipment.direction)} />
            <SummaryItem label="Expéditeur" value={shipment.senderName} />
            <SummaryItem label="Destinataire" value={shipment.recipientName} />
            <SummaryItem label="Ville de retrait" value={shipment.recipientCity} />
            <SummaryItem label="Statut de l’envoi" value={getStaffShipmentStatusLabel(shipment.status, shipment.direction)} />
          </dl>
        </section>

        <section className="mt-8 rounded-3xl border border-blue-200 bg-blue-950 p-6 text-white shadow-xl shadow-blue-950/10 sm:p-8">
          <div className="flex items-center gap-3"><FileCheck2 aria-hidden="true" className="h-7 w-7 text-blue-300" /><h2 className="text-2xl font-black tracking-tight">Devis officiel</h2></div>
          {completeQuote ? (
            <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-2xl bg-white/10 p-4"><dt className="text-sm font-semibold text-blue-200">Montant du devis</dt><dd className="mt-1 text-2xl font-black">{completeQuote.quotedAmount.toString()} {completeQuote.quoteCurrency}</dd></div>
              <div className="rounded-2xl bg-white/10 p-4"><dt className="text-sm font-semibold text-blue-200">Devise</dt><dd className="mt-1 font-bold">{completeQuote.quoteCurrency}</dd></div>
              <div className="rounded-2xl bg-white/10 p-4"><dt className="text-sm font-semibold text-blue-200">Date du devis</dt><dd className="mt-1 font-bold">{dateFormatter.format(completeQuote.quotedAt)}</dd></div>
              <div className="rounded-2xl bg-white/10 p-4"><dt className="text-sm font-semibold text-blue-200">Poids mesuré</dt><dd className="mt-1 font-bold">{completeQuote.measuredWeightKg.toString()} kg</dd></div>
              <div className="rounded-2xl bg-white/10 p-4"><dt className="text-sm font-semibold text-blue-200">Tarif par kg</dt><dd className="mt-1 font-bold">{completeQuote.ratePerKg.toString()} {completeQuote.quoteCurrency}/kg</dd></div>
            </dl>
          ) : (
            <p className="mt-5 max-w-3xl leading-7 text-blue-100">Cet envoi ne possède pas encore un devis complet permettant d’enregistrer un paiement.</p>
          )}
        </section>

        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div>
            {!completeQuote ? (
              <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 sm:p-8"><h2 className="text-2xl font-black tracking-tight">Paiement indisponible</h2><p className="mt-3 leading-7 text-slate-700">Complétez d’abord le devis officiel avant d’enregistrer un paiement.</p></section>
            ) : pendingPayment ? (
              <ShipmentPaymentConfirmation
                payment={{ id: pendingPayment.id, method: pendingPayment.method, amount: pendingPayment.amount.toString(), currency: pendingPayment.currency, zelleName: pendingPayment.zelleName, mobileMoneyPayerName: pendingPayment.mobileMoneyPayerName, createdAt: pendingPayment.createdAt.toISOString() }}
                loginUrl={loginUrl}
              />
            ) : confirmedPayment ? (
              <section className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
                <Banknote aria-hidden="true" className="h-9 w-9 text-emerald-700" />
                <h2 className="mt-5 text-3xl font-black tracking-tight">Paiement confirmé</h2>
                <p className="mt-3 leading-7 text-slate-600">Le paiement est enregistré comme reçu. Aucun nouveau paiement ne peut être créé depuis cet écran.</p>
                <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                  <SummaryItem label="Méthode" value={getShipmentPaymentMethodLabel(confirmedPayment.method)} />
                  <SummaryItem label="Montant" value={`${confirmedPayment.amount.toString()} ${confirmedPayment.currency}`} />
                  {confirmedPayment.zelleName ? <SummaryItem label="Nom Zelle" value={confirmedPayment.zelleName} /> : null}
                  {confirmedPayment.mobileMoneyPayerName ? <SummaryItem label="Nom Orange Money" value={confirmedPayment.mobileMoneyPayerName} /> : null}
                  <SummaryItem label="Date de création" value={dateFormatter.format(confirmedPayment.createdAt)} />
                  <SummaryItem label="Date de confirmation" value={confirmedPayment.confirmedAt ? dateFormatter.format(confirmedPayment.confirmedAt) : "Non renseignée"} />
                </dl>
              </section>
            ) : mayCreatePayment ? (
              <ShipmentPaymentForm shipmentId={shipment.id} amount={completeQuote.quotedAmount.toString()} currency={completeQuote.quoteCurrency} loginUrl={loginUrl} allowedMethods={getAllowedShipmentPaymentMethods(shipment.direction)} />
            ) : (
              <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8"><h2 className="text-2xl font-black tracking-tight">Aucune action disponible</h2><p className="mt-3 leading-7 text-slate-600">Cet envoi est au statut « {getStaffShipmentStatusLabel(shipment.status, shipment.direction)} ». Un paiement ne peut être enregistré que lorsqu’il est en attente de paiement.</p></section>
            )}
          </div>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center gap-3"><History aria-hidden="true" className="h-6 w-6 text-blue-700" /><h2 className="text-2xl font-black tracking-tight">Historique des paiements</h2></div>
            <PaymentHistory payments={shipment.payments} />
          </section>
        </div>
      </div>
    </main>
  );
}
