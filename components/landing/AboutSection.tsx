import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

const benefits = [
  "Designed specifically for high school and college students",
  "Easy-to-use mobile-friendly interface",
  "Verified hours for college applications",
  "Connect with organizations in your community",
  "Track progress toward graduation requirements",
  "Export reports for scholarships and resumes",
];

export function AboutSection() {
  return (
    <section id="about" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-accent font-semibold text-sm uppercase tracking-wider">For Students</span>
            <h2 className="font-display text-4xl md:text-5xl font-black mt-2 mb-6">
              DESIGNED FOR
              <br />
              <span className="text-accent">STUDENTS</span>
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              We built Service Tracker with students in mind. Whether you're completing 
              graduation requirements, applying to colleges, or simply want to give back 
              to your community, we've got you covered.
            </p>
            
            <ul className="space-y-4">
              {benefits.map((benefit, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                  <span className="text-foreground">{benefit}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="bg-gradient-to-br from-accent/20 to-success/20 rounded-3xl p-8 lg:p-12">
              <div className="bg-card rounded-2xl shadow-card p-6 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-display font-bold text-lg">Your Impact</span>
                  <span className="text-accent font-bold">This Month</span>
                </div>
                <div className="text-5xl font-display font-black text-foreground mb-2">127</div>
                <div className="text-muted-foreground">Hours of service</div>
                <div className="mt-4 h-2 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: "85%" }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="h-full bg-accent rounded-full"
                  />
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  85% toward your 150-hour goal
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-card rounded-xl shadow-card p-4">
                  <div className="text-2xl font-display font-bold">23</div>
                  <div className="text-sm text-muted-foreground">Events attended</div>
                </div>
                <div className="bg-card rounded-xl shadow-card p-4">
                  <div className="text-2xl font-display font-bold">8</div>
                  <div className="text-sm text-muted-foreground">Badges earned</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
