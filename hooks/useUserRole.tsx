import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

type AppRole = "admin" | "moderator" | "volunteer" | "organization";

interface UseUserRoleReturn {
  role: AppRole | null;
  isLoading: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  isVolunteer: boolean;
  isOrganization: boolean;
}

export function useUserRole(user: User | null): UseUserRoleReturn {
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      if (!user) {
        setRole(null);
        setIsLoading(true);
        return;
      }

      setIsLoading(true);

      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();

        if (error) {
          console.error("Error fetching user role:", error instanceof Error ? error.message : "Unknown error");
          setRole("volunteer");
        } else {
          setRole(data?.role as AppRole || "volunteer");
        }
      } catch (err) {
        console.error("Error fetching user role:", err instanceof Error ? err.message : "Unknown error");
        setRole("volunteer");
      } finally {
        setIsLoading(false);
      }
    }

    fetchRole();
  }, [user]);

  return {
    role,
    isLoading,
    isAdmin: role === "admin",
    isModerator: role === "moderator",
    isVolunteer: role === "volunteer",
    isOrganization: role === "organization",
  };
}
