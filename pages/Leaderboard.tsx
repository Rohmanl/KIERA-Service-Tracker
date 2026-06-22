import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Medal, Award, Users, MapPin, GraduationCap, Building2, Calendar, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { performLogout } from "@/lib/logout";
import { useNavigate } from "react-router-dom";
import { subDays, subYears, format } from "date-fns";
import { useUserRole } from "@/hooks/useUserRole";
import { User } from "@supabase/supabase-js";

interface LeaderboardUser {
  id: string;
  name: string | null;
  school: string | null;
  grade: string | null;
  city: string | null;
  total_hours: number;
}

const timeFilters = [
  { value: "alltime", label: "All Time" },
  { value: "lastyear", label: "Last Year" },
  { value: "last30", label: "Last 30 Days" },
  { value: "lastweek", label: "Last Week" },
];

export default function Leaderboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const { isAdmin, isLoading: isRoleLoading } = useUserRole(currentUser);
  const [cityFilter, setCityFilter] = useState("All Cities");
  const [gradeFilter, setGradeFilter] = useState("All Grades");
  const [schoolFilter, setSchoolFilter] = useState("All Schools");
  const [timeFilter, setTimeFilter] = useState("alltime");

  useEffect(() => {
    fetchLeaderboardData();
  }, [timeFilter]);

  const fetchLeaderboardData = async () => {
    setLoading(true);
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
      setCurrentUser(user);
    }

    // Calculate since_date based on timeFilter
    let sinceDate: string | null = null;
    const now = new Date();
    if (timeFilter === "lastyear") {
      sinceDate = format(subYears(now, 1), "yyyy-MM-dd");
    } else if (timeFilter === "last30") {
      sinceDate = format(subDays(now, 30), "yyyy-MM-dd");
    } else if (timeFilter === "lastweek") {
      sinceDate = format(subDays(now, 7), "yyyy-MM-dd");
    }

    const { data, error } = await supabase.rpc("get_leaderboard_profiles_since", {
      since_date: sinceDate,
    });

    if (!error && data) {
      setUsers(data);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await performLogout("/");
  };

  // Get unique filter options from data
  const cities = ["All Cities", ...new Set(users.map(u => u.city).filter(Boolean) as string[])];
  const grades = ["All Grades", ...new Set(users.map(u => u.grade).filter(Boolean) as string[])];
  const schools = ["All Schools", ...new Set(users.map(u => u.school).filter(Boolean) as string[])];

  // Filter and rank users
  const filteredData = users
    .filter((user) => {
      if (cityFilter !== "All Cities" && user.city !== cityFilter) return false;
      if (gradeFilter !== "All Grades" && user.grade !== gradeFilter) return false;
      if (schoolFilter !== "All Schools" && user.school !== schoolFilter) return false;
      return true;
    })
    .map((user, idx) => ({
      ...user,
      rank: idx + 1,
      isCurrentUser: user.id === currentUserId,
      avatar: (user.name || "?")[0].toUpperCase(),
      displayName: user.name || "Anonymous",
    }));

  const currentUserData = filteredData.find(u => u.isCurrentUser);
  const totalHours = users.reduce((sum, u) => sum + Number(u.total_hours || 0), 0);
  const uniqueSchools = new Set(users.map(u => u.school).filter(Boolean)).size;

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-6 h-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
    if (rank === 3) return <Award className="w-6 h-6 text-amber-600" />;
    return <span className="w-6 h-6 flex items-center justify-center font-bold text-muted-foreground">{rank}</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar isAuthenticated={true} onLogout={handleLogout} isAdmin={isAdmin} isRoleLoading={isRoleLoading} />
        <main className="container mx-auto px-4 pt-24 pb-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar isAuthenticated={true} onLogout={handleLogout} isAdmin={isAdmin} isRoleLoading={isRoleLoading} />
      
      <main className="container mx-auto px-4 pt-24 pb-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">Ranking</h1>
          <p className="text-muted-foreground">See how you rank among top volunteers. Friendly competition inspires others to volunteer more!</p>
        </motion.div>

        {/* Filters */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8"
        >
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" /> City
            </label>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {cities.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <GraduationCap className="w-3 h-3" /> Grade
            </label>
            <Select value={gradeFilter} onValueChange={setGradeFilter}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {grades.map((g) => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Building2 className="w-3 h-3" /> School
            </label>
            <Select value={schoolFilter} onValueChange={setSchoolFilter}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {schools.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Time Period
            </label>
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeFilters.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <div className="w-full bg-secondary/50 rounded-lg px-3 py-2 flex items-center gap-2">
              <Users className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium">{filteredData.length} volunteers</span>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Leaderboard */}
          <Card data-tour="admin-ranking-leaderboard" variant="elevated" className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-accent" />
                Top Volunteers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredData.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No volunteers found.</p>
              ) : (
                filteredData.map((user, index) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex items-center justify-between p-4 rounded-xl transition-all hover:scale-[1.01] ${
                      user.isCurrentUser 
                        ? "bg-accent/10 border-2 border-accent" 
                        : "bg-secondary/50 hover:bg-secondary/70"
                    } ${isAdmin ? "cursor-pointer" : ""}`}
                    onClick={isAdmin ? () => navigate(`/analytics?studentId=${user.id}`) : undefined}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 flex justify-center">{getRankIcon(user.rank)}</div>
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                        user.rank <= 3 ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"
                      }`}>
                        {user.avatar}
                      </div>
                      <div>
                        <p className="font-semibold flex items-center gap-2">
                          {user.displayName}
                          {user.isCurrentUser && <Badge className="text-xs">You</Badge>}
                        </p>
                        {(user.school || user.grade) && (
                          <p className="text-sm text-muted-foreground">
                            {[user.school, user.grade].filter(Boolean).join(" • ")}
                          </p>
                        )}
                        {user.city && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" /> {user.city}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-2xl font-bold">{user.total_hours || 0}</p>
                      <p className="text-sm text-muted-foreground">hours</p>
                    </div>
                  </motion.div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Stats Sidebar */}
          <div className="space-y-6">
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="text-lg">Your Position</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto rounded-full bg-accent/20 flex items-center justify-center mb-3">
                    <span className="font-display text-3xl font-bold text-accent">
                      #{currentUserData?.rank || "-"}
                    </span>
                  </div>
                  <p className="font-semibold">{currentUserData?.total_hours || 0} verified hours</p>
                  {currentUserData && filteredData.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Top {Math.round((currentUserData.rank / filteredData.length) * 100)}% of volunteers
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="text-lg">Community Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Hours</span>
                  <span className="font-bold">{totalHours.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Active Volunteers</span>
                  <span className="font-bold">{users.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Schools Represented</span>
                  <span className="font-bold">{uniqueSchools}</span>
                </div>
              </CardContent>
            </Card>

            {currentUserData && currentUserData.rank > 1 && (
              <Card variant="elevated" className="bg-gradient-to-br from-accent/10 to-accent/5">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Trophy className="w-10 h-10 text-accent mx-auto mb-2" />
                    <p className="font-semibold mb-1">Keep Going!</p>
                    <p className="text-sm text-muted-foreground">
                      {(() => {
                        const nextUser = filteredData[currentUserData.rank - 2];
                        const hoursNeeded = nextUser ? (nextUser.total_hours - currentUserData.total_hours + 1) : 0;
                        return hoursNeeded > 0 
                          ? `Log ${hoursNeeded} more hours to reach rank #${currentUserData.rank - 1}!`
                          : "You're doing great!";
                      })()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
