import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { TrendingUp, Target, Flame, Calendar, Clock, Award, ArrowUp, ArrowDown, Loader2, Trophy, CheckCircle2, Download, ScrollText } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAchievements } from "@/hooks/useAchievements";
import { format, subMonths, startOfMonth, endOfMonth, getDay, startOfWeek, endOfWeek, differenceInWeeks, differenceInMonths, addMonths } from "date-fns";
import { User } from "@supabase/supabase-js";
import { Link } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface VolunteerHour {
  id: string;
  organization: string;
  hours: number;
  date: string;
  status: "pending" | "approved" | "denied";
}

interface AnalyticsContentProps {
  user: User;
  viewingStudentName?: string | null;
  isViewingAsAdmin?: boolean;
}

const CATEGORY_COLORS = [
  "hsl(var(--accent))",
  "hsl(142, 76%, 36%)",
  "hsl(221, 83%, 53%)",
  "hsl(262, 83%, 58%)",
  "hsl(340, 75%, 55%)",
  "hsl(45, 93%, 47%)",
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function AnalyticsContent({ user, viewingStudentName, isViewingAsAdmin }: AnalyticsContentProps) {
  const [loading, setLoading] = useState(true);
  const [volunteerHours, setVolunteerHours] = useState<VolunteerHour[]>([]);
  const { achievements, earnedCount: badgesEarned, isLoading: achievementsLoading } = useAchievements(user.id);

  useEffect(() => {
    fetchVolunteerHours();
  }, [user.id]);

  const fetchVolunteerHours = async () => {
    const { data, error } = await supabase
      .from("volunteer_hours")
      .select("id, organization, hours, date, status")
      .eq("user_id", user.id)
      .order("date", { ascending: true });

    if (!error && data) {
      setVolunteerHours(data as VolunteerHour[]);
    }

    setLoading(false);
  };

  const approvedHours = volunteerHours.filter(h => h.status === "approved");
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  const totalHours = approvedHours.reduce((sum, h) => sum + Number(h.hours), 0);
  const thisMonthHours = approvedHours
    .filter(h => new Date(h.date) >= thisMonthStart && new Date(h.date) <= thisMonthEnd)
    .reduce((sum, h) => sum + Number(h.hours), 0);
  const lastMonthHours = approvedHours
    .filter(h => new Date(h.date) >= lastMonthStart && new Date(h.date) <= lastMonthEnd)
    .reduce((sum, h) => sum + Number(h.hours), 0);
  const sessionsThisMonth = volunteerHours.filter(
    h => new Date(h.date) >= thisMonthStart && new Date(h.date) <= thisMonthEnd
  ).length;

  const firstDate = approvedHours.length > 0 ? new Date(approvedHours[0].date) : now;
  const weeksActive = Math.max(1, differenceInWeeks(now, firstDate) + 1);
  const avgPerWeek = (totalHours / weeksActive).toFixed(1);

  const calculateStreak = () => {
    let streak = 0;
    let checkDate = now;
    for (let i = 0; i < 52; i++) {
      const weekStart = startOfWeek(checkDate);
      const weekEnd = endOfWeek(checkDate);
      const hasHours = approvedHours.some(h => {
        const d = new Date(h.date);
        return d >= weekStart && d <= weekEnd;
      });
      if (hasHours) {
        streak++;
        checkDate = new Date(weekStart);
        checkDate.setDate(checkDate.getDate() - 7);
      } else {
        break;
      }
    }
    return streak;
  };
  const streak = calculateStreak();

  // Monthly data for chart
  const chartStartDate = approvedHours.length > 0
    ? subMonths(startOfMonth(new Date(approvedHours[0].date)), 1)
    : subMonths(startOfMonth(now), 1);
  const monthCount = differenceInMonths(startOfMonth(now), chartStartDate) + 1;
  const monthlyData = Array.from({ length: monthCount }, (_, i) => {
    const date = addMonths(chartStartDate, i);
    const mStart = startOfMonth(date);
    const mEnd = endOfMonth(date);
    const hours = approvedHours
      .filter(h => new Date(h.date) >= mStart && new Date(h.date) <= mEnd)
      .reduce((sum, h) => sum + Number(h.hours), 0);
    return { month: format(date, "MMM yyyy"), hours: Math.round(hours * 10) / 10 };
  });

  // Category data for pie chart
  const categoryMap = new Map<string, number>();
  approvedHours.forEach(h => {
    categoryMap.set(h.organization, (categoryMap.get(h.organization) || 0) + Number(h.hours));
  });
  const categoryData = Array.from(categoryMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value], index) => ({
      name,
      value: Math.round(value * 10) / 10,
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    }));

  // Weekly trend (last 6 weeks)
  const weeklyTrend = Array.from({ length: 6 }, (_, i) => {
    const weekStart = startOfWeek(now);
    weekStart.setDate(weekStart.getDate() - (5 - i) * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const hours = approvedHours
      .filter(h => new Date(h.date) >= weekStart && new Date(h.date) <= weekEnd)
      .reduce((sum, h) => sum + Number(h.hours), 0);
    return { week: `W${i + 1}`, hours: Math.round(hours * 10) / 10, avg: parseFloat(avgPerWeek) };
  });

  // Frequency by day of week
  const frequencyData = DAY_NAMES.map((day, index) => ({
    day,
    sessions: volunteerHours.filter(h => getDay(new Date(h.date)) === index).length,
  }));

  const monthChange = lastMonthHours > 0
    ? Math.round(((thisMonthHours - lastMonthHours) / lastMonthHours) * 100)
    : thisMonthHours > 0 ? 100 : 0;

  const unearnedAchievements = achievements.filter(a => !a.earned).sort((a, b) => b.progress - a.progress);
  const earnedAchievements = achievements.filter(a => a.earned);

  const handleExportPDF = async () => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("name, email, school")
      .eq("id", user.id)
      .single();

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const margin = 25;
    const name = profile?.name || "Volunteer";
    const school = profile?.school || "";
    const issueDate = format(now, "MMMM d, yyyy");

    // Subtle outer border
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.5);
    doc.rect(margin - 5, margin - 5, W - (margin - 5) * 2, H - (margin - 5) * 2);

    // Logo placeholder
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, margin, 20, 20, 2, 2);
    doc.setFontSize(6);
    doc.setTextColor(180, 180, 180);
    doc.setFont("helvetica", "normal");
    doc.text("LOGO", margin + 10, margin + 11, { align: "center" });

    // Header title
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("OFFICIAL", W / 2, margin + 4, { align: "center" });
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("VOLUNTEER SERVICE TRANSCRIPT", W / 2, margin + 12, { align: "center" });

    // Subtle line under header
    doc.setDrawColor(30, 30, 30);
    doc.setLineWidth(0.6);
    doc.line(margin, margin + 17, W - margin, margin + 17);
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin, margin + 18.5, W - margin, margin + 18.5);

    // Student summary box
    const boxY = margin + 24;
    doc.setFillColor(248, 248, 248);
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, boxY, W - margin * 2, 24, 2, 2, "FD");

    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.setFont("helvetica", "normal");
    doc.text("STUDENT NAME", margin + 6, boxY + 7);
    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.setFont("helvetica", "bold");
    doc.text(name, margin + 6, boxY + 14);
    if (school) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(school, margin + 6, boxY + 20);
    }

    // Right side: total hours
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.setFont("helvetica", "normal");
    doc.text("TOTAL CERTIFIED HOURS", W - margin - 6, boxY + 7, { align: "right" });
    doc.setFontSize(22);
    doc.setTextColor(30, 30, 30);
    doc.setFont("helvetica", "bold");
    doc.text(totalHours.toString(), W - margin - 6, boxY + 17, { align: "right" });
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    doc.text("Approved & Verified", W - margin - 6, boxY + 21, { align: "right" });

    // Table
    const tableData = approvedHours.map((h, i) => [
      (i + 1).toString(),
      format(new Date(h.date), "MMM d, yyyy"),
      h.organization,
      h.hours.toString(),
    ]);

    autoTable(doc, {
      startY: boxY + 30,
      head: [["#", "Date", "Activity", "Hours"]],
      body: tableData,
      theme: "plain",
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 9,
        cellPadding: 4,
        textColor: [50, 50, 50],
        lineColor: [220, 220, 220],
        lineWidth: 0.2,
        font: "helvetica",
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [80, 80, 80],
        fontStyle: "bold",
        fontSize: 8,
        cellPadding: 4,
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250],
      },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 30 },
        3: { cellWidth: 18, halign: "center", fontStyle: "bold" },
      },
      didDrawPage: () => {
        // Re-draw border on each page
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.5);
        doc.rect(margin - 5, margin - 5, W - (margin - 5) * 2, H - (margin - 5) * 2);
      },
    });

    // Footer - always on last page at bottom
    const footerY = H - margin - 18;

    // Signature line left
    doc.setDrawColor(80, 80, 80);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY, margin + 55, footerY);
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    doc.text("Authorized Signature", margin, footerY + 4);

    // Date line center
    doc.line(W / 2 - 25, footerY, W / 2 + 25, footerY);
    doc.text("Date of Issuance", W / 2, footerY + 4, { align: "center" });
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    doc.setFont("helvetica", "normal");
    doc.text(issueDate, W / 2, footerY - 2, { align: "center" });

    // Verified text right
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text("Officially verified by Service Tracker", W - margin, footerY + 4, { align: "right" });

    // Seal
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.6);
    doc.circle(W - margin - 12, footerY - 8, 7);
    doc.setLineWidth(0.3);
    doc.circle(W - margin - 12, footerY - 8, 5.5);
    doc.setFontSize(5);
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "bold");
    doc.text("VERIFIED", W - margin - 12, footerY - 9, { align: "center" });
    doc.setFontSize(4);
    doc.text("SERVICE TRACKER", W - margin - 12, footerY - 6.5, { align: "center" });

    if (typeof pendo !== 'undefined') {
      pendo.track("volunteer_transcript_exported", {
        total_hours: totalHours,
        approved_entries_count: approvedHours.length,
      });
    }
    doc.save(`volunteer-transcript-${format(now, "yyyy-MM-dd")}.pdf`);
  };

  const handleDownloadCertificate = async () => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .single();

    const name = profile?.name || "Volunteer";
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();

    // Background
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, W, H, "F");

    // Outer decorative border
    doc.setDrawColor(26, 54, 93);
    doc.setLineWidth(2.5);
    doc.rect(8, 8, W - 16, H - 16);
    doc.setLineWidth(0.8);
    doc.rect(12, 12, W - 24, H - 24);

    // Corner ornaments
    const cornerSize = 14;
    const corners = [
      [14, 14], [W - 14, 14], [14, H - 14], [W - 14, H - 14],
    ];
    doc.setLineWidth(0.6);
    doc.setDrawColor(26, 54, 93);
    corners.forEach(([cx, cy]) => {
      const dx = cx < W / 2 ? 1 : -1;
      const dy = cy < H / 2 ? 1 : -1;
      doc.line(cx, cy, cx + cornerSize * dx, cy);
      doc.line(cx, cy, cx, cy + cornerSize * dy);
      doc.line(cx + cornerSize * dx * 0.3, cy + cornerSize * dy * 0.3, cx + cornerSize * dx, cy + cornerSize * dy * 0.3);
      doc.line(cx + cornerSize * dx * 0.3, cy + cornerSize * dy * 0.3, cx + cornerSize * dx * 0.3, cy + cornerSize * dy);
    });

    // Award ribbon icon (simple geometric)
    const ribbonX = W / 2;
    const ribbonY = 32;
    doc.setFillColor(26, 54, 93);
    doc.circle(ribbonX, ribbonY, 8, "F");
    doc.setFillColor(255, 255, 255);
    doc.circle(ribbonX, ribbonY, 6, "F");
    doc.setFillColor(212, 175, 55);
    doc.circle(ribbonX, ribbonY, 4.5, "F");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text("★", ribbonX, ribbonY + 1.5, { align: "center" });

    // Title
    doc.setTextColor(26, 54, 93);
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text("CERTIFICATE", W / 2, 52, { align: "center" });
    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.text("of Volunteer Service", W / 2, 64, { align: "center" });

    // Decorative line under title
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(1);
    doc.line(W / 2 - 50, 69, W / 2 + 50, 69);
    doc.setLineWidth(0.4);
    doc.line(W / 2 - 40, 72, W / 2 + 40, 72);

    // Preamble
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("This is to officially certify that", W / 2, 86, { align: "center" });

    // Name
    doc.setTextColor(26, 54, 93);
    doc.setFontSize(26);
    doc.setFont("helvetica", "bold");
    doc.text(name, W / 2, 100, { align: "center" });

    // Underline for name
    const nameWidth = doc.getTextWidth(name);
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.6);
    doc.line(W / 2 - nameWidth / 2 - 5, 103, W / 2 + nameWidth / 2 + 5, 103);

    // Body text
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("has successfully completed a total of", W / 2, 115, { align: "center" });

    // Hours
    doc.setTextColor(26, 54, 93);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text(`${totalHours} Verified Volunteer Service Hours`, W / 2, 127, { align: "center" });

    // Closing statement
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(
      "demonstrating outstanding commitment to community service and civic engagement.",
      W / 2, 138, { align: "center" }
    );

    // Date of issue
    const issueDate = format(now, "MMMM d, yyyy");
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Date of Issue: ${issueDate}`, W / 2, 155, { align: "center" });

    // Bottom section: signature area
    const sigY = H - 42;
    doc.setDrawColor(26, 54, 93);
    doc.setLineWidth(0.4);

    // Left: Digital Signature
    doc.line(W / 2 - 85, sigY, W / 2 - 25, sigY);
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    doc.text("Authorized Signature", W / 2 - 55, sigY + 5, { align: "center" });

    // Right: Verified seal
    doc.line(W / 2 + 25, sigY, W / 2 + 85, sigY);
    doc.text("Official Seal", W / 2 + 55, sigY + 5, { align: "center" });

    // Seal circle
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(1);
    doc.circle(W / 2 + 55, sigY - 10, 9);
    doc.setLineWidth(0.5);
    doc.circle(W / 2 + 55, sigY - 10, 7);
    doc.setFontSize(6);
    doc.setTextColor(212, 175, 55);
    doc.setFont("helvetica", "bold");
    doc.text("VERIFIED", W / 2 + 55, sigY - 11, { align: "center" });
    doc.setFontSize(5);
    doc.text("SERVICE TRACKER", W / 2 + 55, sigY - 8, { align: "center" });

    // Footer
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    doc.setFont("helvetica", "normal");
    doc.text("This certificate was digitally generated by Service Tracker and verifies the recorded volunteer hours.", W / 2, H - 18, { align: "center" });

    if (typeof pendo !== 'undefined') {
      pendo.track("volunteer_certificate_downloaded", {
        total_hours: totalHours,
        volunteer_name: name,
      });
    }
    doc.save(`certificate-${format(now, "yyyy-MM-dd")}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <>
      {isViewingAsAdmin && viewingStudentName && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-accent/10 border border-accent/20">
            <Link to="/ranking" className="flex items-center gap-1 text-sm font-medium text-accent hover:underline">
              ← Back to Ranking
            </Link>
            <div className="h-4 w-px bg-border" />
            <p className="font-semibold text-lg">Viewing Analytics for: <span className="text-accent">{viewingStudentName}</span></p>
          </div>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
              {isViewingAsAdmin ? `${viewingStudentName}'s Analytics` : "Your Analytics"}
            </h1>
            <p className="text-muted-foreground">
              {isViewingAsAdmin
                ? "Detailed volunteer impact and activity for this student."
                : "Track your volunteer impact, identify trends, and achieve your goals."}
            </p>
          </div>
          {!isViewingAsAdmin && (
            <div className="flex gap-2">
              <Button onClick={handleDownloadCertificate} variant="outline" className="gap-2">
                <ScrollText className="w-4 h-4" />
                Download Certificate
              </Button>
              <Button onClick={handleExportPDF} variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Export Log
              </Button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8"
      >
        <Card className="bg-gradient-to-br from-accent/20 to-accent/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-5 h-5 text-accent" />
              {monthChange !== 0 && (
                <Badge variant="secondary" className="text-xs">
                  {monthChange > 0 ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />}
                  {Math.abs(monthChange)}%
                </Badge>
              )}
            </div>
            <p className="font-display text-2xl font-bold">{totalHours}</p>
            <p className="text-xs text-muted-foreground">Total Hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Calendar className="w-5 h-5 text-muted-foreground mb-2" />
            <p className="font-display text-2xl font-bold">{thisMonthHours}</p>
            <p className="text-xs text-muted-foreground">This Month</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Flame className="w-5 h-5 text-orange-500 mb-2" />
            <p className="font-display text-2xl font-bold">{streak} wks</p>
            <p className="text-xs text-muted-foreground">Active Streak</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <TrendingUp className="w-5 h-5 text-muted-foreground mb-2" />
            <p className="font-display text-2xl font-bold">{avgPerWeek}</p>
            <p className="text-xs text-muted-foreground">Avg/Week</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Target className="w-5 h-5 text-muted-foreground mb-2" />
            <p className="font-display text-2xl font-bold">{sessionsThisMonth}</p>
            <p className="text-xs text-muted-foreground">Sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Award className="w-5 h-5 text-muted-foreground mb-2" />
            <p className="font-display text-2xl font-bold">{badgesEarned}</p>
            <p className="text-xs text-muted-foreground">Badges Earned</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Achievement Goals */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-8">
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-accent" />
                  Achievement Goals
                </CardTitle>
                <CardDescription>
                  {badgesEarned} of {achievements.length} achievements earned
                </CardDescription>
              </div>
              <Link to="/achievements">
                <Badge variant="secondary" className="cursor-pointer hover:bg-accent/20 transition-colors">
                  View All
                </Badge>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {achievementsLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {unearnedAchievements.slice(0, 4).map((achievement) => (
                  <div key={achievement.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{achievement.title}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{achievement.progress}%</span>
                    </div>
                    <Progress value={achievement.progress} className="h-2" />
                    <p className="text-xs text-muted-foreground">{achievement.description}</p>
                  </div>
                ))}
                {earnedAchievements.length > 0 && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs font-medium text-muted-foreground mb-3">Recently Earned</p>
                    <div className="flex flex-wrap gap-2">
                      {earnedAchievements.slice(0, 5).map((achievement) => (
                        <Badge key={achievement.id} variant="secondary" className="gap-1.5 bg-accent/10 text-accent border-accent/20">
                          <CheckCircle2 className="w-3 h-3" />
                          {achievement.title}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {unearnedAchievements.length === 0 && earnedAchievements.length > 0 && (
                  <p className="text-sm text-center text-muted-foreground py-2">🎉 All achievements earned!</p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Hours by Month</CardTitle>
              <CardDescription>Your volunteer hours over time</CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                  <Line type="monotone" dataKey="hours" stroke="hsl(var(--accent))" strokeWidth={3} dot={{ fill: "hsl(var(--accent))" }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Hours by Activity</CardTitle>
              <CardDescription>Distribution of your service areas</CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={0}
                      dataKey="value"
                      label={({ name, percent }) => `${name.slice(0, 15)} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No approved hours yet
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Weekly Trend</CardTitle>
              <CardDescription>Your hours vs. weekly average</CardDescription>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                  <Line type="monotone" dataKey="hours" stroke="hsl(var(--accent))" strokeWidth={3} dot={{ fill: "hsl(var(--accent))" }} name="Your Hours" />
                  <Line type="monotone" dataKey="avg" stroke="hsl(var(--muted-foreground))" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Average" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Volunteer Frequency</CardTitle>
              <CardDescription>Sessions by day of week</CardDescription>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={frequencyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                  <Bar dataKey="sessions" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </>
  );
}
