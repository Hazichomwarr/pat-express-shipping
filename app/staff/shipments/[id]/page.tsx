import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Banknote,
  Box,
  CalendarClock,
  ClipboardList,
  FileText,
  MapPin,
  UserRound,
} from "lucide-react";

import StaffHeader from "@/components/staff/StaffHeader";
import ShipmentStatusControl from "@/components/staff/ShipmentStatusControl";
import { prisma } from "@/src/lib/prisma";
import {
  requireStaff,
  StaffAuthenticationRequiredError,
} from "@/src/services/_shared/require-staff";
import {
  getShipmentQuoteState,
  getStaffShipmentStatusActionPresentation,
  getStaffShipmentWorkspaceAction,
} from "@/src/services/_shared/staff-shipment-workspace";
import {
  getShipmentDirectionDestinationLabel,
  getShipmentDirectionLabel,
  getShipmentDirectionOriginLabel,
} from "@/src/services/_shared/shipment-direction-presentation";
import {
  getShipmentIntakeMethodLabel,
  getShipmentItemCategoryLabel,
  getShipmentPaymentMethodLabel,
  getShipmentPaymentStatusLabel,
  getStaffShipmentStatusLabel,
} from "@/src/services/_shared/staff-ui";

export const metadata: Metadata = {
  title: "Dossier d’envoi | PatExpressShipping",
  description: "Espace opérationnel d’un envoi PatExpressShipping.",
};

type StaffShipmentWorkspacePageProps = {
  params: Promise<{ id: string }>;
};

const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeStyle: "short",
});

async function findShipmentWorkspace(id: string) {
  return prisma.shipment.findUnique({
    where: { id },
    select: {
      id: true,
      trackingNumber: true,
      status: true,
      direction: true,
      intakeMethod: true,
      createdAt: true,
      updatedAt: true,
      senderName: true,
      senderPhone: true,
      senderEmail: true,
      recipientName: true,
      recipientPhone: true,
      recipientEmail: true,
      recipientCity: true,
      recipientNotes: true,
      customerNotes: true,
      internalNotes: true,
      packageReceivedAt: true,
      measuredWeightKg: true,
      ratePerKg: true,
      quotedAmount: true,
      quoteCurrency: true,
      quotedAt: true,
      paymentConfirmedAt: true,
      arrivedDestinationAt: true,
      readyForPickupAt: true,
      deliveredAt: true,
      cancelledAt: true,
      items: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          description: true,
          category: true,
          quantity: true,
          declaredValue: true,
          createdAt: true,
        },
      },
      payments: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          method: true,
          status: true,
          amount: true,
          currency: true,
          zelleName: true,
          createdAt: true,
          confirmedAt: true,
          cancelledAt: true,
        },
      },
    },
  });
}

type ShipmentWorkspace = NonNullable<
  Awaited<ReturnType<typeof findShipmentWorkspace>>
>;

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm font-semibold text-slate-500">{label}</dt>
      <dd className="mt-1 break-words font-bold text-slate-950">{value}</dd>
    </div>
  );
}

function ContactCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
      <div className="flex items-center gap-3">
        <UserRound aria-hidden="true" className="h-6 w-6 text-blue-700" />
        <h2 className="text-2xl font-black tracking-tight">{title}</h2>
      </div>
      <dl className="mt-6 grid gap-5 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

function QuoteSection({ shipment }: { shipment: ShipmentWorkspace }) {
  const quoteState = getShipmentQuoteState(shipment);
  const quoteHref = `/staff/shipments/${encodeURIComponent(shipment.id)}/quote`;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-center gap-3">
        <FileText aria-hidden="true" className="h-6 w-6 text-blue-700" />
        <h2 className="text-2xl font-black tracking-tight">Devis</h2>
      </div>

      {quoteState === "empty" ? (
        <div className="mt-5 rounded-2xl bg-slate-50 p-5">
          <p className="text-slate-600">Aucun devis n’a encore été enregistré.</p>
          {shipment.status === "AWAITING_QUOTE" ? (
            <Link
              href={quoteHref}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
            >
              Établir le devis
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
      ) : quoteState === "partial" ? (
        <div role="status" className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div>
              <h3 className="font-black text-slate-950">Informations incomplètes</h3>
              <p className="mt-1 text-slate-700">Les informations du devis sont incomplètes.</p>
            </div>
          </div>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Detail label="Poids mesuré" value={shipment.measuredWeightKg ? `${shipment.measuredWeightKg.toString()} kg` : "Non renseigné"} />
            <Detail label="Tarif par kilogramme" value={shipment.ratePerKg?.toString() ?? "Non renseigné"} />
            <Detail label="Montant" value={shipment.quotedAmount?.toString() ?? "Non renseigné"} />
            <Detail label="Devise" value={shipment.quoteCurrency ?? "Non renseignée"} />
            <Detail label="Date du devis" value={shipment.quotedAt ? dateTimeFormatter.format(shipment.quotedAt) : "Non renseignée"} />
          </dl>
        </div>
      ) : (
        <dl className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          <Detail label="Poids mesuré" value={`${shipment.measuredWeightKg!.toString()} kg`} />
          <Detail label="Tarif par kilogramme" value={`${shipment.ratePerKg!.toString()} ${shipment.quoteCurrency}/kg`} />
          <Detail label="Montant" value={shipment.quotedAmount!.toString()} />
          <Detail label="Devise" value={shipment.quoteCurrency!} />
          <Detail label="Date du devis" value={dateTimeFormatter.format(shipment.quotedAt!)} />
        </dl>
      )}
    </section>
  );
}

function PaymentsSection({ shipment }: { shipment: ShipmentWorkspace }) {
  const paymentHref = `/staff/shipments/${encodeURIComponent(shipment.id)}/payment`;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-center gap-3">
        <Banknote aria-hidden="true" className="h-6 w-6 text-blue-700" />
        <h2 className="text-2xl font-black tracking-tight">Paiements</h2>
      </div>

      {shipment.payments.length === 0 ? (
        <div className="mt-5 rounded-2xl bg-slate-50 p-5">
          <p className="text-slate-600">Aucun paiement enregistré.</p>
          {shipment.status === "AWAITING_PAYMENT" ? (
            <Link href={paymentHref} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200">
              Gérer le paiement
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {shipment.payments.map((payment) => (
            <article
              key={payment.id}
              className={`rounded-2xl border p-5 ${payment.status === "CONFIRMED" ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-black text-slate-950">
                    {getShipmentPaymentMethodLabel(payment.method)} · {payment.amount.toString()} {payment.currency}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Enregistré le {dateTimeFormatter.format(payment.createdAt)}
                  </p>
                </div>
                <span className="inline-flex w-fit rounded-full bg-white px-3 py-1.5 text-sm font-bold text-slate-800 ring-1 ring-slate-300">
                  {getShipmentPaymentStatusLabel(payment.status)}
                </span>
              </div>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                {payment.zelleName ? <Detail label="Nom Zelle" value={payment.zelleName} /> : null}
                {payment.confirmedAt ? <Detail label="Confirmé le" value={dateTimeFormatter.format(payment.confirmedAt)} /> : null}
                {payment.cancelledAt ? <Detail label="Annulé le" value={dateTimeFormatter.format(payment.cancelledAt)} /> : null}
              </dl>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default async function StaffShipmentWorkspacePage({
  params,
}: StaffShipmentWorkspacePageProps) {
  const { id } = await params;
  const workspacePath = `/staff/shipments/${encodeURIComponent(id)}`;
  let authenticationRequired = false;

  try {
    await requireStaff();
  } catch (error) {
    if (!(error instanceof StaffAuthenticationRequiredError)) throw error;
    authenticationRequired = true;
  }

  if (authenticationRequired) {
    redirect(`/staff/login?callbackUrl=${encodeURIComponent(workspacePath)}`);
  }

  const shipment = await findShipmentWorkspace(id);
  if (!shipment) notFound();

  const nextAction = getStaffShipmentWorkspaceAction(
    shipment.status,
    shipment.direction,
    shipment.id,
  );
  const operationalAction = getStaffShipmentStatusActionPresentation(
    shipment.status,
    shipment.direction,
  );
  const loginUrl = `/staff/login?callbackUrl=${encodeURIComponent(workspacePath)}`;
  const milestones = [
    { label: "Demande créée", date: shipment.createdAt },
    {
      label: getStaffShipmentStatusLabel("PACKAGE_RECEIVED", shipment.direction),
      date: shipment.packageReceivedAt,
    },
    { label: "Devis enregistré", date: shipment.quotedAt },
    { label: "Paiement confirmé", date: shipment.paymentConfirmedAt },
    {
      label: getStaffShipmentStatusLabel("ARRIVED_DESTINATION", shipment.direction),
      date: shipment.arrivedDestinationAt,
    },
    { label: "Prêt pour le retrait", date: shipment.readyForPickupAt },
    { label: "Livré", date: shipment.deliveredAt },
    { label: "Annulé", date: shipment.cancelledAt },
  ].filter((milestone): milestone is { label: string; date: Date } => milestone.date !== null);

  return (
    <main lang="fr" className="min-h-screen bg-slate-50 text-slate-950">
      <StaffHeader />

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6 sm:py-12">
        <Link href="/staff" className="inline-flex items-center gap-2 rounded-lg text-sm font-bold text-blue-700 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Retour aux envois
        </Link>

        <header className="mt-6 rounded-3xl bg-slate-950 p-6 text-white shadow-xl shadow-slate-950/10 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-300">Dossier d’envoi</p>
              <h1 className="mt-3 break-words text-3xl font-black tracking-tight sm:text-5xl">
                Envoi {shipment.trackingNumber}
              </h1>
            </div>
            <div className="flex flex-col items-start gap-2 lg:items-end">
              <span className="inline-flex w-fit rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-slate-100 ring-1 ring-white/20">
                {getShipmentDirectionLabel(shipment.direction)}
              </span>
              <span className="inline-flex w-fit rounded-full bg-blue-400/15 px-4 py-2 text-sm font-bold text-blue-100 ring-1 ring-blue-300/30">
                {getStaffShipmentStatusLabel(shipment.status, shipment.direction)}
              </span>
            </div>
          </div>
          <dl className="mt-7 grid gap-4 border-t border-white/10 pt-6 sm:grid-cols-3">
            <div><dt className="text-sm font-semibold text-slate-400">Mode de dépôt</dt><dd className="mt-1 font-bold">{getShipmentIntakeMethodLabel(shipment.intakeMethod)}</dd></div>
            <div><dt className="text-sm font-semibold text-slate-400">Date de création</dt><dd className="mt-1 font-bold">{dateTimeFormatter.format(shipment.createdAt)}</dd></div>
            <div><dt className="text-sm font-semibold text-slate-400">Dernière mise à jour</dt><dd className="mt-1 font-bold">{dateTimeFormatter.format(shipment.updatedAt)}</dd></div>
          </dl>
        </header>

        <section aria-labelledby="next-action-heading" className="mt-7 rounded-3xl border border-blue-200 bg-blue-50 p-6 sm:p-8">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-700">Prochaine étape</p>
          <h2 id="next-action-heading" className="mt-2 text-2xl font-black tracking-tight">{nextAction.title}</h2>
          <p className="mt-2 max-w-3xl leading-7 text-slate-700">{nextAction.description}</p>
          {nextAction.href && nextAction.linkLabel ? (
            <Link href={nextAction.href} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-bold text-white hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200">
              {nextAction.linkLabel}
              <ArrowRight aria-hidden="true" className="h-5 w-5" />
            </Link>
          ) : null}
          {operationalAction ? (
            <ShipmentStatusControl
              key={shipment.status}
              shipmentId={shipment.id}
              presentation={operationalAction}
              loginUrl={loginUrl}
            />
          ) : null}
        </section>

        <div className="mt-7 grid gap-7 lg:grid-cols-2">
          <ContactCard
            title={`Expéditeur — ${getShipmentDirectionOriginLabel(shipment.direction)}`}
          >
            <Detail label="Nom" value={shipment.senderName} />
            <Detail label="Téléphone" value={shipment.senderPhone} />
            <Detail label="Adresse e-mail" value={shipment.senderEmail} />
          </ContactCard>
          <ContactCard
            title={`Destinataire — ${getShipmentDirectionDestinationLabel(shipment.direction)}`}
          >
            <Detail label="Nom" value={shipment.recipientName} />
            <Detail label="Téléphone" value={shipment.recipientPhone} />
            {shipment.recipientEmail ? <Detail label="Adresse e-mail" value={shipment.recipientEmail} /> : null}
            <Detail
              label={`Ville de retrait — ${getShipmentDirectionDestinationLabel(shipment.direction)}`}
              value={shipment.recipientCity}
            />
            {shipment.recipientNotes ? <Detail label="Instructions" value={shipment.recipientNotes} /> : null}
            <div className="sm:col-span-2 flex items-start gap-2 rounded-xl bg-blue-50 p-3 text-sm text-blue-900">
              <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              Retrait local {shipment.direction === "US_TO_BF" ? "au Burkina Faso" : "aux États-Unis"} — aucune adresse de livraison à domicile n’est associée à cet envoi.
            </div>
          </ContactCard>
        </div>

        <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center gap-3">
            <Box aria-hidden="true" className="h-6 w-6 text-blue-700" />
            <h2 className="text-2xl font-black tracking-tight">Contenu déclaré</h2>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {shipment.items.map((item, index) => (
              <article key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">Article {index + 1}</p>
                <h3 className="mt-2 break-words text-lg font-black">{item.description}</h3>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <Detail label="Catégorie" value={getShipmentItemCategoryLabel(item.category)} />
                  <Detail label="Quantité" value={item.quantity.toString()} />
                  {item.declaredValue !== null ? <Detail label="Valeur déclarée" value={item.declaredValue.toString()} /> : null}
                </dl>
              </article>
            ))}
          </div>
        </section>

        <div className="mt-7 grid items-start gap-7 xl:grid-cols-2">
          <QuoteSection shipment={shipment} />
          <PaymentsSection shipment={shipment} />
        </div>

        <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center gap-3">
            <CalendarClock aria-hidden="true" className="h-6 w-6 text-blue-700" />
            <h2 className="text-2xl font-black tracking-tight">Historique opérationnel</h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-500">Étapes connues à partir des dates enregistrées sur l’envoi.</p>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {milestones.map((milestone) => (
              <li key={milestone.label} className="rounded-2xl bg-slate-50 p-4">
                <p className="font-black text-slate-950">{milestone.label}</p>
                <time dateTime={milestone.date.toISOString()} className="mt-1 block text-sm text-slate-600">
                  {dateTimeFormatter.format(milestone.date)}
                </time>
              </li>
            ))}
          </ol>
        </section>

        {shipment.customerNotes || shipment.internalNotes ? (
          <section className="mt-7" aria-labelledby="notes-heading">
            <div className="flex items-center gap-3">
              <ClipboardList aria-hidden="true" className="h-6 w-6 text-blue-700" />
              <h2 id="notes-heading" className="text-2xl font-black tracking-tight">Notes</h2>
            </div>
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              {shipment.customerNotes ? (
                <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="font-black">Notes du client</h3>
                  <p className="mt-3 whitespace-pre-wrap break-words leading-7 text-slate-700">{shipment.customerNotes}</p>
                </article>
              ) : null}
              {shipment.internalNotes ? (
                <article className="rounded-3xl border border-violet-200 bg-violet-50 p-6">
                  <p className="text-xs font-black uppercase tracking-wider text-violet-700">Réservé au personnel</p>
                  <h3 className="mt-2 font-black">Notes internes</h3>
                  <p className="mt-3 whitespace-pre-wrap break-words leading-7 text-slate-700">{shipment.internalNotes}</p>
                </article>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
