import Link from "next/link";

type NavbarProps = {
  language?: "en" | "fr";
};

const navigation = {
  en: {
    tagline: "From USA to Burkina Faso",
    links: [
      { label: "Home", href: "/" },
      { label: "How It Works", href: "/#how-it-works" },
      { label: "Services & Pricing", href: "/#services" },
      { label: "Track Package", href: "/track" },
      { label: "About Us", href: "/#about" },
      { label: "Contact Us", href: "/#contact" },
    ],
    createShipment: "Create Shipment",
    login: "Log In",
  },
  fr: {
    tagline: "Des États-Unis vers le Burkina Faso",
    links: [
      { label: "Accueil", href: "/" },
      { label: "Fonctionnement", href: "/#how-it-works" },
      { label: "Services et tarifs", href: "/#services" },
      { label: "Suivre un colis", href: "/track" },
      { label: "À propos", href: "/#about" },
      { label: "Contact", href: "/#contact" },
    ],
    createShipment: "Créer un envoi",
    login: "Connexion",
  },
} as const;

export default function Navbar({ language = "en" }: NavbarProps) {
  const copy = navigation[language];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-4">
        <Link href="/" className="flex flex-col leading-none">
          <span className="text-2xl font-extrabold tracking-tight">
            <span className="text-blue-700">Pat</span>
            <span className="text-red-600">Express</span>
            <span className="text-slate-900">Shipping</span>
          </span>
          <span className="mt-1 text-xs font-medium text-slate-500">
            {copy.tagline}
          </span>
        </Link>

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

        <div className="hidden items-center gap-3 xl:flex">
          <Link
            href="/expedier"
            className="rounded-md bg-blue-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
          >
            {copy.createShipment}
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-blue-700 px-5 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
          >
            {copy.login}
          </Link>
        </div>

        <Link
          href="/expedier"
          className="inline-flex rounded-md bg-blue-700 px-4 py-2.5 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 xl:hidden"
        >
          {copy.createShipment}
        </Link>
      </nav>
    </header>
  );
}
