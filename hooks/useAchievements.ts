import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AchievementDef {
  id: string;
  code: string;
  title: string;
  description: string;
  rule_type: string;
  target: number;
  is_active: boolean;
  category?: string;
}

interface VolunteerEntry {
  hours: number;
  date: string;
  organization: string;
  description: string | null;
  status: string;
  created_at: string;
}

export interface AchievementWithProgress {
  id: string;
  code: string;
  title: string;
  description: string;
  rule_type: string;
  target: number;
  category: string;
  earned: boolean;
  earned_at?: string;
  progress: number;
}

function calculateConsecutiveWeeks(dates: string[]): number {
  if (dates.length === 0) return 0;
  const weekNumbers = dates.map((date) => {
    const d = new Date(date);
    const startOfYear = new Date(d.getFullYear(), 0, 1);
    const days = Math.floor((d.getTime() - startOfYear.getTime()) / (86400000));
    return d.getFullYear() * 100 + Math.ceil((days + startOfYear.getDay() + 1) / 7);
  });
  const unique = [...new Set(weekNumbers)].sort((a, b) => b - a);
  let streak = 1, max = 1;
  for (let i = 1; i < unique.length; i++) {
    if (unique[i - 1] - unique[i] === 1) {
      streak++;
      max = Math.max(max, streak);
    } else {
      streak = 1;
    }
  }
  return max;
}

function calculateConsecutiveMonths(dates: string[]): number {
  if (dates.length === 0) return 0;
  const months = dates.map((date) => {
    const d = new Date(date);
    return d.getFullYear() * 12 + d.getMonth();
  });
  const unique = [...new Set(months)].sort((a, b) => b - a);
  let streak = 1, max = 1;
  for (let i = 1; i < unique.length; i++) {
    if (unique[i - 1] - unique[i] === 1) {
      streak++;
      max = Math.max(max, streak);
    } else {
      streak = 1;
    }
  }
  return max;
}

function isHolidayDate(dateStr: string): boolean {
  const d = new Date(dateStr);
  const m = d.getMonth(); // 0-indexed
  const day = d.getDate();
  // Summer break: Jun, Jul, Aug
  if (m === 5 || m === 6 || m === 7) return true;
  // Winter break: Dec 18 - Jan 5
  if (m === 11 && day >= 18) return true;
  if (m === 0 && day <= 5) return true;
  // Spring break (rough): late March
  if (m === 2 && day >= 20) return true;
  return false;
}

const KEYWORDS: Record<string, string[]> = {
  keyword_mentor: ["mentor", "tutor", "teach", "tutoring", "mentoring", "teaching"],
  keyword_event: ["event", "festival", "fundraiser", "fair", "ceremony", "concert"],
  keyword_campus: ["school", "campus", "classroom", "library", "student"],
  keyword_local: ["community", "neighborhood", "local", "shelter", "food bank", "park", "clean"],
};

function matchesKeyword(ruleType: string, entries: VolunteerEntry[]): boolean {
  const words = KEYWORDS[ruleType];
  if (!words) return false;
  return entries.some((e) => {
    const text = `${e.organization ?? ""} ${e.description ?? ""}`.toLowerCase();
    return words.some((w) => text.includes(w));
  });
}

interface Stats {
  totalHours: number;
  distinctActivities: number;
  weekendCount: number;
  streakWeeks: number;
  maxSingleActivity: number;
  submissionCount: number;
  monthsLogged: number;
  monthlyStreak: number;
  hasEarlyBird: boolean;
  hasNightOwl: boolean;
  hasHoliday: boolean;
  yearlyGoal: number;
  entries: VolunteerEntry[];
}

function evaluateRule(ruleType: string, target: number, stats: Stats): { earned: boolean; progress: number } {
  let current = 0;
  let earned = false;

  switch (ruleType) {
    case "total_hours":
    case "goal_complete":
      current = stats.totalHours;
      break;
    case "distinct_activities":
      current = stats.distinctActivities;
      break;
    case "weekends_count":
      current = stats.weekendCount;
      break;
    case "streak_weeks":
      current = stats.streakWeeks;
      break;
    case "single_activity_hours":
      current = stats.maxSingleActivity;
      break;
    case "submission_count":
      current = stats.submissionCount;
      break;
    case "months_logged":
      current = stats.monthsLogged;
      break;
    case "monthly_streak":
      current = stats.monthlyStreak;
      break;
    case "goal_percent": {
      const pct = stats.yearlyGoal > 0 ? (stats.totalHours / stats.yearlyGoal) * 100 : 0;
      current = pct;
      break;
    }
    case "early_bird":
      earned = stats.hasEarlyBird;
      current = earned ? 1 : 0;
      break;
    case "night_owl":
      earned = stats.hasNightOwl;
      current = earned ? 1 : 0;
      break;
    case "holiday_helper":
      earned = stats.hasHoliday;
      current = earned ? 1 : 0;
      break;
    case "keyword_mentor":
    case "keyword_event":
    case "keyword_campus":
    case "keyword_local":
      earned = matchesKeyword(ruleType, stats.entries);
      current = earned ? 1 : 0;
      break;
    default:
      current = 0;
  }

  if (!earned) earned = current >= target;
  const progress = earned ? 100 : Math.min(Math.round((current / target) * 100), 99);
  return { earned, progress };
}

const trackedAchievementIds = new Set<string>();

export function useAchievements(userId: string | undefined) {
  const [achievements, setAchievements] = useState<AchievementWithProgress[]>([]);
  const [earnedCount, setEarnedCount] = useState(0);
  const [newlyEarned, setNewlyEarned] = useState<AchievementWithProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) return;

    try {
      const [defsRes, entriesRes, earnedRes, profileRes] = await Promise.all([
        supabase.from("achievements").select("*").eq("is_active", true),
        supabase
          .from("volunteer_hours")
          .select("hours, date, organization, description, status, created_at")
          .eq("user_id", userId)
          .eq("status", "approved"),
        supabase.from("user_achievements").select("achievement_id, earned_at").eq("user_id", userId),
        supabase.from("profiles").select("yearly_goal").eq("id", userId).single(),
      ]);

      const defs: AchievementDef[] = (defsRes.data || []) as AchievementDef[];
      const entries: VolunteerEntry[] = (entriesRes.data || []) as VolunteerEntry[];
      const earnedMap = new Map<string, string>();
      (earnedRes.data || []).forEach((e: any) => earnedMap.set(e.achievement_id, e.earned_at));
      const yearlyGoal = Number(profileRes.data?.yearly_goal ?? 150);

      const totalHours = entries.reduce((s, e) => s + Number(e.hours), 0);
      const orgSet = new Set(entries.map((e) => e.organization));
      const distinctActivities = orgSet.size;
      const weekendDates = new Set<string>();
      entries.forEach((e) => {
        const day = new Date(e.date).getDay();
        if (day === 0 || day === 6) weekendDates.add(e.date);
      });
      const weekendCount = weekendDates.size;
      const streakWeeks = calculateConsecutiveWeeks(entries.map((e) => e.date));
      const monthsLogged = new Set(
        entries.map((e) => {
          const d = new Date(e.date);
          return `${d.getFullYear()}-${d.getMonth()}`;
        })
      ).size;
      const monthlyStreak = calculateConsecutiveMonths(entries.map((e) => e.date));
      const hoursByOrg: Record<string, number> = {};
      entries.forEach((e) => {
        hoursByOrg[e.organization] = (hoursByOrg[e.organization] || 0) + Number(e.hours);
      });
      const maxSingleActivity = Math.max(0, ...Object.values(hoursByOrg));

      const hasEarlyBird = entries.some((e) => {
        if (!e.created_at) return false;
        return new Date(e.created_at).getHours() < 9;
      });
      const hasNightOwl = entries.some((e) => {
        if (!e.created_at) return false;
        return new Date(e.created_at).getHours() >= 20;
      });
      const hasHoliday = entries.some((e) => isHolidayDate(e.date));

      const stats: Stats = {
        totalHours,
        distinctActivities,
        weekendCount,
        streakWeeks,
        maxSingleActivity,
        submissionCount: entries.length,
        monthsLogged,
        monthlyStreak,
        hasEarlyBird,
        hasNightOwl,
        hasHoliday,
        yearlyGoal,
        entries,
      };

      const newlyEarnedList: { achievement_id: string }[] = [];
      const result: AchievementWithProgress[] = defs.map((def) => {
        const { earned, progress } = evaluateRule(def.rule_type, Number(def.target), stats);
        const alreadyEarned = earnedMap.has(def.id);

        if (earned && !alreadyEarned) {
          newlyEarnedList.push({ achievement_id: def.id });
        }

        return {
          id: def.id,
          code: def.code,
          title: def.title,
          description: def.description,
          rule_type: def.rule_type,
          target: Number(def.target),
          category: def.category || "special",
          earned: earned || alreadyEarned,
          earned_at: earnedMap.get(def.id),
          progress,
        };
      });

      const justEarned: AchievementWithProgress[] = [];
      if (newlyEarnedList.length > 0) {
        const rows = newlyEarnedList.map((a) => ({ user_id: userId, achievement_id: a.achievement_id }));
        const { error } = await supabase.from("user_achievements").insert(rows);
        if (error) {
          console.error("Failed to persist achievements:", error instanceof Error ? error.message : "Unknown error");
        } else {
          const now = new Date().toISOString();
          result.forEach((r) => {
            if (newlyEarnedList.some((n) => n.achievement_id === r.id) && !r.earned_at) {
              r.earned_at = now;
              justEarned.push(r);
            }
          });
          if (typeof pendo !== 'undefined') {
            justEarned.forEach((a) => {
              if (!trackedAchievementIds.has(a.id)) {
                trackedAchievementIds.add(a.id);
                pendo.track("achievement_earned", {
                  achievement_code: a.code,
                  achievement_title: a.title,
                  achievement_category: a.category,
                  total_earned_count: result.filter((r) => r.earned).length,
                });
              }
            });
          }
        }
      }

      setAchievements(result);
      setEarnedCount(result.filter((a) => a.earned).length);
      if (justEarned.length > 0) {
        setNewlyEarned((prev) => [...prev, ...justEarned]);
      }
    } catch (err) {
      console.error("useAchievements error:", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const clearNewlyEarned = useCallback(() => {
    setNewlyEarned((prev) => prev.slice(1));
  }, []);

  return { achievements, earnedCount, isLoading, refresh, newlyEarned, clearNewlyEarned };
}
