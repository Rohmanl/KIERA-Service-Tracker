import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Clock, BarChart3, Trophy, Shield, Users } from "lucide-react";

const features = [
  {
    icon: Clock,
    title: "Easy Hour Logging",
    description: "Log your volunteer hours in seconds with our intuitive interface. Upload proof and get verified quickly.",
  },
  {
    icon: BarChart3,
    title: "Track Your Progress",
    description: "Beautiful analytics dashboards to visualize your impact and track progress toward your goals.",
  },
  {
    icon: Trophy,
    title: "Earn Achievements",
    description: "Gamified experience with badges and milestones. Celebrate your volunteer journey!",
  },
  {
    icon: Shield,
    title: "Verified Hours",
    description: "All hours are verified by organizations, ensuring authentic service records for applications.",
  },
  {
    icon: Users,
    title: "Community Rankings",
    description: "See how you rank among peers and get inspired by top volunteers in your community.",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 bg-secondary/50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-accent font-semibold text-sm uppercase tracking-wider">Features</span>
          <h2 className="font-display text-4xl md:text-5xl font-black mt-2 mb-4">
            WHY USE SERVICE TRACKER?
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Everything you need to manage your volunteer journey, all in one place.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature, index) => (
            <motion.div key={index} variants={itemVariants}>
              <Card variant="feature" className="h-full">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-accent" />
                  </div>
                  <h3 className="font-display text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
