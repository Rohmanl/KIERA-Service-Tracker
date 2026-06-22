import { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, ShieldCheck, Building2, AlertTriangle, Loader2, Calendar, Clock, MapPin, User } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface SubmissionDetails {
  id: string;
  organization: string;
  description: string | null;
  hours: number;
  date: string;
  location: string | null;
  status: string;
  volunteer_name: string | null;
}

export default function GuestVerify() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState<SubmissionDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const fetchDetails = async () => {
    if (!token) {
      setError("No verification token provided.");
      setLoading(false);
      return;
    }

    try {
      const { data, error: rpcError } = await supabase.rpc("get_hours_by_token", {
        _token: token,
      });
      if (rpcError) throw rpcError;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) {
        setError("This verification link is invalid or has expired.");
      } else {
        setSubmission(row as SubmissionDetails);
      }
    } catch (err) {
      console.error("Failed to load submission:", err);
      setError("Unable to load this submission. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleVerify = async () => {
    if (!token) return;
    setVerifying(true);
    try {
      const { error: rpcError } = await supabase.rpc("verify_hours_by_token", {
        _token: token,
      });
      if (rpcError) throw rpcError;
      if (typeof pendo !== 'undefined') {
        pendo.track("guest_hours_verified", {
          organization_name: submission?.organization || "",
          hours: submission?.hours || 0,
          volunteer_name: submission?.volunteer_name || "",
        });
      }
      toast.success("Hours verified — thank you!");
      await fetchDetails();
    } catch (err: any) {
      toast.error(err?.message || "Verification failed.");
    } finally {
      setVerifying(false);
    }
  };

  // Strip the embedded "[Org Contact: email]" line from the description for guest display
  const cleanDescription = submission?.description
    ? submission.description.replace(/\n*\[Org Contact:[^\]]+\]\n*/g, "").trim()
    : null;

  const alreadyVerified =
    submission?.status === "org_verified" || submission?.status === "approved";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/15 text-accent mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
            Verify Volunteer Hours
          </h1>
          <p className="text-muted-foreground">
            A student has listed your organization on a service hour submission.
            Please review and confirm.
          </p>
        </div>

        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Submission Details</span>
              {submission && alreadyVerified && (
                <Badge className="bg-success/15 text-success border-success/30">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Verified
                </Badge>
              )}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-6 w-1/3" />
              </div>
            ) : error ? (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/5 border border-destructive/30">
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Unable to verify</p>
                  <p className="text-sm text-muted-foreground mt-1">{error}</p>
                </div>
              </div>
            ) : submission ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <User className="w-4 h-4 text-muted-foreground mt-1" />
                    <div>
                      <p className="text-xs text-muted-foreground">Volunteer</p>
                      <p className="font-medium">{submission.volunteer_name || "Unknown"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Building2 className="w-4 h-4 text-muted-foreground mt-1" />
                    <div>
                      <p className="text-xs text-muted-foreground">Organization</p>
                      <p className="font-medium">{submission.organization}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="w-4 h-4 text-muted-foreground mt-1" />
                    <div>
                      <p className="text-xs text-muted-foreground">Hours</p>
                      <p className="font-medium">{submission.hours}h</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="w-4 h-4 text-muted-foreground mt-1" />
                    <div>
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p className="font-medium">
                        {format(new Date(submission.date + "T00:00:00"), "MMMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  {submission.location && (
                    <div className="flex items-start gap-3 sm:col-span-2">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-1" />
                      <div>
                        <p className="text-xs text-muted-foreground">Location</p>
                        <p className="font-medium">{submission.location}</p>
                      </div>
                    </div>
                  )}
                </div>

                {cleanDescription && (
                  <div className="p-4 rounded-lg bg-muted/30 border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Activity Details</p>
                    <p className="text-sm whitespace-pre-line">{cleanDescription}</p>
                  </div>
                )}

                {alreadyVerified ? (
                  <div className="p-4 rounded-lg bg-success/5 border border-success/30 text-center">
                    <CheckCircle2 className="w-8 h-8 text-success mx-auto mb-2" />
                    <p className="font-medium">These hours have been verified.</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Thank you. The platform admin will complete the final review.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 pt-2">
                    <Button
                      onClick={handleVerify}
                      disabled={verifying}
                      className="w-full"
                      size="lg"
                    >
                      {verifying ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                      )}
                      Just Verify Hours
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      size="lg"
                      onClick={() => navigate("/auth")}
                    >
                      <Building2 className="w-4 h-4 mr-2" />
                      Create an Organization Account
                    </Button>
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      One-click verification doesn't require an account. Creating
                      an account lets you manage future volunteer submissions.
                    </p>
                  </div>
                )}
              </>
            ) : null}
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
