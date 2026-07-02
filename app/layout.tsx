import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PatExpressShipping | Shipping from USA to Burkina Faso",

  description:
    "PatExpressShipping provides reliable shipping services from the United States to Burkina Faso. Create shipments online, choose flexible payment options, and track your package every step of the way.",

  keywords: [
    "Shipping USA to Burkina Faso",
    "Package delivery Burkina Faso",
    "International shipping",
    "Freight Burkina Faso",
    "Cargo Burkina Faso",
    "Shipping Newark NJ",
    "Package tracking",
    "Orange Money payment",
    "Zelle shipping",
    "PatExpressShipping",
  ],

  authors: [{ name: "PatExpressShipping" }],

  creator: "PatExpressShipping",

  applicationName: "PatExpressShipping",

  metadataBase: new URL("https://www.patexpressshipping.com"),

  openGraph: {
    title: "PatExpressShipping",
    description:
      "Ship packages from the USA to Burkina Faso with secure payments and real-time tracking.",
    url: "https://www.patexpressshipping.com",
    siteName: "PatExpressShipping",
    locale: "en_US",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "PatExpressShipping",
    description: "Reliable shipping from the United States to Burkina Faso.",
  },

  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
