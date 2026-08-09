"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  RefreshCw,
  ShieldAlert,
  StepForward,
} from "lucide-react";

import {
  advanceShipmentStatusAction,
  type AdvanceShipmentStatusActionState,
} from "@/src/actions/advance-shipment-status.action";
import type { StaffShipmentStatusActionPresentation } from "@/src/services/_shared/staff-shipment-workspace";

const INITIAL_STATE: AdvanceShipmentStatusActionState = { status: "idle" };
const AUTHENTICATION_REQUIRED_MESSAGE =
  "Vous devez être connecté en tant que membre du personnel pour effectuer cette action.";

type ShipmentStatusControlProps = {
  shipmentId: string;
  presentation: StaffShipmentStatusActionPresentation;
  loginUrl: string;
};

export default function ShipmentStatusControl({
  shipmentId,
  presentation,
  loginUrl,
}: ShipmentStatusControlProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    advanceShipmentStatusAction,
    INITIAL_STATE,
  );
  const [isConfirming, setIsConfirming] = useState(false);
  const refreshedSuccessRef = useRef<string | null>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      feedbackRef.current?.focus();
      const successKey = `${state.shipment.id}:${state.shipment.status}:${state.shipment.milestoneAt ?? "none"}`;

      if (refreshedSuccessRef.current !== successKey) {
        refreshedSuccessRef.current = successKey;
        router.refresh();
      }
    } else if (state.status === "error" || state.status === "validation_error") {
      feedbackRef.current?.focus();
    }
  }, [router, state]);

  const isAuthenticationError =
    state.status === "error" &&
    state.message === AUTHENTICATION_REQUIRED_MESSAGE;
  const canRefresh =
    state.status === "error" && state.message.includes("Actualisez la page");

  if (state.status === "success") {
    return (
      <div
        ref={feedbackRef}
        tabIndex={-1}
        role="status"
        aria-live="polite"
        className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 outline-none focus:ring-4 focus:ring-emerald-100"
      >
        <div className="flex items-start gap-3">
          <CheckCircle2
            aria-hidden="true"
            className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700"
          />
          <div>
            <p className="font-bold">{state.message}</p>
            <p className="mt-1 text-sm">Actualisation du dossier en cours…</p>
          </div>
        </div>
      </div>
    );
  }

  const feedback =
    state.status === "error" || state.status === "validation_error"
      ? state
      : null;

  const form = (
    <form action={formAction} aria-busy={isPending} className="mt-5">
      <input type="hidden" name="shipmentId" value={shipmentId} />
      <input type="hidden" name="toStatus" value={presentation.toStatus} />

      {presentation.requiresConfirmation && isConfirming ? (
        <div className="rounded-2xl border border-amber-300 bg-white p-4 sm:p-5">
          <h3 className="font-black text-slate-950">
            Confirmer la livraison
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            Confirmez uniquement si l’envoi a bien été remis au destinataire.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-65"
            >
              <CheckCircle2 aria-hidden="true" className="h-5 w-5" />
              {isPending ? "Mise à jour..." : "Confirmer la livraison"}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => setIsConfirming(false)}
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-800 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-65"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : presentation.requiresConfirmation ? (
        <button
          type="button"
          onClick={() => setIsConfirming(true)}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-bold text-white shadow-lg shadow-blue-700/15 transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 sm:w-auto"
        >
          <StepForward aria-hidden="true" className="h-5 w-5" />
          {presentation.label}
        </button>
      ) : (
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-bold text-white shadow-lg shadow-blue-700/15 transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-65 sm:w-auto"
        >
          <StepForward aria-hidden="true" className="h-5 w-5" />
          {isPending ? "Mise à jour..." : presentation.label}
        </button>
      )}
    </form>
  );

  return (
    <>
      {feedback ? (
        <div
          ref={feedbackRef}
          tabIndex={-1}
          role="alert"
          className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-950 outline-none focus:ring-4 focus:ring-red-100"
        >
          <div className="flex items-start gap-3">
            <ShieldAlert
              aria-hidden="true"
              className="mt-0.5 h-5 w-5 shrink-0 text-red-700"
            />
            <p className="font-semibold">{feedback.message}</p>
          </div>
          {isAuthenticationError ? (
            <Link
              href={loginUrl}
              className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-red-900 px-4 py-2 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-200"
            >
              Se reconnecter
            </Link>
          ) : null}
          {canRefresh ? (
            <button
              type="button"
              onClick={() => router.refresh()}
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-red-900 px-4 py-2 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-200"
            >
              <RefreshCw aria-hidden="true" className="h-4 w-4" />
              Actualiser
            </button>
          ) : null}
        </div>
      ) : null}
      {form}
    </>
  );
}
