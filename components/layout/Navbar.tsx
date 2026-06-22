import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Clock, BarChart3, Trophy, Award, User, LogOut, LucideIcon, Shield, Building2, CalendarDays } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface NavbarProps {
  isAuthenticated?: boolean;
  onLogout?: () => void;
  isAdmin?: boolean;
  isOrganization?: boolean;
  isRoleLoading?: boolean;
}

interface NavLink {
  href: string;
  label: string;
  icon?: LucideIcon;
}

export function Navbar({ isAuthenticated = false, onLogout, isAdmin = false, isOrganization = false, isRoleLoading = false }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const publicLinks: NavLink[] = [
    { href: "/features", label: "Features" },
    { href: "/about", label: "About" },
    { href: "/about-us", label: "About Us" },
    { href: "/contact", label: "Contact" },
  ];

  const userLinks: NavLink[] = [
    { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
    { href: "/explore", label: "Explore", icon: CalendarDays },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/ranking", label: "Ranking", icon: Trophy },
    { href: "/achievements", label: "Achievements", icon: Award },
  ];

  const adminLinks: NavLink[] = [
    { href: "/dashboard", label: "Dashboard", icon: Shield },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/ranking", label: "Ranking", icon: Trophy },
  ];

  const orgLinks: NavLink[] = [
    { href: "/dashboard", label: "Dashboard", icon: Building2 },
    { href: "/events", label: "Events", icon: CalendarDays },
  ];

  const links = !isAuthenticated
    ? publicLinks
    : isRoleLoading
      ? []
      : isAdmin
        ? adminLinks
        : isOrganization
          ? orgLinks
          : userLinks;

  const roleLabel = isAdmin ? "Admin" : isOrganization ? "Org" : null;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to={isAuthenticated ? "/dashboard" : "/"} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold">Service Tracker</span>
            {roleLabel && (
              <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-accent/10 text-accent rounded-full">
                {roleLabel}
              </span>
            )}
          </Link>

          {/* Desktop Navigation */}
          <div data-tour="nav-links" className="hidden md:flex items-center gap-6">
            {links.map((link) => {
              const tourId = link.label.toLowerCase();
              const IconComponent = link.icon;
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  data-tour={`nav-${tourId}`}
                  className={`text-sm font-medium transition-colors hover:text-accent flex items-center gap-2 ${
                    location.pathname === link.href ? "text-accent" : "text-muted-foreground"
                  }`}
                >
                  {IconComponent && <IconComponent className="w-4 h-4" />}
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link to="/profile" data-tour="nav-profile" aria-label="Profile">
                  <Button variant="ghost" size="icon" aria-label="Profile">
                    <User className="w-5 h-5" />
                  </Button>
                </Link>
                <Button variant="outline" onClick={onLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link to="/auth?mode=signup">
                  <Button variant="hero">Get Started</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-border"
            >
              <div className="py-4 space-y-2">
                {links.map((link) => {
                  const IconComponent = link.icon;
                  return (
                    <Link
                      key={link.href}
                      to={link.href}
                      onClick={() => setIsOpen(false)}
                      className={`block px-4 py-2 text-sm font-medium transition-colors rounded-lg hover:bg-accent/10 ${
                        location.pathname === link.href ? "text-accent bg-accent/10" : "text-muted-foreground"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {IconComponent && <IconComponent className="w-4 h-4" />}
                        {link.label}
                      </span>
                    </Link>
                  );
                })}
                <div className="pt-4 px-4 space-y-2">
                  {isAuthenticated ? (
                    <>
                      <Link to="/profile" onClick={() => setIsOpen(false)}>
                        <Button variant="outline" className="w-full">
                          <User className="w-4 h-4 mr-2" />
                          Profile
                        </Button>
                      </Link>
                      <Button variant="default" className="w-full" onClick={onLogout}>
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                      </Button>
                    </>
                  ) : (
                    <>
                      <Link to="/auth" onClick={() => setIsOpen(false)}>
                        <Button variant="outline" className="w-full">Sign In</Button>
                      </Link>
                      <Link to="/auth?mode=signup" onClick={() => setIsOpen(false)}>
                        <Button variant="hero" className="w-full">Get Started</Button>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
