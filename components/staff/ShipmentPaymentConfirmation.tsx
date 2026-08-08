"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import type { ShipmentPaymentMethod } from "@prisma/client";
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldAlert } from "lucide-react";

import {
  confirmShipmentPaymentAction,
  type ConfirmShipmentPaymentActionState,
} from "@/src/actions/confirm-shipment-payment.action";
import { getShipmentPaymentMethodLabel } from "@/src/services/_shared/staff-ui";

const INITIAL_STATE: ConfirmShipmentPaymentActionState = { status: "idle" };
const AUTHENTICATION_REQUIRED_MESSAGE =
  "Vous devez être connecté en tant que membre du personnel pour effectuer cette action.";

type ShipmentPaymentConfirmationProps = {
  payment: {
    id: string;
    method: ShipmentPaymentMethod;
    amount: string;
    currency: string;
    zelleName: string | null;
    createdAt: string;
  };
  loginUrl: string;
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function ShipmentPaymentConfirmation({
  payment,
  loginUrl,
}: ShipmentPaymentConfirmationProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    confirmShipmentPaymentAction,
    INITIAL_STATE,
  );
  const successHeadingRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      successHeadingRef.current?.focus();
    } else if (state.status === "error") {
      errorRef.current?.focus();
    }
  }, [router, state]);

  if (state.status === "success") {
    return (
      <section aria-live="polite" className="overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-xl shadow-slate-200/60">
        <div className="bg-linear-to-r from-emerald-600 to-blue-700 px-6 py-8 text-white sm:px-8">
          <CheckCircle2 aria-hidden="true" className="h-10 w-10" />
          <h2 ref={successHeadingRef} tabIndex={-1} className="mt-5 text-3xl font-black tracking-tight outline-none">Paiement confirmé</h2>
          <p className="mt-2 leading-7 text-emerald-50">Le paiement a été confirmé et l’envoi peut poursuivre son traitement.</p>
        </div>
        <dl className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8">
          <div className="rounded-2xl bg-slate-50 p-4"><dt className="text-sm font-semibold text-slate-500">Méthode</dt><dd className="mt-1 font-bold">{getShipmentPaymentMethodLabel(state.payment.method)}</dd></div>
          <div className="rounded-2xl bg-slate-50 p-4"><dt className="text-sm font-semibold text-slate-500">Statut de l’envoi</dt><dd className="mt-1 font-bold text-emerald-800">Paiement confirmé</dd></div>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4"><dt className="text-sm font-semibold text-blue-700">Montant</dt><dd className="mt-1 text-xl font-black text-blue-950">{state.payment.amount} {state.payment.currency}</dd></div>
          <div className="rounded-2xl bg-slate-50 p-4"><dt className="text-sm font-semibold text-slate-500">Date de confirmation</dt><dd className="mt-1 font-bold">{formatDate(state.payment.confirmedAt)}</dd></div>
        </dl>
        <div className="px-6 pb-6 sm:px-8 sm:pb-8">
          <button type="button" onClick={() => router.refresh()} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3.5 font-bold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200">
            <RefreshCw aria-hidden="true" className="h-5 w-5" />
            Actualiser l’envoi
          </button>
        </div>
      </section>
    );
  }

  const fieldErrors = state.status === "validation_error" ? state.fieldErrors : {};
  const isAuthenticationError = state.status === "error" && state.message === AUTHENTICATION_REQUIRED_MESSAGE;
  const canRefresh = state.status === "error" && state.message.includes("Actualisez la page");

  return (
    <section className="rounded-3xl border border-amber-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
      <p className="text-sm font-black uppercase tracking-[0.18em] text-amber-700">Paiement en attente</p>
      <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">Vérifier la réception des fonds</h2>
      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-4"><dt className="text-sm font-semibold text-slate-500">Méthode</dt><dd className="mt-1 font-bold">{getShipmentPaymentMethodLabel(payment.method)}</dd></div>
        <div className="rounded-2xl bg-slate-50 p-4"><dt className="text-sm font-semibold text-slate-500">Montant</dt><dd className="mt-1 font-bold">{payment.amount} {payment.currency}</dd></div>
        <div className="rounded-2xl bg-slate-50 p-4 sm:col-span-2"><dt className="text-sm font-semibold text-slate-500">Date d’enregistrement</dt><dd className="mt-1 font-bold">{formatDate(payment.createdAt)}</dd></div>
      </dl>

      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
        <div className="flex items-start gap-3"><AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-bold">Confirmez ce paiement uniquement après avoir vérifié que les fonds ont bien été reçus.</p><p className="mt-2 text-sm leading-6">{payment.method === "ZELLE" ? `Nom Zelle déclaré : ${payment.zelleName ?? "Non renseigné"}` : "Paiement en espèces à confirmer après réception physique."}</p></div></div>
      </div>

      {state.status === "validation_error" ? (
        <div role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900"><p className="font-bold">{state.message}</p>{fieldErrors.paymentId?.map((error) => <p key={error} className="mt-1 text-sm">{error}</p>)}</div>
      ) : null}
      {state.status === "error" ? (
        <div ref={errorRef} tabIndex={-1} role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900 outline-none focus:ring-4 focus:ring-red-100">
          <div className="flex items-start gap-3"><ShieldAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" /><p className="font-semibold">{isAuthenticationError ? "Votre session n’est plus valide." : state.message}</p></div>
          {isAuthenticationError ? <Link href={loginUrl} className="mt-4 inline-flex rounded-lg bg-red-900 px-4 py-2 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-200">Se reconnecter</Link> : null}
          {canRefresh ? <button type="button" onClick={() => router.refresh()} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-900 px-4 py-2 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-200"><RefreshCw aria-hidden="true" className="h-4 w-4" />Actualiser la page</button> : null}
        </div>
      ) : null}

      <form action={formAction} aria-busy={isPending} className="mt-6">
        <input type="hidden" name="paymentId" value={payment.id} />
        <button type="submit" disabled={isPending} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 py-3.5 font-bold text-white shadow-lg shadow-emerald-700/20 transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-65">
          <CheckCircle2 aria-hidden="true" className="h-5 w-5" />
          {isPending ? "Confirmation..." : "Confirmer le paiement reçu"}
        </button>
      </form>
    </section>
  );
}
