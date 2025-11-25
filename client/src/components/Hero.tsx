import { Button } from "@/components/ui/button";
import heroImage from "@assets/generated_images/ready_for_better_future_hero.png";
import { CheckCircle2 } from "lucide-react";

export default function Hero() {
  const handleFreeConsultation = () => {
    console.log('Free consultation clicked - scrolling to contact form');
    document.getElementById('contact-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleLearnMore = () => {
    console.log('Learn more clicked - scrolling to services');
    document.getElementById('services-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative h-80vh md:h-80vh flex items-center justify-center overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/60" />
      
      <div className="relative z-10 max-w-4xl mx-auto px-4 text-center text-white">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6">
          Rebuild Your Credit, Maximize Your Returns
        </h1>
        <p className="text-lg md:text-xl lg:text-2xl mb-8 md:mb-10 text-white/90">
          Professional credit restoration and tax optimization services to secure your financial future
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10 md:mb-12">
          <Button
            size="lg"
            onClick={handleFreeConsultation}
            className="bg-primary hover:bg-primary/90 text-primary-foreground border border-primary-border text-base md:text-lg px-8 py-6"
            data-testid="button-free-consultation"
          >
            Free Consultation
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={handleLearnMore}
            className="backdrop-blur-md bg-white/20 border-white/30 text-white hover:bg-white/30 text-base md:text-lg px-8 py-6"
            data-testid="button-learn-more"
          >
            Learn More
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center text-sm md:text-base">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            <span>1000+ Clients Helped</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            <span>Licensed Tax Professionals</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            <span>Licensed & Certified</span>
          </div>
        </div>
      </div>
    </section>
  );
}
