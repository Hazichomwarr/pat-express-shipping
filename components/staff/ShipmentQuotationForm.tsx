"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import { CheckCircle2, RefreshCw, Save, ShieldAlert } from "lucide-react";

import {
  quoteShipmentAction,
  type QuoteShipmentActionState,
} from "@/src/actions/quote-shipment.action";

const INITIAL_STATE: QuoteShipmentActionState = { status: "idle" };
const AUTHENTICATION_REQUIRED_MESSAGE =
  "Vous devez être connecté en tant que membre du personnel pour effectuer cette action.";
const CONFLICT_MESSAGE =
  "Cet envoi a été modifié entre-temps. Actualisez la page avant de réessayer.";
const inputClassName =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-base text-slate-950 shadow-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100 aria-invalid:border-red-500 aria-invalid:ring-red-100";

type ShipmentQuotationFormProps = {
  shipmentId: string;
  loginUrl: string;
};

function FieldError({ errors, id }: { errors?: string[]; id: string }) {
  if (!errors?.length) {
    return null;
  }

  return (
    <div id={id} role="alert" className="mt-2 text-sm font-semibold text-red-700">
      {errors[0]}
    </div>
  );
}

function formatQuotedAt(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function ShipmentQuotationForm({
  shipmentId,
  loginUrl,
}: ShipmentQuotationFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    quoteShipmentAction,
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
  }, [state]);

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
            Devis enregistré
          </h2>
          <p className="mt-2 leading-7 text-emerald-50">
            L’envoi est maintenant en attente de paiement.
          </p>
        </div>

        <dl className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8">
          <div className="rounded-2xl bg-slate-50 p-4 sm:col-span-2">
            <dt className="text-sm font-semibold text-slate-500">Numéro de suivi</dt>
            <dd className="mt-1 break-all text-xl font-black text-slate-950">
              {state.quotation.trackingNumber}
            </dd>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <dt className="text-sm font-semibold text-slate-500">Statut</dt>
            <dd className="mt-1 font-bold text-slate-950">
              En attente de paiement
            </dd>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <dt className="text-sm font-semibold text-slate-500">Date du devis</dt>
            <dd className="mt-1 font-bold text-slate-950">
              {formatQuotedAt(state.quotation.quotedAt)}
            </dd>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <dt className="text-sm font-semibold text-slate-500">Poids mesuré</dt>
            <dd className="mt-1 font-bold text-slate-950">
              {state.quotation.measuredWeightKg} kg
            </dd>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <dt className="text-sm font-semibold text-slate-500">Tarif</dt>
            <dd className="mt-1 font-bold text-slate-950">
              {state.quotation.ratePerKg} {state.quotation.quoteCurrency}/kg
            </dd>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 sm:col-span-2">
            <dt className="text-sm font-semibold text-blue-700">Montant du devis</dt>
            <dd className="mt-1 text-2xl font-black text-blue-950">
              {state.quotation.quotedAmount} {state.quotation.quoteCurrency}
            </dd>
          </div>
        </dl>
      </section>
    );
  }

  const isAuthenticationError =
    state.status === "error" &&
    state.message === AUTHENTICATION_REQUIRED_MESSAGE;
  const isConflict =
    state.status === "error" && state.message === CONFLICT_MESSAGE;

  return (
    <form
      action={formAction}
      noValidate
      aria-busy={isPending}
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8"
    >
      <input type="hidden" name="shipmentId" value={shipmentId} />

      <div>
        <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-700">
          Devis officiel
        </p>
        <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
          Enregistrer les conditions du devis
        </h2>
        <p className="mt-3 leading-7 text-slate-600">
          Saisissez les mesures et le montant final communiqués au client.
        </p>
      </div>

      {state.status === "validation_error" ? (
        <div
          role="alert"
          className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900"
        >
          <p className="font-bold">{state.message}</p>
          {fieldErrors._form?.map((error) => (
            <p key={error} className="mt-1 text-sm">
              {error}
            </p>
          ))}
          {fieldErrors.shipmentId?.map((error) => (
            <p key={error} className="mt-1 text-sm">
              {error}
            </p>
          ))}
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
            <p className="font-semibold">{state.message}</p>
          </div>
          {isAuthenticationError ? (
            <Link
              href={loginUrl}
              className="mt-4 inline-flex rounded-lg bg-red-900 px-4 py-2 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-200"
            >
              Se reconnecter
            </Link>
          ) : null}
          {isConflict ? (
            <button
              type="button"
              onClick={() => router.refresh()}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-900 px-4 py-2 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-200"
            >
              <RefreshCw aria-hidden="true" className="h-4 w-4" />
              Actualiser la page
            </button>
          ) : null}
        </div>
      ) : null}

      <fieldset disabled={isPending} className="mt-7 grid gap-5 border-0 p-0 sm:grid-cols-2">
        <legend className="sr-only">Conditions du devis</legend>

        <div>
          <label htmlFor="measuredWeightKg" className="text-sm font-bold text-slate-800">
            Poids mesuré (kg)
          </label>
          <input
            id="measuredWeightKg"
            name="measuredWeightKg"
            type="number"
            inputMode="decimal"
            min="0.001"
            step="0.001"
            className={inputClassName}
            aria-invalid={Boolean(fieldErrors.measuredWeightKg)}
            aria-describedby={fieldErrors.measuredWeightKg ? "measuredWeightKg-error" : undefined}
          />
          <FieldError
            errors={fieldErrors.measuredWeightKg}
            id="measuredWeightKg-error"
          />
        </div>

        <div>
          <label htmlFor="ratePerKg" className="text-sm font-bold text-slate-800">
            Tarif par kilogramme
          </label>
          <input
            id="ratePerKg"
            name="ratePerKg"
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            className={inputClassName}
            aria-invalid={Boolean(fieldErrors.ratePerKg)}
            aria-describedby={fieldErrors.ratePerKg ? "ratePerKg-error" : undefined}
          />
          <FieldError errors={fieldErrors.ratePerKg} id="ratePerKg-error" />
        </div>

        <div>
          <label htmlFor="quotedAmount" className="text-sm font-bold text-slate-800">
            Montant du devis
          </label>
          <input
            id="quotedAmount"
            name="quotedAmount"
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            className={inputClassName}
            aria-invalid={Boolean(fieldErrors.quotedAmount)}
            aria-describedby={fieldErrors.quotedAmount ? "quotedAmount-error" : undefined}
          />
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Le montant final reste une décision explicite du personnel.
          </p>
          <FieldError errors={fieldErrors.quotedAmount} id="quotedAmount-error" />
        </div>

        <div>
          <label htmlFor="quoteCurrency" className="text-sm font-bold text-slate-800">
            Devise
          </label>
          <select
            id="quoteCurrency"
            name="quoteCurrency"
            defaultValue="USD"
            className={inputClassName}
            aria-invalid={Boolean(fieldErrors.quoteCurrency)}
            aria-describedby={fieldErrors.quoteCurrency ? "quoteCurrency-error" : undefined}
          >
            <option value="USD">USD — Dollar américain</option>
          </select>
          <FieldError errors={fieldErrors.quoteCurrency} id="quoteCurrency-error" />
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={isPending}
        className="mt-8 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3.5 font-bold text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-65"
      >
        <Save aria-hidden="true" className="h-5 w-5" />
        {isPending ? "Enregistrement..." : "Enregistrer le devis"}
      </button>
    </form>
  );
}
