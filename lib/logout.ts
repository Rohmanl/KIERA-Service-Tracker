import { supabase } from "@/integrations/supabase/client";
import { queryClient } from "@/lib/queryClient";

/**
 * Deep-clean logout: destroys the Supabase session, wipes the TanStack Query
 * cache, clears auth-related browser storage, and performs a hard redirect
 * to fully reset the React tree so a different account can sign in cleanly.
 */
export async function performLogout(redirectTo: string = "/"): Promise<void> {
  // 1. End session on the backend and clear Supabase's own local storage.
  try {
    await supabase.auth.signOut({ scope: "global" });
  } catch (err) {
    // Even if the network call fails, continue clearing local state.
    console.error("signOut failed:", err instanceof Error ? err.message : err);
  }

  // 2. Wipe all cached query data so the previous user's data can't leak.
  try {
    queryClient.clear();
  } catch (err) {
    console.error("queryClient.clear failed:", err);
  }

  // 3. Clear any leftover Supabase / app auth artifacts from web storage.
  try {
    const purge = (storage: Storage) => {
      const keys: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (!key) continue;
        if (
          key.startsWith("sb-") ||
          key.startsWith("supabase.") ||
          key.includes("supabase.auth")
        ) {
          keys.push(key);
        }
      }
      keys.forEach((k) => storage.removeItem(k));
    };
    purge(localStorage);
    purge(sessionStorage);

    // App-specific keys (product tour flags, etc. that shouldn't bleed between accounts).
    ["productTourSeen", "adminTourSeen", "orgTourSeen"].forEach((k) => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
  } catch (err) {
    console.error("storage purge failed:", err);
  }

  // 4. Hard redirect to reset the entire React tree and in-memory state.
  window.location.replace(redirectTo);
}
