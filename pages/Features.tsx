import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Clock, 
  BarChart3, 
  Award, 
  Shield, 
  Users, 
  Calendar,
  FileCheck,
  TrendingUp,
  Target
} from "lucide-react";
import { Seo } from "@/components/Seo";

const features = [
  {
    icon: Clock,
    title: "Easy Hour Logging",
    description: "Log your volunteer hours in seconds with our intuitive interface. Simply enter the organization, date, hours, and a brief description. No complicated forms or confusing workflows.",
    highlight: "Save time with quick entries"
  },
  {
    icon: BarChart3,
    title: "Track Your Progress",
    description: "Visualize your community impact with detailed analytics and progress tracking. See your total hours, monthly trends, and how close you are to reaching your service goals.",
    highlight: "Real-time progress updates"
  },
  {
    icon: Award,
    title: "Earn Achievements",
    description: "Stay motivated with our gamified achievement system. Unlock badges for milestones like your first 10 hours, 50 hours, and beyond. Celebrate your dedication to service.",
    highlight: "25+ badges to unlock"
  },
  {
    icon: Shield,
    title: "Verified Hours",
    description: "Get your hours verified by organization administrators. Our verification system ensures accuracy and provides credible documentation for college applications and scholarships.",
    highlight: "Trusted by 500+ organizations"
  },
  {
    icon: Users,
    title: "Community Rankings",
    description: "See how you compare with peers in your school or community. Friendly competition motivates everyone to give back more and creates a culture of service.",
    highlight: "Connect with fellow volunteers"
  },
  {
    icon: Calendar,
    title: "Event Discovery",
    description: "Find volunteer opportunities near you. Browse upcoming events, sign up directly, and never miss a chance to make a difference in your community.",
    highlight: "New opportunities weekly"
  }
];

const benefits = [
  {
    icon: FileCheck,
    title: "College Ready",
    description: "Generate official reports for college applications and scholarship submissions."
  },
  {
    icon: TrendingUp,
    title: "Goal Setting",
    description: "Set personal service goals and track your progress toward achieving them."
  },
  {
    icon: Target,
    title: "Organization Tools",
    description: "Schools and organizations can manage volunteers and approve hours efficiently."
  }
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

export default function Features() {
  return (
    <div className="min-h-screen bg-background">
      <Seo title="Features — ACL Volunteer Tracker" description="Hour logging, verification, achievements, leaderboards, and analytics for student volunteers and organizations." path="/features" />
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
                Everything You Need to{" "}
                <span className="text-accent">Track Your Impact</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8">
                From logging hours to earning achievements, Service Tracker provides all the tools 
                students need to manage their volunteer journey and showcase their community contributions.
              </p>
              <Link to="/auth?mode=signup">
                <Button size="lg" className="text-lg px-8">
                  Start Tracking Free
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Main Features Grid */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <motion.div 
              className="text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
                Core Features
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Built specifically for students and volunteers who want to make tracking service hours simple and rewarding.
              </p>
            </motion.div>

            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {features.map((feature, index) => (
                <motion.div key={index} variants={itemVariants}>
                  <Card variant="feature" className="h-full hover:shadow-lg transition-shadow duration-300">
                    <CardContent className="p-6">
                      <div className="w-14 h-14 bg-accent/10 rounded-xl flex items-center justify-center mb-5">
                        <feature.icon className="w-7 h-7 text-accent" />
                      </div>
                      <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                        {feature.title}
                      </h3>
                      <p className="text-muted-foreground mb-4 leading-relaxed">
                        {feature.description}
                      </p>
                      <span className="inline-flex items-center text-sm font-medium text-accent">
                        {feature.highlight}
                      </span>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Benefits Section */}
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
                Why Choose Service Tracker?
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                More than just a logging tool—it's your complete volunteer management solution.
              </p>
            </motion.div>

            <motion.div 
              className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {benefits.map((benefit, index) => (
                <motion.div key={index} variants={itemVariants}>
                  <Card variant="elevated" className="text-center h-full">
                    <CardContent className="p-8">
                      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-5">
                        <benefit.icon className="w-8 h-8 text-primary" />
                      </div>
                      <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                        {benefit.title}
                      </h3>
                      <p className="text-muted-foreground">
                        {benefit.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-primary">
          <div className="container mx-auto px-4">
            <motion.div 
              className="max-w-3xl mx-auto text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-6">
                Ready to Start Tracking Your Impact?
              </h2>
              <p className="text-primary-foreground/80 text-lg mb-8">
                Join thousands of students already using Service Tracker to manage their volunteer hours and build their community service portfolio.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/auth?mode=signup">
                  <Button size="lg" variant="secondary" className="text-lg px-8">
                    Create Free Account
                  </Button>
                </Link>
                <Link to="/about">
                  <Button size="lg" variant="outline" className="text-lg px-8 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                    Learn More
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
