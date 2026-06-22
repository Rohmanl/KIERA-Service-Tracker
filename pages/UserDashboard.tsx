import { useState, useEffect, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { format } from "date-fns";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { AchievementBadges } from "@/components/dashboard/AchievementBadges";
import { HourSubmissionForm } from "@/components/dashboard/HourSubmissionForm";
import { AchievementPopup } from "@/components/dashboard/AchievementPopup";
import { Clock, Target, Calendar, Trophy, AlertCircle, HelpCircle } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAchievements, AchievementWithProgress } from "@/hooks/useAchievements";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { resetTour } from "@/components/dashboard/ProductTour";
import { fetchUserAdjustmentDelta } from "@/lib/hoursAdjustments";

interface ActivityItem {
  id: string;
  organization: string;
  hours: number;
  date: string;
  status: "pending" | "approved" | "denied";
  source?: "external" | "platform";
  verified_by_org?: string | null;
  organization_id?: string | null;
}

interface UserDashboardProps {
  user: User;
}

export default function UserDashboard({ user }: UserDashboardProps) {
  const navigate = useNavigate();
  const userName = user?.user_metadata?.name || user?.email?.split("@")[0] || "Volunteer";
  
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [stats, setStats] = useState({ totalHours: 0, volunteerTimes: 0, yearlyGoal: 150 });
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const [rejectedClaims, setRejectedClaims] = useState<{ event_title: string; event_id: string }[]>([]);
  const { achievements, earnedCount, refresh: refreshAchievements, newlyEarned, clearNewlyEarned } = useAchievements(user.id);

  const fetchActivities = useCallback(async () => {
    // Fetch activities
    const { data, error } = await supabase
      .from("volunteer_hours")
      .select("id, organization, hours, date, status, source, verified_by_org, organization_id")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(10);

    // Dynamically calculate total hours from approved records (source of truth)
    const { data: approvedData } = await supabase
      .from("volunteer_hours")
      .select("hours")
      .eq("user_id", user.id)
      .eq("status", "approved");

    // Fetch yearly_goal from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("yearly_goal")
      .eq("id", user.id)
      .single();

    const adjustmentDelta = await fetchUserAdjustmentDelta(user.id);
    const dynamicTotalHours = Math.max(
      0,
      (approvedData?.reduce((sum, r) => sum + Number(r.hours), 0) ?? 0) + adjustmentDelta
    );

    if (!error && data) {
      const formattedActivities: ActivityItem[] = data.map((item: any) => ({
        id: item.id,
        organization: item.organization,
        hours: Number(item.hours),
        date: format(new Date(item.date), "MMM d, yyyy"),
        status: item.status as "pending" | "approved" | "denied",
        source: item.source || "external",
        verified_by_org: item.verified_by_org || null,
        organization_id: item.organization_id || null,
      }));
      setActivities(formattedActivities);

      setStats({
        totalHours: dynamicTotalHours,
        volunteerTimes: data.length,
        yearlyGoal: Number(profile?.yearly_goal ?? 150),
      });
    }
  }, [user.id]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  useEffect(() => {
    const checkProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("school, grade")
        .eq("id", user.id)
        .single();
      if (data && (!data.school || !data.grade)) {
        setProfileIncomplete(true);
      }
    };
    checkProfile();
  }, [user.id]);

  // Check for rejected hour claims
  useEffect(() => {
    const fetchRejected = async () => {
      const { data: signups } = await supabase
        .from("event_signups")
        .select("event_id, verification_status")
        .eq("user_id", user.id)
        .eq("verification_status", "rejected") as any;

      if (!signups || signups.length === 0) {
        setRejectedClaims([]);
        return;
      }

      const eventIds = signups.map((s: any) => s.event_id);
      const { data: events } = await supabase
        .from("events")
        .select("id, title")
        .in("id", eventIds);

      setRejectedClaims(
        (events || []).map((e) => ({ event_title: e.title, event_id: e.id }))
      );
    };
    fetchRejected();
  }, [user.id]);

  const handleFormSuccess = () => {
    fetchActivities();
    refreshAchievements();
  };

  const goalProgress = Math.min(Math.round((stats.totalHours / stats.yearlyGoal) * 100), 100);

  // Map achievements to badge format for the sidebar widget
  const badgeData = achievements.slice(0, 5).map((a) => ({
    id: a.id,
    name: a.title,
    icon: a.code.toLowerCase().includes("hero") ? "trophy" :
          a.code.toLowerCase().includes("team") ? "users" :
          a.code.toLowerCase().includes("weekend") ? "zap" :
          a.code.toLowerCase().includes("community") || a.code.toLowerCase().includes("leader") ? "heart" :
          a.code.toLowerCase().includes("first") ? "star" : "award",
    earned: a.earned,
    description: a.description,
  }));

  const restartTour = () => {
    resetTour(user.id);
  };

    return (
    <>
      <AchievementPopup
        open={newlyEarned.length > 0}
        onClose={clearNewlyEarned}
        title={newlyEarned[0]?.title ?? ""}
        description={newlyEarned[0]?.description ?? ""}
      />

      {rejectedClaims.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <Alert className="border-destructive/50 bg-destructive/5">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <AlertTitle className="text-destructive">Hours Rejected</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>
                Your hour claim{rejectedClaims.length > 1 ? "s" : ""} for{" "}
                <strong>{rejectedClaims.map((c) => c.event_title).join(", ")}</strong>{" "}
                {rejectedClaims.length > 1 ? "were" : "was"} not verified. You can resubmit from the Explore page.
              </span>
              <Button variant="outline" size="sm" onClick={() => navigate("/explore")} className="ml-4 shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10">
                Resubmit
              </Button>
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      {profileIncomplete && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <Alert className="border-accent/50 bg-accent/10">
            <AlertCircle className="h-4 w-4 text-accent" />
            <AlertTitle>Complete Your Profile</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>Please add your school and grade to your profile so admins can see your info.</span>
              <Button variant="accent" size="sm" onClick={() => navigate("/profile")} className="ml-4 shrink-0">
                Update Profile
              </Button>
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      <motion.div data-tour="dashboard-area" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
          Welcome back, <span className="text-accent">{userName}</span>!
        </h1>
        <p className="text-muted-foreground">Here's an overview of your volunteer journey.</p>
      </motion.div>

      <div data-tour="stats-cards" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard title="Total Hours" value={stats.totalHours.toString()} subtitle="Verified hours" icon={Clock} variant="accent" />
        <StatsCard title="Goal Progress" value={`${goalProgress}%`} subtitle={`${stats.yearlyGoal} hours goal`} icon={Target} variant="accent" />
        <StatsCard title="Volunteer Times" value={stats.volunteerTimes.toString()} subtitle="Total submissions" icon={Calendar} variant="accent" />
        <StatsCard title="Achievements" value={earnedCount.toString()} subtitle="Badges earned" icon={Trophy} variant="accent" />
      </div>

      <motion.div data-tour="hour-submission" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-8">
        <HourSubmissionForm userId={user.id} onSuccess={handleFormSuccess} />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div data-tour="recent-activity">
            <RecentActivity activities={activities} />
          </div>
        </div>
        <div className="space-y-6">
          <div data-tour="quick-actions">
            <QuickActions />
          </div>
          <div data-tour="achievement-badges">
            <AchievementBadges badges={badgeData} />
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex justify-center mt-10 mb-4"
      >
        <Button
          variant="outline"
          size="sm"
          onClick={restartTour}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <HelpCircle className="w-4 h-4" />
          Help / Tutorial
        </Button>
      </motion.div>
    </>
  );
}
