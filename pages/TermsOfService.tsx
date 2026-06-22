import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { ScrollText } from "lucide-react";
import { Seo } from "@/components/Seo";

const sections = [
  {
    title: "Accurate Information",
    body: "By using Service Tracker, you agree to provide accurate and truthful service-hour information. Submissions should reflect activities you genuinely participated in, with correct dates, durations, and organization details.",
  },
  {
    title: "No False or Misleading Records",
    body: "You may not submit false, exaggerated, or misleading service-hour records. Doing so may result in rejection of submissions, suspension of your account, or removal from the platform.",
  },
  {
    title: "Account Responsibility",
    body: "You are responsible for keeping your account information secure, including your password. You are responsible for all activity that occurs under your account. Notify an admin immediately if you suspect unauthorized access.",
  },
  {
    title: "Admin Review & Verification",
    body: "Admins and approved organizations may review, verify, edit, or reject submissions to ensure accuracy and integrity. Records may be corrected or removed if they appear inaccurate, duplicated, or in violation of these terms.",
  },
  {
    title: "Acceptable Use",
    body: "You agree not to misuse the platform, interfere with its operation, attempt to access data that does not belong to you, or use Service Tracker for any unlawful purpose.",
  },
  {
    title: "Service Disclaimer",
    body: "Service Tracker is provided to help students, organizations, and admins manage and track service-hour records. The platform is provided 'as is' and may be updated, changed, or temporarily unavailable from time to time. We do not guarantee uninterrupted access or that records will satisfy every external requirement (such as school or scholarship policies) — please confirm with the requesting party.",
  },
  {
    title: "Changes to These Terms",
    body: "These Terms of Service may be updated over time as the platform evolves. Continued use of Service Tracker after updates means you accept the revised terms.",
  },
  {
    title: "Contact",
    body: "Questions about these terms? Reach out through the Contact page and an admin will get back to you.",
  },
];

export default function TermsOfService() {
  return (
    <div className="min-h-screen flex flex-col">
      <Seo title="Terms of Service — ACL Volunteer Tracker" description="The terms governing use of ACL Volunteer Tracker for students, organizations, and admins." path="/terms" />
      <Navbar />
      <main className="flex-1 bg-gradient-to-br from-secondary/50 to-background py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <div className="mx-auto w-14 h-14 bg-primary rounded-xl flex items-center justify-center mb-4">
              <ScrollText className="w-7 h-7 text-primary-foreground" />
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">Terms of Service</h1>
            <p className="text-muted-foreground">
              Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </motion.div>

          <Card variant="elevated">
            <CardContent className="p-6 md:p-10 space-y-8">
              <p className="text-muted-foreground leading-relaxed">
                Welcome to Service Tracker. By creating an account or using the platform, you agree to the following terms.
              </p>
              {sections.map((section) => (
                <div key={section.title}>
                  <h2 className="font-display text-xl font-semibold mb-2">{section.title}</h2>
                  <p className="text-muted-foreground leading-relaxed">{section.body}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
