import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Send, Loader2, MapPin, Search, Building2, ChevronDown, Check, Paperclip, X, FileText } from "lucide-react";
import { motion } from "framer-motion";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getSafeErrorMessage } from "@/lib/safeError";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface OrgOption {
  id: string;
  org_name: string;
}

const formSchema = z.object({
  organizationMode: z.enum(["registered", "other"]),
  selectedOrgId: z.string().optional(),
  selectedOrgName: z.string().optional(),
  organization: z
    .string()
    .trim()
    .max(100, "Organization must be less than 100 characters")
    .optional(),
  orgContactEmail: z
    .string()
    .trim()
    .max(255, "Email must be less than 255 characters")
    .optional(),
  activity: z
    .string()
    .trim()
    .min(1, "Activity is required")
    .max(200, "Activity must be less than 200 characters"),
  location: z
    .string()
    .trim()
    .min(1, "Location is required")
    .max(200, "Location must be less than 200 characters"),
  hours: z
    .number({ required_error: "Hours is required", invalid_type_error: "Please enter a valid number" })
    .min(0.5, "Minimum 0.5 hours")
    .max(24, "Maximum 24 hours per entry"),
  date: z.date({
    required_error: "Date is required",
  }),
  description: z
    .string()
    .trim()
    .max(500, "Description must be less than 500 characters")
    .optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
}).superRefine((data, ctx) => {
  if (data.organizationMode === "registered" && !data.selectedOrgId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please select an organization",
      path: ["selectedOrgId"],
    });
  }
  if (data.organizationMode === "other" && (!data.organization || data.organization.trim().length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Organization name is required",
      path: ["organization"],
    });
  }
  if (data.organizationMode === "other" && (!data.orgContactEmail || data.orgContactEmail.trim().length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Organization contact email is required",
      path: ["orgContactEmail"],
    });
  }
  if (data.organizationMode === "other" && data.orgContactEmail && data.orgContactEmail.trim().length > 0) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.orgContactEmail.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please enter a valid email address",
        path: ["orgContactEmail"],
      });
    }
  }
});

type FormData = z.infer<typeof formSchema>;

interface HourSubmissionFormProps {
  userId: string;
  onSuccess?: () => void;
}

export function HourSubmissionForm({ userId, onSuccess }: HourSubmissionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [organizations, setOrganizations] = useState<OrgOption[]>([]);
  const [orgPopoverOpen, setOrgPopoverOpen] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofError, setProofError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      organizationMode: "other",
      selectedOrgId: "",
      selectedOrgName: "",
      organization: "",
      orgContactEmail: "",
      activity: "",
      location: "",
      hours: undefined,
      date: undefined,
      description: "",
    },
  });

  const organizationMode = form.watch("organizationMode");
  const selectedOrgName = form.watch("selectedOrgName");

  // Fetch approved organizations
  useEffect(() => {
    const fetchOrgs = async () => {
      const { data } = await supabase
        .from("organizations")
        .select("id, org_name")
        .eq("account_status", "approved")
        .order("org_name", { ascending: true });
      if (data) setOrganizations(data);
    };
    fetchOrgs();
  }, []);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation Not Supported",
        description: "Your browser does not support geolocation.",
        variant: "destructive",
      });
      return;
    }

    setIsFetchingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        form.setValue("latitude", latitude);
        form.setValue("longitude", longitude);

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { "Accept-Language": "en" } }
          );
          const data = await res.json();
          if (data && typeof data.display_name === 'string' && data.display_name.length <= 200) {
            form.setValue("location", data.display_name.trim(), { shouldValidate: true });
          }
        } catch {
          form.setValue("location", `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`, { shouldValidate: true });
        } finally {
          setIsFetchingLocation(false);
        }
      },
      (err) => {
        setIsFetchingLocation(false);
        const messages: Record<number, string> = {
          1: "Location permission denied. Please allow location access.",
          2: "Location unavailable. Try again later.",
          3: "Location request timed out. Try again.",
        };
        toast({
          title: "Location Error",
          description: messages[err.code] || "Unable to get location.",
          variant: "destructive",
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const onSubmit = async (data: FormData) => {
    if (submittingRef.current) return;
    if (!proofFile) {
      setProofError("Proof of hours is required. Please attach a file.");
      toast({
        title: "Proof Required",
        description: "Please attach a proof of hours file before submitting.",
        variant: "destructive",
      });
      return;
    }
    setProofError(null);
    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const isRegisteredOrg = data.organizationMode === "registered";
      const orgName = isRegisteredOrg ? data.selectedOrgName! : data.organization!;
      const orgId = isRegisteredOrg ? data.selectedOrgId! : null;

      // Optional proof file upload
      let proofFileUrl: string | null = null;
      if (proofFile) {
        const ext = proofFile.name.split(".").pop() || "bin";
        const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("hour-proofs")
          .upload(path, proofFile, { contentType: proofFile.type });
        if (uploadError) throw uploadError;
        proofFileUrl = path;
      }

      // Generate verification token for "other" org submissions (guest verification flow)
      const verificationToken =
        !isRegisteredOrg && data.orgContactEmail ? crypto.randomUUID() : null;

      const { error } = await supabase.from("volunteer_hours").insert({
        user_id: userId,
        organization: orgName,
        organization_id: orgId,
        location: data.location,
        hours: data.hours,
        date: format(data.date, "yyyy-MM-dd"),
        description: [
          data.activity ? `Activity: ${data.activity}` : null,
          data.description || null,
          !isRegisteredOrg && data.orgContactEmail ? `[Org Contact: ${data.orgContactEmail}]` : null,
        ].filter(Boolean).join("\n\n") || null,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        proof_file_url: proofFileUrl,
        status: verificationToken ? "pending_external_org" : "pending",
        verification_token: verificationToken,
      } as any);

      if (error) throw error;

      if (typeof pendo !== 'undefined') {
        pendo.track("volunteer_hours_submitted", {
          hours: data.hours,
          organization_mode: data.organizationMode,
          organization_name: orgName,
          has_proof_file: !!proofFile,
          proof_file_type: proofFile?.type || "",
          has_verification_email: !!verificationToken,
          activity: data.activity,
        });
      }

      // Send guest verification email via edge function
      if (verificationToken) {
        // Generate a signed URL for the proof file so the supervisor can view it
        let proofSignedUrl: string | null = null;
        if (proofFileUrl) {
          const { data: signed } = await supabase.storage
            .from("hour-proofs")
            .createSignedUrl(proofFileUrl, 60 * 60 * 24 * 14); // 14 days
          proofSignedUrl = signed?.signedUrl || null;
        }

        const { error: emailError } = await supabase.functions.invoke("send-org-verification", {
          body: {
            to: data.orgContactEmail,
            studentName: (await supabase.from("profiles").select("name").eq("id", userId).maybeSingle()).data?.name || "A student",
            organization: orgName,
            activity: data.activity,
            hours: data.hours,
            date: format(data.date, "yyyy-MM-dd"),
            location: data.location,
            description: data.description || null,
            proofUrl: proofSignedUrl,
            proofFileName: proofFile?.name || null,
            verificationToken,
            appOrigin: window.location.origin,
          },
        });

        if (emailError) {
          console.error("Email send error:", emailError);
          toast({
            title: "Hours Submitted, Email Failed",
            description: "Your hours were saved, but we couldn't send the verification email. An admin will follow up.",
            variant: "destructive",
          });
        } else {
          if (typeof pendo !== 'undefined') {
            pendo.track("verification_email_sent", {
              organization_name: orgName,
              hours: data.hours,
              activity: data.activity,
            });
          }
          toast({
            title: "Verification email sent to supervisor!",
            description: `We emailed ${data.orgContactEmail} to verify your hours.`,
          });
        }
      } else {
        toast({
          title: "Hours Submitted!",
          description: isRegisteredOrg
            ? `Your hours have been sent to ${orgName} for verification.`
            : "Your volunteer hours have been submitted for admin approval.",
        });
      }

      form.reset();
      setProofFile(null);
      setProofError(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onSuccess?.();
    } catch (error: any) {
      console.error("Submission error:", error);
      toast({
        title: "Submission Failed",
        description: getSafeErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      submittingRef.current = false;
    }
  };

  return (
    <Card variant="elevated">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="w-5 h-5" />
          Submit Your Hours
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Organization Selection */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="organizationMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization</FormLabel>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={field.value === "other" ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          field.onChange("other");
                          form.setValue("selectedOrgId", "");
                          form.setValue("selectedOrgName", "");
                        }}
                        className="flex-1"
                      >
                        Other
                      </Button>
                      <Button
                        type="button"
                        variant={field.value === "registered" ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          field.onChange("registered");
                          form.setValue("organization", "");
                        }}
                        className="flex-1"
                      >
                        <Building2 className="h-4 w-4 mr-1.5" />
                        Select Organization
                      </Button>
                    </div>
                    <FormDescription>
                      {field.value === "registered"
                        ? "Select a registered organization — they'll verify your hours directly."
                        : "Enter the organization name — your hours will be sent to an admin for approval."}
                    </FormDescription>
                  </FormItem>
                )}
              />

              {organizationMode === "registered" ? (
                <FormField
                  control={form.control}
                  name="selectedOrgId"
                  render={({ field }) => (
                    <FormItem>
                      <Popover open={orgPopoverOpen} onOpenChange={setOrgPopoverOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={orgPopoverOpen}
                              className={cn(
                                "w-full justify-between h-12 font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {selectedOrgName || "Search and select an organization..."}
                              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search organizations..." />
                            <CommandList>
                              <CommandEmpty>No organization found.</CommandEmpty>
                              <CommandGroup>
                                {organizations.map((org) => (
                                  <CommandItem
                                    key={org.id}
                                    value={org.org_name}
                                    onSelect={() => {
                                      form.setValue("selectedOrgId", org.id, { shouldValidate: true });
                                      form.setValue("selectedOrgName", org.org_name);
                                      setOrgPopoverOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        field.value === org.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                                    {org.org_name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="organization"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                        <Input
                            placeholder="e.g., Food Distribution"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="orgContactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization Contact Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="e.g., contact@organization.com"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          So the admin can verify your hours with the organization
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            <FormField
              control={form.control}
              name="activity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Activity</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Food Distribution, Park Cleanup"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input
                          placeholder="e.g., Downtown Community Center"
                          {...field}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="shrink-0 h-12 w-12"
                          onClick={handleUseMyLocation}
                          disabled={isFetchingLocation}
                          title="Use my location"
                        >
                          {isFetchingLocation ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <MapPin className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hours</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.5"
                        min="0.5"
                        max="24"
                        placeholder="e.g., 3"
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value ? parseFloat(value) : undefined);
                        }}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("2020-01-01")
                        }
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what you did during your volunteer time..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Provide details about your volunteer activity
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Required proof file upload */}
            <FormItem>
              <FormLabel>Proof of Hours <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf,.doc,.docx"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const MAX = 10 * 1024 * 1024; // 10MB
                      if (file.size > MAX) {
                        toast({
                          title: "File too large",
                          description: "Please upload a file smaller than 10MB.",
                          variant: "destructive",
                        });
                        if (fileInputRef.current) fileInputRef.current.value = "";
                        return;
                      }
                      setProofFile(file);
                      setProofError(null);
                    }}
                  />
                  {proofFile ? (
                    <div className="flex items-center gap-2 p-3 rounded-lg border border-input bg-muted/30">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate flex-1">{proofFile.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => {
                          setProofFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full sm:w-auto"
                    >
                      <Paperclip className="mr-2 h-4 w-4" />
                      Attach File
                    </Button>
                  )}
                </div>
              </FormControl>
              <FormDescription>
                Upload a photo, signed form, or document as proof (max 10MB). Required.
              </FormDescription>
              {proofError && (
                <p className="text-sm font-medium text-destructive">{proofError}</p>
              )}
            </FormItem>

            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                type="submit"
                className="w-full md:w-auto"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Submit Hours
                  </>
                )}
              </Button>
            </motion.div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
