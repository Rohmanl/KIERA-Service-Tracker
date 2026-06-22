import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Trophy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

interface AchievementPopupProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
}

export function AchievementPopup({ open, onClose, title, description }: AchievementPopupProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm text-center p-8">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", duration: 0.6 }}
              className="flex flex-col items-center gap-4"
            >
              <motion.div
                initial={{ rotate: -20, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: "spring", delay: 0.2, duration: 0.5 }}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center"
              >
                <Trophy className="w-10 h-10 text-accent-foreground" />
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.35 }}
              >
                <p className="text-sm font-medium text-accent uppercase tracking-wider mb-1">
                  Achievement Unlocked!
                </p>
                <h2 className="font-display text-2xl font-bold mb-2">{title}</h2>
                <p className="text-sm text-muted-foreground">{description}</p>
              </motion.div>

              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <Button onClick={onClose} variant="accent" className="mt-2">
                  Congratulations!
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
