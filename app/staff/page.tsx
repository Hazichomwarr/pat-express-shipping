import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShipmentStatus, type Prisma } from "@prisma/client";
import {
  ArrowRight,
  FilterX,
  PackageOpen,
  Search,
} from "lucide-react";

import StaffHeader from "@/components/staff/StaffHeader";
import { prisma } from "@/src/lib/prisma";
import {
  requireStaff,
  StaffAuthenticationRequiredError,
} from "@/src/services/_shared/require-staff";
import { parseStaffShipmentListQuery } from "@/src/services/_shared/staff-shipment-list";
import {
  getShipmentIntakeMethodLabel,
  getShipmentStatusLabel,
} from "@/src/services/_shared/staff-ui";

export const metadata: Metadata = {
  title: "Envois | PatExpressShipping",
  description: "File de travail des envois PatExpressShipping.",
};

const SHIPMENT_LIMIT = 50;
const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
});

type StaffShipmentListPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    status?: string | string[];
  }>;
};

async function findStaffShipments(where: Prisma.ShipmentWhereInput) {
  return prisma.shipment.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: SHIPMENT_LIMIT + 1,
    select: {
      id: true,
      trackingNumber: true,
      status: true,
      intakeMethod: true,
      senderName: true,
      recipientName: true,
      recipientCity: true,
      createdAt: true,
      packageReceivedAt: true,
      quotedAt: true,
      paymentConfirmedAt: true,
      arrivedBfAt: true,
      readyForPickupAt: true,
      deliveredAt: true,
      cancelledAt: true,
    },
  });
}

type StaffShipment = Awaited<ReturnType<typeof findStaffShipments>>[number];

function ShipmentStatusBadge({ status }: { status: ShipmentStatus }) {
  return (
    <span className="inline-flex w-fit rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800 ring-1 ring-blue-200">
      {getShipmentStatusLabel(status)}
    </span>
  );
}

function MobileShipmentCard({ shipment }: { shipment: StaffShipment }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3">
        <Link
          href={`/staff/shipments/${encodeURIComponent(shipment.id)}`}
          className="w-fit break-all text-lg font-black text-slate-950 decoration-blue-600 decoration-2 underline-offset-4 hover:text-blue-700 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
        >
          {shipment.trackingNumber}
        </Link>
        <ShipmentStatusBadge status={shipment.status} />
      </div>
      <dl className="mt-5 space-y-3 text-sm">
        <div>
          <dt className="font-semibold text-slate-500">Trajet</dt>
          <dd className="mt-1 font-bold text-slate-900">
            {shipment.senderName} → {shipment.recipientName}
          </dd>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <dt className="font-semibold text-slate-500">Ville</dt>
            <dd className="mt-1 font-bold text-slate-900">{shipment.recipientCity}</dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-500">Mode de dépôt</dt>
            <dd className="mt-1 font-bold text-slate-900">
              {getShipmentIntakeMethodLabel(shipment.intakeMethod)}
            </dd>
          </div>
        </div>
        <div>
          <dt className="font-semibold text-slate-500">Créé le</dt>
          <dd className="mt-1 font-bold text-slate-900">
            {dateFormatter.format(shipment.createdAt)}
          </dd>
        </div>
      </dl>
      <Link
        href={`/staff/shipments/${encodeURIComponent(shipment.id)}`}
        className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
      >
        Ouvrir l’envoi
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </Link>
    </article>
  );
}

export default async function StaffShipmentListPage({
  searchParams,
}: StaffShipmentListPageProps) {
  let authenticationRequired = false;

  try {
    await requireStaff();
  } catch (error) {
    if (!(error instanceof StaffAuthenticationRequiredError)) throw error;
    authenticationRequired = true;
  }

  if (authenticationRequired) {
    redirect("/staff/login?callbackUrl=%2Fstaff");
  }

  const rawQuery = await searchParams;
  const query = parseStaffShipmentListQuery(rawQuery);
  const where: Prisma.ShipmentWhereInput = {
    status: query.status,
    OR: query.search
      ? [
          { trackingNumber: { contains: query.search, mode: "insensitive" } },
          { senderName: { contains: query.search, mode: "insensitive" } },
          { recipientName: { contains: query.search, mode: "insensitive" } },
          { recipientCity: { contains: query.search, mode: "insensitive" } },
        ]
      : undefined,
  };
  const shipmentResults = await findStaffShipments(where);
  const hasMore = shipmentResults.length > SHIPMENT_LIMIT;
  const shipments = shipmentResults.slice(0, SHIPMENT_LIMIT);
  const hasFilters = Boolean(query.search || query.status);

  return (
    <main lang="fr" className="min-h-screen bg-slate-50 text-slate-950">
      <StaffHeader />

      <div className="mx-auto max-w-7xl px-5 py-9 sm:px-6 sm:py-12">
        <div className="max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-700">
            Espace personnel
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
            Envois
          </h1>
          <p className="mt-3 text-lg leading-8 text-slate-600">
            Consultez les envois en cours et ouvrez un dossier pour poursuivre son traitement.
          </p>
        </div>

        <section aria-labelledby="shipment-filters-heading" className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 id="shipment-filters-heading" className="sr-only">
            Rechercher et filtrer les envois
          </h2>
          <form action="/staff" method="get" className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px_auto] lg:items-end">
            <div>
              <label htmlFor="shipment-search" className="text-sm font-bold text-slate-800">
                Recherche
              </label>
              <div className="relative mt-2">
                <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  id="shipment-search"
                  name="q"
                  type="search"
                  defaultValue={query.search ?? ""}
                  placeholder="Rechercher par numéro de suivi, nom ou ville"
                  className="min-h-12 w-full rounded-xl border border-slate-300 bg-white py-3 pl-12 pr-4 text-base outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                />
              </div>
            </div>
            <div>
              <label htmlFor="shipment-status" className="text-sm font-bold text-slate-800">
                Statut
              </label>
              <select
                id="shipment-status"
                name="status"
                defaultValue={query.status ?? ""}
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              >
                <option value="">Tous les statuts</option>
                {Object.values(ShipmentStatus).map((status) => (
                  <option key={status} value={status}>
                    {getShipmentStatusLabel(status)}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-bold text-white shadow-md shadow-blue-700/15 transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200">
              <Search aria-hidden="true" className="h-5 w-5" />
              Rechercher
            </button>
          </form>
        </section>

        <section aria-labelledby="shipment-list-heading" className="mt-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="shipment-list-heading" className="text-2xl font-black tracking-tight">
                Envois récents
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {shipments.length} {shipments.length > 1 ? "envois affichés" : "envoi affiché"}
              </p>
            </div>
            {hasFilters ? (
              <Link href="/staff" className="inline-flex w-fit items-center gap-2 rounded-lg text-sm font-bold text-blue-700 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100">
                <FilterX aria-hidden="true" className="h-4 w-4" />
                Réinitialiser les filtres
              </Link>
            ) : null}
          </div>

          {shipments.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
              <PackageOpen aria-hidden="true" className="mx-auto h-10 w-10 text-slate-400" />
              <h3 className="mt-4 text-xl font-black">
                {hasFilters ? "Aucun résultat" : "Aucun envoi"}
              </h3>
              <p className="mx-auto mt-2 max-w-lg leading-7 text-slate-600">
                {hasFilters
                  ? "Aucun envoi ne correspond à votre recherche."
                  : "Aucune demande d’envoi n’a encore été enregistrée."}
              </p>
              {hasFilters ? (
                <Link href="/staff" className="mt-5 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-300">
                  Réinitialiser les filtres
                </Link>
              ) : null}
            </div>
          ) : (
            <>
              <div className="mt-5 space-y-4 md:hidden">
                {shipments.map((shipment) => (
                  <MobileShipmentCard key={shipment.id} shipment={shipment} />
                ))}
              </div>

              <div className="mt-5 hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
                <table className="w-full border-collapse text-left">
                  <thead className="bg-slate-100 text-xs font-black uppercase tracking-wider text-slate-600">
                    <tr>
                      <th scope="col" className="px-5 py-4">Envoi</th>
                      <th scope="col" className="px-5 py-4">Trajet</th>
                      <th scope="col" className="px-5 py-4">Statut</th>
                      <th scope="col" className="px-5 py-4">Dépôt</th>
                      <th scope="col" className="px-5 py-4">Création</th>
                      <th scope="col" className="px-5 py-4"><span className="sr-only">Action</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {shipments.map((shipment) => (
                      <tr key={shipment.id} className="align-top transition hover:bg-slate-50">
                        <td className="px-5 py-5">
                          <Link href={`/staff/shipments/${encodeURIComponent(shipment.id)}`} className="font-black text-slate-950 hover:text-blue-700 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100">
                            {shipment.trackingNumber}
                          </Link>
                          <p className="mt-1 text-sm text-slate-500">{shipment.recipientCity}</p>
                        </td>
                        <td className="px-5 py-5">
                          <p className="font-bold text-slate-900">{shipment.senderName}</p>
                          <p className="mt-1 text-sm text-slate-500">vers {shipment.recipientName}</p>
                        </td>
                        <td className="px-5 py-5"><ShipmentStatusBadge status={shipment.status} /></td>
                        <td className="px-5 py-5 text-sm font-semibold text-slate-700">{getShipmentIntakeMethodLabel(shipment.intakeMethod)}</td>
                        <td className="px-5 py-5 text-sm font-semibold text-slate-700">{dateFormatter.format(shipment.createdAt)}</td>
                        <td className="px-5 py-5 text-right">
                          <Link href={`/staff/shipments/${encodeURIComponent(shipment.id)}`} aria-label={`Ouvrir l’envoi ${shipment.trackingNumber}`} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-blue-700 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100">
                            Ouvrir
                            <ArrowRight aria-hidden="true" className="h-4 w-4" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {hasMore ? (
            <p className="mt-4 text-sm font-semibold text-slate-500">
              Affichage des 50 envois les plus récents correspondant aux filtres.
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
