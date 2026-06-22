import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches admin hour-adjustment deltas (new_value - old_value) summed per user.
 * Used so admin edits to a volunteer's total hours actually take effect across
 * the dynamically-computed displays (which sum approved volunteer_hours rows).
 */
export async function fetchAdjustmentDeltas(
  userIds?: string[]
): Promise<Record<string, number>> {
  let query = supabase.from("admin_adjustments").select("user_id, old_value, new_value");
  if (userIds && userIds.length > 0) {
    query = query.in("user_id", userIds);
  }
  const { data, error } = await query;
  if (error || !data) return {};
  const map: Record<string, number> = {};
  data.forEach((r: any) => {
    const delta = Number(r.new_value) - Number(r.old_value);
    map[r.user_id] = (map[r.user_id] || 0) + delta;
  });
  return map;
}

export async function fetchUserAdjustmentDelta(userId: string): Promise<number> {
  const map = await fetchAdjustmentDeltas([userId]);
  return map[userId] || 0;
}
