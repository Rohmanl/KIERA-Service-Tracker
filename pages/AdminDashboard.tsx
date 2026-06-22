import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, Clock, CheckCircle, XCircle, AlertCircle, Shield, Pencil, MapPin, Search, HelpCircle, FileText } from "lucide-react";
import { startAdminTour } from "@/components/dashboard/AdminProductTour";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { EditHoursDialog } from "@/components/admin/EditHoursDialog";
import { fetchAdjustmentDeltas } from "@/lib/hoursAdjustments";
import { ManageOrganizations } from "@/components/admin/ManageOrganizations";
import { UserProfileDialog } from "@/components/admin/UserProfileDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye } from "lucide-react";


interface PendingHour {
  id: string;
  hours: number;
  date: string;
  organization: string;
  description: string | null;
  location: string | null;
  user_id: string;
  status: string;
  proof_file_url: string | null;
  profiles: {
    name: string | null;
    email: string | null;
  } | null;
}

interface VolunteerProfile {
  id: string;
  name: string | null;
  email: string | null;
  total_hours: number;
  school: string | null;
  grade: string | null;
}

interface AdminDashboardProps {
  user: User;
}

export default function AdminDashboard({ user }: AdminDashboardProps) {
  const [pendingHours, setPendingHours] = useState<PendingHour[]>([]);
  const [volunteers, setVolunteers] = useState<VolunteerProfile[]>([]);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalVolunteers: 0,
    totalHours: 0,
    pendingApprovals: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [editingVolunteer, setEditingVolunteer] = useState<VolunteerProfile | null>(null);
  const [viewingVolunteer, setViewingVolunteer] = useState<VolunteerProfile | null>(null);
  
  const [usersSearchQuery, setUsersSearchQuery] = useState("");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch admin's own profile name
      const { data: ownProfile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .single();
      if (ownProfile?.name) setProfileName(ownProfile.name);
      // Fetch pending hours (includes org-verified ones awaiting final admin approval)
      const { data: hoursData, error: hoursError } = await supabase
        .from("volunteer_hours")
        .select("id, hours, date, organization, description, location, user_id, organization_id, status, proof_file_url")
        .in("status", ["pending", "pending_external_org", "org_verified"] as any)
        .is("organization_id", null)
        .order("date", { ascending: false });

      if (hoursError) throw hoursError;

      // Fetch profiles for the pending hours
      const userIds = [...new Set(hoursData?.map(h => h.user_id) || [])];
      let profilesMap: Record<string, { name: string | null; email: string | null }> = {};
      
      if (userIds.length > 0) {
        const { data: profilesForHours } = await supabase
          .from("profiles")
          .select("id, name, email")
          .in("id", userIds);
        
        profilesForHours?.forEach(p => {
          profilesMap[p.id] = { name: p.name, email: p.email };
        });
      }

      const hoursWithProfiles = (hoursData || []).map(h => ({
        ...h,
        profiles: profilesMap[h.user_id] || null,
      }));
      
      setPendingHours(hoursWithProfiles);

      // Fetch all volunteers (exclude admin accounts)
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name, email, total_hours, school, grade")
        .order("total_hours", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch admin and org user IDs to filter them out from volunteers
      const { data: nonVolunteerRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "organization"] as any);
      const excludeIds = new Set(nonVolunteerRoles?.map(r => r.user_id) || []);

      const volunteerProfiles = (profilesData || []).filter(p => !excludeIds.has(p.id));

      // Dynamically calculate hours from approved records per volunteer
      const volunteerIds = volunteerProfiles.map(p => p.id);
      let approvedHoursMap: Record<string, number> = {};
      let adjustmentMap: Record<string, number> = {};
      if (volunteerIds.length > 0) {
        const { data: approvedData } = await supabase
          .from("volunteer_hours")
          .select("user_id, hours")
          .eq("status", "approved")
          .in("user_id", volunteerIds);
        approvedData?.forEach(r => {
          approvedHoursMap[r.user_id] = (approvedHoursMap[r.user_id] || 0) + Number(r.hours);
        });
        adjustmentMap = await fetchAdjustmentDeltas(volunteerIds);
      }

      const volunteersWithDynamicHours = volunteerProfiles.map(p => ({
        ...p,
        total_hours: Math.max(0, (approvedHoursMap[p.id] ?? 0) + (adjustmentMap[p.id] ?? 0)),
      }));
      // Re-sort by dynamic hours
      volunteersWithDynamicHours.sort((a, b) => b.total_hours - a.total_hours);
      setVolunteers(volunteersWithDynamicHours);

      // Calculate stats (volunteers only, dynamic hours)
      const totalHours = volunteersWithDynamicHours.reduce((sum, p) => sum + p.total_hours, 0);
      setStats({
        totalVolunteers: volunteersWithDynamicHours.length,
        totalHours,
        pendingApprovals: hoursData?.length || 0,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error instanceof Error ? error.message : "Unknown error");
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewProof = async (path: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("hour-proofs")
        .createSignedUrl(path, 60 * 60);
      if (error || !data?.signedUrl) throw error || new Error("No URL");
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error("Failed to load proof:", err);
      toast.error("Could not open proof file");
    }
  };

  const handleApprove = async (hourId: string) => {
    try {
      const { error } = await supabase
        .from("volunteer_hours")
        .update({
          status: "approved",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", hourId);

      if (error) throw error;
      toast.success("Hours approved successfully");
      fetchDashboardData();
    } catch (error) {
      console.error("Error approving hours:", error instanceof Error ? error.message : "Unknown error");
      toast.error("Failed to approve hours");
    }
  };

  const handleReject = async (hourId: string) => {
    try {
      const { error } = await supabase
        .from("volunteer_hours")
        .update({
          status: "denied",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", hourId);

      if (error) throw error;
      toast.success("Hours rejected");
      fetchDashboardData();
    } catch (error) {
      console.error("Error rejecting hours:", error instanceof Error ? error.message : "Unknown error");
      toast.error("Failed to reject hours");
    }
  };

  const userName = profileName || user?.user_metadata?.name || user?.email?.split("@")[0] || "Admin";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-8 w-8 text-accent" />
          <h1 className="font-display text-3xl md:text-4xl font-bold">
            Admin Dashboard
          </h1>
        </div>
        <p className="text-muted-foreground">
          Welcome back, <span className="text-accent font-medium">{userName}</span>. Manage volunteers and approve hours.
        </p>
      </motion.div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Manage Users</TabsTrigger>
          <TabsTrigger value="organizations">Manage Organizations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8">
          {/* Stats Grid */}
          <div data-tour="admin-stats-grid" className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatsCard
              title="Total Volunteers"
              value={stats.totalVolunteers.toString()}
              subtitle="Registered users"
              icon={Users}
              variant="accent"
            />
            <StatsCard
              title="Total Hours"
              value={stats.totalHours.toString()}
              subtitle="Across all volunteers"
              icon={Clock}
              variant="success"
            />
            <StatsCard
              title="Pending Approvals"
              value={stats.pendingApprovals.toString()}
              subtitle="Awaiting review"
              icon={AlertCircle}
            />
          </div>

          {/* Pending Approvals */}
          <motion.div
            data-tour="admin-pending-approvals"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-warning" />
                  Pending Hour Approvals
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pendingHours.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No pending approvals at this time.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Volunteer</TableHead>
                        <TableHead>Activity</TableHead>
                        <TableHead>Organization</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Hours</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Proof</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingHours.map((hour) => {
                        const orgEmailMatch = hour.description?.match(/\[Org Contact:\s*([^\]]+)\]/);
                        const orgEmail = orgEmailMatch?.[1]?.trim();
                        const cleanDescription = hour.description
                          ?.replace(/\n*\[Org Contact:[^\]]+\]\n*/g, "")
                          .trim() || "—";
                        return (
                        <TableRow key={hour.id} className={hour.status === "org_verified" ? "bg-success/5" : undefined}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{hour.profiles?.name || "Unknown"}</p>
                              <p className="text-sm text-muted-foreground">{hour.profiles?.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>{cleanDescription}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p>{hour.organization}</p>
                              {hour.status === "org_verified" && orgEmail && (
                                <Badge className="bg-success/15 text-success border-success/30 hover:bg-success/20">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Proof verified by {orgEmail}
                                </Badge>
                              )}
                              {hour.status === "pending_external_org" && orgEmail && (
                                <p className="text-sm text-muted-foreground">{orgEmail}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {hour.location ? (
                              <span className="flex items-center gap-1 text-sm">
                                <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="truncate max-w-[200px]" title={hour.location}>{hour.location}</span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{hour.hours}h</Badge>
                          </TableCell>
                          <TableCell>{new Date(hour.date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            {hour.proof_file_url ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewProof(hour.proof_file_url!)}
                              >
                                <FileText className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => handleApprove(hour.id)}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleReject(hour.id)}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Top 5 Volunteers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-accent" />
                  Top 5 Volunteers by Hours
                </CardTitle>
              </CardHeader>
              <CardContent>
                {volunteers.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No volunteers registered yet.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>School</TableHead>
                        <TableHead>Total Hours</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {volunteers.slice(0, 5).map((volunteer, index) => (
                        <TableRow key={volunteer.id}>
                          <TableCell className="font-bold text-accent">{index + 1}</TableCell>
                          <TableCell className="font-medium">{volunteer.name || "—"}</TableCell>
                          <TableCell>{volunteer.school || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{volunteer.total_hours || 0}h</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-accent" />
                  User Directory
                </CardTitle>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={usersSearchQuery}
                    onChange={(e) => setUsersSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {(() => {
                const filtered = volunteers.filter((v) => {
                  if (!usersSearchQuery.trim()) return true;
                  const q = usersSearchQuery.toLowerCase();
                  return (
                    v.name?.toLowerCase().includes(q) ||
                    v.email?.toLowerCase().includes(q)
                  );
                });
                return filtered.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    {usersSearchQuery.trim() ? "No users match your search." : "No volunteers registered yet."}
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>School</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead>Total Verified Hours</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((volunteer) => (
                        <TableRow key={volunteer.id}>
                          <TableCell className="font-medium">{volunteer.name || "—"}</TableCell>
                          <TableCell>{volunteer.email || "—"}</TableCell>
                          <TableCell>{volunteer.school || "—"}</TableCell>
                          <TableCell>{volunteer.grade || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{volunteer.total_hours || 0}h</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setViewingVolunteer(volunteer)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View Profile
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingVolunteer(volunteer)}
                              >
                                <Pencil className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organizations">
          <ManageOrganizations />
        </TabsContent>
      </Tabs>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex justify-center mt-10 mb-4"
      >
        <Button
          variant="outline"
          size="sm"
          onClick={startAdminTour}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <HelpCircle className="w-4 h-4" />
          Help / Tutorial
        </Button>
      </motion.div>

      {editingVolunteer && (
        <EditHoursDialog
          open={!!editingVolunteer}
          onOpenChange={(open) => !open && setEditingVolunteer(null)}
          volunteer={editingVolunteer}
          adminId={user.id}
          onSaved={fetchDashboardData}
        />
      )}

      {viewingVolunteer && (
        <UserProfileDialog
          open={!!viewingVolunteer}
          onOpenChange={(open) => !open && setViewingVolunteer(null)}
          volunteer={viewingVolunteer}
        />
      )}
    </>
  );
}
