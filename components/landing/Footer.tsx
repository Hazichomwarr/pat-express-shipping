import { Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";

type FooterProps = {
  language?: "en" | "fr";
};

const footerContent = {
  en: {
    description:
      "Un service d’envoi fiable des États-Unis vers le Burkina Faso. Nous rendons chaque envoi simple, sûr et transparent.",
    quickLinksTitle: "Liens rapides",
    quickLinks: [
      { label: "Accueil", href: "/" },
      { label: "Créer un envoi", href: "/expedier" },
      { label: "Suivre un colis", href: "/suivi" },
      { label: "Fonctionnement", href: "/#how-it-works" },
    ],
    contact: "Contact",
    follow: "Suivez-nous",
    followDescription:
      "Restez informé des départs, des arrivées et de nos actualités.",
    rights: "Tous droits réservés.",
    connection:
      "Nous relions fièrement les États-Unis 🇺🇸 et le Burkina Faso 🇧🇫",
  },
  fr: {
    description:
      "Un service d’envoi fiable des États-Unis vers le Burkina Faso. Nous rendons chaque envoi simple, sûr et transparent.",
    quickLinksTitle: "Liens rapides",
    quickLinks: [
      { label: "Accueil", href: "/" },
      { label: "Créer un envoi", href: "/expedier" },
      { label: "Suivre un colis", href: "/suivi" },
      { label: "Fonctionnement", href: "/#how-it-works" },
    ],
    contact: "Contact",
    follow: "Suivez-nous",
    followDescription:
      "Restez informé des départs, des arrivées et de nos actualités.",
    rights: "Tous droits réservés.",
    connection:
      "Nous relions fièrement les États-Unis 🇺🇸 et le Burkina Faso 🇧🇫",
  },
} as const;

export default function Footer({ language = "en" }: FooterProps) {
  const copy = footerContent[language];

  return (
    <footer className="bg-slate-950 text-slate-300">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-16 lg:grid-cols-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight">
              <span className="text-blue-500">Pat</span>
              <span className="text-red-500">Express</span>
              <span className="text-white">Shipping</span>
            </h2>
            <p className="mt-6 leading-7 text-slate-400">
              {copy.description}
            </p>
          </div>

          <div>
            <h3 className="text-lg font-bold text-white">
              {copy.quickLinksTitle}
            </h3>
            <ul className="mt-6 space-y-4">
              {copy.quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="transition hover:text-white focus-visible:rounded focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-bold text-white">{copy.contact}</h3>
            <ul className="mt-6 space-y-5">
              <li className="flex items-start gap-3">
                <Phone
                  aria-hidden="true"
                  className="mt-1 h-5 w-5 text-blue-500"
                />
                <span>(862) 336-0170</span>
              </li>
              <li className="flex items-start gap-3">
                <Mail
                  aria-hidden="true"
                  className="mt-1 h-5 w-5 text-blue-500"
                />
                <span>info@patexpressshipping.com</span>
              </li>
              <li className="flex items-start gap-3">
                <MapPin
                  aria-hidden="true"
                  className="mt-1 h-5 w-5 text-blue-500"
                />
                <span>
                  Newark, New Jersey
                  <br />
                  {language === "fr" ? "États-Unis" : "États-Unis"}
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-bold text-white">{copy.follow}</h3>
            <p className="mt-6 text-slate-400">{copy.followDescription}</p>
            <div className="mt-8 flex gap-4">
              <Link
                href="#"
                aria-label="Facebook"
                className="rounded-xl bg-slate-800 p-3 transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30"
              >
                <span className="sr-only">Facebook</span>
              </Link>
              <Link
                href="#"
                aria-label="Instagram"
                className="rounded-xl bg-slate-800 p-3 transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30"
              >
                <span className="sr-only">Instagram</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="my-12 h-px bg-slate-800" />

        <div className="flex flex-col items-center justify-between gap-6 text-center text-sm text-slate-500 md:flex-row">
          <p>
            © {new Date().getFullYear()} PatExpressShipping. {copy.rights}
          </p>
          <p>{copy.connection}</p>
        </div>
      </div>
    </footer>
  );
}
