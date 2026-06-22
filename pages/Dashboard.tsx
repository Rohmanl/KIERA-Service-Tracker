import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { performLogout } from "@/lib/logout";
import { User } from "@supabase/supabase-js";
import { useUserRole } from "@/hooks/useUserRole";
import UserDashboard from "./UserDashboard";
import AdminDashboard from "./AdminDashboard";
import OrgDashboard from "./OrgDashboard";
import PendingApproval from "./PendingApproval";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { role, isLoading: isRoleLoading, isAdmin, isOrganization } = useUserRole(user);
  const [orgData, setOrgData] = useState<{ orgName: string; accountStatus: string } | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setIsLoading(false);
        if (!session?.user) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
      if (!session?.user) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Ensure profile exists (fallback if trigger failed)
  useEffect(() => {
    if (!user) return;
    const ensureProfile = async () => {
      const { data } = await supabase.from("profiles").select("id").eq("id", user.id).single();
      if (!data) {
        console.log("Profile missing, creating fallback profile");
        await supabase.from("profiles").upsert({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || user.email?.split("@")[0] || "Volunteer",
        });
      }
    };
    ensureProfile();
  }, [user]);

  // Fetch org data if user is an organization
  useEffect(() => {
    if (!user || isRoleLoading) return;
    if (!isOrganization) {
      setOrgLoading(false);
      return;
    }
    setOrgLoading(true);
    const fetchOrgData = async () => {
      const { data } = await supabase
        .from("organizations")
        .select("org_name, account_status")
        .eq("user_id", user.id)
        .single() as any;

      if (data) {
        setOrgData({ orgName: data.org_name, accountStatus: data.account_status });
      }
      setOrgLoading(false);
    };
    fetchOrgData();
  }, [user, isOrganization, isRoleLoading]);

  const handleLogout = async () => {
    await performLogout("/");
  };

  if (isLoading || isRoleLoading || (isOrganization && orgLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (!user) return null;

  // Organization with pending/rejected status → show waiting room
  if (isOrganization && orgData?.accountStatus !== "approved") {
    return <PendingApproval onLogout={handleLogout} orgName={orgData?.orgName} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar
        isAuthenticated={true}
        onLogout={handleLogout}
        isAdmin={isAdmin}
        isOrganization={isOrganization}
        isRoleLoading={isRoleLoading}
      />
      <main className="container mx-auto px-4 pt-24 pb-12">
        {isAdmin ? (
          <AdminDashboard user={user} />
        ) : isOrganization ? (
          <OrgDashboard user={user} orgName={orgData?.orgName || "Organization"} />
        ) : (
          <UserDashboard user={user} />
        )}
      </main>
    </div>
  );
}
