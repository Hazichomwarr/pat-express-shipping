import { ShipmentStatus } from "@prisma/client";
import { Check, CircleCheckBig, PackageSearch, XCircle } from "lucide-react";

import type { PublicShipmentTrackingResult } from "@/src/services/public-shipment-tracking.service";

type PublicTrackingResultProps = {
  result: PublicShipmentTrackingResult;
};

const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeStyle: "short",
});

function getStatusPresentation(status: ShipmentStatus) {
  if (status === ShipmentStatus.DELIVERED) {
    return {
      eyebrow: "Envoi livré",
      cardClassName: "border-emerald-200 bg-emerald-50",
      iconClassName: "bg-emerald-700 text-white",
      badgeClassName: "bg-white text-emerald-800 ring-emerald-200",
      Icon: CircleCheckBig,
    };
  }

  if (status === ShipmentStatus.CANCELLED) {
    return {
      eyebrow: "Envoi annulé",
      cardClassName: "border-slate-300 bg-slate-100",
      iconClassName: "bg-slate-700 text-white",
      badgeClassName: "bg-white text-slate-800 ring-slate-300",
      Icon: XCircle,
    };
  }

  return {
    eyebrow: "Statut actuel",
    cardClassName: "border-blue-200 bg-blue-50",
    iconClassName: "bg-blue-700 text-white",
    badgeClassName: "bg-white text-blue-800 ring-blue-200",
    Icon: PackageSearch,
  };
}

export default function PublicTrackingResult({
  result,
}: PublicTrackingResultProps) {
  const statusPresentation = getStatusPresentation(result.status);
  const StatusIcon = statusPresentation.Icon;

  return (
    <section aria-labelledby="tracking-result-title" className="mt-8 space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-bold text-slate-500">Numéro de suivi</p>
        <h2
          id="tracking-result-title"
          className="mt-2 break-words font-mono text-2xl font-black tracking-tight text-slate-950 sm:text-3xl"
        >
          {result.trackingNumber}
        </h2>
      </div>

      <div
        className={`rounded-3xl border p-6 sm:p-8 ${statusPresentation.cardClassName}`}
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <span
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${statusPresentation.iconClassName}`}
            >
              <StatusIcon aria-hidden="true" className="h-6 w-6" />
            </span>
            <div>
              <p className="text-sm font-black uppercase tracking-[0.16em] text-slate-600">
                {statusPresentation.eyebrow}
              </p>
              <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                {result.statusLabel}
              </h3>
              <p className="mt-3 max-w-2xl leading-7 text-slate-700">
                {result.statusDescription}
              </p>
            </div>
          </div>
          <span
            className={`inline-flex w-fit shrink-0 rounded-full px-3 py-1.5 text-sm font-bold ring-1 ${statusPresentation.badgeClassName}`}
          >
            {result.isTerminal ? "Suivi terminé" : "En cours"}
          </span>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h3 className="text-2xl font-black tracking-tight text-slate-950">
          Étapes enregistrées
        </h3>
        <p className="mt-2 leading-7 text-slate-600">
          Ces dates correspondent uniquement aux étapes effectivement
          enregistrées pour votre envoi.
        </p>

        <ol className="mt-7 space-y-0" aria-label="Historique de l’envoi">
          {result.milestones.map((milestone, index) => (
            <li key={milestone.key} className="relative flex gap-4 pb-7 last:pb-0">
              {index < result.milestones.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="absolute left-[17px] top-9 h-[calc(100%-1.25rem)] w-px bg-blue-200"
                />
              ) : null}
              <span className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-700 text-white ring-4 ring-blue-50">
                <Check aria-hidden="true" className="h-4 w-4" />
              </span>
              <div className="min-w-0 pt-1">
                <p className="font-bold text-slate-950">{milestone.label}</p>
                <time
                  dateTime={milestone.occurredAt.toISOString()}
                  className="mt-1 block text-sm leading-6 text-slate-600"
                >
                  {dateTimeFormatter.format(milestone.occurredAt)}
                </time>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
