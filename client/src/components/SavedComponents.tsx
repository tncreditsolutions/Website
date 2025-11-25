
import { Button } from "@/components/ui/button";
import { Facebook, Twitter, Linkedin, Instagram } from "lucide-react";

export function SocialMediaIcons() {
  return (
    <div className="flex gap-3">
      <Button size="icon" variant="outline" data-testid="link-facebook">
        <Facebook className="w-4 h-4" />
      </Button>
      <Button size="icon" variant="outline" data-testid="link-twitter">
        <Twitter className="w-4 h-4" />
      </Button>
      <Button size="icon" variant="outline" data-testid="link-linkedin">
        <Linkedin className="w-4 h-4" />
      </Button>
      <Button size="icon" variant="outline" data-testid="link-instagram">
        <Instagram className="w-4 h-4" />
      </Button>
    </div>
  );
}
