import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-primary via-primary/95 to-primary/90">
        {/* Floating Decorative Blobs */}
        <motion.div
          className="absolute top-20 right-[20%] w-72 h-72 rounded-full bg-accent/20 blur-3xl"
          animate={{
            y: [0, -30, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-32 left-[10%] w-96 h-96 rounded-full bg-accent/15 blur-3xl"
          animate={{
            y: [0, 20, 0],
            scale: [1, 0.95, 1],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
        <motion.div
          className="absolute top-1/2 right-[5%] w-64 h-64 rounded-full bg-accent/10 blur-2xl"
          animate={{
            x: [0, 20, 0],
            y: [0, -15, 0],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
        <motion.div
          className="absolute top-[15%] left-[30%] w-48 h-48 rounded-full bg-white/5 blur-2xl"
          animate={{
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 pt-20 pb-12 relative z-10">
        <div className="max-w-6xl mx-auto text-center">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="text-3xl md:text-5xl lg:text-6xl text-primary-foreground/90 mb-8 font-display font-medium"
          >
            The volunteer tracker that makes volunteering easy.
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display font-black text-primary-foreground mb-10 leading-[0.95] text-6xl md:text-8xl lg:text-9xl"
          >
            <span className="text-accent">Volunteer</span> Tracker{" "}
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link to="/auth?mode=signup">
              <Button variant="hero" size="xl" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                Start your volunteer journey today for free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
