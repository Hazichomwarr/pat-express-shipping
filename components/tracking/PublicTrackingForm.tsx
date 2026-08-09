import { Search } from "lucide-react";

type PublicTrackingFormProps = {
  defaultValue: string;
};

export default function PublicTrackingForm({
  defaultValue,
}: PublicTrackingFormProps) {
  return (
    <form action="/suivi" method="get" className="mt-7">
      <label
        htmlFor="tracking-number"
        className="block text-sm font-bold text-slate-900"
      >
        Numéro de suivi
      </label>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <input
          id="tracking-number"
          name="numero"
          type="text"
          defaultValue={defaultValue}
          placeholder="PAT-2026-XXXXXXXX"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          aria-describedby="tracking-number-help"
          className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3.5 font-mono text-base font-semibold tracking-wide text-slate-950 shadow-sm outline-none transition placeholder:font-sans placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
        />
        <button
          type="submit"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3.5 font-bold text-white shadow-sm transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
        >
          <Search aria-hidden="true" className="h-5 w-5" />
          Suivre mon colis
        </button>
      </div>
      <p id="tracking-number-help" className="mt-3 text-sm leading-6 text-slate-600">
        Votre numéro de suivi commence par PAT et figure sur votre confirmation
        d’envoi.
      </p>
    </form>
  );
}
