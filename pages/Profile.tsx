import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, School, GraduationCap, Save, MapPin, Trophy, Target, Building2, ShieldCheck, Lock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { performLogout } from "@/lib/logout";
import { useNavigate } from "react-router-dom";
import { getSafeErrorMessage } from "@/lib/safeError";
import { z } from "zod";
import { useUserRole } from "@/hooks/useUserRole";
import { User as SupaUser } from "@supabase/supabase-js";

const profileSchema = z.object({
  name: z.string().max(100, "Name must be under 100 characters"),
  school: z.string().max(150, "School must be under 150 characters"),
  grade: z.string().max(20, "Grade must be under 20 characters"),
  city: z.string().max(100, "City must be under 100 characters"),
  yearlyGoal: z.string().refine((v) => {
    const n = Number(v);
    return !isNaN(n) && n >= 1 && n <= 10000;
  }, "Goal must be between 1 and 10,000"),
});

const orgProfileSchema = z.object({
  orgName: z.string().trim().min(2, "Organization name must be at least 2 characters").max(200, "Organization name must be under 200 characters"),
  contactEmail: z.string().trim().email("Invalid email address").max(255, "Email must be under 255 characters"),
  name: z.string().max(100, "Display name must be under 100 characters"),
});

export default function Profile() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [authUser, setAuthUser] = useState<SupaUser | null>(null);
  const { isAdmin, isOrganization, isLoading: isRoleLoading } = useUserRole(authUser);
  const [formData, setFormData] = useState({ name: "", email: "", school: "", grade: "", city: "", yearlyGoal: "150" });
  const [orgData, setOrgData] = useState({ orgName: "", contactEmail: "", name: "", address: "", verificationInfo: "" });
  const [showInRanking, setShowInRanking] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      setAuthUser(user);

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("name, email, school, grade, city, show_in_ranking, yearly_goal")
        .eq("id", user.id)
        .single();

      if (error || !profile) {
        const fallback = {
          name: user.user_metadata?.name || user.email?.split("@")[0] || "",
          email: user.email || "",
          school: "",
          grade: "",
          city: "",
          yearlyGoal: "150",
        };
        await supabase.from("profiles").upsert({ id: user.id, ...fallback });
        setFormData(fallback);
      } else {
        setFormData({
          name: profile.name || "",
          email: profile.email || user.email || "",
          school: profile.school || "",
          grade: profile.grade || "",
          city: profile.city || "",
          yearlyGoal: String(profile.yearly_goal ?? 150),
        });
        setShowInRanking(profile.show_in_ranking ?? true);
      }
      setIsFetching(false);
    };
    loadProfile();
  }, [navigate]);

  // Load org data when role is resolved
  useEffect(() => {
    if (!authUser || isRoleLoading || !isOrganization) return;
    const loadOrgData = async () => {
      const { data } = await supabase
        .from("organizations")
        .select("org_name, contact_email, address, verification_info")
        .eq("user_id", authUser.id)
        .single() as any;
      if (data) {
        setOrgData({
          orgName: data.org_name || "",
          contactEmail: data.contact_email || "",
          name: formData.name,
          address: data.address || "",
          verificationInfo: data.verification_info || "",
        });
      }
    };
    loadOrgData();
  }, [authUser, isRoleLoading, isOrganization, formData.name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isOrganization) {
      const validation = orgProfileSchema.safeParse(orgData);
      if (!validation.success) {
        toast.error(validation.error.errors[0]?.message || "Invalid input");
        return;
      }
    } else {
      const validation = profileSchema.safeParse(formData);
      if (!validation.success) {
        toast.error(validation.error.errors[0]?.message || "Invalid input");
        return;
      }
    }

    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Not authenticated"); setIsLoading(false); return; }

    if (isOrganization) {
      // Update profile name
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ name: orgData.name })
        .eq("id", user.id);

      // Update organization record
      const { error: orgError } = await supabase
        .from("organizations")
        .update({ org_name: orgData.orgName, contact_email: orgData.contactEmail, address: orgData.address, verification_info: orgData.verificationInfo } as any)
        .eq("user_id", user.id);

      if (profileError || orgError) {
        console.error("Profile save error:", profileError || orgError);
        toast.error("Failed to update profile");
      } else {
        toast.success("Profile updated!");
      }
    } else {
      const yearlyGoalNum = Math.max(1, Math.min(10000, Math.round(Number(formData.yearlyGoal) || 150)));
      const { error } = await supabase
        .from("profiles")
        .update({ name: formData.name, school: formData.school, grade: formData.grade, city: formData.city, show_in_ranking: showInRanking, yearly_goal: yearlyGoalNum })
        .eq("id", user.id);

      if (error) {
        console.error("Profile save error:", error instanceof Error ? error.message : "Unknown error");
        toast.error(getSafeErrorMessage(error));
      } else {
        toast.success("Profile updated!");
      }
    }
    setIsLoading(false);
  };

  const handleLogout = async () => { await performLogout("/"); };

  return (
    <div className="min-h-screen bg-background">
      <Navbar isAuthenticated={true} onLogout={handleLogout} isAdmin={isAdmin} isOrganization={isOrganization} isRoleLoading={isRoleLoading} />
      <main className="container mx-auto px-4 pt-24 pb-12 max-w-xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-3xl font-bold mb-8">Profile Settings</h1>
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isOrganization ? <Building2 className="w-5 h-5" /> : <User className="w-5 h-5" />}
                {isOrganization ? "Organization Information" : "Your Information"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isFetching || isRoleLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
                </div>
              ) : isOrganization ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2"><Building2 className="w-4 h-4" />Organization Name</label>
                    <Input maxLength={200} value={orgData.orgName} onChange={(e) => setOrgData({ ...orgData, orgName: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2"><Mail className="w-4 h-4" />Contact Email</label>
                    <Input type="email" maxLength={255} value={orgData.contactEmail} onChange={(e) => setOrgData({ ...orgData, contactEmail: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2"><User className="w-4 h-4" />Display Name</label>
                    <Input maxLength={100} value={orgData.name} onChange={(e) => setOrgData({ ...orgData, name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2"><MapPin className="w-4 h-4" />Physical Address</label>
                    <Input maxLength={300} placeholder="123 Main St, City, State, ZIP" value={orgData.address} onChange={(e) => setOrgData({ ...orgData, address: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2"><ShieldCheck className="w-4 h-4" />Verification Proof</label>
                    <Input maxLength={500} placeholder="Tax ID / EIN, Website URL, or 501(c)(3) doc link" value={orgData.verificationInfo} onChange={(e) => setOrgData({ ...orgData, verificationInfo: e.target.value })} />
                    <p className="text-xs text-muted-foreground">Tax ID/EIN, official website, or link to your 501(c)(3) documentation</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2"><Mail className="w-4 h-4" />Login Email</label>
                    <Input value={formData.email} disabled />
                    <p className="text-xs text-muted-foreground">This is your login email and cannot be changed here</p>
                  </div>
                  <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isLoading}>
                    <Save className="w-4 h-4 mr-2" />{isLoading ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2"><User className="w-4 h-4" />Name</label>
                    <Input maxLength={100} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2"><Mail className="w-4 h-4" />Email</label>
                    <Input value={formData.email} disabled />
                  </div>
                  {!isAdmin && (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2"><School className="w-4 h-4" />School</label>
                        <Input
                          maxLength={150}
                          placeholder="Enter your school name"
                          value={formData.school}
                          onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2"><GraduationCap className="w-4 h-4" />Grade</label>
                        <Input maxLength={20} value={formData.grade} onChange={(e) => setFormData({ ...formData, grade: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2"><MapPin className="w-4 h-4" />City</label>
                        <Input maxLength={100} value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2"><Target className="w-4 h-4" />Yearly Hour Goal</label>
                        <Input type="number" min="1" max="10000" value={formData.yearlyGoal} onChange={(e) => setFormData({ ...formData, yearlyGoal: e.target.value })} placeholder="150" />
                        <p className="text-xs text-muted-foreground">Set your personal volunteer hour target for the year</p>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border p-4">
                        <div className="flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-accent" />
                          <div>
                            <p className="text-sm font-medium">Show me in Ranking</p>
                            <p className="text-xs text-muted-foreground">Display your name on the public ranking page</p>
                          </div>
                        </div>
                        <Switch checked={showInRanking} onCheckedChange={setShowInRanking} />
                      </div>
                    </>
                  )}
                  <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isLoading}>
                    <Save className="w-4 h-4 mr-2" />{isLoading ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <ChangePasswordCard />
        </motion.div>
      </main>
    </div>
  );
}

function ChangePasswordCard() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setIsSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsSaving(false);
    if (error) {
      toast.error(getSafeErrorMessage(error));
    } else {
      toast.success("Password updated successfully");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <Card variant="elevated" className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="w-5 h-5" />
          Change Password
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2"><Lock className="w-4 h-4" />New Password</label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2"><Lock className="w-4 h-4" />Confirm New Password</label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter new password" autoComplete="new-password" />
          </div>
          <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isSaving || !newPassword || !confirmPassword}>
            <Save className="w-4 h-4 mr-2" />{isSaving ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

