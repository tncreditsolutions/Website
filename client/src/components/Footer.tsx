import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleNewsletterSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) throw new Error("Failed to subscribe");
      toast({
        title: "Welcome to our newsletter!",
        description: "You'll receive monthly credit tips and tax strategies.",
      });
      setEmail("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to subscribe. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <footer className="bg-card border-t">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="py-12 md:py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <h3 className="font-bold text-xl mb-4">TN Credit Solutions</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Professional credit restoration and tax optimization services to secure your financial future.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Services</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Credit Restoration</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Tax Preparation</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Tax Planning</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Credit Monitoring</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Resources</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Credit Education</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Tax Tips Blog</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Success Stories</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">FAQ</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Newsletter</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Credit tips & tax strategies monthly
            </p>
            <form onSubmit={handleNewsletterSignup} className="space-y-2">
              <Input
                type="email"
                placeholder="Your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                data-testid="input-newsletter"
              />
              <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-subscribe">
                {isLoading ? "Subscribing..." : "Subscribe"}
              </Button>
            </form>
            <p className="text-xs text-muted-foreground mt-3">
              Join 5,000+ subscribers
            </p>
          </div>
        </div>

        <div className="border-t py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
              <Link href="/privacy" className="hover:text-foreground transition-colors" data-testid="link-privacy">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-foreground transition-colors" data-testid="link-terms">Terms of Service</Link>
              <Link href="/disclaimer" className="hover:text-foreground transition-colors" data-testid="link-disclaimer">Disclaimer</Link>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="w-4 h-4" />
              <span>Licensed & Certified Professionals</span>
            </div>
          </div>
          <div className="text-center mt-4 text-sm text-muted-foreground">
            © {new Date().getFullYear()} TN Credit Solutions. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
