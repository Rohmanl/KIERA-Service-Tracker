import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { LifeBuoy, UserPlus, ClipboardList, BarChart3, ShieldCheck, Mail, AlertTriangle } from "lucide-react";
import { Seo } from "@/components/Seo";

const sections = [
  {
    icon: UserPlus,
    title: "Creating an Account & Signing In",
    items: [
      { q: "How do I create an account?", a: "Click 'Sign Up' on the homepage, choose Student/Volunteer, and fill in your name, school, grade, email, and password. You'll get a verification email — click the link to activate your account." },
      { q: "How do I sign in?", a: "Click 'Sign In' and enter the email and password you signed up with. If you forgot your password, use the 'Forgot password?' link." },
    ],
  },
  {
    icon: ClipboardList,
    title: "Submitting Service Hours",
    items: [
      { q: "How do I submit hours?", a: "Go to your Dashboard and use the 'Submit Hours' form. Enter the organization name, date, hours, and a short description of what you did." },
      { q: "Do I need proof?", a: "If the organization is on Service Tracker, they can verify directly. Otherwise, you may be asked to upload proof so an admin can review your submission." },
    ],
  },
  {
    icon: BarChart3,
    title: "Viewing Your Hours & Activity",
    items: [
      { q: "Where do I see my total hours?", a: "Your Dashboard shows your total approved hours, recent activity, and progress toward your yearly goal." },
      { q: "Can I see a breakdown by activity?", a: "Yes — visit the Analytics page to see charts and summaries of your volunteer work over time." },
    ],
  },
  {
    icon: ShieldCheck,
    title: "Pending vs. Verified Hours",
    items: [
      { q: "What does 'Pending' mean?", a: "Pending hours have been submitted but not yet reviewed by an organization or admin. They don't count toward your total yet." },
      { q: "What does 'Verified' (Approved) mean?", a: "Verified hours have been approved by the organization or an admin and count toward your total hours and achievements." },
      { q: "What if my hours are rejected?", a: "You'll see a notification on your Dashboard. You can resubmit with corrected information or additional proof." },
    ],
  },
  {
    icon: Mail,
    title: "Contacting an Admin",
    items: [
      { q: "How do I report a mistake?", a: "Use the Contact page to send us a message. Include your name, email, and a description of the issue (e.g., 'My hours show the wrong date')." },
    ],
  },
  {
    icon: AlertTriangle,
    title: "Troubleshooting Common Issues",
    items: [
      { q: "I can't log in.", a: "Make sure your email is spelled correctly and your password meets the requirements. Try resetting your password if you're stuck." },
      { q: "My hours are missing.", a: "Check the Dashboard — they may still be pending. If approved hours don't appear, contact an admin via the Contact page." },
      { q: "I submitted the wrong information.", a: "Contact an admin to correct or remove the entry. Include the activity name and date." },
    ],
  },
];

export default function HelpCenter() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: sections.flatMap((s) =>
      s.items.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      }))
    ),
  };

  return (
    <div className="min-h-screen flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <Seo title="Help Center — ACL Volunteer Tracker" description="Answers to common questions about logging hours, verification, and using ACL Volunteer Tracker." path="/help" />
      <Navbar />
      <main className="flex-1 bg-gradient-to-br from-secondary/50 to-background py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <div className="mx-auto w-14 h-14 bg-primary rounded-xl flex items-center justify-center mb-4">
              <LifeBuoy className="w-7 h-7 text-primary-foreground" />
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">Help Center</h1>
            <p className="text-muted-foreground text-lg">
              Answers to common questions about using Service Tracker.
            </p>
          </motion.div>

          <div className="space-y-6">
            {sections.map((section, i) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
              >
                <Card variant="elevated">
                  <CardContent className="p-6 md:p-8">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <section.icon className="w-5 h-5 text-primary" />
                      </div>
                      <h2 className="font-display text-2xl font-semibold">{section.title}</h2>
                    </div>
                    <div className="space-y-4">
                      {section.items.map((item) => (
                        <div key={item.q}>
                          <h3 className="font-semibold mb-1">{item.q}</h3>
                          <p className="text-muted-foreground text-sm leading-relaxed">{item.a}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
