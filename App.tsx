import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Features from "./pages/Features";
import About from "./pages/About";
import AboutUs from "./pages/AboutUs";
import Contact from "./pages/Contact";
import Analytics from "./pages/Analytics";
import Ranking from "./pages/Leaderboard";
import Achievements from "./pages/Achievements";
import Profile from "./pages/Profile";
import Explore from "./pages/Explore";
import OrgEvents from "./pages/OrgEvents";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
import HelpCenter from "./pages/HelpCenter";
import GuestVerify from "./pages/GuestVerify";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import { ProductTour } from "./components/dashboard/ProductTour";
import { AdminProductTour } from "./components/dashboard/AdminProductTour";
import { OrgProductTour } from "./components/dashboard/OrgProductTour";

async function pendoIdentifyUser(userId: string, email?: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, email, school, grade, city, total_hours, show_in_ranking, yearly_goal, created_at')
    .eq('id', userId)
    .single();

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();

  const { data: orgData } = await supabase
    .from('organizations')
    .select('id, org_name, contact_email, account_status, address, approved_at, created_at')
    .eq('user_id', userId)
    .single();

  const identifyPayload: Record<string, any> = {
    visitor: {
      id: userId,
      email: profile?.email || email || '',
      full_name: profile?.name || '',
      role: roleData?.role || '',
      school: profile?.school || '',
      grade: profile?.grade || '',
      city: profile?.city || '',
      totalHours: profile?.total_hours ?? 0,
      showInRanking: profile?.show_in_ranking ?? true,
      yearlyGoal: profile?.yearly_goal ?? 150,
      createdAt: profile?.created_at || '',
    },
  };

  if (orgData) {
    identifyPayload.account = {
      id: orgData.id,
      name: orgData.org_name,
      contactEmail: orgData.contact_email,
      accountStatus: orgData.account_status,
      address: orgData.address || '',
      approvedAt: orgData.approved_at || '',
      createdAt: orgData.created_at,
    };
  }

  pendo.identify(identifyPayload);
}

const App = () => {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          await pendoIdentifyUser(session.user.id, session.user.email);
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        await pendoIdentifyUser(session.user.id, session.user.email);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ProductTour />
          <AdminProductTour />
          <OrgProductTour />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/features" element={<Features />} />
            <Route path="/about" element={<About />} />
            <Route path="/about-us" element={<AboutUs />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/ranking" element={<Ranking />} />
            <Route path="/leaderboard" element={<Ranking />} />
            <Route path="/achievements" element={<Achievements />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/events" element={<OrgEvents />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/help" element={<HelpCenter />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/guest-verify" element={<GuestVerify />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
