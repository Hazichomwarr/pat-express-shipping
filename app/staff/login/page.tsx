import type { Metadata } from "next";
import Link from "next/link";
import { LockKeyhole, ShieldCheck } from "lucide-react";

import StaffLoginForm from "@/components/staff/StaffLoginForm";
import { getSafeStaffCallbackUrl } from "@/src/services/_shared/staff-ui";

export const metadata: Metadata = {
  title: "Connexion du personnel | PatExpressShipping",
  description: "Accès sécurisé aux opérations internes de PatExpressShipping.",
};

type StaffLoginPageProps = {
  searchParams: Promise<{
    callbackUrl?: string | string[];
  }>;
};

export default async function StaffLoginPage({
  searchParams,
}: StaffLoginPageProps) {
  const callbackUrl = getSafeStaffCallbackUrl(
    (await searchParams).callbackUrl,
  );

  return (
    <main
      lang="fr"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-5 py-12 text-slate-950"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.32),transparent_42%)]" />
      <div className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-blue-700/15 blur-3xl" />

      <div className="relative w-full max-w-md">
        <Link
          href="/"
          className="mx-auto flex w-fit flex-col items-center rounded-lg text-center leading-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-400/40"
        >
          <span className="text-3xl font-black tracking-tight">
            <span className="text-blue-400">Pat</span>
            <span className="text-red-400">Express</span>
            <span className="text-white">Shipping</span>
          </span>
          <span className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Opérations internes
          </span>
        </Link>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white p-6 shadow-2xl shadow-black/30 sm:p-9">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
            <LockKeyhole aria-hidden="true" className="h-6 w-6" />
          </div>
          <p className="mt-6 text-sm font-black uppercase tracking-[0.2em] text-blue-700">
            Espace personnel
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
            Connexion à PatExpressShipping
          </h1>
          <p className="mt-3 leading-7 text-slate-600">
            Connectez-vous pour gérer les opérations d’envoi.
          </p>

          <StaffLoginForm callbackUrl={callbackUrl} />

          <div className="mt-7 flex items-start gap-3 border-t border-slate-200 pt-6 text-sm leading-6 text-slate-500">
            <ShieldCheck
              aria-hidden="true"
              className="mt-0.5 h-5 w-5 shrink-0 text-blue-700"
            />
            <p>Cet espace est réservé au personnel autorisé.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
