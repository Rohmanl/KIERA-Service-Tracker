import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { performLogout } from "@/lib/logout";
import { User } from "@supabase/supabase-js";
import { useUserRole } from "@/hooks/useUserRole";
import { AnalyticsContent } from "@/components/analytics/AnalyticsContent";
import { AdminAnalyticsContent } from "@/components/analytics/AdminAnalyticsContent";

export default function Analytics() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const studentId = searchParams.get("studentId");
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { isLoading: isRoleLoading, isAdmin } = useUserRole(user);
  const [studentName, setStudentName] = useState<string | null>(null);

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

  // Fetch student name when admin is viewing a specific student
  useEffect(() => {
    if (studentId && isAdmin && !isRoleLoading) {
      supabase
        .from("profiles")
        .select("name")
        .eq("id", studentId)
        .single()
        .then(({ data }) => {
          setStudentName(data?.name || "Unknown Student");
        });
    }
  }, [studentId, isAdmin, isRoleLoading]);

  const handleLogout = async () => {
    await performLogout("/");
  };

  if (isLoading || isRoleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (!user) return null;

  // If non-admin tries to view another student's analytics, strip the param
  if (studentId && !isAdmin) {
    navigate("/analytics", { replace: true });
    return null;
  }

  // Admin viewing a specific student's analytics
  const isAdminViewingStudent = isAdmin && !!studentId;

  // Create a proxy user object with the student's ID for data fetching
  const targetUser = isAdminViewingStudent
    ? { ...user, id: studentId! } as User
    : user;

  return (
    <div className="min-h-screen bg-background">
      <Navbar isAuthenticated={true} onLogout={handleLogout} isAdmin={isAdmin} isRoleLoading={isRoleLoading} />
      <main className="container mx-auto px-4 pt-24 pb-12">
        {isAdminViewingStudent ? (
          <AnalyticsContent
            user={targetUser}
            viewingStudentName={studentName}
            isViewingAsAdmin={true}
          />
        ) : isAdmin ? (
          <AdminAnalyticsContent />
        ) : (
          <AnalyticsContent user={user} />
        )}
      </main>
    </div>
  );
}
