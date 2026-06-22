import { motion } from "framer-motion";
import { Clock, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PendingApprovalProps {
  onLogout: () => void;
  orgName?: string;
}

export default function PendingApproval({ onLogout, orgName }: PendingApprovalProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card variant="elevated">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-accent" />
            </div>
            <CardTitle className="font-display text-2xl">Account Under Review</CardTitle>
            <CardDescription>
              {orgName ? `Welcome, ${orgName}` : "Welcome"}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Building2 className="w-4 h-4" />
              <span>Organization Account</span>
            </div>
            <p className="text-muted-foreground">
              Your organization account is currently pending approval by an administrator. 
              You'll be able to access your dashboard once your account has been reviewed and approved.
            </p>
            <p className="text-sm text-muted-foreground">
              This usually takes 1-2 business days. Thank you for your patience!
            </p>
            <Button variant="outline" onClick={onLogout} className="mt-4">
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
