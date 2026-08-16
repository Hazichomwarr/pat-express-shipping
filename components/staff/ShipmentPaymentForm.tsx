"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import type { ShipmentPaymentMethod } from "@prisma/client";
import { Banknote, CheckCircle2, RefreshCw, Save, ShieldAlert } from "lucide-react";

import {
  createShipmentPaymentAction,
  type CreateShipmentPaymentActionState,
} from "@/src/actions/create-shipment-payment.action";
import { getShipmentPaymentMethodLabel } from "@/src/services/_shared/staff-ui";

const INITIAL_STATE: CreateShipmentPaymentActionState = { status: "idle" };
const AUTHENTICATION_REQUIRED_MESSAGE =
  "Vous devez être connecté en tant que membre du personnel pour effectuer cette action.";
const inputClassName =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-base text-slate-950 shadow-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100 aria-invalid:border-red-500 aria-invalid:ring-red-100";

type ShipmentPaymentFormProps = {
  shipmentId: string;
  amount: string;
  currency: string;
  loginUrl: string;
  allowedMethods: readonly ShipmentPaymentMethod[];
};

function FieldError({ errors, id }: { errors?: string[]; id: string }) {
  if (!errors?.length) return null;

  return (
    <p id={id} role="alert" className="mt-2 text-sm font-semibold text-red-700">
      {errors[0]}
    </p>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function ShipmentPaymentForm({
  shipmentId,
  amount,
  currency,
  loginUrl,
  allowedMethods,
}: ShipmentPaymentFormProps) {
  const router = useRouter();
  const [method, setMethod] = useState<ShipmentPaymentMethod | null>(null);
  const [state, formAction, isPending] = useActionState(
    createShipmentPaymentAction,
    INITIAL_STATE,
  );
  const successHeadingRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const fieldErrors =
    state.status === "validation_error" ? state.fieldErrors : {};

  useEffect(() => {
    if (state.status === "success") {
      successHeadingRef.current?.focus();
    } else if (state.status === "error") {
      errorRef.current?.focus();
    }
  }, [router, state]);

  if (state.status === "success") {
    return (
      <section
        aria-live="polite"
        className="overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-xl shadow-slate-200/60"
      >
        <div className="bg-linear-to-r from-emerald-600 to-blue-700 px-6 py-8 text-white sm:px-8">
          <CheckCircle2 aria-hidden="true" className="h-10 w-10" />
          <h2
            ref={successHeadingRef}
            tabIndex={-1}
            className="mt-5 text-3xl font-black tracking-tight outline-none"
          >
            Paiement enregistré
          </h2>
          <p className="mt-2 leading-7 text-emerald-50">
            Le paiement est en attente de confirmation. Confirmez-le uniquement après avoir vérifié la réception des fonds.
          </p>
        </div>
        <dl className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8">
          <div className="rounded-2xl bg-slate-50 p-4">
            <dt className="text-sm font-semibold text-slate-500">Méthode</dt>
            <dd className="mt-1 font-bold text-slate-950">
              {getShipmentPaymentMethodLabel(state.payment.method)}
            </dd>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <dt className="text-sm font-semibold text-slate-500">Statut</dt>
            <dd className="mt-1 font-bold text-amber-800">En attente</dd>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <dt className="text-sm font-semibold text-blue-700">Montant</dt>
            <dd className="mt-1 text-xl font-black text-blue-950">
              {state.payment.amount} {state.payment.currency}
            </dd>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <dt className="text-sm font-semibold text-slate-500">Date d’enregistrement</dt>
            <dd className="mt-1 font-bold text-slate-950">
              {formatDate(state.payment.createdAt)}
            </dd>
          </div>
          {state.payment.zelleName ? (
            <div className="rounded-2xl bg-slate-50 p-4 sm:col-span-2">
              <dt className="text-sm font-semibold text-slate-500">Nom Zelle déclaré</dt>
              <dd className="mt-1 font-bold text-slate-950">{state.payment.zelleName}</dd>
            </div>
          ) : null}
          {state.payment.mobileMoneyPayerName ? (
            <div className="rounded-2xl bg-slate-50 p-4 sm:col-span-2">
              <dt className="text-sm font-semibold text-slate-500">
                Nom Orange Money déclaré
              </dt>
              <dd className="mt-1 font-bold text-slate-950">
                {state.payment.mobileMoneyPayerName}
              </dd>
            </div>
          ) : null}
        </dl>
        <div className="px-6 pb-6 sm:px-8 sm:pb-8">
          <button
            type="button"
            onClick={() => router.refresh()}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3.5 font-bold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
          >
            <RefreshCw aria-hidden="true" className="h-5 w-5" />
            Afficher le paiement en attente
          </button>
        </div>
      </section>
    );
  }

  const isAuthenticationError =
    state.status === "error" && state.message === AUTHENTICATION_REQUIRED_MESSAGE;
  const canRefresh =
    state.status === "error" && state.message.includes("Actualisez la page");

  return (
    <form
      action={formAction}
      noValidate
      aria-busy={isPending}
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8"
    >
      <input type="hidden" name="shipmentId" value={shipmentId} />
      <input type="hidden" name="amount" value={amount} />
      <input type="hidden" name="currency" value={currency} />

      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
          <Banknote aria-hidden="true" className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-700">
            Nouveau paiement
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
            Enregistrer le mode choisi
          </h2>
        </div>
      </div>

      {state.status === "validation_error" ? (
        <div role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900">
          <p className="font-bold">{state.message}</p>
          {[...(fieldErrors._form ?? []), ...(fieldErrors.shipmentId ?? [])].map(
            (error) => <p key={error} className="mt-1 text-sm">{error}</p>,
          )}
        </div>
      ) : null}

      {state.status === "error" ? (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900 outline-none focus:ring-4 focus:ring-red-100"
        >
          <div className="flex items-start gap-3">
            <ShieldAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="font-semibold">
              {isAuthenticationError ? "Votre session n’est plus valide." : state.message}
            </p>
          </div>
          {isAuthenticationError ? (
            <Link href={loginUrl} className="mt-4 inline-flex rounded-lg bg-red-900 px-4 py-2 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-200">
              Se reconnecter
            </Link>
          ) : null}
          {canRefresh ? (
            <button type="button" onClick={() => router.refresh()} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-900 px-4 py-2 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-200">
              <RefreshCw aria-hidden="true" className="h-4 w-4" />
              Actualiser la page
            </button>
          ) : null}
        </div>
      ) : null}

      <fieldset disabled={isPending} className="mt-7 border-0 p-0">
        <legend className="text-sm font-bold text-slate-800">Mode de paiement</legend>
        <div
          role="radiogroup"
          aria-invalid={Boolean(fieldErrors.method)}
          aria-describedby={fieldErrors.method ? "method-error" : undefined}
          className="mt-3 grid gap-3 sm:grid-cols-2"
        >
          {allowedMethods.map((value) => (
            <label key={value} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-300 bg-white p-4 font-bold text-slate-900 transition has-checked:border-blue-600 has-checked:bg-blue-50 has-checked:ring-2 has-checked:ring-blue-100">
              <input
                type="radio"
                name="method"
                value={value}
                checked={method === value}
                onChange={() => setMethod(value)}
                className="h-5 w-5 accent-blue-700"
              />
              {getShipmentPaymentMethodLabel(value)}
            </label>
          ))}
        </div>
        <FieldError errors={fieldErrors.method} id="method-error" />

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="payment-amount" className="text-sm font-bold text-slate-800">Montant</label>
            <input id="payment-amount" value={amount} readOnly className={`${inputClassName} cursor-not-allowed bg-slate-100 font-bold`} aria-invalid={Boolean(fieldErrors.amount)} aria-describedby={fieldErrors.amount ? "payment-amount-help amount-error" : "payment-amount-help"} />
            <p id="payment-amount-help" className="mt-2 text-sm text-slate-500">Montant fixé par le devis officiel.</p>
            <FieldError errors={fieldErrors.amount} id="amount-error" />
          </div>
          <div>
            <label htmlFor="payment-currency" className="text-sm font-bold text-slate-800">Devise</label>
            <input id="payment-currency" value={currency} readOnly className={`${inputClassName} cursor-not-allowed bg-slate-100 font-bold`} aria-invalid={Boolean(fieldErrors.currency)} aria-describedby={fieldErrors.currency ? "currency-error" : undefined} />
            <FieldError errors={fieldErrors.currency} id="currency-error" />
          </div>
        </div>

        {method === "ZELLE" ? (
          <div className="mt-6">
            <label htmlFor="zelleName" className="text-sm font-bold text-slate-800">Nom utilisé pour le paiement Zelle</label>
            <input
              id="zelleName"
              name="zelleName"
              type="text"
              maxLength={120}
              className={inputClassName}
              aria-invalid={Boolean(fieldErrors.zelleName)}
              aria-describedby={fieldErrors.zelleName ? "zelleName-help zelleName-error" : "zelleName-help"}
            />
            <p id="zelleName-help" className="mt-2 text-sm leading-6 text-slate-500">
              Saisissez le nom communiqué par l’expéditeur afin de faciliter la vérification du paiement.
            </p>
            <FieldError errors={fieldErrors.zelleName} id="zelleName-error" />
          </div>
        ) : (
          <input type="hidden" name="zelleName" value="" />
        )}

        {method === "ORANGE_MONEY" ? (
          <div className="mt-6">
            <label
              htmlFor="mobileMoneyPayerName"
              className="text-sm font-bold text-slate-800"
            >
              Nom associé au paiement Orange Money
            </label>
            <input
              id="mobileMoneyPayerName"
              name="mobileMoneyPayerName"
              type="text"
              maxLength={120}
              className={inputClassName}
              aria-invalid={Boolean(fieldErrors.mobileMoneyPayerName)}
              aria-describedby={
                fieldErrors.mobileMoneyPayerName
                  ? "mobileMoneyPayerName-help mobileMoneyPayerName-error"
                  : "mobileMoneyPayerName-help"
              }
            />
            <p
              id="mobileMoneyPayerName-help"
              className="mt-2 text-sm leading-6 text-slate-500"
            >
              Saisissez le nom communiqué pour faciliter la vérification du paiement.
            </p>
            <FieldError
              errors={fieldErrors.mobileMoneyPayerName}
              id="mobileMoneyPayerName-error"
            />
          </div>
        ) : (
          <input type="hidden" name="mobileMoneyPayerName" value="" />
        )}
      </fieldset>

      <button type="submit" disabled={isPending} className="mt-8 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3.5 font-bold text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-65">
        <Save aria-hidden="true" className="h-5 w-5" />
        {isPending ? "Enregistrement..." : "Enregistrer le paiement"}
      </button>
    </form>
  );
}
