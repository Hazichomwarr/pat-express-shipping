"use client";

import { useState } from "react";
import Link from "next/link";

type NavbarProps = {
  language?: "en" | "fr";
};

const navigation = {
  en: {
    tagline: "Entre les États-Unis et le Burkina Faso",
    links: [
      { label: "Accueil", href: "/" },
      { label: "Fonctionnement", href: "/#how-it-works" },
      { label: "Services et tarifs", href: "/#services" },
      { label: "Suivre un colis", href: "/suivi" },
      { label: "À propos", href: "/#about" },
      { label: "Contact", href: "/#contact" },
    ],
    createShipment: "Créer un envoi",
    login: "Connexion",
    openMenu: "Ouvrir le menu",
    closeMenu: "Fermer le menu",
  },
  fr: {
    tagline: "Entre les États-Unis et le Burkina Faso",
    links: [
      { label: "Accueil", href: "/" },
      { label: "Fonctionnement", href: "/#how-it-works" },
      { label: "Services et tarifs", href: "/#services" },
      { label: "Suivre un colis", href: "/suivi" },
      { label: "À propos", href: "/#about" },
      { label: "Contact", href: "/#contact" },
    ],
    createShipment: "Créer un envoi",
    login: "Connexion",
    openMenu: "Ouvrir le menu",
    closeMenu: "Fermer le menu",
  },
} as const;

export default function Navbar({ language = "en" }: NavbarProps) {
  const copy = navigation[language];
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="border-b border-slate-200 bg-white">
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8"
        aria-label="Navigation principale"
      >
        {/* Brand */}
        <Link
          href="/"
          onClick={closeMenu}
          className="flex min-w-0 flex-col focus-visible:rounded focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
        >
          <span className="text-xl font-black leading-none tracking-tight text-slate-950">
            Pat
            <span className="text-blue-700">Express</span>
            Shipping
          </span>

          <span className="mt-1 hidden text-xs font-medium text-slate-500 sm:block">
            {copy.tagline}
          </span>
        </Link>

        {/* Desktop navigation */}
        <div className="hidden items-center gap-6 xl:flex">
          {copy.links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-semibold text-slate-800 transition hover:text-blue-700 focus-visible:rounded focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop actions */}
        <div className="hidden items-center gap-3 xl:flex">
          <Link
            href="/expedier"
            className="rounded-md bg-blue-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
          >
            {copy.createShipment}
          </Link>

          <Link
            href="/staff"
            className="rounded-md border border-blue-700 px-5 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
          >
            {copy.login}
          </Link>
        </div>

        {/* Mobile controls */}
        <div className="flex items-center gap-2 xl:hidden">
          <Link
            href="/expedier"
            onClick={closeMenu}
            className="hidden rounded-md bg-blue-700 px-4 py-2.5 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 sm:inline-flex"
          >
            {copy.createShipment}
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            aria-label={menuOpen ? copy.closeMenu : copy.openMenu}
            className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-slate-200 text-slate-900 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
          >
            {menuOpen ? (
              /* X icon */
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
                className="h-6 w-6"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            ) : (
              /* Hamburger icon */
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
                className="h-6 w-6"
              >
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          id="mobile-navigation"
          className="border-t border-slate-200 bg-white px-4 pb-6 pt-3 shadow-lg sm:px-6 xl:hidden"
        >
          <div className="mx-auto flex max-w-7xl flex-col">
            {copy.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                className="border-b border-slate-100 px-2 py-4 text-base font-semibold text-slate-800 transition last:border-b-0 hover:text-blue-700 focus-visible:rounded focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
              >
                {link.label}
              </Link>
            ))}

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Link
                href="/expedier"
                onClick={closeMenu}
                className="inline-flex items-center justify-center rounded-md bg-blue-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
              >
                {copy.createShipment}
              </Link>

              <Link
                href="/staff"
                onClick={closeMenu}
                className="inline-flex items-center justify-center rounded-md border border-blue-700 px-5 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
              >
                {copy.login}
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
