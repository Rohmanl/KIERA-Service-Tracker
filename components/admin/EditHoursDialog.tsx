import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EditHoursDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  volunteer: {
    id: string;
    name: string | null;
    total_hours: number;
  };
  adminId: string;
  onSaved: () => void;
}

export function EditHoursDialog({
  open,
  onOpenChange,
  volunteer,
  adminId,
  onSaved,
}: EditHoursDialogProps) {
  const [hours, setHours] = useState(volunteer.total_hours.toString());
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const parsed = parseFloat(hours);
    if (isNaN(parsed) || parsed < 0) {
      toast.error("Please enter a valid number of hours");
      return;
    }

    if (!reason.trim()) {
      toast.error("Please provide a reason for the adjustment");
      return;
    }

    setIsSaving(true);
    try {
      // Log the adjustment for audit trail
      const { error: logError } = await supabase
        .from("admin_adjustments")
        .insert({
          user_id: volunteer.id,
          admin_id: adminId,
          old_value: volunteer.total_hours,
          new_value: parsed,
          reason: reason.trim().slice(0, 500),
        });

      if (logError) throw logError;

      const { error } = await supabase
        .from("profiles")
        .update({ total_hours: parsed })
        .eq("id", volunteer.id);

      if (error) throw error;
      toast.success(`Updated ${volunteer.name || "volunteer"}'s hours to ${parsed}`);
      setReason("");
      onSaved();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating hours:", error instanceof Error ? error.message : "Unknown error");
      toast.error("Failed to update hours");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Edit Total Hours</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Editing hours for <span className="font-medium text-foreground">{volunteer.name || "Unknown"}</span>
          </p>
          <div className="space-y-2">
            <Label htmlFor="hours">Total Hours</Label>
            <Input
              id="hours"
              type="number"
              min="0"
              step="0.5"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for adjustment *</Label>
            <Textarea
              id="reason"
              placeholder="e.g. Correcting data entry error, manual reconciliation..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
