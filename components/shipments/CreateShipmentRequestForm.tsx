"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { ShipmentDirection } from "@prisma/client";
import {
  ArrowRightLeft,
  Check,
  CheckCircle2,
  Clipboard,
  Mail,
  MapPin,
  PackagePlus,
  Plus,
  Send,
} from "lucide-react";

import {
  createShipmentRequestAction,
  type CreateShipmentRequestActionState,
} from "@/src/actions/create-shipment-request.action";
import {
  getShipmentDirectionDestinationLabel,
  getShipmentDirectionLabel,
  getShipmentDirectionOriginLabel,
} from "@/src/services/_shared/shipment-direction-presentation";
import ShipmentItemFields, {
  type ShipmentItemFormValues,
} from "./ShipmentItemFields";

const SHIPMENT_DIRECTION_OPTIONS: {
  value: ShipmentDirection;
  description: string;
}[] = [
  {
    value: "US_TO_BF",
    description: "Vous envoyez un colis depuis les États-Unis.",
  },
  {
    value: "BF_TO_US",
    description: "Vous envoyez un colis depuis le Burkina Faso.",
  },
];

const INITIAL_ACTION_STATE: CreateShipmentRequestActionState = {
  status: "idle",
};

const inputClassName =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-base text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 aria-invalid:border-red-500 aria-invalid:ring-red-100";

type ContactValues = {
  senderName: string;
  senderPhone: string;
  senderEmail: string;
  recipientName: string;
  recipientPhone: string;
  recipientEmail: string;
  recipientCity: string;
  recipientNotes: string;
  customerNotes: string;
};

const initialContactValues: ContactValues = {
  senderName: "",
  senderPhone: "",
  senderEmail: "",
  recipientName: "",
  recipientPhone: "",
  recipientEmail: "",
  recipientCity: "",
  recipientNotes: "",
  customerNotes: "",
};

function createEmptyItem(id: number): ShipmentItemFormValues {
  return {
    id,
    description: "",
    category: "",
    quantity: "1",
    declaredValue: "",
  };
}

function SectionHeading({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-sm font-black text-white shadow-sm">
        {number}
      </span>
      <div>
        <h2 className="text-2xl font-black tracking-tight text-slate-950">
          {title}
        </h2>
        <p className="mt-1 max-w-3xl leading-7 text-slate-600">
          {description}
        </p>
      </div>
    </div>
  );
}

function FieldError({
  errors,
  id,
}: {
  errors: string[] | undefined;
  id: string;
}) {
  if (!errors?.length) {
    return null;
  }

  return (
    <div id={id} className="mt-2 space-y-1" role="alert">
      {errors.slice(0, 1).map((error) => (
        <p key={error} className="text-sm font-medium text-red-700">
          {error}
        </p>
      ))}
    </div>
  );
}

export default function CreateShipmentRequestForm() {
  const [state, formAction, isPending] = useActionState(
    createShipmentRequestAction,
    INITIAL_ACTION_STATE,
  );
  const [direction, setDirection] = useState<ShipmentDirection | "">("");
  const [intakeMethod, setIntakeMethod] = useState<"DROP_OFF" | "MAIL_IN">(
    "DROP_OFF",
  );
  const [contactValues, setContactValues] =
    useState<ContactValues>(initialContactValues);
  const [items, setItems] = useState<ShipmentItemFormValues[]>([
    createEmptyItem(0),
  ]);
  const [copyFeedback, setCopyFeedback] = useState("");
  const nextItemId = useRef(1);
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const confirmationHeadingRef = useRef<HTMLHeadingElement>(null);

  const fieldErrors =
    state.status === "validation_error" ? state.fieldErrors : {};

  useEffect(() => {
    if (state.status === "success") {
      confirmationHeadingRef.current?.focus();
      return;
    }

    if (state.status === "error") {
      errorRef.current?.focus();
      return;
    }

    if (state.status !== "validation_error") {
      return;
    }

    const firstPath = Object.keys(state.fieldErrors)[0];
    const formControl = firstPath
      ? formRef.current?.elements.namedItem(firstPath)
      : null;

    if (formControl instanceof HTMLElement) {
      formControl.focus();
    } else if (formControl instanceof RadioNodeList) {
      const firstRadio = formControl.item(0);
      if (firstRadio instanceof HTMLElement) {
        firstRadio.focus();
      }
    } else {
      summaryRef.current?.focus();
    }
  }, [state]);

  function updateContact(field: keyof ContactValues, value: string) {
    setContactValues((current) => ({ ...current, [field]: value }));
  }

  function updateItem(
    id: number,
    field: Exclude<keyof ShipmentItemFormValues, "id">,
    value: string,
  ) {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  }

  function addItem() {
    if (items.length >= 50) {
      return;
    }

    const id = nextItemId.current;
    nextItemId.current += 1;
    setItems((current) => [...current, createEmptyItem(id)]);
  }

  function removeItem(id: number) {
    setItems((current) =>
      current.length === 1 ? current : current.filter((item) => item.id !== id),
    );
  }

  async function copyTrackingNumber() {
    if (state.status !== "success") {
      return;
    }

    try {
      await navigator.clipboard.writeText(state.shipment.trackingNumber);
      setCopyFeedback("Numéro copié");
    } catch {
      setCopyFeedback(
        "Copie impossible. Sélectionnez le numéro pour le copier manuellement.",
      );
    }
  }

  if (state.status === "success") {
    const nextStep =
      intakeMethod === "DROP_OFF"
        ? "Apportez maintenant votre colis à PatExpressShipping. Notre équipe vous contactera après sa réception et sa pesée."
        : "Envoyez maintenant votre colis à l’adresse confirmée par PatExpressShipping. Notre équipe vous contactera après sa réception et sa pesée.";

    return (
      <section
        className="overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-xl shadow-slate-200/60"
        aria-live="polite"
      >
        <div className="bg-linear-to-r from-emerald-600 to-blue-700 px-6 py-10 text-white sm:px-10">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <CheckCircle2 aria-hidden="true" className="h-8 w-8" />
          </span>
          <h2
            ref={confirmationHeadingRef}
            tabIndex={-1}
            className="mt-6 text-3xl font-black tracking-tight outline-none sm:text-4xl"
          >
            Votre demande d’envoi est créée
          </h2>
          <p className="mt-3 max-w-2xl text-lg leading-8 text-emerald-50">
            Conservez votre numéro de suivi. Il vous permettra de suivre
            l’évolution de votre colis.
          </p>
        </div>

        <div className="px-6 py-8 sm:px-10 sm:py-10">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
            Numéro de suivi
          </p>
          <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-5 sm:flex-row sm:items-center sm:justify-between">
            <code className="break-all text-2xl font-black tracking-wider text-blue-950 sm:text-3xl">
              {state.shipment.trackingNumber}
            </code>
            <button
              type="button"
              onClick={copyTrackingNumber}
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 font-bold text-blue-700 shadow-sm ring-1 ring-blue-200 transition hover:bg-blue-700 hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
            >
              {copyFeedback === "Numéro copié" ? (
                <Check aria-hidden="true" className="h-5 w-5" />
              ) : (
                <Clipboard aria-hidden="true" className="h-5 w-5" />
              )}
              {copyFeedback === "Numéro copié"
                ? "Numéro copié"
                : "Copier le numéro"}
            </button>
          </div>
          <p className="mt-3 min-h-6 text-sm font-medium text-slate-600" aria-live="polite">
            {copyFeedback}
          </p>

          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {direction ? (
              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-500">
                  Sens de l’envoi
                </p>
                <p className="mt-2 font-bold text-slate-950">
                  {getShipmentDirectionLabel(direction)}
                </p>
              </div>
            ) : null}
            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-500">
                Statut actuel
              </p>
              <p className="mt-2 flex items-center gap-2 font-bold text-slate-950">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                {state.shipment.status === "AWAITING_PACKAGE"
                  ? "En attente de réception du colis"
                  : "Demande enregistrée"}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-500">
                Prochaine étape
              </p>
              <p className="mt-2 leading-7 text-slate-700">{nextStep}</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      noValidate
      aria-busy={isPending}
      className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60"
    >
      <fieldset disabled={isPending} className="min-w-0 border-0 p-0">
        <legend className="sr-only">Demande d’envoi</legend>

        {state.status === "validation_error" ? (
          <div
            ref={summaryRef}
            tabIndex={-1}
            role="alert"
            className="m-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-900 outline-none focus:ring-4 focus:ring-red-100 sm:m-8"
          >
            <p className="font-bold">{state.message}</p>
            {fieldErrors._form?.map((error) => (
              <p key={error} className="mt-2 text-sm">
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
            className="m-6 rounded-2xl border border-red-200 bg-red-50 p-5 font-semibold text-red-900 outline-none focus:ring-4 focus:ring-red-100 sm:m-8"
          >
            {state.message}
          </div>
        ) : null}

        <section className="border-b border-slate-200 px-6 py-8 sm:px-10 sm:py-10">
          <SectionHeading
            number="1"
            title="Sens de l’envoi"
            description="Indiquez le pays de départ et le pays d’arrivée de votre colis."
          />

          <div
            role="radiogroup"
            aria-label="Sens de l’envoi"
            aria-describedby={
              fieldErrors.direction ? "direction-error" : undefined
            }
            className="mt-7 grid gap-4 md:grid-cols-2"
          >
            {SHIPMENT_DIRECTION_OPTIONS.map((option) => (
              <label key={option.value} className="group relative cursor-pointer">
                <input
                  type="radio"
                  name="direction"
                  value={option.value}
                  checked={direction === option.value}
                  onChange={() => setDirection(option.value)}
                  className="peer sr-only"
                  aria-describedby={`direction-${option.value}-description`}
                />
                <span className="block h-full rounded-2xl border-2 border-slate-200 p-5 transition group-hover:border-blue-300 peer-checked:border-blue-700 peer-checked:bg-blue-50 peer-focus-visible:ring-4 peer-focus-visible:ring-blue-200">
                  <span className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-3 text-lg font-black text-slate-950">
                      <span className="rounded-xl bg-white p-2.5 text-blue-700 shadow-sm">
                        <ArrowRightLeft aria-hidden="true" className="h-5 w-5" />
                      </span>
                      {getShipmentDirectionLabel(option.value)}
                    </span>
                    <span
                      aria-hidden="true"
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-slate-300 text-white transition group-has-[:checked]:border-blue-700 group-has-[:checked]:bg-blue-700"
                    >
                      <Check
                        aria-hidden="true"
                        className="h-4 w-4 opacity-0 group-has-[:checked]:opacity-100"
                      />
                    </span>
                  </span>
                  <span
                    id={`direction-${option.value}-description`}
                    className="mt-3 block leading-7 text-slate-600"
                  >
                    {option.description}
                  </span>
                </span>
              </label>
            ))}
          </div>
          <FieldError errors={fieldErrors.direction} id="direction-error" />
        </section>

        <section className="border-b border-slate-200 px-6 py-8 sm:px-10 sm:py-10">
          <SectionHeading
            number="2"
            title="Mode de dépôt"
            description="Choisissez comment votre colis arrivera chez PatExpressShipping."
          />

          <div className="mt-7 grid gap-4 md:grid-cols-2">
            <label className="group relative cursor-pointer">
              <input
                type="radio"
                name="intakeMethod"
                value="DROP_OFF"
                checked={intakeMethod === "DROP_OFF"}
                onChange={() => setIntakeMethod("DROP_OFF")}
                className="peer sr-only"
                aria-describedby="drop-off-description"
              />
              <span className="block h-full rounded-2xl border-2 border-slate-200 p-5 transition group-hover:border-blue-300 peer-checked:border-blue-700 peer-checked:bg-blue-50 peer-focus-visible:ring-4 peer-focus-visible:ring-blue-200">
                <span className="flex items-center gap-3 text-lg font-black text-slate-950">
                  <span className="rounded-xl bg-white p-2.5 text-blue-700 shadow-sm">
                    <MapPin aria-hidden="true" className="h-5 w-5" />
                  </span>
                  Je déposerai le colis
                </span>
                <span
                  id="drop-off-description"
                  className="mt-3 block leading-7 text-slate-600"
                >
                  Vous apporterez le colis directement à PatExpressShipping.
                </span>
              </span>
            </label>

            <label className="group relative cursor-pointer">
              <input
                type="radio"
                name="intakeMethod"
                value="MAIL_IN"
                checked={intakeMethod === "MAIL_IN"}
                onChange={() => setIntakeMethod("MAIL_IN")}
                className="peer sr-only"
                aria-describedby="mail-in-description"
              />
              <span className="block h-full rounded-2xl border-2 border-slate-200 p-5 transition group-hover:border-blue-300 peer-checked:border-blue-700 peer-checked:bg-blue-50 peer-focus-visible:ring-4 peer-focus-visible:ring-blue-200">
                <span className="flex items-center gap-3 text-lg font-black text-slate-950">
                  <span className="rounded-xl bg-white p-2.5 text-blue-700 shadow-sm">
                    <Mail aria-hidden="true" className="h-5 w-5" />
                  </span>
                  J’enverrai le colis par courrier
                </span>
                <span
                  id="mail-in-description"
                  className="mt-3 block leading-7 text-slate-600"
                >
                  Vous enverrez le colis à l’adresse de PatExpressShipping.
                </span>
              </span>
            </label>
          </div>
          <FieldError
            errors={fieldErrors.intakeMethod}
            id="intake-method-error"
          />
        </section>

        <section className="border-b border-slate-200 px-6 py-8 sm:px-10 sm:py-10">
          <SectionHeading
            number="3"
            title={
              direction
                ? `Informations de l’expéditeur — ${getShipmentDirectionOriginLabel(direction)}`
                : "Informations de l’expéditeur"
            }
            description="Indiquez les coordonnées de la personne qui envoie et paiera le colis."
          />
          <div className="mt-7 grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label htmlFor="senderName" className="text-sm font-bold text-slate-800">
                Nom complet
              </label>
              <input
                id="senderName"
                name="senderName"
                autoComplete="name"
                value={contactValues.senderName}
                onChange={(event) => updateContact("senderName", event.target.value)}
                className={inputClassName}
                aria-invalid={Boolean(fieldErrors.senderName)}
                aria-describedby={fieldErrors.senderName ? "senderName-error" : undefined}
              />
              <FieldError errors={fieldErrors.senderName} id="senderName-error" />
            </div>
            <div>
              <label htmlFor="senderPhone" className="text-sm font-bold text-slate-800">
                Téléphone
              </label>
              <input
                id="senderPhone"
                name="senderPhone"
                type="tel"
                autoComplete="tel"
                value={contactValues.senderPhone}
                onChange={(event) => updateContact("senderPhone", event.target.value)}
                placeholder="+1 (862) 555-0142"
                className={inputClassName}
                aria-invalid={Boolean(fieldErrors.senderPhone)}
                aria-describedby={fieldErrors.senderPhone ? "senderPhone-error" : undefined}
              />
              <FieldError errors={fieldErrors.senderPhone} id="senderPhone-error" />
            </div>
            <div>
              <label htmlFor="senderEmail" className="text-sm font-bold text-slate-800">
                Adresse e-mail
              </label>
              <input
                id="senderEmail"
                name="senderEmail"
                type="email"
                autoComplete="email"
                value={contactValues.senderEmail}
                onChange={(event) => updateContact("senderEmail", event.target.value)}
                className={inputClassName}
                aria-invalid={Boolean(fieldErrors.senderEmail)}
                aria-describedby={fieldErrors.senderEmail ? "senderEmail-error" : undefined}
              />
              <FieldError errors={fieldErrors.senderEmail} id="senderEmail-error" />
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 px-6 py-8 sm:px-10 sm:py-10">
          <SectionHeading
            number="4"
            title={
              direction
                ? `Informations du destinataire — ${getShipmentDirectionDestinationLabel(direction)}`
                : "Informations du destinataire"
            }
            description={
              direction
                ? `Le destinataire sera contacté lorsque le colis sera prêt à être retiré. Lieu de retrait : ${getShipmentDirectionDestinationLabel(direction)}.`
                : "Le destinataire sera contacté lorsque le colis sera prêt à être retiré."
            }
          />
          <div className="mt-7 grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label htmlFor="recipientName" className="text-sm font-bold text-slate-800">
                Nom complet
              </label>
              <input
                id="recipientName"
                name="recipientName"
                autoComplete="name"
                value={contactValues.recipientName}
                onChange={(event) => updateContact("recipientName", event.target.value)}
                className={inputClassName}
                aria-invalid={Boolean(fieldErrors.recipientName)}
                aria-describedby={fieldErrors.recipientName ? "recipientName-error" : undefined}
              />
              <FieldError errors={fieldErrors.recipientName} id="recipientName-error" />
            </div>
            <div>
              <label htmlFor="recipientPhone" className="text-sm font-bold text-slate-800">
                Téléphone
              </label>
              <input
                id="recipientPhone"
                name="recipientPhone"
                type="tel"
                autoComplete="tel"
                value={contactValues.recipientPhone}
                onChange={(event) => updateContact("recipientPhone", event.target.value)}
                placeholder="70 12 34 56"
                className={inputClassName}
                aria-invalid={Boolean(fieldErrors.recipientPhone)}
                aria-describedby={fieldErrors.recipientPhone ? "recipientPhone-error" : undefined}
              />
              <FieldError errors={fieldErrors.recipientPhone} id="recipientPhone-error" />
            </div>
            <div>
              <label htmlFor="recipientEmail" className="text-sm font-bold text-slate-800">
                Adresse e-mail — facultatif
              </label>
              <input
                id="recipientEmail"
                name="recipientEmail"
                type="email"
                autoComplete="email"
                value={contactValues.recipientEmail}
                onChange={(event) => updateContact("recipientEmail", event.target.value)}
                className={inputClassName}
                aria-invalid={Boolean(fieldErrors.recipientEmail)}
                aria-describedby={fieldErrors.recipientEmail ? "recipientEmail-error" : undefined}
              />
              <FieldError errors={fieldErrors.recipientEmail} id="recipientEmail-error" />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="recipientCity" className="text-sm font-bold text-slate-800">
                Ville
              </label>
              <input
                id="recipientCity"
                name="recipientCity"
                autoComplete="address-level2"
                value={contactValues.recipientCity}
                onChange={(event) => updateContact("recipientCity", event.target.value)}
                placeholder="Ex. Ouagadougou"
                className={inputClassName}
                aria-invalid={Boolean(fieldErrors.recipientCity)}
                aria-describedby={fieldErrors.recipientCity ? "recipientCity-error" : undefined}
              />
              <FieldError errors={fieldErrors.recipientCity} id="recipientCity-error" />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="recipientNotes" className="text-sm font-bold text-slate-800">
                Instructions pour le destinataire — facultatif
              </label>
              <textarea
                id="recipientNotes"
                name="recipientNotes"
                rows={3}
                maxLength={500}
                value={contactValues.recipientNotes}
                onChange={(event) => updateContact("recipientNotes", event.target.value)}
                placeholder="Ex. Appelez le destinataire avant le retrait."
                className={inputClassName}
                aria-invalid={Boolean(fieldErrors.recipientNotes)}
                aria-describedby={fieldErrors.recipientNotes ? "recipientNotes-error" : undefined}
              />
              <FieldError errors={fieldErrors.recipientNotes} id="recipientNotes-error" />
            </div>
          </div>
        </section>

        <section className="px-6 py-8 sm:px-10 sm:py-10">
          <SectionHeading
            number="5"
            title="Contenu du colis"
            description="Déclarez chaque type d’article présent dans votre colis. Vous pourrez en ajouter jusqu’à 50."
          />

          <div className="mt-7 space-y-5">
            {items.map((item, index) => (
              <ShipmentItemFields
                key={item.id}
                index={index}
                item={item}
                itemCount={items.length}
                fieldErrors={fieldErrors}
                onChange={updateItem}
                onRemove={removeItem}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={addItem}
            disabled={items.length >= 50 || isPending}
            className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 font-bold text-blue-700 transition hover:border-blue-700 hover:bg-blue-700 hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus aria-hidden="true" className="h-5 w-5" />
            Ajouter un autre article
          </button>

          <div className="mt-8">
            <label htmlFor="customerNotes" className="text-sm font-bold text-slate-800">
              Notes concernant l’envoi — facultatif
            </label>
            <textarea
              id="customerNotes"
              name="customerNotes"
              rows={4}
              maxLength={1000}
              value={contactValues.customerNotes}
              onChange={(event) => updateContact("customerNotes", event.target.value)}
              placeholder="Ajoutez toute information utile pour notre équipe."
              className={inputClassName}
              aria-invalid={Boolean(fieldErrors.customerNotes)}
              aria-describedby={fieldErrors.customerNotes ? "customerNotes-error customerNotes-help" : "customerNotes-help"}
            />
            <p id="customerNotes-help" className="mt-2 text-sm leading-6 text-slate-500">
              Ajoutez toute information utile pour notre équipe.
            </p>
            <FieldError errors={fieldErrors.customerNotes} id="customerNotes-error" />
          </div>

          <div className="mt-9 rounded-2xl bg-slate-950 p-5 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6">
            <div className="flex items-start gap-3 text-slate-300">
              <PackagePlus aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0 text-blue-400" />
              <p className="text-sm leading-6">
                Aucun paiement n’est demandé maintenant. Le prix vous sera communiqué après réception, vérification et pesée du colis.
              </p>
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="mt-5 inline-flex min-h-14 w-full shrink-0 items-center justify-center gap-3 rounded-xl bg-blue-600 px-7 py-4 text-base font-black text-white shadow-lg shadow-blue-950/20 transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-300 disabled:cursor-wait disabled:bg-blue-400 sm:mt-0 sm:w-auto"
            >
              {isPending ? (
                <>
                  <Send aria-hidden="true" className="h-5 w-5" />
                  Création de votre demande...
                </>
              ) : (
                <>
                  <Send aria-hidden="true" className="h-5 w-5" />
                  Créer ma demande d’envoi
                </>
              )}
            </button>
          </div>
        </section>
      </fieldset>
    </form>
  );
}
