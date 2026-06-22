import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Heart, 
  Target, 
  Eye, 
  Users, 
  GraduationCap, 
  Building2,
  CheckCircle,
  Sparkles,
  ShieldCheck,
  UserCircle2,
  ClipboardList
} from "lucide-react";
import { Seo } from "@/components/Seo";

const accountTypes = [
  {
    icon: UserCircle2,
    title: "Student Account",
    tagline: "Log, track, and grow your impact",
    description:
      "Students use this account to log and track their volunteer hours. After completing an activity, they submit hours through the platform for verification.",
    points: [
      "Approved organizations can directly verify and approve submitted hours.",
      "If an organization isn't on the platform, we automatically email them an invitation to join.",
      "If an organization doesn't respond, students can upload proof of participation for admin review.",
      "Browse and join volunteering events listed on the platform.",
    ],
  },
  {
    icon: Building2,
    title: "Organization Account",
    tagline: "Manage and verify volunteer activity",
    description:
      "Organizations use this account to manage and verify volunteer activities tied to events they host.",
    points: [
      "Approved organizations verify and approve student-submitted hours for their events.",
      "Organizations may receive invitations to join when students submit hours associated with them.",
      "Once approved, organizations play a key role in validating volunteer participation.",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Administration Account",
    tagline: "Full oversight of the platform",
    description:
      "The administration account has full oversight and control of the platform's data, events, and verifications.",
    points: [
      "Review and approve student-submitted hours when organizations don't verify them.",
      "Create and publish volunteering opportunities visible to all students.",
      "Access all student data, including total volunteer hours and rankings.",
    ],
  },
];

const values = [
  {
    icon: Heart,
    title: "Our Mission",
    description: "To empower every student to track, celebrate, and grow their community impact. We believe service should be simple to log and meaningful to share."
  },
  {
    icon: Eye,
    title: "Our Vision",
    description: "A world where every volunteer hour is recognized, every act of service is valued, and every student has the tools to showcase their dedication to community."
  },
  {
    icon: Target,
    title: "Our Purpose",
    description: "Built by students who understood the frustration of paper logs and scattered records. We created Service Tracker to solve a real problem with an elegant solution."
  }
];

const audiences = [
  {
    icon: GraduationCap,
    title: "Students",
    description: "High school and college students tracking service hours for graduation requirements, scholarships, and college applications.",
    features: ["Easy mobile logging", "Achievement badges", "Exportable reports"]
  },
  {
    icon: Building2,
    title: "Organizations",
    description: "Schools, nonprofits, and community organizations managing volunteers and verifying service hours.",
    features: ["Volunteer management", "Hour verification", "Analytics dashboard"]
  },
  {
    icon: Users,
    title: "Communities",
    description: "Local communities connecting volunteers with opportunities and celebrating collective impact.",
    features: ["Event discovery", "Rankings", "Impact tracking"]
  }
];

const principles = [
  "Simplicity in every interaction",
  "Privacy and security first",
  "Accessible to all students",
  "Built for real-world needs",
  "Continuous improvement",
  "Community-driven development"
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5
    }
  }
};

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <Seo title="About — ACL Volunteer Tracker" description="Who we are and why we built ACL Volunteer Tracker for students and volunteer organizations." path="/about" />
      <Navbar />
      <main>
        {/* Hero Section */}
        <section className="relative py-20 md:py-28 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-background" />
          <div className="container mx-auto px-4 relative z-10">
            <motion.div 
              className="max-w-3xl mx-auto text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
                Making Service Hours{" "}
                <span className="text-accent">Simple</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground">
                We're on a mission to help every student track their volunteer journey, 
                celebrate their achievements, and share their community impact with the world.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Mission, Vision, Purpose */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-3 gap-8"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {values.map((value, index) => (
                <motion.div key={index} variants={itemVariants}>
                  <Card variant="elevated" className="h-full text-center">
                    <CardContent className="p-8">
                      <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <value.icon className="w-8 h-8 text-accent" />
                      </div>
                      <h3 className="font-display text-2xl font-bold text-foreground mb-4">
                        {value.title}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {value.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Who We Serve */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <motion.div 
              className="text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
                Who We Serve
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Service Tracker is designed for everyone involved in community service—from individual volunteers to large organizations.
              </p>
            </motion.div>

            <motion.div 
              className="grid grid-cols-1 md:grid-cols-3 gap-8"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {audiences.map((audience, index) => (
                <motion.div key={index} variants={itemVariants}>
                  <Card variant="feature" className="h-full">
                    <CardContent className="p-8">
                      <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-5">
                        <audience.icon className="w-7 h-7 text-primary" />
                      </div>
                      <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                        {audience.title}
                      </h3>
                      <p className="text-muted-foreground mb-5">
                        {audience.description}
                      </p>
                      <ul className="space-y-2">
                        {audience.features.map((feature, fIndex) => (
                          <li key={fIndex} className="flex items-center gap-2 text-sm text-foreground">
                            <CheckCircle className="w-4 h-4 text-accent flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Account Types */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-4">
                <ClipboardList className="w-4 h-4" />
                <span className="text-sm font-medium">Get to know the platform</span>
              </div>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
                Account Types
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Volunteer Tracker supports three types of accounts, each designed for a specific role in our community.
              </p>
            </motion.div>

            <motion.div
              className="grid grid-cols-1 md:grid-cols-3 gap-8"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {accountTypes.map((account, index) => (
                <motion.div key={index} variants={itemVariants}>
                  <Card variant="feature" className="h-full">
                    <CardContent className="p-8">
                      <div className="w-14 h-14 bg-accent/10 rounded-xl flex items-center justify-center mb-5">
                        <account.icon className="w-7 h-7 text-accent" />
                      </div>
                      <h3 className="font-display text-xl font-semibold text-foreground mb-1">
                        {account.title}
                      </h3>
                      <p className="text-sm text-accent font-medium mb-3">
                        {account.tagline}
                      </p>
                      <p className="text-muted-foreground mb-5">
                        {account.description}
                      </p>
                      <ul className="space-y-3">
                        {account.points.map((point, pIndex) => (
                          <li key={pIndex} className="flex items-start gap-2 text-sm text-foreground">
                            <CheckCircle className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Our Principles */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <motion.div 
                className="text-center mb-12"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-4 py-2 rounded-full mb-4">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-sm font-medium">What Guides Us</span>
                </div>
                <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
                  Our Principles
                </h2>
                <p className="text-muted-foreground text-lg">
                  The values that shape everything we build.
                </p>
              </motion.div>

              <motion.div 
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                {principles.map((principle, index) => (
                  <motion.div 
                    key={index} 
                    variants={itemVariants}
                    className="flex items-center gap-3 p-4 rounded-lg bg-muted/50"
                  >
                    <CheckCircle className="w-5 h-5 text-accent flex-shrink-0" />
                    <span className="text-foreground font-medium">{principle}</span>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <motion.div 
              className="max-w-3xl mx-auto text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
                Join Our Community
              </h2>
              <p className="text-muted-foreground text-lg mb-8">
                Ready to start tracking your volunteer journey? Join thousands of students making a difference.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/auth?mode=signup">
                  <Button size="lg" className="text-lg px-8">
                    Get Started Free
                  </Button>
                </Link>
                <Link to="/contact">
                  <Button size="lg" variant="outline" className="text-lg px-8">
                    Contact Us
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
