import { Badge } from "@/components/ui/badge";
import { UserCheck, BarChart3, Trophy } from "lucide-react";

export default function HowItWorks() {
  const steps = [
    {
      number: 1,
      icon: UserCheck,
      title: "Free Consultation",
      description: "Schedule a complimentary meeting to discuss your credit and tax situation with our experts"
    },
    {
      number: 2,
      icon: BarChart3,
      title: "Custom Analysis",
      description: "We analyze your credit report and tax records to create a personalized action plan"
    },
    {
      number: 3,
      icon: Trophy,
      title: "Achieve Results",
      description: "Watch your credit score improve and tax savings grow with our proven strategies"
    }
  ];

  return (
    <section className="py-12 md:py-20 lg:py-24 px-4 md:px-6 lg:px-8 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">How It Works</h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            Our simple three-step process to financial success
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 md:gap-6 relative">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.number} className="relative" data-testid={`step-${step.number}`}>
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-16 left-full w-full h-0.5 bg-border -z-10" />
                )}
                <div className="text-center">
                  <div className="flex justify-center mb-4">
                    <Badge 
                      variant="default" 
                      className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
                      data-testid={`badge-step-${step.number}`}
                    >
                      {step.number}
                    </Badge>
                  </div>
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <Icon className="w-8 h-8 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-xl md:text-2xl font-semibold mb-3">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
