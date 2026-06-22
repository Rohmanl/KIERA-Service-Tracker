import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Building2, CheckCircle, XCircle, Loader2, Search, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface OrgRecord {
  id: string;
  user_id: string;
  org_name: string;
  contact_email: string;
  account_status: string;
  created_at: string;
  address: string | null;
  verification_info: string | null;
}

export function ManageOrganizations() {
  const [organizations, setOrganizations] = useState<OrgRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .order("created_at", { ascending: false }) as any;

      if (error) throw error;
      setOrganizations(data || []);
    } catch (error) {
      console.error("Error fetching organizations:", error instanceof Error ? error.message : "Unknown error");
      toast.error("Failed to load organizations");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const handleUpdateStatus = async (orgId: string, newStatus: "approved" | "rejected") => {
    setActionLoading(orgId);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({ account_status: newStatus } as any)
        .eq("id", orgId) as any;

      if (error) throw error;
      toast.success(`Organization ${newStatus === "approved" ? "approved" : "rejected"} successfully`);
      fetchOrganizations();
    } catch (error) {
      console.error("Error updating organization:", error instanceof Error ? error.message : "Unknown error");
      toast.error("Failed to update organization status");
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Pending Accounts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-warning" />
            Pending Account Approvals
          </CardTitle>
        </CardHeader>
        <CardContent>
          {organizations.filter(o => o.account_status === "pending").length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No pending approvals at this time.
            </p>
          ) : (
            <div className="space-y-4">
              {organizations.filter(o => o.account_status === "pending").map((org) => (
                <Card key={org.id} className="border">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-lg">{org.org_name}</p>
                        <p className="text-sm text-muted-foreground">{org.contact_email}</p>
                        <p className="text-xs text-muted-foreground">Registered: {new Date(org.created_at).toLocaleDateString()}</p>
                      </div>
                      <Badge variant="secondary">Pending</Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Physical Address</p>
                        <p className="text-sm">{org.address || <span className="text-muted-foreground italic">Not provided</span>}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Verification Proof</p>
                        <p className="text-sm break-all">{org.verification_info || <span className="text-muted-foreground italic">Not provided</span>}</p>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => handleUpdateStatus(org.id, "approved")}
                        disabled={actionLoading === org.id}
                      >
                        {actionLoading === org.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleUpdateStatus(org.id, "rejected")}
                        disabled={actionLoading === org.id}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Organizations */}
      <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-accent" />
            Manage Organizations
          </CardTitle>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {(() => {
          const filtered = organizations.filter((org) => {
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            return (
              org.org_name.toLowerCase().includes(q) ||
              org.contact_email.toLowerCase().includes(q)
            );
          });
          if (filtered.length === 0) {
            return (
              <p className="text-muted-foreground text-center py-8">
                {searchQuery.trim() ? "No organizations match your search." : "No organizations registered yet."}
              </p>
            );
          }
          return (
          <Table>
            <TableHeader>
               <TableRow>
                 <TableHead>Organization Name</TableHead>
                 <TableHead>Contact Email</TableHead>
                 <TableHead>Address</TableHead>
                 <TableHead>Verification</TableHead>
                 <TableHead>Registered</TableHead>
                 <TableHead>Status</TableHead>
                 <TableHead>Actions</TableHead>
               </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((org) => (
                <TableRow key={org.id}>
                   <TableCell className="font-medium">{org.org_name}</TableCell>
                   <TableCell>{org.contact_email}</TableCell>
                   <TableCell className="max-w-[200px] truncate" title={org.address || ""}>{org.address || <span className="text-muted-foreground">—</span>}</TableCell>
                   <TableCell className="max-w-[200px] truncate" title={org.verification_info || ""}>{org.verification_info || <span className="text-muted-foreground">—</span>}</TableCell>
                   <TableCell>{new Date(org.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>{getStatusBadge(org.account_status)}</TableCell>
                  <TableCell>
                    {org.account_status === "pending" ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => handleUpdateStatus(org.id, "approved")}
                          disabled={actionLoading === org.id}
                        >
                          {actionLoading === org.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleUpdateStatus(org.id, "rejected")}
                          disabled={actionLoading === org.id}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          );
        })()}
      </CardContent>
    </Card>
    </div>
  );
}
