import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, Star, Trophy, Zap, Heart, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

interface Badge {
  id: string;
  name: string;
  icon: string;
  earned: boolean;
  description: string;
}

interface AchievementBadgesProps {
  badges: Badge[];
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  star: Star,
  trophy: Trophy,
  zap: Zap,
  heart: Heart,
  users: Users,
  award: Award,
};

export function AchievementBadges({ badges }: AchievementBadgesProps) {
  return (
    <Card variant="elevated">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Award className="w-5 h-5" />
          Achievements
        </CardTitle>
        <Link to="/achievements">
          <Button variant="ghost" size="sm">
            View All
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {badges.map((badge, index) => {
            const IconComponent = iconMap[badge.icon] || Award;
            return (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className={`flex-shrink-0 w-20 text-center ${!badge.earned && "opacity-40"}`}
              >
                <div
                  className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-2 ${
                    badge.earned
                      ? "bg-gradient-to-br from-accent to-accent/70 text-accent-foreground"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  <IconComponent className="w-8 h-8" />
                </div>
                <p className="text-xs font-medium truncate">{badge.name}</p>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
