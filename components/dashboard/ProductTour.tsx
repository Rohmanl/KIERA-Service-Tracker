import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, ChevronRight, ChevronLeft, SkipForward } from "lucide-react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface TourStep {
  target: string;
  title: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right";
  navigateTo?: string;
  navigateOnFinish?: string;
  allowScroll?: boolean;
}

const TOUR_STEPS: TourStep[] = [
  {
    target: "dashboard-area",
    title: "Welcome to Your Dashboard",
    description:
      "This is your dashboard. Here you can quickly see an overview of your volunteer activity, including your total hours, goal progress, submissions, and achievements.",
    position: "bottom",
    navigateTo: "/dashboard",
  },
  {
    target: "hour-submission",
    title: "Log Your Volunteer Hours",
    description:
      "Log your volunteer activities here — enter the activity name, location, hours, date, and description, then submit.",
    position: "top",
    allowScroll: true,
    navigateTo: "/dashboard",
  },
  {
    target: "nav-links",
    title: "Navigate the Platform",
    description:
      "Use these buttons to switch between Dashboard, Analytics, Ranking, and Achievements.",
    position: "bottom",
    navigateTo: "/dashboard",
  },
  {
    target: "nav-explore",
    title: "Explore Volunteer Events",
    description:
      "Browse the Events tab to discover and sign up for upcoming volunteer opportunities near you.",
    position: "bottom",
    navigateTo: "/explore",
  },
  {
    target: "nav-analytics",
    title: "Analytics Overview",
    description:
      "The Analytics page shows your volunteer activity overview — total hours, trends, and impact stats.",
    position: "bottom",
    navigateTo: "/analytics",
  },
  {
    target: "nav-ranking",
    title: "Volunteer Leaderboard",
    description:
      "See how you rank compared to others on the volunteer leaderboard.",
    position: "bottom",
    navigateTo: "/ranking",
  },
  {
    target: "nav-achievements",
    title: "Unlock Achievements",
    description:
      "Earn badges and milestones based on your volunteer participation!",
    position: "bottom",
    navigateTo: "/achievements",
  },
  {
    target: "nav-profile",
    title: "Your Profile",
    description:
      "View your personal information and account settings here.",
    position: "left",
    navigateTo: "/achievements",
  },
];

const TOUR_ACTIVE_KEY = "service-tracker-tour-active";
const TOUR_STEP_KEY = "service-tracker-tour-step";

interface ProductTourProps {
  forceStart?: boolean;
  onComplete?: () => void;
}

export function ProductTour({ forceStart, onComplete }: ProductTourProps) {
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const TOUR_STORAGE_KEY = authUserId ? `service-tracker-tour-completed-${authUserId}` : null;
  const navigate = useNavigate();
  const location = useLocation();
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const step = TOUR_STEPS[currentStep];

  // Get current user ID
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthUserId(session?.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const AUTHENTICATED_ROUTES = ["/dashboard", "/explore", "/analytics", "/ranking", "/leaderboard", "/achievements", "/profile"];
  const isAuthRoute = AUTHENTICATED_ROUTES.some((r) => location.pathname.startsWith(r));

  // Close tour immediately on public/unauthenticated pages
  useEffect(() => {
    if (!isAuthRoute || !authUserId) {
      if (isActive) {
        setIsActive(false);
        sessionStorage.removeItem(TOUR_ACTIVE_KEY);
        sessionStorage.removeItem(TOUR_STEP_KEY);
      }
      return;
    }
    // Restore tour state after navigation (only on auth routes)
    const active = sessionStorage.getItem(TOUR_ACTIVE_KEY);
    const savedStep = sessionStorage.getItem(TOUR_STEP_KEY);
    if (active === "true" && savedStep !== null) {
      setCurrentStep(parseInt(savedStep, 10));
      setIsActive(true);
      setIsNavigating(false);
    }
  }, [location.pathname, authUserId]);

  const measureTarget = useCallback(() => {
    if (!isActive || !step || isNavigating) return;
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);

      // Keep guided centering for normal steps, but allow free scrolling on steps that opt in
      if (!step.allowScroll) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      if (retryRef.current) {
        clearTimeout(retryRef.current);
        retryRef.current = null;
      }
    } else {
      setTargetRect(null);
      // Retry measuring — element may not be in DOM yet after navigation
      retryRef.current = setTimeout(measureTarget, 200);
    }
  }, [isActive, step, isNavigating]);

  // Listen for restart event from Help button
  useEffect(() => {
    const handleRestart = () => {
      setCurrentStep(0);
      setIsActive(true);
      sessionStorage.setItem(TOUR_ACTIVE_KEY, "true");
      sessionStorage.setItem(TOUR_STEP_KEY, "0");
      if (location.pathname !== "/dashboard") {
        navigate("/dashboard");
      }
    };
    window.addEventListener("restart-product-tour", handleRestart);
    return () => window.removeEventListener("restart-product-tour", handleRestart);
  }, [navigate, location.pathname]);

  // Auto-start for brand-new users only (created within last 2 minutes)
  useEffect(() => {
    if (location.pathname !== "/dashboard") return;
    if (!TOUR_STORAGE_KEY || !authUserId) return;
    if (forceStart) {
      setCurrentStep(0);
      setIsActive(true);
      sessionStorage.setItem(TOUR_ACTIVE_KEY, "true");
      sessionStorage.setItem(TOUR_STEP_KEY, "0");
      return;
    }
    const completed = localStorage.getItem(TOUR_STORAGE_KEY);
    if (completed) return;

    // Check if this is a brand-new account by looking at profile created_at
    const checkNewUser = async () => {
      // Skip auto-start entirely for organization accounts — they have their own tour
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", authUserId)
        .maybeSingle();
      if ((roleData as any)?.role === "organization") return;

      const { data } = await supabase
        .from("profiles")
        .select("created_at")
        .eq("id", authUserId)
        .single();

      if (!data?.created_at) return;

      const createdAt = new Date(data.created_at).getTime();
      const now = Date.now();
      const TWO_MINUTES = 2 * 60 * 1000;

      if (now - createdAt < TWO_MINUTES) {
        // Brand-new user — auto-start tour
        setTimeout(() => {
          setCurrentStep(0);
          setIsActive(true);
          sessionStorage.setItem(TOUR_ACTIVE_KEY, "true");
          sessionStorage.setItem(TOUR_STEP_KEY, "0");
        }, 800);
      } else {
        // Existing user — mark as completed so we don't check again
        localStorage.setItem(TOUR_STORAGE_KEY, "true");
      }
    };
    checkNewUser();
  }, [forceStart, location.pathname, TOUR_STORAGE_KEY, authUserId]);

  // Lock body scroll unless current step allows scrolling
  useEffect(() => {
    if (!isActive) return;
    if (step?.allowScroll) {
      document.body.style.overflow = "";
      return;
    }
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isActive, step?.allowScroll]);

  useEffect(() => {
    measureTarget();
    window.addEventListener("resize", measureTarget);
    window.addEventListener("scroll", measureTarget, true);
    return () => {
      window.removeEventListener("resize", measureTarget);
      window.removeEventListener("scroll", measureTarget, true);
      if (retryRef.current) clearTimeout(retryRef.current);
    };
  }, [measureTarget]);

  const finish = useCallback(() => {
    const currentStepData = TOUR_STEPS[currentStep];
    setIsActive(false);
    if (TOUR_STORAGE_KEY) localStorage.setItem(TOUR_STORAGE_KEY, "true");
    sessionStorage.removeItem(TOUR_ACTIVE_KEY);
    sessionStorage.removeItem(TOUR_STEP_KEY);
    if (currentStepData?.navigateOnFinish) {
      navigate(currentStepData.navigateOnFinish);
    } else {
      navigate("/dashboard");
    }
    onComplete?.();
  }, [onComplete, navigate, currentStep]);

  const goToStep = useCallback(
    (nextIndex: number) => {
      const nextStep = TOUR_STEPS[nextIndex];
      sessionStorage.setItem(TOUR_STEP_KEY, String(nextIndex));

      if (nextStep?.navigateTo && location.pathname !== nextStep.navigateTo) {
        setIsNavigating(true);
        setCurrentStep(nextIndex);
        navigate(nextStep.navigateTo);
        // The location change effect will re-activate
      } else {
        setCurrentStep(nextIndex);
      }
    },
    [navigate, location.pathname],
  );

  const next = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      goToStep(currentStep + 1);
    } else {
      finish();
    }
  };

  const back = () => {
    if (currentStep > 0) {
      goToStep(currentStep - 1);
    }
  };

  if (!isActive || !step) return null;

  const padding = 12;

  const getTooltipStyle = (): React.CSSProperties => {
    const margin = 16;
    const gap = 16;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const tooltipWidth = Math.min(340, vw - margin * 2);
    const tooltipHeight = 220;

    if (!targetRect) {
      return {
        top: Math.max(margin, (vh - tooltipHeight) / 2),
        left: Math.max(margin, (vw - tooltipWidth) / 2),
        position: "fixed",
      };
    }

    const preferred = step.position || "bottom";
    const fits = {
      bottom: targetRect.bottom + gap + tooltipHeight <= vh - margin,
      top: targetRect.top - gap - tooltipHeight >= margin,
      right: targetRect.right + gap + tooltipWidth <= vw - margin,
      left: targetRect.left - gap - tooltipWidth >= margin,
    };
    const order: Array<keyof typeof fits> = [
      preferred as keyof typeof fits,
      "bottom",
      "top",
      "right",
      "left",
    ];
    let pos: keyof typeof fits = preferred as keyof typeof fits;
    for (const candidate of order) {
      if (fits[candidate]) {
        pos = candidate;
        break;
      }
    }

    const clamp = (v: number, min: number, max: number) =>
      Math.max(min, Math.min(v, max));

    let left: number;
    let top: number;

    if (pos === "bottom" || pos === "top") {
      const desiredLeft = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
      left = clamp(desiredLeft, margin, vw - tooltipWidth - margin);
      top =
        pos === "bottom"
          ? clamp(targetRect.bottom + gap, margin, vh - tooltipHeight - margin)
          : clamp(targetRect.top - gap - tooltipHeight, margin, vh - tooltipHeight - margin);
    } else {
      const desiredTop = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
      top = clamp(desiredTop, margin, vh - tooltipHeight - margin);
      left =
        pos === "right"
          ? clamp(targetRect.right + gap, margin, vw - tooltipWidth - margin)
          : clamp(targetRect.left - gap - tooltipWidth, margin, vw - tooltipWidth - margin);
    }

    return { top, left, width: tooltipWidth, position: "fixed" };
  };

  const scrollable = step?.allowScroll;

  const overlay = (
    <div className="fixed inset-0 z-[9998]" onClick={finish} style={{ pointerEvents: scrollable ? "none" : undefined }}>
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
        <defs>
          <mask id="tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - padding}
                y={targetRect.top - padding}
                width={targetRect.width + padding * 2}
                height={targetRect.height + padding * 2}
                rx="12"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="hsl(var(--background) / 0.75)"
          mask="url(#tour-mask)"
          style={{ pointerEvents: scrollable ? "none" : "all" }}
        />
      </svg>

      {targetRect && (
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="absolute rounded-xl border-2 border-accent shadow-[0_0_24px_hsl(var(--accent)/0.35)]"
          style={{
            top: targetRect.top - padding,
            left: targetRect.left - padding,
            width: targetRect.width + padding * 2,
            height: targetRect.height + padding * 2,
            pointerEvents: "none",
          }}
        />
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.96 }}
          transition={{ duration: 0.25 }}
          className="z-[9999] w-[340px] max-w-[90vw] rounded-xl border bg-card p-5 shadow-2xl"
          style={{ ...getTooltipStyle(), pointerEvents: "all" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-1.5">
              {TOUR_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === currentStep
                      ? "w-6 bg-accent"
                      : i < currentStep
                        ? "w-3 bg-accent/50"
                        : "w-3 bg-muted"
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              {currentStep + 1}/{TOUR_STEPS.length}
            </span>
          </div>

          <h3 className="font-display text-base font-semibold mb-1.5 text-foreground">
            {step.title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">{step.description}</p>

          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={finish}
              className="text-muted-foreground hover:text-foreground"
            >
              <SkipForward className="w-3.5 h-3.5 mr-1" />
              Skip
            </Button>
            <div className="flex gap-2">
              {currentStep > 0 && (
                <Button variant="outline" size="sm" onClick={back}>
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                  Back
                </Button>
              )}
              <Button variant="accent" size="sm" onClick={next}>
                {currentStep === TOUR_STEPS.length - 1 ? (
                  "Done"
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );

  return createPortal(overlay, document.body);
}

export function resetTour(userId?: string) {
  const key = userId ? `service-tracker-tour-completed-${userId}` : "service-tracker-tour-completed";
  localStorage.removeItem(key);
  sessionStorage.removeItem(TOUR_ACTIVE_KEY);
  sessionStorage.removeItem(TOUR_STEP_KEY);
  window.dispatchEvent(new CustomEvent("restart-product-tour"));
}
