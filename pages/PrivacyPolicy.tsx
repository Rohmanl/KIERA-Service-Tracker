import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { Seo } from "@/components/Seo";

const sections = [
  {
    title: "Information We Collect",
    body: "When you create an account, we collect basic information such as your name, email address, school, and grade. When you submit service hours, we store the activity name, hours logged, date, location, description, and verification status.",
  },
  {
    title: "How We Use Your Information",
    body: "We use your data only to track and manage your volunteer/service hours, verify submissions through organizations or admins, generate your activity summaries and reports, and improve the Service Tracker platform.",
  },
  {
    title: "Who Can See Your Data",
    body: "Only authorized admins and the organizations you submit hours to can review your service-hour records. Other users cannot view your personal submissions. Public information on the leaderboard (such as your name and total hours) is only shown if you have opted in.",
  },
  {
    title: "Data Sharing",
    body: "We do not sell your personal data to third parties. Your information is used solely within Service Tracker for the purposes described above.",
  },
  {
    title: "Data Security",
    body: "Your data is stored on a secure backend with industry-standard authentication and access controls. Sensitive records are protected by row-level security so users can only access their own data.",
  },
  {
    title: "Your Choices",
    body: "You can update your profile information at any time from the Profile page, request deletion of your account by contacting an admin, and control whether your name appears on the public leaderboard.",
  },
  {
    title: "Contact Us",
    body: "If you have questions about this Privacy Policy or how your data is handled, please reach out through the Contact page.",
  },
];

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen flex flex-col">
      <Seo title="Privacy Policy — ACL Volunteer Tracker" description="How ACL Volunteer Tracker collects, uses, and protects your information." path="/privacy" />
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
              <ShieldCheck className="w-7 h-7 text-primary-foreground" />
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">Privacy Policy</h1>
            <p className="text-muted-foreground">
              Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </motion.div>

          <Card variant="elevated">
            <CardContent className="p-6 md:p-10 space-y-8">
              <p className="text-muted-foreground leading-relaxed">
                This Privacy Policy explains what information Service Tracker collects, how it is used, and the choices you have regarding your data.
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
