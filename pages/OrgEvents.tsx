import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  CalendarDays,
  MapPin,
  Users,
  Clock,
  Mail,
  School,
  GraduationCap,
  MapPinned,
  Search,
  Loader2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  Download,
  MessageSquare,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { performLogout } from "@/lib/logout";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

interface OrgEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string;
  location: string;
  max_capacity: number;
  contact_info: string | null;
  created_at: string;
}

interface Registrant {
  user_id: string;
  signed_up_at: string;
  verification_status: string;
  note_to_org: string | null;
  name: string | null;
  email: string | null;
  school: string | null;
  grade: string | null;
  city: string | null;
}

type EventStatus = "upcoming" | "today" | "past";

function getEventStatus(eventDate: string): EventStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ed = new Date(`${eventDate}T00:00:00`);
  if (ed.getTime() === today.getTime()) return "today";
  if (ed.getTime() > today.getTime()) return "upcoming";
  return "past";
}

function statusBadge(status: EventStatus) {
  if (status === "today")
    return <Badge className="bg-accent/20 text-accent border-accent/30">Today</Badge>;
  if (status === "upcoming")
    return <Badge className="bg-success/20 text-success border-success/30">Upcoming</Badge>;
  return <Badge variant="outline" className="text-muted-foreground">Past</Badge>;
}

export default function OrgEvents() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const { isLoading: isRoleLoading, isAdmin, isOrganization } = useUserRole(user);

  const [orgId, setOrgId] = useState<string | null>(null);
  const [events, setEvents] = useState<OrgEvent[]>([]);
  const [signupCounts, setSignupCounts] = useState<Record<string, number>>({});
  const [registrantsByEvent, setRegistrantsByEvent] = useState<Record<string, Registrant[]>>({});
  const [loadingRegistrants, setLoadingRegistrants] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | EventStatus>("all");
  const [isLoading, setIsLoading] = useState(true);

  // Auth
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
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

  // Redirect non-organizations
  useEffect(() => {
    if (!user || isRoleLoading) return;
    if (!isOrganization) {
      navigate("/dashboard");
    }
  }, [user, isOrganization, isRoleLoading, navigate]);

  // Fetch org id
  useEffect(() => {
    if (!user) return;
    const run = async () => {
      const { data } = await supabase
        .from("organizations")
        .select("id")
        .eq("user_id", user.id)
        .single() as any;
      if (data) setOrgId(data.id);
    };
    run();
  }, [user]);

  // Fetch events
  useEffect(() => {
    if (!orgId) return;
    const run = async () => {
      setIsLoading(true);
      try {
        const { data: eventsData, error } = await supabase
          .from("events")
          .select("*")
          .eq("organization_id", orgId)
          .order("event_date", { ascending: false }) as any;
        if (error) throw error;

        setEvents(eventsData || []);

        const ids = (eventsData || []).map((e: any) => e.id);
        if (ids.length > 0) {
          const { data: signups } = await supabase
            .from("event_signups")
            .select("event_id")
            .in("event_id", ids) as any;
          const counts: Record<string, number> = {};
          (signups || []).forEach((s: any) => {
            counts[s.event_id] = (counts[s.event_id] || 0) + 1;
          });
          setSignupCounts(counts);
        }
      } catch (err) {
        console.error("Error loading events:", err instanceof Error ? err.message : "Unknown");
        toast.error("Failed to load events");
      } finally {
        setIsLoading(false);
      }
    };
    run();
  }, [orgId]);

  const loadRegistrants = async (eventId: string) => {
    if (registrantsByEvent[eventId]) return;
    setLoadingRegistrants((p) => ({ ...p, [eventId]: true }));
    try {
      const { data: signups, error } = await supabase
        .from("event_signups")
        .select("user_id, signed_up_at, verification_status, note_to_org")
        .eq("event_id", eventId)
        .order("signed_up_at", { ascending: true }) as any;
      if (error) throw error;

      if (!signups || signups.length === 0) {
        setRegistrantsByEvent((p) => ({ ...p, [eventId]: [] }));
        return;
      }

      const userIds = signups.map((s: any) => s.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, email, school, grade, city")
        .in("id", userIds) as any;

      const profileMap: Record<string, any> = {};
      (profiles || []).forEach((p: any) => { profileMap[p.id] = p; });

      const list: Registrant[] = signups.map((s: any) => ({
        user_id: s.user_id,
        signed_up_at: s.signed_up_at,
        verification_status: s.verification_status,
        note_to_org: s.note_to_org ?? null,
        name: profileMap[s.user_id]?.name || null,
        email: profileMap[s.user_id]?.email || null,
        school: profileMap[s.user_id]?.school || null,
        grade: profileMap[s.user_id]?.grade || null,
        city: profileMap[s.user_id]?.city || null,
      }));

      setRegistrantsByEvent((p) => ({ ...p, [eventId]: list }));
    } catch (err) {
      console.error("Error loading registrants:", err instanceof Error ? err.message : "Unknown");
      toast.error("Failed to load registrants");
    } finally {
      setLoadingRegistrants((p) => ({ ...p, [eventId]: false }));
    }
  };

  const toggleExpand = (eventId: string) => {
    setExpanded((p) => {
      const next = { ...p, [eventId]: !p[eventId] };
      if (next[eventId]) loadRegistrants(eventId);
      return next;
    });
  };

  const csvEscape = (val: string | number | null | undefined) => {
    const s = val === null || val === undefined ? "" : String(val);
    return `"${s.replace(/"/g, '""')}"`;
  };

  const downloadCsv = (filename: string, rows: string[][]) => {
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportEventCsv = async (event: OrgEvent) => {
    let regs = registrantsByEvent[event.id];
    if (!regs) {
      await loadRegistrants(event.id);
      regs = registrantsByEvent[event.id];
    }
    if (!regs || regs.length === 0) {
      toast.error("No signups to export");
      return;
    }
    const header = [
      "Name",
      "Email",
      "School",
      "Grade",
      "City",
      "Signed Up At",
      "Verification Status",
      "Note to Organization",
    ];
    const rows = regs.map((r) => [
      csvEscape(r.name),
      csvEscape(r.email),
      csvEscape(r.school),
      csvEscape(r.grade),
      csvEscape(r.city),
      csvEscape(format(new Date(r.signed_up_at), "yyyy-MM-dd HH:mm")),
      csvEscape(r.verification_status || "registered"),
      csvEscape(r.note_to_org),
    ]);
    const safeTitle = event.title.replace(/[^a-z0-9-_]+/gi, "_").slice(0, 60);
    downloadCsv(`signups_${safeTitle}_${event.event_date}.csv`, [header, ...rows]);
    if (typeof pendo !== 'undefined') {
      pendo.track("org_event_signups_exported", {
        export_scope: "single_event",
        event_count: 1,
        signup_count: regs.length,
      });
    }
    toast.success("CSV exported");
  };

  const exportAllCsv = async () => {
    if (filteredEvents.length === 0) {
      toast.error("No events to export");
      return;
    }
    // Make sure registrants are loaded for all visible events
    await Promise.all(
      filteredEvents
        .filter((e) => !registrantsByEvent[e.id])
        .map((e) => loadRegistrants(e.id))
    );

    const header = [
      "Event",
      "Event Date",
      "Event Time",
      "Location",
      "Volunteer Name",
      "Email",
      "School",
      "Grade",
      "City",
      "Signed Up At",
      "Verification Status",
      "Note to Organization",
    ];
    const rows: string[][] = [];
    filteredEvents.forEach((ev) => {
      const regs = registrantsByEvent[ev.id] || [];
      regs.forEach((r) => {
        rows.push([
          csvEscape(ev.title),
          csvEscape(ev.event_date),
          csvEscape(ev.event_time?.slice(0, 5)),
          csvEscape(ev.location),
          csvEscape(r.name),
          csvEscape(r.email),
          csvEscape(r.school),
          csvEscape(r.grade),
          csvEscape(r.city),
          csvEscape(format(new Date(r.signed_up_at), "yyyy-MM-dd HH:mm")),
          csvEscape(r.verification_status || "registered"),
          csvEscape(r.note_to_org),
        ]);
      });
    });

    if (rows.length === 0) {
      toast.error("No signups to export");
      return;
    }
    downloadCsv(`all_event_signups_${new Date().toISOString().slice(0, 10)}.csv`, [header, ...rows]);
    if (typeof pendo !== 'undefined') {
      pendo.track("org_event_signups_exported", {
        export_scope: "all_events",
        event_count: filteredEvents.length,
        signup_count: rows.length,
      });
    }
    toast.success("CSV exported");
  };

  const handleLogout = async () => {
    await performLogout("/");
  };

  const filteredEvents = events.filter((e) => {
    const status = getEventStatus(e.event_date);
    if (statusFilter !== "all" && status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (
        !e.title.toLowerCase().includes(q) &&
        !e.location.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  if (authLoading || isRoleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!user || !isOrganization) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar
        isAuthenticated
        onLogout={handleLogout}
        isAdmin={isAdmin}
        isOrganization={isOrganization}
        isRoleLoading={isRoleLoading}
      />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"
          data-tour="org-events-header"
        >
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
              Events
            </h1>
            <p className="text-muted-foreground">
              View all your events, their status, and the volunteers who signed up.
            </p>
          </div>
          <Button
            onClick={exportAllCsv}
            variant="outline"
            className="gap-2 self-start sm:self-auto"
            data-tour="org-events-export"
          >
            <Download className="w-4 h-4" />
            Export All Signups (CSV)
          </Button>
        </motion.div>

        {/* Filters */}
        <Card variant="elevated" className="mb-6" data-tour="org-events-filters">
          <CardContent className="p-4 flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by title or location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {(["all", "upcoming", "today", "past"] as const).map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={statusFilter === s ? "default" : "outline"}
                  onClick={() => setStatusFilter(s)}
                  className="capitalize"
                >
                  {s}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Events list */}
        <div data-tour="org-events-list">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : filteredEvents.length === 0 ? (
          <Card variant="elevated">
            <CardContent className="p-12 text-center">
              <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-display text-xl font-semibold mb-2">
                No events found
              </h3>
              <p className="text-muted-foreground">
                {events.length === 0
                  ? "You haven't created any events yet."
                  : "No events match your current filters."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredEvents.map((event) => {
              const status = getEventStatus(event.event_date);
              const count = signupCounts[event.id] || 0;
              const isOpen = !!expanded[event.id];
              const registrants = registrantsByEvent[event.id] || [];
              const loading = !!loadingRegistrants[event.id];

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card variant="elevated">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <CardTitle className="text-xl">{event.title}</CardTitle>
                            {statusBadge(status)}
                          </div>
                          <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <CalendarDays className="w-4 h-4" />
                              {format(new Date(`${event.event_date}T00:00:00`), "MMM d, yyyy")}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-4 h-4" />
                              {event.event_time?.slice(0, 5)}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <MapPin className="w-4 h-4" />
                              {event.location}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Users className="w-4 h-4" />
                              {count} / {event.max_capacity} signed up
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => exportEventCsv(event)}
                            className="gap-2"
                            title="Export this event's signups as CSV"
                          >
                            <Download className="w-4 h-4" />
                            CSV
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleExpand(event.id)}
                            className="gap-2"
                          >
                            {isOpen ? (
                              <>
                                Hide signups <ChevronUp className="w-4 h-4" />
                              </>
                            ) : (
                              <>
                                View signups <ChevronDown className="w-4 h-4" />
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    {isOpen && (
                      <CardContent className="pt-0">
                        {loading ? (
                          <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-accent" />
                          </div>
                        ) : registrants.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
                            <AlertCircle className="w-6 h-6" />
                            No one has signed up for this event yet.
                          </div>
                        ) : (
                          <div className="overflow-x-auto rounded-lg border border-border/50">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Volunteer</TableHead>
                                  <TableHead>Contact</TableHead>
                                  <TableHead>School / Grade</TableHead>
                                  <TableHead>City</TableHead>
                                  <TableHead>Signed Up</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead className="min-w-[200px]">Note</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {registrants.map((r) => (
                                  <TableRow key={r.user_id}>
                                    <TableCell className="font-medium">
                                      {r.name || "Unknown"}
                                    </TableCell>
                                    <TableCell>
                                      {r.email ? (
                                        <a
                                          href={`mailto:${r.email}`}
                                          className="text-accent hover:underline flex items-center gap-1.5 text-sm"
                                        >
                                          <Mail className="w-3.5 h-3.5" />
                                          {r.email}
                                        </a>
                                      ) : (
                                        <span className="text-muted-foreground text-sm">—</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                      {r.school || r.grade ? (
                                        <span className="flex flex-col">
                                          {r.school && (
                                            <span className="flex items-center gap-1.5">
                                              <School className="w-3.5 h-3.5" /> {r.school}
                                            </span>
                                          )}
                                          {r.grade && (
                                            <span className="flex items-center gap-1.5">
                                              <GraduationCap className="w-3.5 h-3.5" /> {r.grade}
                                            </span>
                                          )}
                                        </span>
                                      ) : (
                                        "—"
                                      )}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                      {r.city ? (
                                        <span className="flex items-center gap-1.5">
                                          <MapPinned className="w-3.5 h-3.5" /> {r.city}
                                        </span>
                                      ) : (
                                        "—"
                                      )}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                      {format(new Date(r.signed_up_at), "MMM d, yyyy h:mm a")}
                                    </TableCell>
                                    <TableCell>
                                      {r.verification_status === "approved" ? (
                                        <Badge className="bg-success/20 text-success border-success/30 gap-1">
                                          <CheckCircle2 className="w-3 h-3" /> Verified
                                        </Badge>
                                      ) : r.verification_status === "pending" ? (
                                        <Badge className="bg-accent/20 text-accent border-accent/30">
                                          Pending
                                        </Badge>
                                      ) : r.verification_status === "rejected" ? (
                                        <Badge variant="destructive">Rejected</Badge>
                                      ) : (
                                        <Badge variant="outline">Registered</Badge>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                      {r.note_to_org ? (
                                        <div className="flex items-start gap-1.5 text-foreground max-w-md">
                                          <MessageSquare className="w-3.5 h-3.5 mt-0.5 text-accent flex-shrink-0" />
                                          <span className="whitespace-pre-wrap break-words">
                                            {r.note_to_org}
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-muted-foreground">—</span>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
        </div>
      </main>
    </div>
  );
}
