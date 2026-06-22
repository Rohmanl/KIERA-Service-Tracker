import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "accent" | "success" | "info";
}

export function StatsCard({ title, value, subtitle, icon: Icon, trend, variant = "default" }: StatsCardProps) {
  const colorClasses = {
    default: "bg-secondary text-secondary-foreground",
    accent: "bg-accent/10 text-accent",
    success: "bg-success/10 text-success",
    info: "bg-blue-500/10 text-blue-500",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card variant="stat" className="overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
              <p className="text-3xl font-display font-bold">{value}</p>
              {subtitle && (
                <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
              )}
              {trend && (
                <p className={`text-sm font-medium mt-2 ${trend.isPositive ? "text-success" : "text-destructive"}`}>
                  {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}% from last month
                </p>
              )}
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[variant]}`}>
              <Icon className="w-6 h-6" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
