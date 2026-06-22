import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Clock, Building2, AlertCircle, Download, Trophy, Loader2, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { toast } from "sonner";

interface TopStudent {
  id: string;
  name: string | null;
  school: string | null;
  total_hours: number;
}

interface TopOrg {
  org_name: string;
  event_count: number;
}

export function AdminAnalyticsContent() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalOrgs: 0,
    totalHours: 0,
    totalPending: 0,
  });
  const [topStudents, setTopStudents] = useState<TopStudent[]>([]);
  const [topOrgs, setTopOrgs] = useState<TopOrg[]>([]);
  const [monthlyData, setMonthlyData] = useState<{ month: string; hours: number }[]>([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      // Fetch volunteer role user IDs
      const { data: volunteerRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "volunteer");
      const volunteerIds = volunteerRoles?.map((r) => r.user_id) || [];

      // Approved orgs count
      const { count: orgCount } = await supabase
        .from("organizations")
        .select("id", { count: "exact", head: true })
        .eq("account_status", "approved");

      // All approved hours
      const { data: approvedHours } = await supabase
        .from("volunteer_hours")
        .select("user_id, hours, date, organization, description, location")
        .eq("status", "approved");

      // Pending count
      const { count: pendingCount } = await supabase
        .from("volunteer_hours")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");

      const totalHours = (approvedHours || []).reduce((sum, h) => sum + Number(h.hours), 0);

      setStats({
        totalStudents: volunteerIds.length,
        totalOrgs: orgCount || 0,
        totalHours: Math.round(totalHours * 10) / 10,
        totalPending: pendingCount || 0,
      });

      // Top 5 students by hours
      const studentHoursMap = new Map<string, number>();
      (approvedHours || []).forEach((h) => {
        if (volunteerIds.includes(h.user_id)) {
          studentHoursMap.set(h.user_id, (studentHoursMap.get(h.user_id) || 0) + Number(h.hours));
        }
      });
      const topStudentIds = [...studentHoursMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      if (topStudentIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name, school")
          .in("id", topStudentIds.map(([id]) => id));

        const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
        setTopStudents(
          topStudentIds.map(([id, hours]) => ({
            id,
            name: profileMap.get(id)?.name || null,
            school: profileMap.get(id)?.school || null,
            total_hours: Math.round(hours * 10) / 10,
          }))
        );
      }

      // Top 5 orgs by event count
      const { data: orgsWithEvents } = await supabase
        .from("organizations")
        .select("org_name, id")
        .eq("account_status", "approved");

      if (orgsWithEvents && orgsWithEvents.length > 0) {
        const { data: events } = await supabase
          .from("events")
          .select("organization_id");

        const eventCountMap = new Map<string, number>();
        (events || []).forEach((e) => {
          eventCountMap.set(e.organization_id, (eventCountMap.get(e.organization_id) || 0) + 1);
        });

        const orgsSorted = orgsWithEvents
          .map((o) => ({ org_name: o.org_name, event_count: eventCountMap.get(o.id) || 0 }))
          .sort((a, b) => b.event_count - a.event_count)
          .slice(0, 5);
        setTopOrgs(orgsSorted);
      }

      // Monthly hours (last 6 months)
      const months: { month: string; hours: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const mLabel = format(d, "MMM yyyy");
        const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
        const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        const hrs = (approvedHours || [])
          .filter((h) => {
            const hd = new Date(h.date);
            return hd >= mStart && hd <= mEnd;
          })
          .reduce((s, h) => s + Number(h.hours), 0);
        months.push({ month: mLabel, hours: Math.round(hrs * 10) / 10 });
      }
      setMonthlyData(months);
    } catch (err) {
      console.error("Admin analytics error:", err);
      toast.error("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const { data: allHours } = await supabase
        .from("volunteer_hours")
        .select("user_id, organization, description, hours, date, status, location, source")
        .eq("status", "approved")
        .order("date", { ascending: false });

      if (!allHours || allHours.length === 0) {
        toast.error("No approved records to export");
        setExporting(false);
        return;
      }

      // Fetch profiles for names
      const userIds = [...new Set(allHours.map((h) => h.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, email, school")
        .in("id", userIds);
      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

      const headers = ["Student Name", "Email", "School", "Organization", "Activity", "Hours", "Date", "Location", "Source"];
      const rows = allHours.map((h) => {
        const p = profileMap.get(h.user_id);
        return [
          p?.name || "",
          p?.email || "",
          p?.school || "",
          h.organization,
          h.description || "",
          h.hours.toString(),
          h.date,
          h.location || "",
          h.source,
        ].map((v) => `"${v.replace(/"/g, '""')}"`).join(",");
      });

      const csv = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `platform-data-${format(new Date(), "yyyy-MM-dd")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      if (typeof pendo !== 'undefined') {
        pendo.track("admin_platform_data_exported", {
          record_count: allHours.length,
        });
      }
      toast.success("CSV exported successfully");
    } catch {
      toast.error("Failed to export data");
    } finally {
      setExporting(false);
    }
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
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">Platform Analytics</h1>
            <p className="text-muted-foreground">System-wide data and engagement overview.</p>
          </div>
          <Button onClick={handleExportCSV} disabled={exporting} className="gap-2">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export System Data (CSV)
          </Button>
        </div>
      </motion.div>

      {/* Aggregate Stats */}
      <motion.div data-tour="admin-analytics-stats" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard title="Total Students" value={stats.totalStudents.toString()} subtitle="Registered volunteers" icon={Users} variant="accent" />
        <StatsCard title="Approved Organizations" value={stats.totalOrgs.toString()} subtitle="Active partners" icon={Building2} variant="success" />
        <StatsCard title="Platform Hours" value={stats.totalHours.toString()} subtitle="All verified hours" icon={Clock} />
        <StatsCard title="Pending Submissions" value={stats.totalPending.toString()} subtitle="Awaiting review" icon={AlertCircle} />
      </motion.div>

      {/* Monthly Hours Chart */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-accent" />
              Platform Hours by Month
            </CardTitle>
            <CardDescription>Approved hours across all volunteers (last 6 months)</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Bar dataKey="hours" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Top 5 Students by Hours
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topStudents.length === 0 ? (
                <p className="text-muted-foreground text-center py-6">No data yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>School</TableHead>
                      <TableHead>Hours</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topStudents.map((s, i) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-bold text-accent">{i + 1}</TableCell>
                        <TableCell className="font-medium">{s.name || "—"}</TableCell>
                        <TableCell>{s.school || "—"}</TableCell>
                        <TableCell><Badge variant="secondary">{s.total_hours}h</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-accent" />
                Top 5 Active Organizations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topOrgs.length === 0 ? (
                <p className="text-muted-foreground text-center py-6">No data yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>Events Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topOrgs.map((o, i) => (
                      <TableRow key={o.org_name}>
                        <TableCell className="font-bold text-accent">{i + 1}</TableCell>
                        <TableCell className="font-medium">{o.org_name}</TableCell>
                        <TableCell><Badge variant="secondary">{o.event_count}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </>
  );
}
