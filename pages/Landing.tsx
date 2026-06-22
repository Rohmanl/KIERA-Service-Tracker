import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { AboutSection } from "@/components/landing/AboutSection";
import { ContactSection } from "@/components/landing/ContactSection";
import { Seo } from "@/components/Seo";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <Seo title="ACL Volunteer Tracker — Log Service Hours" description="Log, verify, and showcase community service hours. Track progress, earn achievements, and find volunteer opportunities." path="/" />
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <AboutSection />
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
}
