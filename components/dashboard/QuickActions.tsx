import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Plus, Trophy } from "lucide-react";
import { motion } from "framer-motion";

const actions = [
  {
    title: "View Analytics",
    description: "See your impact stats",
    icon: BarChart3,
    href: "/analytics",
    variant: "accent" as const,
  },
  {
    title: "View Ranking",
    description: "See the volunteer leaderboard",
    icon: Trophy,
    href: "/ranking",
    variant: "accent" as const,
  },
];

export function QuickActions() {
  return (
    <Card variant="elevated">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {actions.map((action, index) => (
          <motion.div
            key={action.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link to={action.href}>
              <Button
                variant={action.variant}
                className="w-full justify-start h-auto py-4"
              >
                <action.icon className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <div className="font-semibold">{action.title}</div>
                  <div className="text-xs opacity-80">{action.description}</div>
                </div>
              </Button>
            </Link>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}
