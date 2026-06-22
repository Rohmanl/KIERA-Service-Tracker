import { Link } from "react-router-dom";
import { Clock, Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary-foreground rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <span className="font-display text-xl font-bold">Service Tracker</span>
            </Link>
            <p className="text-primary-foreground/70 max-w-md">
              Empowering students and volunteers to track their service hours, discover opportunities, 
              and make a meaningful impact in their communities.
            </p>
          </div>
          
          <div>
            <h3 className="font-display font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-primary-foreground/70">
              <li><Link to="/features" className="hover:text-primary-foreground transition-colors">Features</Link></li>
              <li><Link to="/about" className="hover:text-primary-foreground transition-colors">About</Link></li>
              <li><Link to="/about-us" className="hover:text-primary-foreground transition-colors">About Us</Link></li>
              <li><Link to="/contact" className="hover:text-primary-foreground transition-colors">Contact</Link></li>
              <li><Link to="/auth" className="hover:text-primary-foreground transition-colors">Sign In</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-display font-semibold mb-4">Support</h3>
            <ul className="space-y-2 text-primary-foreground/70">
              <li><Link to="/help" className="hover:text-primary-foreground transition-colors">Help Center</Link></li>
              <li><Link to="/privacy" className="hover:text-primary-foreground transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-primary-foreground transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-primary-foreground/20 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-primary-foreground/70 text-sm">
            © {new Date().getFullYear()} Service Tracker. All rights reserved.
          </p>
          <p className="text-primary-foreground/70 text-sm flex items-center gap-1">
            Made with <Heart className="w-4 h-4 text-accent fill-accent" /> for communities everywhere
          </p>
        </div>
      </div>
    </footer>
  );
}
