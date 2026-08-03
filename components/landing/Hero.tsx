// src/components/Hero.tsx

import Image from "next/image";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-16 lg:grid-cols-2 lg:items-center">
        {/* Left */}

        <div>
          <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
            🇺🇸 États-Unis → 🇧🇫 Burkina Faso
          </span>

          <h1 className="mt-6 text-6xl md:text-7xl font-bold tracking-tight text-slate-900">
            Vos colis voyagent en toute confiance
            <br />
            des <span className="text-blue-700">États-Unis</span> au{" "}
            <span className="text-red-600">Burkina Faso</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
            Envoyez vos colis des États-Unis vers le Burkina Faso en toute
            sérénité. Créez votre envoi, payez en ligne ou sur place et suivez
            chaque étape jusqu’à la livraison.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/expedier"
              className="rounded-lg bg-blue-700 px-7 py-4 text-center font-semibold text-white transition hover:bg-blue-800"
            >
              Créer un envoi
            </Link>

            <Link
              href="/track"
              className="rounded-lg border border-blue-700 px-7 py-4 text-center font-semibold text-blue-700 transition hover:bg-blue-50"
            >
              Suivre un colis
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-1">
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-700">
              ✓ Départs chaque semaine
            </span>

            <span className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-medium text-blue-700">
              ✓ Paiement en ligne ou sur place
            </span>

            <span className="rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-xs font-medium text-orange-700">
              ✓ Suivi du colis en temps réel
            </span>
          </div>
        </div>

        {/* Right */}

        <div className="relative">
          <div className="overflow-hidden rounded-3xl shadow-2xl">
            <Image
              src="/images/pat-hero.jpg"
              alt="PatExpressShipping"
              width={1200}
              height={900}
              priority
              className="h-auto w-full object-contain md:object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
