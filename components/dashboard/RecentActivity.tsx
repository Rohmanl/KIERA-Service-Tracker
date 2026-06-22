import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Clock, CheckCircle2, XCircle, Loader2, Building2, Search } from "lucide-react";
import { motion } from "framer-motion";

interface ActivityItem {
  id: string;
  organization: string;
  hours: number;
  date: string;
  status: "pending" | "approved" | "denied" | "pending_external_org" | "org_verified";
  source?: "external" | "platform";
  verified_by_org?: string | null;
  organization_id?: string | null;
}

interface RecentActivityProps {
  activities: ActivityItem[];
}

export function RecentActivity({ activities }: RecentActivityProps) {
  const [search, setSearch] = useState("");

  const statusConfig: Record<string, { icon: any; variant: "secondary" | "default" | "destructive"; label: string; orgLabel?: string; className: string }> = {
    pending_external_org: {
      icon: Loader2,
      variant: "secondary",
      label: "Awaiting Org Verification",
      className: "animate-spin",
    },
    org_verified: {
      icon: CheckCircle2,
      variant: "default",
      label: "Org Verified · Pending Admin",
      className: "text-success",
    },
    pending: {
      icon: Loader2,
      variant: "secondary" as const,
      label: "Pending Admin Approval",
      orgLabel: "Pending Org Approval",
      className: "animate-spin",
    },
    approved: {
      icon: CheckCircle2,
      variant: "default" as const,
      label: "Approved",
      className: "text-success",
    },
    denied: {
      icon: XCircle,
      variant: "destructive" as const,
      label: "Denied",
      className: "",
    },
  };

  const filtered = activities.filter((a) => {
    const q = search.toLowerCase();
    return (
      a.organization.toLowerCase().includes(q) ||
      a.date.toLowerCase().includes(q) ||
      a.status.toLowerCase().includes(q)
    );
  });

  return (
    <Card variant="elevated">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 shrink-0">
            <Clock className="w-5 h-5" />
            Recent Activity
          </CardTitle>
          {activities.length > 0 && (
            <div className="relative w-full max-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search activities..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No activity yet</p>
            <p className="text-sm">Start logging your volunteer hours!</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>No matching activities</p>
            <p className="text-sm">Try a different search term</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((activity, index) => {
              const isPlatform = activity.source === "platform";
              const status = statusConfig[activity.status];
              const StatusIcon = isPlatform && activity.status === "approved" ? Building2 : status.icon;
              
              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-4 bg-secondary/50 rounded-xl"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full bg-background flex items-center justify-center`}>
                      <StatusIcon className={`w-5 h-5 ${isPlatform && activity.status === "approved" ? "text-accent" : status.className}`} />
                    </div>
                    <div>
                      <p className="font-medium">{activity.organization}</p>
                      <p className="text-sm text-muted-foreground">{activity.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-bold text-lg">{activity.hours}h</p>
                    {isPlatform && activity.status === "approved" ? (
                      <Badge variant="default" className="gap-1 text-xs">
                        <Building2 className="h-3 w-3" />
                        Verified by {activity.verified_by_org || "Org"}
                      </Badge>
                    ) : (
                      <Badge variant={status.variant}>
                        {activity.status === "pending" && activity.organization_id
                          ? "Pending Org Approval"
                          : status.label}
                      </Badge>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
