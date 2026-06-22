import { useState, useEffect, useMemo } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Award, Star, Trophy, Zap, Heart, Users, Clock, Target, Flame,
  Compass, Network, Sparkles, Sunrise, Moon, PartyPopper,
  ClipboardList, FileCheck, FilePlus, Files, Layers,
  GraduationCap, CalendarDays, MapPin, CalendarRange, Repeat,
} from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { performLogout } from "@/lib/logout";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useAchievements } from "@/hooks/useAchievements";
import { format } from "date-fns";
import { useUserRole } from "@/hooks/useUserRole";
import { User } from "@supabase/supabase-js";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  // Hours
  FIRST_STEPS: Star,
  HOURS_5: Star,
  "10_HOUR_HERO": Clock,
  HOURS_25: Clock,
  "50_HOUR_CHAMPION": Trophy,
  HOURS_75: Trophy,
  "100_HOUR_LEGEND": Award,
  COMMUNITY_LEADER: Heart,
  HOURS_200: Sparkles,
  HOURS_500: Trophy,
  // Activities
  EXPLORER: Compass,
  TEAM_PLAYER: Users,
  COMMUNITY_CONNECTOR: Network,
  ALL_ROUND_VOLUNTEER: Layers,
  FOCUSED_HELPER: Target,
  DEDICATED_VOLUNTEER: Flame,
  CHOSEN_VOLUNTEER: Award,
  ACTIVITY_SPECIALIST: Sparkles,
  // Consistency
  CONSISTENCY_KING: Flame,
  MONTHLY_VOLUNTEER: CalendarDays,
  THREE_MONTH_STREAK: Repeat,
  SEMESTER_STREAK: CalendarRange,
  // Special
  WEEKEND_WARRIOR: Zap,
  EARLY_BIRD: Sunrise,
  NIGHT_OWL: Moon,
  HOLIDAY_HELPER: PartyPopper,
  MENTOR_BADGE: GraduationCap,
  EVENT_SUPPORTER: CalendarDays,
  CAMPUS_HELPER: GraduationCap,
  LOCAL_IMPACT: MapPin,
  // Submissions
  FIRST_SUBMISSION: FilePlus,
  FREQUENT_LOGGER: ClipboardList,
  RECORD_KEEPER: Files,
  SUPER_SUBMITTER: FileCheck,
  // Goals
  GOAL_STARTER: Target,
  HALFWAY_THERE: Target,
  ALMOST_THERE: Target,
  GOAL_CRUSHER: Trophy,
  OVERACHIEVER: Sparkles,
};

const CATEGORIES: { id: string; label: string }[] = [
  { id: "all", label: "All" },
  { id: "hours", label: "Hours" },
  { id: "activities", label: "Activities" },
  { id: "consistency", label: "Consistency" },
  { id: "submissions", label: "Submissions" },
  { id: "goals", label: "Goals" },
  { id: "special", label: "Special" },
];

export default function Achievements() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string>();
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const { isAdmin, isLoading: isRoleLoading } = useUserRole(authUser);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { navigate("/auth"); return; }
      setUserId(user.id);
      setAuthUser(user);
    });
  }, [navigate]);

  useEffect(() => {
    if (!isRoleLoading && isAdmin) {
      navigate("/dashboard", { replace: true });
    }
  }, [isRoleLoading, isAdmin, navigate]);

  const { achievements, earnedCount, isLoading } = useAchievements(userId);

  const handleLogout = async () => {
    await performLogout("/");
  };

  const filtered = useMemo(() => {
    if (activeCategory === "all") return achievements;
    return achievements.filter((a) => a.category === activeCategory);
  }, [achievements, activeCategory]);

  if (isRoleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent" />
      </div>
    );
  }

  if (isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar isAuthenticated={true} onLogout={handleLogout} isAdmin={isAdmin} isRoleLoading={isRoleLoading} />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">Achievements</h1>
          {isLoading ? (
            <Skeleton className="h-6 w-64" />
          ) : (
            <p className="text-muted-foreground">You've earned {earnedCount} of {achievements.length} badges!</p>
          )}
        </motion.div>

        {!isLoading && (
          <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mb-6">
            <TabsList className="flex flex-wrap h-auto gap-1 bg-secondary/50 p-1">
              {CATEGORIES.map((c) => {
                const count =
                  c.id === "all"
                    ? achievements.length
                    : achievements.filter((a) => a.category === c.id).length;
                return (
                  <TabsTrigger key={c.id} value={c.id} className="gap-2">
                    {c.label}
                    <span className="text-xs opacity-60">({count})</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(9)].map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((achievement, index) => {
              const IconComponent = iconMap[achievement.code] || Award;
              return (
                <motion.div key={achievement.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.03, 0.4) }}>
                  <Card variant="feature" className={`h-full ${!achievement.earned && "opacity-60"}`}>
                    <CardContent className="p-6 text-center">
                      <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${achievement.earned ? "bg-gradient-to-br from-accent to-accent/70 text-accent-foreground" : "bg-secondary text-muted-foreground"}`}>
                        <IconComponent className="w-10 h-10" />
                      </div>
                      <h3 className="font-display text-lg font-bold mb-1">{achievement.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{achievement.description}</p>
                      {achievement.earned ? (
                        <p className="text-xs text-success font-medium">
                          Earned {achievement.earned_at ? format(new Date(achievement.earned_at), "MMM d, yyyy") : ""}
                        </p>
                      ) : (
                        <div>
                          <div className="h-2 bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${achievement.progress}%` }} />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{achievement.progress}% complete</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
