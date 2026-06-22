import { useEffect, useState, useRef } from "react";
import { User } from "@supabase/supabase-js";
import { motion } from "framer-motion";
import { Building2, Clock, Users, CheckCircle, Plus, CalendarDays, MapPin, Loader2, Pencil, Trash2, ImagePlus, X, Eye, Mail, School, GraduationCap, MapPinned, Phone, Search, Download, Award, HelpCircle } from "lucide-react";
import { format } from "date-fns";
import { z } from "zod";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { startOrgTour } from "@/components/dashboard/OrgProductTour";

interface OrgDashboardProps {
  user: User;
  orgName: string;
}

interface OrgEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string;
  location: string;
  max_capacity: number;
  image_url: string | null;
  contact_info: string | null;
  created_at: string;
  signup_count: number;
}

interface Registrant {
  id: string;
  name: string | null;
  email: string | null;
  school: string | null;
  grade: string | null;
  city: string | null;
  signed_up_at: string;
  attended: boolean;
  attended_hours: number | null;
  claimed_hours: number | null;
  verification_status: string;
}

const eventSchema = z.object({
  title: z.string().trim().min(2, "Title must be at least 2 characters").max(200),
  description: z.string().trim().max(1000).optional(),
  event_date: z.string().min(1, "Date is required"),
  event_time: z.string().min(1, "Time is required"),
  location: z.string().trim().min(2, "Location is required").max(300),
  max_capacity: z.number().int().min(1, "Must allow at least 1 volunteer").max(10000),
});

export default function OrgDashboard({ user, orgName }: OrgDashboardProps) {
  const [events, setEvents] = useState<OrgEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [editingEvent, setEditingEvent] = useState<OrgEvent | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    event_date: "",
    event_time: "",
    location: "",
    max_capacity: 10,
    contact_info: "",
  });
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    event_date: "",
    event_time: "",
    location: "",
    max_capacity: 10,
    contact_info: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [registrantsDialogOpen, setRegistrantsDialogOpen] = useState(false);
  const [registrantsEvent, setRegistrantsEvent] = useState<OrgEvent | null>(null);
  const [registrants, setRegistrants] = useState<Registrant[]>([]);
  const [loadingRegistrants, setLoadingRegistrants] = useState(false);
  const [markingAttended, setMarkingAttended] = useState<string | null>(null);
  const [attendanceHours, setAttendanceHours] = useState<Record<string, string>>({});
  const [eventSearchQuery, setEventSearchQuery] = useState("");
  const [pendingHours, setPendingHours] = useState<any[]>([]);
  const [loadingPendingHours, setLoadingPendingHours] = useState(false);
  const [processingHourId, setProcessingHourId] = useState<string | null>(null);
  const [impactStats, setImpactStats] = useState({ totalEvents: 0, totalVolunteers: 0, totalVerifiedHours: 0 });
  const [verifiedVolunteers, setVerifiedVolunteers] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Fetch org id
  useEffect(() => {
    const fetchOrgId = async () => {
      const { data } = await supabase
        .from("organizations")
        .select("id")
        .eq("user_id", user.id)
        .single() as any;
      if (data) setOrgId(data.id);
    };
    fetchOrgId();
  }, [user.id]);

  // Fetch events
  useEffect(() => {
    if (!orgId) return;
    fetchEvents();
    fetchPendingHours();
    fetchImpactStats();
  }, [orgId]);

  const fetchImpactStats = async () => {
    if (!orgId) return;
    try {
      // Total events
      const { count: eventCount } = await supabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId) as any;

      // Total unique volunteers (signups across all events)
      const { data: orgEvents } = await supabase
        .from("events")
        .select("id")
        .eq("organization_id", orgId) as any;
      const eventIds = (orgEvents || []).map((e: any) => e.id);
      
      let uniqueVolunteers = 0;
      if (eventIds.length > 0) {
        const { data: signups } = await supabase
          .from("event_signups")
          .select("user_id")
          .in("event_id", eventIds) as any;
        uniqueVolunteers = new Set((signups || []).map((s: any) => s.user_id)).size;
      }

      // Total verified hours (from volunteer_hours where verified_by_org matches or organization_id matches)
      const { data: verifiedHoursData } = await supabase
        .from("volunteer_hours")
        .select("user_id, hours, organization, date, description")
        .eq("organization_id", orgId)
        .eq("status", "approved") as any;
      
      // Also get platform-sourced hours for this org's events
      const { data: platformHoursData } = await supabase
        .from("volunteer_hours")
        .select("user_id, hours, organization, date, description")
        .eq("source", "platform")
        .eq("status", "approved")
        .eq("verified_by_org", orgName) as any;

      const allVerified = [...(verifiedHoursData || []), ...(platformHoursData || [])];
      // Deduplicate by a composite key
      const seen = new Set<string>();
      const dedupedVerified: any[] = [];
      allVerified.forEach((v: any) => {
        const key = `${v.user_id}-${v.date}-${v.hours}`;
        if (!seen.has(key)) {
          seen.add(key);
          dedupedVerified.push(v);
        }
      });

      const totalHours = dedupedVerified.reduce((sum: number, v: any) => sum + Number(v.hours || 0), 0);
      setImpactStats({ totalEvents: eventCount || 0, totalVolunteers: uniqueVolunteers, totalVerifiedHours: totalHours });
      setVerifiedVolunteers(dedupedVerified);
    } catch (error) {
      console.error("Error fetching impact stats:", error instanceof Error ? error.message : "Unknown error");
    }
  };

  const handleExportCSV = async () => {
    if (verifiedVolunteers.length === 0) {
      toast.error("No verified volunteer data to export");
      return;
    }
    // Fetch volunteer names
    const userIds = [...new Set(verifiedVolunteers.map((v: any) => v.user_id))] as string[];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, email")
      .in("id", userIds) as any;
    const profileMap: Record<string, any> = {};
    (profiles || []).forEach((p: any) => { profileMap[p.id] = p; });

    const csvRows = [
      ["Volunteer Name", "Email", "Activity", "Hours", "Date", "Description"].join(","),
      ...verifiedVolunteers.map((v: any) => [
        `"${(profileMap[v.user_id]?.name || "Unknown").replace(/"/g, '""')}"`,
        `"${(profileMap[v.user_id]?.email || "").replace(/"/g, '""')}"`,
        `"${(v.organization || "").replace(/"/g, '""')}"`,
        v.hours,
        v.date,
        `"${(v.description || "").replace(/"/g, '""')}"`,
      ].join(","))
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${orgName.replace(/\s+/g, "_")}_verified_volunteers.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report exported!");
  };

  const fetchPendingHours = async () => {
    if (!orgId) return;
    setLoadingPendingHours(true);
    try {
      const { data, error } = await supabase
        .from("volunteer_hours")
        .select("id, user_id, organization, hours, date, description, location, status, created_at")
        .eq("organization_id", orgId)
        .eq("status", "pending")
        .order("created_at", { ascending: false }) as any;
      if (error) throw error;
      
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map((d: any) => d.user_id))] as string[];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name, email")
          .in("id", userIds) as any;
        const profileMap: Record<string, any> = {};
        (profiles || []).forEach((p: any) => { profileMap[p.id] = p; });
        
        setPendingHours(data.map((d: any) => ({
          ...d,
          volunteer_name: profileMap[d.user_id]?.name || "Unknown",
          volunteer_email: profileMap[d.user_id]?.email || "",
        })));
      } else {
        setPendingHours([]);
      }
    } catch (error) {
      console.error("Error fetching pending hours:", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoadingPendingHours(false);
    }
  };

  const fetchEvents = async () => {
    if (!orgId) return;
    setIsLoading(true);
    try {
      const { data: eventsData, error } = await supabase
        .from("events")
        .select("*")
        .eq("organization_id", orgId)
        .order("event_date", { ascending: true }) as any;

      if (error) throw error;

      // Get signup counts
      const eventIds = (eventsData || []).map((e: any) => e.id);
      let signupCounts: Record<string, number> = {};

      if (eventIds.length > 0) {
        const { data: signups } = await supabase
          .from("event_signups")
          .select("event_id")
          .in("event_id", eventIds) as any;

        (signups || []).forEach((s: any) => {
          signupCounts[s.event_id] = (signupCounts[s.event_id] || 0) + 1;
        });
      }

      const eventsWithCounts: OrgEvent[] = (eventsData || []).map((e: any) => ({
        ...e,
        signup_count: signupCounts[e.id] || 0,
      }));

      setEvents(eventsWithCounts);
    } catch (error) {
      console.error("Error fetching events:", error instanceof Error ? error.message : "Unknown error");
      toast.error("Failed to load events");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const parsed = eventSchema.safeParse({
      ...form,
      max_capacity: Number(form.max_capacity),
    });

    if (!parsed.success) {
      const newErrors: Record<string, string> = {};
      parsed.error.errors.forEach((err) => {
        if (err.path[0]) newErrors[err.path[0] as string] = err.message;
      });
      setErrors(newErrors);
      return;
    }

    if (!orgId) {
      toast.error("Organization not found");
      return;
    }

    setIsSubmitting(true);
    try {
      let imageUrl: string | null = null;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const path = `${orgId}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("event-images")
          .upload(path, imageFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("event-images").getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from("events").insert({
        organization_id: orgId,
        title: parsed.data.title,
        description: parsed.data.description || null,
        event_date: parsed.data.event_date,
        event_time: parsed.data.event_time,
        location: parsed.data.location,
        max_capacity: parsed.data.max_capacity,
        image_url: imageUrl,
        contact_info: form.contact_info.trim() || null,
      } as any);

      if (error) throw error;

      toast.success("Event created successfully!");
      setForm({ title: "", description: "", event_date: "", event_time: "", location: "", max_capacity: 10, contact_info: "" });
      setImageFile(null);
      setImagePreview(null);
      setDialogOpen(false);
      fetchEvents();
    } catch (error) {
      console.error("Error creating event:", error instanceof Error ? error.message : "Unknown error");
      toast.error("Failed to create event");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Are you sure you want to delete this event? This will also remove all signups.")) return;
    try {
      const { error } = await supabase.from("events").delete().eq("id", eventId);
      if (error) throw error;
      toast.success("Event deleted");
      fetchEvents();
    } catch (error) {
      console.error("Error deleting event:", error instanceof Error ? error.message : "Unknown error");
      toast.error("Failed to delete event");
    }
  };

  const openEditDialog = (event: OrgEvent) => {
    setEditingEvent(event);
    setEditForm({
      title: event.title,
      description: event.description || "",
      event_date: event.event_date,
      event_time: event.event_time,
      location: event.location,
      max_capacity: event.max_capacity,
      contact_info: event.contact_info || "",
    });
    setEditImageFile(null);
    setEditImagePreview(event.image_url || null);
    setErrors({});
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;
    setErrors({});

    const parsed = eventSchema.safeParse({
      ...editForm,
      max_capacity: Number(editForm.max_capacity),
    });

    if (!parsed.success) {
      const newErrors: Record<string, string> = {};
      parsed.error.errors.forEach((err) => {
        if (err.path[0]) newErrors[err.path[0] as string] = err.message;
      });
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      let imageUrl = editingEvent.image_url;
      if (editImageFile) {
        const ext = editImageFile.name.split(".").pop();
        const path = `${orgId}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("event-images")
          .upload(path, editImageFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("event-images").getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      } else if (!editImagePreview) {
        imageUrl = null;
      }

      const { error } = await supabase
        .from("events")
        .update({
          title: parsed.data.title,
          description: parsed.data.description || null,
          event_date: parsed.data.event_date,
          event_time: parsed.data.event_time,
          location: parsed.data.location,
          max_capacity: parsed.data.max_capacity,
          image_url: imageUrl,
          contact_info: editForm.contact_info.trim() || null,
        } as any)
        .eq("id", editingEvent.id);

      if (error) throw error;

      toast.success("Event updated successfully!");
      setEditDialogOpen(false);
      setEditingEvent(null);
      setEditImageFile(null);
      setEditImagePreview(null);
      fetchEvents();
    } catch (error) {
      console.error("Error updating event:", error instanceof Error ? error.message : "Unknown error");
      toast.error("Failed to update event");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalSignups = events.reduce((sum, e) => sum + e.signup_count, 0);

  const openRegistrantsDialog = async (event: OrgEvent) => {
    setRegistrantsEvent(event);
    setRegistrantsDialogOpen(true);
    setLoadingRegistrants(true);
    setAttendanceHours({});
    try {
      const { data: signups, error } = await supabase
        .from("event_signups")
        .select("user_id, signed_up_at, claimed_hours, verification_status")
        .eq("event_id", event.id) as any;
      if (error) throw error;

      if (!signups || signups.length === 0) {
        setRegistrants([]);
        setLoadingRegistrants(false);
        return;
      }

      const userIds = signups.map((s: any) => s.user_id);
      
      // Fetch profiles and existing attendance records in parallel
      const [profilesRes, attendanceRes] = await Promise.all([
        supabase.from("profiles").select("id, name, email, school, grade, city").in("id", userIds) as any,
        supabase.from("volunteer_hours").select("user_id, hours").eq("source", "platform").eq("organization", event.title).eq("date", event.event_date).in("user_id", userIds) as any,
      ]);

      const profileMap: Record<string, any> = {};
      (profilesRes.data || []).forEach((p: any) => { profileMap[p.id] = p; });

      const attendanceMap: Record<string, number> = {};
      (attendanceRes.data || []).forEach((a: any) => { attendanceMap[a.user_id] = a.hours; });

      const result: Registrant[] = signups.map((s: any) => ({
        id: s.user_id,
        signed_up_at: s.signed_up_at,
        name: profileMap[s.user_id]?.name || null,
        email: profileMap[s.user_id]?.email || null,
        school: profileMap[s.user_id]?.school || null,
        grade: profileMap[s.user_id]?.grade || null,
        city: profileMap[s.user_id]?.city || null,
        attended: s.user_id in attendanceMap,
        attended_hours: attendanceMap[s.user_id] ?? null,
        claimed_hours: s.claimed_hours ?? null,
        verification_status: s.verification_status ?? "none",
      }));

      setRegistrants(result);
    } catch (error) {
      console.error("Error fetching registrants:", error instanceof Error ? error.message : "Unknown error");
      toast.error("Failed to load registrants");
    } finally {
      setLoadingRegistrants(false);
    }
  };

  const handleVerifyHours = async (registrant: Registrant) => {
    if (!registrantsEvent || !orgId || !registrant.claimed_hours) return;
    setMarkingAttended(registrant.id);
    try {
      const { error } = await supabase.rpc("mark_event_attendance" as any, {
        _event_id: registrantsEvent.id,
        _user_id: registrant.id,
        _hours: registrant.claimed_hours,
      });
      if (error) throw error;

      await supabase
        .from("event_signups")
        .update({ verification_status: "verified" } as any)
        .eq("event_id", registrantsEvent.id)
        .eq("user_id", registrant.id);

      toast.success(`Verified ${registrant.name || "volunteer"}'s ${registrant.claimed_hours}h`);
      setRegistrants((prev) =>
        prev.map((r) =>
          r.id === registrant.id
            ? { ...r, attended: true, attended_hours: registrant.claimed_hours, verification_status: "verified" }
            : r
        )
      );
    } catch (error: any) {
      console.error("RPC Error:", JSON.stringify(error, null, 2));
      toast.error(error?.message || "Failed to verify hours");
    } finally {
      setMarkingAttended(null);
    }
  };

  const handleRejectHours = async (registrant: Registrant) => {
    if (!registrantsEvent || !orgId) return;
    setMarkingAttended(registrant.id);
    try {
      const { error } = await supabase.rpc("reject_event_hours" as any, {
        _event_id: registrantsEvent.id,
        _user_id: registrant.id,
      });
      if (error) throw error;

      toast.success(`Rejected ${registrant.name || "volunteer"}'s claim. They can resubmit.`);
      setRegistrants((prev) =>
        prev.map((r) =>
          r.id === registrant.id
            ? { ...r, claimed_hours: null, verification_status: "rejected" }
            : r
        )
      );
    } catch (error: any) {
      console.error("RPC Error:", JSON.stringify(error, null, 2));
      toast.error(error?.message || "Failed to reject hours");
    } finally {
      setMarkingAttended(null);
    }
  };

  const handleApproveManualHours = async (hourId: string) => {
    setProcessingHourId(hourId);
    try {
      const { error } = await supabase
        .from("volunteer_hours")
        .update({ status: "approved", reviewed_at: new Date().toISOString() } as any)
        .eq("id", hourId);
      if (error) throw error;
      toast.success("Hours approved!");
      fetchPendingHours();
    } catch (error: any) {
      toast.error(error?.message || "Failed to approve hours");
    } finally {
      setProcessingHourId(null);
    }
  };

  const handleDenyManualHours = async (hourId: string) => {
    setProcessingHourId(hourId);
    try {
      const { error } = await supabase
        .from("volunteer_hours")
        .update({ status: "denied", reviewed_at: new Date().toISOString() } as any)
        .eq("id", hourId);
      if (error) throw error;
      toast.success("Hours denied.");
      fetchPendingHours();
    } catch (error: any) {
      toast.error(error?.message || "Failed to deny hours");
    } finally {
      setProcessingHourId(null);
    }
  };

  // Keep legacy manual mark for fallback
  const handleMarkAttended = async (registrant: Registrant) => {
    if (!registrantsEvent || !orgId) return;
    const hours = parseFloat(attendanceHours[registrant.id] || "0");
    if (isNaN(hours) || hours <= 0 || hours > 24) {
      toast.error("Please enter valid hours (0.5–24)");
      return;
    }
    setMarkingAttended(registrant.id);
    try {
      const { error } = await supabase.rpc("mark_event_attendance" as any, {
        _event_id: registrantsEvent.id,
        _user_id: registrant.id,
        _hours: hours,
      });
      if (error) throw error;

      await supabase
        .from("event_signups")
        .update({ verification_status: "verified", claimed_hours: hours } as any)
        .eq("event_id", registrantsEvent.id)
        .eq("user_id", registrant.id);

      toast.success(`Marked ${registrant.name || "volunteer"} as attended (${hours}h)`);
      setRegistrants((prev) => prev.map((r) => r.id === registrant.id ? { ...r, attended: true, attended_hours: hours, verification_status: "verified" } : r));
    } catch (error: any) {
      console.error("RPC Error:", JSON.stringify(error, null, 2));
      toast.error(error?.message || "Failed to mark attendance");
    } finally {
      setMarkingAttended(null);
    }
  };
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8 text-accent" />
            <h1 className="font-display text-3xl md:text-4xl font-bold">
              Organization Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="default" onClick={handleExportCSV} data-tour="org-export-report">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="hero" size="lg" data-tour="org-create-event">
                  <Plus className="h-5 w-5 mr-2" />
                  Create New Event
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Event</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-3 mt-1">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Event Title</label>
                  <Input
                    placeholder="Community Park Cleanup"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                  {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    placeholder="Describe the volunteer opportunity..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={2}
                  />
                  {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Date</label>
                    <Input
                      type="date"
                      value={form.event_date}
                      onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                    />
                    {errors.event_date && <p className="text-xs text-destructive">{errors.event_date}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Time</label>
                    <Input
                      type="time"
                      value={form.event_time}
                      onChange={(e) => setForm({ ...form, event_time: e.target.value })}
                    />
                    {errors.event_time && <p className="text-xs text-destructive">{errors.event_time}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Location</label>
                    <Input
                      placeholder="Central Park, NY"
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                    />
                    {errors.location && <p className="text-xs text-destructive">{errors.location}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Max Capacity</label>
                    <Input
                      type="number"
                      min={1}
                      value={form.max_capacity}
                      onChange={(e) => setForm({ ...form, max_capacity: parseInt(e.target.value) || 1 })}
                    />
                    {errors.max_capacity && <p className="text-xs text-destructive">{errors.max_capacity}</p>}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Contact Info (Phone or Email)</label>
                  <Input
                    placeholder="contact@org.com or (555) 123-4567"
                    value={form.contact_info}
                    onChange={(e) => setForm({ ...form, contact_info: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Cover Image (optional)</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setImageFile(file);
                        setImagePreview(URL.createObjectURL(file));
                      }
                    }}
                  />
                  {imagePreview ? (
                    <div className="relative">
                      <img src={imagePreview} alt="New event image preview" className="w-full h-32 object-cover rounded-lg" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Remove image"
                        className="absolute top-1 right-1 h-7 w-7 bg-background/80 backdrop-blur-sm"
                        onClick={() => { setImageFile(null); setImagePreview(null); }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-20 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-accent/50 hover:text-accent transition-colors"
                    >
                      <ImagePlus className="h-5 w-5" />
                      <span className="text-xs">Click to upload</span>
                    </button>
                  )}
                </div>
                <Button type="submit" variant="hero" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Event"
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>
        <p className="text-muted-foreground">
          Welcome, <span className="text-accent font-medium">{orgName}</span>. Manage your events and volunteers.
        </p>
      </motion.div>

      {/* Consolidated Impact Stats */}
      <div data-tour="org-stats-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          title="Account Status"
          value="Active"
          subtitle="Account approved"
          icon={CheckCircle}
          variant="info"
        />
        <StatsCard
          title="Total Events"
          value={impactStats.totalEvents}
          subtitle="Events created"
          icon={CalendarDays}
          variant="info"
        />
        <StatsCard
          title="Total Volunteers"
          value={impactStats.totalVolunteers}
          subtitle="Unique signups"
          icon={Users}
          variant="info"
        />
        <StatsCard
          title="Total Hours Verified"
          value={impactStats.totalVerifiedHours}
          subtitle="Approved hours"
          icon={Award}
          variant="info"
        />
      </div>

      {/* Pending Hour Approvals */}
      {pendingHours.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-6"
          data-tour="org-pending-approvals"
        >
          <Card className="border-accent/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-accent" />
                Pending Hour Approvals
                <Badge variant="secondary" className="ml-2">{pendingHours.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Volunteer</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[160px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingHours.map((h: any) => (
                    <TableRow key={h.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{h.volunteer_name}</p>
                          <p className="text-xs text-muted-foreground">{h.volunteer_email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{h.hours}h</TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(h.date + "T00:00:00"), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-sm truncate max-w-[150px]">{h.location || "—"}</TableCell>
                      <TableCell className="text-sm truncate max-w-[200px]">{h.description || "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="default"
                            disabled={processingHourId === h.id}
                            onClick={() => handleApproveManualHours(h.id)}
                            className="gap-1"
                          >
                            {processingHourId === h.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CheckCircle className="h-3.5 w-3.5" />
                            )}
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive border-destructive/30 hover:bg-destructive/10"
                            disabled={processingHourId === h.id}
                            onClick={() => handleDenyManualHours(h.id)}
                          >
                            Deny
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div data-tour="org-pending-approvals" className="sr-only" aria-hidden="true" />
      )}

      {/* My Posted Events */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        data-tour="org-posted-events"
      >
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-accent" />
                My Posted Events
              </CardTitle>
              {events.length > 0 && (
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search events..."
                    value={eventSearchQuery}
                    onChange={(e) => setEventSearchQuery(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-12">
                <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground mb-4">
                  You haven't created any events yet. Get started by posting your first volunteer opportunity!
                </p>
                <Button variant="outline" onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Event
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Signups</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.filter((ev) => {
                    if (!eventSearchQuery.trim()) return true;
                    const q = eventSearchQuery.toLowerCase();
                    return ev.title.toLowerCase().includes(q) || ev.location.toLowerCase().includes(q);
                  }).map((event) => {
                    const fillPercent = Math.round((event.signup_count / event.max_capacity) * 100);
                    const isFull = event.signup_count >= event.max_capacity;
                    return (
                      <TableRow key={event.id}>
                        <TableCell>
                          <div
                            className="cursor-pointer hover:text-accent transition-colors"
                            onClick={() => openRegistrantsDialog(event)}
                          >
                            <p className="font-medium">{event.title}</p>
                            {event.description && (
                              <p className="text-sm text-muted-foreground truncate max-w-[250px]">
                                {event.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm">
                            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                            {format(new Date(event.event_date + "T00:00:00"), "MMM d, yyyy")}
                            <span className="text-muted-foreground">at {event.event_time.slice(0, 5)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate max-w-[180px]">{event.location}</span>
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1.5 min-w-[120px]">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium">
                                {event.signup_count} / {event.max_capacity}
                              </span>
                              {isFull ? (
                                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs">Full</Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs">{fillPercent}%</span>
                              )}
                            </div>
                            <Progress value={fillPercent} className="h-1.5" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openRegistrantsDialog(event)} title="View registrants">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(event)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeleteEvent(event.id)}
                            >
                              <Trash2 className="h-4 w-4" />
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

      {/* Edit Event Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-3 mt-1">
            <div className="space-y-1">
              <label className="text-sm font-medium">Event Title</label>
              <Input
                placeholder="Community Park Cleanup"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
              {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="Describe the volunteer opportunity..."
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={2}
              />
              {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Date</label>
                <Input
                  type="date"
                  value={editForm.event_date}
                  onChange={(e) => setEditForm({ ...editForm, event_date: e.target.value })}
                />
                {errors.event_date && <p className="text-xs text-destructive">{errors.event_date}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Time</label>
                <Input
                  type="time"
                  value={editForm.event_time}
                  onChange={(e) => setEditForm({ ...editForm, event_time: e.target.value })}
                />
                {errors.event_time && <p className="text-xs text-destructive">{errors.event_time}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Location</label>
                <Input
                  placeholder="Central Park, NY"
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                />
                {errors.location && <p className="text-xs text-destructive">{errors.location}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Max Capacity</label>
                <Input
                  type="number"
                  min={1}
                  value={editForm.max_capacity}
                  onChange={(e) => setEditForm({ ...editForm, max_capacity: parseInt(e.target.value) || 1 })}
                />
                {errors.max_capacity && <p className="text-xs text-destructive">{errors.max_capacity}</p>}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Contact Info (Phone or Email)</label>
              <Input
                placeholder="contact@org.com or (555) 123-4567"
                value={editForm.contact_info}
                onChange={(e) => setEditForm({ ...editForm, contact_info: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Cover Image (optional)</label>
              <input
                ref={editFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setEditImageFile(file);
                    setEditImagePreview(URL.createObjectURL(file));
                  }
                }}
              />
              {editImagePreview ? (
                <div className="relative">
                  <img src={editImagePreview} alt="Current event image preview" className="w-full h-32 object-cover rounded-lg" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remove image"
                    className="absolute top-1 right-1 h-7 w-7 bg-background/80 backdrop-blur-sm"
                    onClick={() => { setEditImageFile(null); setEditImagePreview(null); }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => editFileInputRef.current?.click()}
                  className="w-full h-20 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-accent/50 hover:text-accent transition-colors"
                >
                  <ImagePlus className="h-5 w-5" />
                  <span className="text-xs">Click to upload</span>
                </button>
              )}
            </div>
            <Button type="submit" variant="hero" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Registrants Dialog */}
      <Dialog open={registrantsDialogOpen} onOpenChange={setRegistrantsDialogOpen}>
        <DialogContent className="sm:max-w-5xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-accent" />
              Registered Volunteers
              {registrantsEvent && (
                <Badge variant="secondary" className="ml-2">
                  {registrantsEvent.title}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {loadingRegistrants ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : registrants.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground">No one has registered for this event yet.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>School</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Signed Up</TableHead>
                    <TableHead>Claimed Hours</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registrants.map((r, idx) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-medium">{r.name || "—"}</TableCell>
                      <TableCell>
                        {r.email ? (
                          <span className="flex items-center gap-1 text-sm">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            {r.email}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell>{r.school || "—"}</TableCell>
                      <TableCell>{r.grade || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(r.signed_up_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        {r.attended ? (
                          <span className="text-sm font-medium">{r.attended_hours}h</span>
                        ) : r.verification_status === "pending" && r.claimed_hours ? (
                          <span className="text-sm font-medium">{r.claimed_hours}h</span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Awaiting Student</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {r.attended || r.verification_status === "verified" ? (
                          <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-600 text-white">
                            <CheckCircle className="h-3 w-3" />
                            Verified
                          </Badge>
                        ) : r.verification_status === "pending" ? (
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="default"
                              disabled={markingAttended === r.id}
                              onClick={() => handleVerifyHours(r)}
                              className="gap-1"
                            >
                              {markingAttended === r.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <CheckCircle className="h-3.5 w-3.5" />
                              )}
                              Verify {r.claimed_hours}h
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive border-destructive/30 hover:bg-destructive/10"
                              disabled={markingAttended === r.id}
                              onClick={() => handleRejectHours(r)}
                            >
                              Reject
                            </Button>
                          </div>
                        ) : r.verification_status === "rejected" ? (
                          <Badge variant="outline" className="gap-1 border-destructive/50 text-destructive">
                            Rejected — Awaiting Resubmission
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Awaiting Student</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <div className="pt-3 border-t flex items-center justify-between text-sm text-muted-foreground">
            <span>{registrants.length} registered volunteer{registrants.length !== 1 ? "s" : ""}</span>
            {registrantsEvent && (
              <span>Capacity: {registrants.length} / {registrantsEvent.max_capacity}</span>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex justify-center mt-10 mb-4"
      >
        <Button
          variant="outline"
          size="sm"
          onClick={startOrgTour}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <HelpCircle className="w-4 h-4" />
          Help / Tutorial
        </Button>
      </motion.div>
    </>
  );
}

