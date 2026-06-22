import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, CalendarDays, MapPin, Users, Clock, Building2, ImageIcon, CheckCircle2, Phone, List, Map as MapIcon } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { EventMap } from "@/components/explore/EventMap";
import { format } from "date-fns";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { performLogout } from "@/lib/logout";
import { useUserRole } from "@/hooks/useUserRole";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";

interface EventWithDetails {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string;
  location: string;
  max_capacity: number;
  image_url: string | null;
  contact_info: string | null;
  organization_id: string;
  org_name: string;
  signup_count: number;
  user_signed_up: boolean;
  user_attended: boolean;
  claimed_hours: number | null;
  verification_status: string;
}

export default function Explore() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const { isAdmin, isOrganization, isLoading: isRoleLoading } = useUserRole(user);

  const [events, setEvents] = useState<EventWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [signingUp, setSigningUp] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventWithDetails | null>(null);
  const [claimHoursInput, setClaimHoursInput] = useState("");
  const [submittingClaim, setSubmittingClaim] = useState(false);
  const [signupNoteEvent, setSignupNoteEvent] = useState<EventWithDetails | null>(null);
  const [signupNote, setSignupNote] = useState("");
  const [view, setView] = useState<"list" | "map">("list");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
      if (!session?.user) navigate("/auth");
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
      if (!session?.user) navigate("/auth");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  // Redirect non-volunteers away
  useEffect(() => {
    if (!isRoleLoading && user && (isAdmin || isOrganization)) {
      navigate("/dashboard");
    }
  }, [isRoleLoading, isAdmin, isOrganization, user, navigate]);

  const fetchEvents = async () => {
    if (!user) return;
    setLoading(true);

    // Fetch upcoming events
    const today = new Date().toISOString().split("T")[0];
    const { data: eventsData, error: eventsError } = await supabase
      .from("events")
      .select("*")
      .gte("event_date", today)
      .order("event_date", { ascending: true });

    if (eventsError) {
      console.error("Error fetching events:", eventsError.message);
      setLoading(false);
      return;
    }

    if (!eventsData || eventsData.length === 0) {
      setEvents([]);
      setLoading(false);
      return;
    }

    // Fetch signup counts (via SECURITY DEFINER RPC) + the current user's own signup rows
    const eventIds = eventsData.map((e) => e.id);
    const [countsRes, mySignupsRes] = await Promise.all([
      supabase.rpc("get_event_signup_counts" as any, { _event_ids: eventIds }),
      supabase
        .from("event_signups")
        .select("event_id, user_id, claimed_hours, verification_status")
        .eq("user_id", user.id)
        .in("event_id", eventIds),
    ]);
    const countsMap = new Map<string, number>(
      ((countsRes.data as any[]) || []).map((r) => [r.event_id, Number(r.signup_count)])
    );
    const signups = mySignupsRes.data || [];

    // Fetch org names
    const orgIds = [...new Set(eventsData.map((e) => e.organization_id))];
    const { data: orgs } = await supabase
      .from("organizations")
      .select("id, org_name")
      .in("id", orgIds);

    // Fetch user's attendance records (platform source, approved)
    const { data: attendanceRecords } = await supabase
      .from("volunteer_hours")
      .select("organization, date")
      .eq("user_id", user.id)
      .eq("source", "platform")
      .eq("status", "approved");

    const orgMap = new Map((orgs || []).map((o) => [o.id, o.org_name]));

    const enriched: EventWithDetails[] = eventsData.map((ev) => {
      const userSignup = signups.find((s) => s.event_id === ev.id);
      const attended = (attendanceRecords || []).some(
        (a) => a.organization === ev.title
      );
      return {
        id: ev.id,
        title: ev.title,
        description: ev.description,
        event_date: ev.event_date,
        event_time: ev.event_time,
        location: ev.location,
        max_capacity: ev.max_capacity,
        image_url: (ev as any).image_url || null,
        contact_info: (ev as any).contact_info || null,
        organization_id: ev.organization_id,
        org_name: orgMap.get(ev.organization_id) || "Organization",
        signup_count: countsMap.get(ev.id) ?? 0,
        user_signed_up: !!userSignup,
        user_attended: attended,
        claimed_hours: (userSignup as any)?.claimed_hours ?? null,
        verification_status: (userSignup as any)?.verification_status ?? "none",
      };
    });

    setEvents(enriched);
    setLoading(false);
  };

  useEffect(() => {
    if (user && !isRoleLoading) fetchEvents();
  }, [user, isRoleLoading]);

  const openSignupDialog = (ev: EventWithDetails) => {
    setSignupNoteEvent(ev);
    setSignupNote("");
    setSelectedEvent(null);
  };

  const handleConfirmSignUp = async () => {
    if (!user || !signupNoteEvent) return;
    const eventId = signupNoteEvent.id;
    const note = signupNote.trim();
    if (note.length > 500) {
      toast.error("Note must be 500 characters or less");
      return;
    }
    setSigningUp(eventId);
    const { error } = await supabase
      .from("event_signups")
      .insert({
        event_id: eventId,
        user_id: user.id,
        note_to_org: note || null,
      } as any);

    if (error) {
      toast.error(error.message.includes("duplicate") ? "You're already signed up" : "Failed to sign up");
    } else {
      toast.success("You're signed up!");
      setSignupNoteEvent(null);
      setSignupNote("");
      await fetchEvents();
    }
    setSigningUp(null);
  };

  const handleCancel = async (eventId: string) => {
    if (!user) return;
    setSigningUp(eventId);
    const { error } = await supabase
      .from("event_signups")
      .delete()
      .eq("event_id", eventId)
      .eq("user_id", user.id);

    if (error) {
      toast.error("Failed to cancel signup");
    } else {
      toast.success("Signup cancelled");
      await fetchEvents();
    }
    setSigningUp(null);
  };

  const handleLogout = async () => {
    await performLogout("/");
  };

  const handleClaimHours = async (eventId: string) => {
    if (!user) return;
    const hours = parseFloat(claimHoursInput);
    if (isNaN(hours) || hours < 0.5 || hours > 24) {
      toast.error("Please enter valid hours (0.5–24)");
      return;
    }
    setSubmittingClaim(true);
    try {
      const { error } = await supabase
        .from("event_signups")
        .update({ claimed_hours: hours, verification_status: "pending" } as any)
        .eq("event_id", eventId)
        .eq("user_id", user.id);
      if (error) throw error;
      toast.success("Hours submitted for verification!");
      setClaimHoursInput("");
      await fetchEvents();
      // Update selectedEvent in place
      setSelectedEvent((prev) =>
        prev ? { ...prev, claimed_hours: hours, verification_status: "pending" } : prev
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit hours");
    } finally {
      setSubmittingClaim(false);
    }
  };

  const filtered = events.filter((ev) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      ev.title?.toLowerCase().includes(q) ||
      ev.location?.toLowerCase().includes(q) ||
      ev.org_name?.toLowerCase().includes(q) ||
      false
    );
  });

  if (authLoading || isRoleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar isAuthenticated onLogout={handleLogout} />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-display font-bold">Explore</h1>
              <p className="text-muted-foreground mt-1">Discover opportunities and sign up for events</p>
            </div>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, location, or org..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex justify-center mb-6">
            <ToggleGroup
              type="single"
              value={view}
              onValueChange={(v) => v && setView(v as "list" | "map")}
              className="bg-muted/40 backdrop-blur border border-border rounded-lg p-1"
            >
              <ToggleGroupItem value="list" aria-label="List view" className="px-4 gap-2 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground">
                <List className="h-4 w-4" />
                List View
              </ToggleGroupItem>
              <ToggleGroupItem value="map" aria-label="Map view" className="px-4 gap-2 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground">
                <MapIcon className="h-4 w-4" />
                Map View
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent" />
            </div>
          ) : filtered.length === 0 ? (
            <Card variant="glass" className="text-center py-16">
              <CardContent>
                <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-muted-foreground">
                  {searchQuery ? "No events match your search" : "No upcoming events available"}
                </p>
              </CardContent>
            </Card>
          ) : view === "map" ? (
            <EventMap
              events={filtered.map((ev) => ({
                id: ev.id,
                title: ev.title,
                org_name: ev.org_name,
                event_date: ev.event_date,
                location: ev.location,
              }))}
              onSelect={(id) => {
                const ev = filtered.find((e) => e.id === id);
                if (ev) setSelectedEvent(ev);
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filtered.map((ev, i) => {
                const spotsLeft = ev.max_capacity - ev.signup_count;
                const isFull = spotsLeft <= 0;
                const fillPercent = Math.min(Math.round((ev.signup_count / ev.max_capacity) * 100), 100);

                return (
                  <motion.div
                    key={ev.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card variant="feature" className="flex flex-col h-full cursor-pointer overflow-hidden" onClick={() => setSelectedEvent(ev)}>
                      {/* Cover Image */}
                       <div className="relative w-full h-36 bg-muted">
                        {ev.image_url ? (
                          <img src={ev.image_url} alt={ev.title} className="w-full h-full object-contain" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-accent/20 via-primary/10 to-accent/5 flex items-center justify-center">
                            <ImageIcon className="h-10 w-10 text-muted-foreground/30" />
                          </div>
                        )}
                        {isFull ? (
                          <Badge variant="destructive" className="absolute top-3 right-3">Full</Badge>
                        ) : spotsLeft <= 3 ? (
                          <Badge variant="secondary" className="absolute top-3 right-3 bg-warning/90 text-warning-foreground border-0">
                            {spotsLeft} left
                          </Badge>
                        ) : null}
                      </div>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg leading-snug">{ev.title}</CardTitle>
                        <div className="flex items-center gap-1.5 text-sm text-accent mt-1 font-medium">
                          <Building2 className="h-3.5 w-3.5" />
                          {ev.org_name}
                        </div>
                      </CardHeader>
                      <CardContent className="flex flex-col flex-1 gap-4">
                        {ev.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{ev.description}</p>
                        )}

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <CalendarDays className="h-4 w-4 shrink-0" />
                            {format(new Date(ev.event_date + "T00:00:00"), "MMM d, yyyy")}
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4 shrink-0" />
                            {ev.event_time.slice(0, 5)}
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-4 w-4 shrink-0" />
                            {ev.location}
                          </div>
                        </div>

                        <div className="mt-auto space-y-2 pt-2">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" />
                              {ev.signup_count} / {ev.max_capacity} filled
                            </span>
                            <span>{fillPercent}%</span>
                          </div>
                          <Progress value={fillPercent} className="h-2" />

                          {ev.user_attended ? (
                            <Button variant="default" className="w-full" disabled>
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Attended
                            </Button>
                          ) : ev.user_signed_up ? (
                            <Button
                              variant="outline"
                              className="w-full"
                              disabled={signingUp === ev.id}
                              onClick={(e) => { e.stopPropagation(); handleCancel(ev.id); }}
                            >
                              {signingUp === ev.id ? "Cancelling..." : "Cancel Signup"}
                            </Button>
                          ) : (
                            <Button
                              variant="default"
                              className="w-full"
                              disabled={isFull || signingUp === ev.id}
                              onClick={(e) => { e.stopPropagation(); openSignupDialog(ev); }}
                            >
                              {signingUp === ev.id ? "Signing up..." : isFull ? "Event Full" : "Sign Up"}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Event Detail Dialog */}
        <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
          <DialogContent className="max-w-md">
            {selectedEvent && (() => {
              const spotsLeft = selectedEvent.max_capacity - selectedEvent.signup_count;
              const isFull = spotsLeft <= 0;
              const fillPercent = Math.min(Math.round((selectedEvent.signup_count / selectedEvent.max_capacity) * 100), 100);
              return (
                <>
                   {selectedEvent.image_url && (
                    <div className="-mx-6 -mt-6 mb-2 bg-muted">
                      <img src={selectedEvent.image_url} alt={selectedEvent.title} className="w-full h-48 object-contain rounded-t-lg" />
                    </div>
                  )}
                  <DialogHeader>
                    <DialogTitle className="text-xl">{selectedEvent.title}</DialogTitle>
                    <div className="flex items-center gap-1.5 text-sm text-accent font-medium mt-1">
                      <Building2 className="h-4 w-4" />
                      {selectedEvent.org_name}
                    </div>
                  </DialogHeader>

                  <div className="space-y-4 pt-2">
                    {selectedEvent.description && (
                      <p className="text-sm text-muted-foreground">{selectedEvent.description}</p>
                    )}

                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        <span>{format(new Date(selectedEvent.event_date + "T00:00:00"), "EEEE, MMMM d, yyyy")}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedEvent.event_time.slice(0, 5)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedEvent.location}</span>
                      </div>
                      {selectedEvent.contact_info && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{selectedEvent.contact_info}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {selectedEvent.signup_count} / {selectedEvent.max_capacity} filled
                        </span>
                        <span>{isFull ? "Full" : `${spotsLeft} spots left`}</span>
                      </div>
                      <Progress value={fillPercent} className="h-2" />
                    </div>

                    {selectedEvent.user_attended ? (
                      <Button variant="default" className="w-full" disabled>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Attended
                      </Button>
                    ) : selectedEvent.user_signed_up ? (
                      <div className="space-y-3">
                        {/* Submit Hours / Claim Section */}
                        {selectedEvent.verification_status === "verified" ? (
                          <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 p-3 text-center">
                            <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto mb-1" />
                            <p className="text-sm font-medium text-green-700 dark:text-green-400">Hours Verified</p>
                            <p className="text-xs text-muted-foreground">{selectedEvent.claimed_hours}h verified by organization</p>
                          </div>
                        ) : selectedEvent.verification_status === "pending" ? (
                          <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800 p-3 text-center">
                            <Clock className="h-5 w-5 text-yellow-600 mx-auto mb-1" />
                            <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">Pending Verification</p>
                            <p className="text-xs text-muted-foreground">{selectedEvent.claimed_hours}h submitted — awaiting organization approval</p>
                          </div>
                        ) : selectedEvent.verification_status === "rejected" ? (
                          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2">
                            <div className="text-center mb-2">
                              <p className="text-sm font-medium text-destructive">Hours Rejected</p>
                              <p className="text-xs text-muted-foreground">The organization did not verify your previous submission. You can resubmit.</p>
                            </div>
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                min="0.5"
                                max="24"
                                step="0.5"
                                placeholder="Hours (e.g. 3)"
                                value={claimHoursInput}
                                onChange={(e) => setClaimHoursInput(e.target.value)}
                                className="flex-1 h-9"
                              />
                              <Button
                                size="sm"
                                disabled={submittingClaim || !claimHoursInput || parseFloat(claimHoursInput) < 0.5}
                                onClick={() => handleClaimHours(selectedEvent.id)}
                                className="h-9"
                              >
                                {submittingClaim ? "Resubmitting..." : "Resubmit"}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                            <p className="text-sm font-medium">Submit Your Hours</p>
                            <p className="text-xs text-muted-foreground">Enter the hours you volunteered and request verification from the organization.</p>
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                min="0.5"
                                max="24"
                                step="0.5"
                                placeholder="Hours (e.g. 3)"
                                value={claimHoursInput}
                                onChange={(e) => setClaimHoursInput(e.target.value)}
                                className="flex-1 h-9"
                              />
                              <Button
                                size="sm"
                                disabled={submittingClaim || !claimHoursInput || parseFloat(claimHoursInput) < 0.5}
                                onClick={() => handleClaimHours(selectedEvent.id)}
                                className="h-9"
                              >
                                {submittingClaim ? "Submitting..." : "Request Verification"}
                              </Button>
                            </div>
                          </div>
                        )}
                        <Button
                          variant="outline"
                          className="w-full"
                          disabled={signingUp === selectedEvent.id}
                          onClick={() => { handleCancel(selectedEvent.id); setSelectedEvent(null); }}
                        >
                          {signingUp === selectedEvent.id ? "Cancelling..." : "Cancel Signup"}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="default"
                        className="w-full"
                        disabled={isFull || signingUp === selectedEvent.id}
                        onClick={() => openSignupDialog(selectedEvent)}
                      >
                        {signingUp === selectedEvent.id ? "Signing up..." : isFull ? "Event Full" : "Sign Up"}
                      </Button>
                    )}
                  </div>
                </>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* Sign-Up Note Dialog */}
        <Dialog
          open={!!signupNoteEvent}
          onOpenChange={(open) => {
            if (!open) {
              setSignupNoteEvent(null);
              setSignupNote("");
            }
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Sign up for {signupNoteEvent?.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <Label htmlFor="signup-note" className="text-sm">
                Note to organization{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                id="signup-note"
                placeholder="Anything the organizers should know? (e.g. dietary needs, arrival time, questions)"
                value={signupNote}
                onChange={(e) => setSignupNote(e.target.value)}
                maxLength={500}
                rows={4}
              />
              <p className="text-xs text-muted-foreground text-right">
                {signupNote.length}/500
              </p>
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSignupNoteEvent(null);
                  setSignupNote("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmSignUp}
                disabled={!!signingUp}
              >
                {signingUp ? "Signing up..." : "Confirm Sign Up"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
