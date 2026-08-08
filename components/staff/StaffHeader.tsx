"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { useState } from "react";

export default function StaffHeader() {
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);

    try {
      await signOut({ callbackUrl: "/staff/login?callbackUrl=%2Fstaff" });
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <header className="border-b border-slate-800 bg-slate-950 text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-6">
        <Link
          href="/staff"
          className="text-lg font-black tracking-tight focus-visible:rounded focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-400/40 sm:text-xl"
        >
          <span className="text-blue-400">Pat</span>
          <span className="text-red-400">Express</span>
          <span>Shipping</span>
        </Link>

        <nav aria-label="Navigation du personnel" className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/staff"
            aria-current="page"
            className="rounded-lg px-3 py-2 text-sm font-bold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-400/40"
          >
            Envois
          </Link>
          <button
            type="button"
            disabled={isSigningOut}
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-400/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogOut aria-hidden="true" className="h-4 w-4" />
            <span className="hidden sm:inline">
              {isSigningOut ? "Déconnexion..." : "Déconnexion"}
            </span>
            <span className="sr-only sm:hidden">
              {isSigningOut ? "Déconnexion en cours" : "Déconnexion"}
            </span>
          </button>
        </nav>
      </div>
    </header>
  );
}
