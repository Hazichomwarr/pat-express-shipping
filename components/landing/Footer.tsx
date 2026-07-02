// components/Footer.tsx
import Link from "next/link";
import { Phone, Mail, MapPin } from "lucide-react";

const quickLinks = [
  {
    label: "Home",
    href: "/",
  },
  {
    label: "Create Shipment",
    href: "/shipments/new",
  },
  {
    label: "Track Package",
    href: "/track",
  },
  {
    label: "How It Works",
    href: "#how-it-works",
  },
];

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-300">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-16 lg:grid-cols-4">
          {/* Company */}

          <div>
            <h2 className="text-3xl font-black tracking-tight">
              <span className="text-blue-500">Pat</span>
              <span className="text-red-500">Express</span>
              <span className="text-white">Shipping</span>
            </h2>

            <p className="mt-6 leading-7 text-slate-400">
              Reliable shipping services from the United States to Burkina Faso.
              We make international shipping simple, secure, and transparent.
            </p>
          </div>

          {/* Quick Links */}

          <div>
            <h3 className="text-lg font-bold text-white">Quick Links</h3>

            <ul className="mt-6 space-y-4">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="transition hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}

          <div>
            <h3 className="text-lg font-bold text-white">Contact</h3>

            <ul className="mt-6 space-y-5">
              <li className="flex items-start gap-3">
                <Phone className="mt-1 h-5 w-5 text-blue-500" />
                <span>(862) 336-0170</span>
              </li>

              <li className="flex items-start gap-3">
                <Mail className="mt-1 h-5 w-5 text-blue-500" />
                <span>info@patexpressshipping.com</span>
              </li>

              <li className="flex items-start gap-3">
                <MapPin className="mt-1 h-5 w-5 text-blue-500" />
                <span>
                  Newark, New Jersey
                  <br />
                  United States
                </span>
              </li>
            </ul>
          </div>

          {/* Social */}

          <div>
            <h3 className="text-lg font-bold text-white">Follow Us</h3>

            <p className="mt-6 text-slate-400">
              Stay connected for shipping updates and announcements.
            </p>

            <div className="mt-8 flex gap-4">
              <Link
                href="#"
                className="rounded-xl bg-slate-800 p-3 transition hover:bg-blue-700"
              >
                {/* <Facebook className="h-5 w-5" /> */}
              </Link>

              <Link
                href="#"
                className="rounded-xl bg-slate-800 p-3 transition hover:bg-blue-700"
              >
                {/* <Instagram className="h-5 w-5" /> */}
              </Link>
            </div>
          </div>
        </div>

        <div className="my-12 h-px bg-slate-800" />

        <div className="flex flex-col items-center justify-between gap-6 text-center text-sm text-slate-500 md:flex-row">
          <p>
            © {new Date().getFullYear()} PatExpressShipping. All rights
            reserved.
          </p>

          <p>Proudly connecting the United States 🇺🇸 and Burkina Faso 🇧🇫</p>
        </div>
      </div>
    </footer>
  );
}
