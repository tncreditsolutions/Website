import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, FileText, CheckCircle } from "lucide-react";

export default function ServicesOverview() {
  const handleCreditRepair = () => {
    console.log('Start Repairing clicked');
    document.getElementById('contact-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleTaxOptimization = () => {
    console.log('Optimize Taxes clicked');
    document.getElementById('contact-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="services-section" className="py-12 md:py-20 lg:py-24 px-4 md:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">Our Services</h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            Comprehensive financial solutions to help you achieve your goals
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <Card className="hover-elevate transition-all duration-300" data-testid="card-credit-restoration">
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-2xl md:text-3xl">Credit Restoration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <span>Remove negative items from your credit report</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <span>Dispute inaccurate information with bureaus</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <span>Personalized strategies to boost your score</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <span>Ongoing support and credit monitoring</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleCreditRepair} 
                className="w-full"
                data-testid="button-start-repairing"
              >
                Start Repairing
              </Button>
            </CardFooter>
          </Card>

          <Card className="hover-elevate transition-all duration-300" data-testid="card-tax-maximization">
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-2xl md:text-3xl">Tax Maximization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <span>Maximize deductions and credits you deserve</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <span>Year-round tax planning and preparation</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <span>IRS audit support and representation</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <span>Strategic advice from licensed professionals</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleTaxOptimization} 
                className="w-full"
                data-testid="button-optimize-taxes"
              >
                Optimize Taxes
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </section>
  );
}
