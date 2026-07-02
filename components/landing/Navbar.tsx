// components/Navbar.tsx
import Link from "next/link";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Services & Pricing", href: "#services" },
  { label: "Track Package", href: "/track" },
  { label: "About Us", href: "#about" },
  { label: "Contact Us", href: "#contact" },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex flex-col leading-none">
          <span className="text-2xl font-extrabold tracking-tight">
            <span className="text-blue-700">Pat</span>
            <span className="text-red-600">Express</span>
            <span className="text-slate-900">Shipping</span>
          </span>
          <span className="mt-1 text-xs font-medium text-slate-500">
            From USA to Burkina Faso
          </span>
        </Link>

        <div className="hidden items-center gap-8 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-semibold text-slate-800 transition hover:text-blue-700"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/shipments/new"
            className="rounded-md bg-blue-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800"
          >
            Create Shipment
          </Link>

          <Link
            href="/login"
            className="rounded-md border border-blue-700 px-5 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-50"
          >
            Log In
          </Link>
        </div>

        <button className="inline-flex rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 lg:hidden">
          Menu
        </button>
      </nav>
    </header>
  );
}
