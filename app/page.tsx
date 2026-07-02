// app/page.tsx
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import Navbar from "@/components/landing/Navbar";
import WhyChooseUs from "@/components/landing/WhyChooseUs";

export default function HomePage() {
  return (
    <main>
      <Navbar />
      <Hero />
      <HowItWorks />
      <WhyChooseUs />
      <CTA />
      <Footer />
    </main>
  );
}
