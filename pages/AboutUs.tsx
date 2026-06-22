import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Users, Heart } from "lucide-react";
import { Seo } from "@/components/Seo";

const teamMembers = ["Karen", "Isabel", "Evelyn", "Rohman", "Ahmet", "Mr. Fawcett"];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function AboutUs() {
  return (
    <div className="min-h-screen bg-background">
      <Seo title="About Us — ACL Volunteer Tracker" description="Meet the team behind ACL Volunteer Tracker." path="/about-us" />
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
                About <span className="text-accent">Us</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground">
                Meet the team behind Service Tracker and learn why we built this platform.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Description Section */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <motion.div
              className="max-w-4xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Card variant="elevated">
                <CardContent className="p-8 md:p-12">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center">
                      <Heart className="w-6 h-6 text-accent" />
                    </div>
                    <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                      Our Story
                    </h2>
                  </div>
                  <p className="text-muted-foreground leading-relaxed text-lg mb-6">
                    We created this platform to make it easier for students to track and manage their volunteer hours. Many students participate in community service but struggle to keep organized records of their activities. Our goal is to provide a simple and reliable system where users can log their hours, monitor their progress, and keep a clear record of their contributions.
                  </p>
                  <p className="text-muted-foreground leading-relaxed text-lg">
                    We believe that community service is an important part of personal growth and community development. By making volunteer tracking easier and more organized, we hope to encourage more students to stay involved and continue making a positive impact.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>

        {/* Team Section */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-4 py-2 rounded-full mb-4">
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium">The People Behind It</span>
              </div>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
                Our Team
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                A dedicated group of individuals committed to making volunteer tracking simple and accessible.
              </p>
            </motion.div>

            <motion.div
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6 max-w-4xl mx-auto"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {teamMembers.map((name, index) => (
                <motion.div key={name} variants={itemVariants}>
                  <Card variant="elevated" className="text-center hover:border-accent/30 transition-colors">
                    <CardContent className="p-6">
                      <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="font-display text-2xl font-bold text-accent">
                          {name[0]}
                        </span>
                      </div>
                      <h3 className="font-display text-lg font-semibold text-foreground">
                        {name}
                      </h3>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
