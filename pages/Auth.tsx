import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Clock, Eye, EyeOff, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { getSafeErrorMessage } from "@/lib/safeError";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, Mail } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const volunteerSignupSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  school: z.string().min(2, "School name is required"),
  grade: z.string().min(1, "Grade is required"),
});

const orgSignupSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  orgName: z.string().min(2, "Organization name must be at least 2 characters"),
  address: z.string().min(5, "Physical address is required"),
  verificationInfo: z.string().min(3, "Verification proof is required"),
});

export default function Auth() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(searchParams.get("mode") !== "signup");
  const [signupType, setSignupType] = useState<"volunteer" | "organization">("volunteer");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showEmailSent, setShowEmailSent] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    school: "",
    grade: "",
    orgName: "",
    contactEmail: "",
    address: "",
    verificationInfo: "",
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        navigate("/dashboard");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const validateForm = () => {
    try {
      if (isLogin) {
        loginSchema.parse(formData);
      } else if (signupType === "organization") {
        orgSignupSchema.parse(formData);
      } else {
        volunteerSignupSchema.parse(formData);
      }
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        if (error) {
          console.error("Login error:", error instanceof Error ? error.message : "Unknown error");
          toast.error(getSafeErrorMessage(error));
          return;
        }
        toast.success("Welcome back!");
        if (typeof pendo !== 'undefined') {
          pendo.track("user_login", {});
        }
        navigate("/dashboard");
      } else if (signupType === "organization") {
        const redirectUrl = `${window.location.origin}/`;
        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              name: formData.orgName,
              signup_role: "organization",
              contact_email: formData.email,
              address: formData.address,
              verification_info: formData.verificationInfo,
            },
          },
        });

        if (error) {
          console.error("Signup error:", error instanceof Error ? error.message : "Unknown error");
          toast.error(getSafeErrorMessage(error));
          return;
        }

        if (typeof pendo !== 'undefined') {
          pendo.track("organization_signup_completed", {
            signup_type: "organization",
          });
        }
        setShowEmailSent(true);
      } else {
        const redirectUrl = `${window.location.origin}/`;
        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              name: formData.name,
              school: formData.school,
              grade: formData.grade,
            },
          },
        });

        if (error) {
          console.error("Signup error:", error instanceof Error ? error.message : "Unknown error");
          toast.error(getSafeErrorMessage(error));
          return;
        }

        if (typeof pendo !== 'undefined') {
          pendo.track("volunteer_signup_completed", {
            signup_type: "volunteer",
            school: formData.school,
            grade: formData.grade,
          });
        }
        setShowEmailSent(true);
      }
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/50 to-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <Card variant="elevated">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-4">
              <Clock className="w-7 h-7 text-primary-foreground" />
            </div>
            <CardTitle className="font-display text-2xl">
              {isLogin ? "Welcome Back" : "Create Account"}
            </CardTitle>
            <CardDescription>
              {isLogin
                ? "Sign in to continue your journey"
                : "Join our community today"
              }
            </CardDescription>
          </CardHeader>

          <CardContent>
            {showEmailSent ? (
              <div className="flex flex-col items-center gap-4 py-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Check your email</h3>
                <p className="text-muted-foreground text-center text-sm">
                  We've sent a verification link to <strong>{formData.email}</strong>. Please click the link to verify your account before signing in.
                </p>
                <Button variant="outline" onClick={() => { setShowEmailSent(false); setIsLogin(true); }}>
                  Back to Sign In
                </Button>
              </div>
            ) : showForgotPassword ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                />
                <Button
                  variant="hero"
                  size="lg"
                  className="w-full"
                  disabled={forgotLoading}
                  onClick={async () => {
                    if (!forgotEmail) { toast.error("Please enter your email"); return; }
                    setForgotLoading(true);
                    try {
                      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
                        redirectTo: `${window.location.origin}/reset-password`,
                      });
                      if (error) { toast.error(error.message); return; }
                      toast.success("Password reset link sent! Check your email.");
                      if (typeof pendo !== 'undefined') {
                        pendo.track("password_reset_requested", {});
                      }
                      setShowForgotPassword(false);
                    } catch { toast.error("Something went wrong."); }
                    finally { setForgotLoading(false); }
                  }}
                >
                  {forgotLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</> : "Send Reset Link"}
                </Button>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="text-sm text-accent hover:underline w-full text-center"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <>
                {!isLogin && (
                  <div className="mb-6">
                    <Tabs value={signupType} onValueChange={(v) => { setSignupType(v as any); setErrors({}); }}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="volunteer">Student / Volunteer</TabsTrigger>
                        <TabsTrigger value="organization">Organization</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {!isLogin && signupType === "volunteer" && (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Full Name</label>
                        <Input
                          placeholder="John Doe"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                        {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">School</label>
                        <Input
                          placeholder="Enter your school name"
                          value={formData.school}
                          onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                        />
                        {errors.school && <p className="text-sm text-destructive">{errors.school}</p>}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Grade</label>
                        <Input
                          placeholder="11th"
                          value={formData.grade}
                          onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                        />
                        {errors.grade && <p className="text-sm text-destructive">{errors.grade}</p>}
                      </div>
                    </>
                  )}

                  {!isLogin && signupType === "organization" && (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Organization Name</label>
                        <Input
                          placeholder="Community Helpers Inc."
                          value={formData.orgName}
                          onChange={(e) => setFormData({ ...formData, orgName: e.target.value })}
                        />
                        {errors.orgName && <p className="text-sm text-destructive">{errors.orgName}</p>}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Physical Address</label>
                        <Input
                          placeholder="123 Main St, City, State, ZIP"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        />
                        {errors.address && <p className="text-sm text-destructive">{errors.address}</p>}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Verification Proof</label>
                        <Input
                          placeholder="Tax ID / EIN, Website URL, or 501(c)(3) doc link"
                          value={formData.verificationInfo}
                          onChange={(e) => setFormData({ ...formData, verificationInfo: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">
                          Required for admin approval. Provide your Tax ID/EIN, official website, or a link to your 501(c)(3) documentation.
                        </p>
                        {errors.verificationInfo && <p className="text-sm text-destructive">{errors.verificationInfo}</p>}
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Password</label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                  </div>

                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-sm text-accent hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}

                  <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {isLogin ? "Signing in..." : "Creating account..."}
                      </>
                    ) : (
                      isLogin ? "Sign In" : signupType === "organization" ? "Register Organization" : "Create Account"
                    )}
                  </Button>
                </form>

                <div className="mt-6 text-center text-sm">
                  <span className="text-muted-foreground">
                    {isLogin ? "Don't have an account?" : "Already have an account?"}
                  </span>{" "}
                  <button
                    type="button"
                    onClick={() => { setIsLogin(!isLogin); setErrors({}); }}
                    className="text-accent font-medium hover:underline"
                  >
                    {isLogin ? "Sign up" : "Sign in"}
                  </button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
