"use client";

import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";
import { LogIn } from "lucide-react";

const INVALID_CREDENTIALS_MESSAGE =
  "Adresse e-mail ou mot de passe incorrect.";

type StaffLoginFormProps = {
  callbackUrl: string;
};

export default function StaffLoginForm({ callbackUrl }: StaffLoginFormProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setErrorMessage("");

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email");
    const password = formData.get("password");

    try {
      const result = await signIn("credentials", {
        email: typeof email === "string" ? email : "",
        password: typeof password === "string" ? password : "",
        callbackUrl,
        redirect: false,
      });

      if (!result?.ok || result.error) {
        setErrorMessage(INVALID_CREDENTIALS_MESSAGE);
        return;
      }

      router.replace(callbackUrl);
      router.refresh();
    } catch {
      setErrorMessage(INVALID_CREDENTIALS_MESSAGE);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-busy={isPending} className="mt-8">
      <fieldset disabled={isPending} className="space-y-5 border-0 p-0">
        <legend className="sr-only">Connexion du personnel</legend>

        {errorMessage ? (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
          >
            {errorMessage}
          </div>
        ) : null}

        <div>
          <label htmlFor="staff-email" className="text-sm font-bold text-slate-800">
            Adresse e-mail
          </label>
          <input
            id="staff-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            autoFocus
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-base text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            placeholder="personnel@patexpressshipping.com"
          />
        </div>

        <div>
          <label
            htmlFor="staff-password"
            className="text-sm font-bold text-slate-800"
          >
            Mot de passe
          </label>
          <input
            id="staff-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-base text-slate-950 shadow-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3.5 font-bold text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-65"
        >
          <LogIn aria-hidden="true" className="h-5 w-5" />
          {isPending ? "Connexion..." : "Se connecter"}
        </button>
      </fieldset>
    </form>
  );
}
