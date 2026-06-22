import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Clock, MapPin } from "lucide-react";

interface VolunteerRecord {
  id: string;
  organization: string;
  description: string | null;
  hours: number;
  date: string;
  status: string | null;
  location: string | null;
  source: string;
}

interface UserProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  volunteer: {
    id: string;
    name: string | null;
    email: string | null;
    school: string | null;
    grade: string | null;
    total_hours: number;
  };
}

export function UserProfileDialog({ open, onOpenChange, volunteer }: UserProfileDialogProps) {
  const [records, setRecords] = useState<VolunteerRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchRecords();
    }
  }, [open, volunteer.id]);

  const fetchRecords = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("volunteer_hours")
      .select("id, organization, description, hours, date, status, location, source")
      .eq("user_id", volunteer.id)
      .order("date", { ascending: false });

    setRecords(data || []);
    setLoading(false);
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Approved</Badge>;
      case "denied":
        return <Badge variant="destructive">Denied</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status || "Unknown"}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Volunteer Profile</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div>
            <p className="text-xs text-muted-foreground">Name</p>
            <p className="font-medium">{volunteer.name || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="font-medium text-sm">{volunteer.email || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">School</p>
            <p className="font-medium">{volunteer.school || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Grade</p>
            <p className="font-medium">{volunteer.grade || "—"}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-4 w-4 text-accent" />
          <span className="font-semibold">{volunteer.total_hours} Total Verified Hours</span>
        </div>

        <h3 className="font-semibold mb-2">Volunteer History</h3>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </div>
        ) : records.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No volunteer records found.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap">{new Date(r.date).toLocaleDateString()}</TableCell>
                  <TableCell>{r.description || "—"}</TableCell>
                  <TableCell>{r.organization}</TableCell>
                  <TableCell>
                    {r.location ? (
                      <span className="flex items-center gap-1 text-sm">
                        <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="truncate max-w-[150px]" title={r.location}>{r.location}</span>
                      </span>
                    ) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{r.hours}h</Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(r.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
