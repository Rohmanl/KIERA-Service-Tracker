import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, SkipForward } from "lucide-react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface TourStep {
  target: string;
  title: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right";
  allowScroll?: boolean;
  navigateTo?: string;
  navigateOnFinish?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    target: "org-stats-grid",
    title: "Dashboard Overview",
    description:
      "This section gives you a quick overview of your organization's activity, including your approval status, total events, volunteer participation, and verified hours.",
    position: "bottom",
    allowScroll: true,
    navigateTo: "/dashboard",
  },
  {
    target: "org-create-event",
    title: "Create New Event",
    description:
      "Create and publish new volunteer opportunities for students to join. Make sure to include clear details such as time, location, and capacity.",
    position: "bottom",
    navigateTo: "/dashboard",
  },
  {
    target: "org-export-report",
    title: "Export Report",
    description:
      "Download a report of your organization's activity, including events and verified volunteer hours.",
    position: "bottom",
    navigateTo: "/dashboard",
  },
  {
    target: "org-posted-events",
    title: "My Posted Events",
    description:
      "Manage all events created by your organization. You can track signups and monitor participation here.",
    position: "top",
    allowScroll: true,
    navigateTo: "/dashboard",
  },
  {
    target: "org-events-header",
    title: "Events Page",
    description:
      "This is your dedicated Events page. Here you can browse every event your organization has created and manage their details.",
    position: "bottom",
    navigateTo: "/events",
    allowScroll: true,
  },
  {
    target: "org-events-filters",
    title: "Search & Filter Events",
    description:
      "Quickly find events by name or location, and filter by status — All, Upcoming, Today, or Past.",
    position: "bottom",
    allowScroll: true,
    navigateTo: "/events",
  },
  {
    target: "org-events-list",
    title: "Event List & Registrants",
    description:
      "Each event card shows its status, date, and signup count. Expand a card to view registered volunteers and their contact details.",
    position: "top",
    allowScroll: true,
    navigateTo: "/events",
  },
  {
    target: "org-events-export",
    title: "Export All Signups",
    description:
      "Download a CSV with every volunteer signup across all your events for easy record-keeping.",
    position: "bottom",
    allowScroll: true,
    navigateTo: "/events",
    navigateOnFinish: "/dashboard",
  },
];

const TOUR_ACTIVE_KEY = "org-tour-active";
const TOUR_STEP_KEY = "org-tour-step";
const RESTART_EVENT = "restart-org-tour";

export function OrgProductTour() {
  const navigate = useNavigate();
  const location = useLocation();
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [showCompletion, setShowCompletion] = useState(false);
  const [tooltipSize, setTooltipSize] = useState({ width: 340, height: 200 });
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const step = TOUR_STEPS[currentStep];
  const TOUR_STORAGE_KEY = authUserId ? `service-tracker-org-tour-completed-${authUserId}` : null;

  // Track auth user
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthUserId(session?.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const ORG_TOUR_ROUTES = ["/dashboard", "/events"];
  const isOrgTourRoute = ORG_TOUR_ROUTES.some((r) => location.pathname.startsWith(r));

  // Restore session state on supported org-tour routes
  useEffect(() => {
    if (!isOrgTourRoute) {
      if (isActive || showCompletion) {
        setIsActive(false);
        setShowCompletion(false);
        sessionStorage.removeItem(TOUR_ACTIVE_KEY);
        sessionStorage.removeItem(TOUR_STEP_KEY);
      }
      return;
    }
    const active = sessionStorage.getItem(TOUR_ACTIVE_KEY);
    const savedStep = sessionStorage.getItem(TOUR_STEP_KEY);
    if (active === "true" && savedStep !== null) {
      setCurrentStep(parseInt(savedStep, 10));
      setIsActive(true);
    }
  }, [location.pathname]);

  // Listen for restart event
  useEffect(() => {
    const handleRestart = () => {
      setShowCompletion(false);
      setCurrentStep(0);
      setIsActive(true);
      sessionStorage.setItem(TOUR_ACTIVE_KEY, "true");
      sessionStorage.setItem(TOUR_STEP_KEY, "0");
      if (location.pathname !== "/dashboard") {
        navigate("/dashboard");
      }
    };
    window.addEventListener(RESTART_EVENT, handleRestart);
    return () => window.removeEventListener(RESTART_EVENT, handleRestart);
  }, [navigate, location.pathname]);

  // Auto-start for brand-new approved org accounts on their first visit
  // to the actual Org Dashboard (not the pending-approval waiting page).
  useEffect(() => {
    if (location.pathname !== "/dashboard" || !authUserId || !TOUR_STORAGE_KEY) return;
    const completed = localStorage.getItem(TOUR_STORAGE_KEY);
    if (completed) return;

    let cancelled = false;

    const tryStart = async () => {
      // Confirm this user is an approved organization
      const { data: orgData } = await supabase
        .from("organizations")
        .select("id, account_status, approved_at")
        .eq("user_id", authUserId)
        .maybeSingle() as any;

      if (cancelled || !orgData) return;
      if (orgData.account_status !== "approved" || !orgData.approved_at) return;

      // Wait until the actual Org Dashboard is rendered (the pending-approval
      // waiting page does not contain this element). This guarantees the tour
      // never auto-starts on the waiting page.
      const waitForDashboard = (): Promise<boolean> =>
        new Promise((resolve) => {
          const deadline = Date.now() + 15000;
          const check = () => {
            if (cancelled) return resolve(false);
            if (document.querySelector('[data-tour="org-stats-grid"]')) return resolve(true);
            if (Date.now() > deadline) return resolve(false);
            setTimeout(check, 200);
          };
          check();
        });

      const ready = await waitForDashboard();
      if (!ready || cancelled) return;

      // Show the tour. Completion is recorded in finish() when the user
      // actually closes/finishes/skips it — never pre-marked, otherwise an
      // interrupted first load would permanently suppress it.
      setTimeout(() => {
        if (cancelled) return;
        setCurrentStep(0);
        setIsActive(true);
        sessionStorage.setItem(TOUR_ACTIVE_KEY, "true");
        sessionStorage.setItem(TOUR_STEP_KEY, "0");
      }, 600);
    };

    tryStart();
    return () => {
      cancelled = true;
    };
  }, [authUserId, location.pathname, TOUR_STORAGE_KEY]);

  const measureTarget = useCallback(() => {
    if (!isActive || !step) return;
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
      if (!step.allowScroll) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      if (retryRef.current) {
        clearTimeout(retryRef.current);
        retryRef.current = null;
      }
    } else {
      setTargetRect(null);
      retryRef.current = setTimeout(measureTarget, 200);
    }
  }, [isActive, step]);

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

  // Lock body scroll unless step allows scrolling
  useEffect(() => {
    if (!isActive && !showCompletion) return;
    if (step?.allowScroll && !showCompletion) {
      document.body.style.overflow = "";
      return;
    }
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isActive, showCompletion, step?.allowScroll]);

  const finish = useCallback(
    (showMessage = false) => {
      const currentStepData = TOUR_STEPS[currentStep];
      setIsActive(false);
      sessionStorage.removeItem(TOUR_ACTIVE_KEY);
      sessionStorage.removeItem(TOUR_STEP_KEY);
      if (TOUR_STORAGE_KEY) localStorage.setItem(TOUR_STORAGE_KEY, "true");
      if (showMessage) setShowCompletion(true);
      if (currentStepData?.navigateOnFinish && location.pathname !== currentStepData.navigateOnFinish) {
        navigate(currentStepData.navigateOnFinish);
      }
    },
    [TOUR_STORAGE_KEY, currentStep, navigate, location.pathname],
  );

  const goToStep = useCallback(
    (i: number) => {
      const nextStep = TOUR_STEPS[i];
      sessionStorage.setItem(TOUR_STEP_KEY, String(i));
      setCurrentStep(i);
      if (nextStep?.navigateTo && location.pathname !== nextStep.navigateTo) {
        navigate(nextStep.navigateTo);
      }
    },
    [navigate, location.pathname],
  );

  const next = () => {
    if (currentStep < TOUR_STEPS.length - 1) goToStep(currentStep + 1);
    else finish(true);
  };
  const back = () => {
    if (currentStep > 0) goToStep(currentStep - 1);
  };

  const padding = 12;

  const getTooltipStyle = (): React.CSSProperties => {
    const margin = 16;
    const gap = 16;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const tooltipWidth = Math.min(tooltipSize.width, vw - margin * 2);
    const tooltipHeight = tooltipSize.height;

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

    return { top, left, position: "fixed" };
  };

  if (showCompletion) {
    const completionOverlay = (
      <div
        className="fixed inset-0 z-[9998] flex items-center justify-center bg-background/75"
        onClick={() => setShowCompletion(false)}
      >
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.25 }}
          className="z-[9999] w-[340px] max-w-[90vw] rounded-xl border bg-card p-5 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="font-display text-base font-semibold mb-1.5 text-foreground">
            You're all set!
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            You can restart this tutorial anytime from the dashboard.
          </p>
          <div className="flex justify-end">
            <Button variant="accent" size="sm" onClick={() => setShowCompletion(false)}>
              Got it
            </Button>
          </div>
        </motion.div>
      </div>
    );
    return createPortal(completionOverlay, document.body);
  }

  if (!isActive || !step) return null;

  const scrollable = step?.allowScroll;

  const overlay = (
    <div
      className="fixed inset-0 z-[9998]"
      onClick={() => finish(false)}
      style={{ pointerEvents: scrollable ? "none" : undefined }}
    >
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
        <defs>
          <mask id="org-tour-mask">
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
          mask="url(#org-tour-mask)"
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
          ref={(node) => {
            tooltipRef.current = node;
            if (node) {
              const r = node.getBoundingClientRect();
              if (
                Math.abs(r.width - tooltipSize.width) > 1 ||
                Math.abs(r.height - tooltipSize.height) > 1
              ) {
                setTooltipSize({ width: r.width, height: r.height });
              }
            }
          }}
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
              onClick={() => finish(false)}
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

export function startOrgTour() {
  window.dispatchEvent(new CustomEvent(RESTART_EVENT));
}
