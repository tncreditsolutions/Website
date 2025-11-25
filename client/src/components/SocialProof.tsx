import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star } from "lucide-react";
import testimonial1 from "@assets/generated_images/client_testimonial_photo_1.png";
import testimonial2 from "@assets/generated_images/client_testimonial_photo_2.png";
import testimonial3 from "@assets/generated_images/client_testimonial_photo_3.png";

export default function SocialProof() {
  const stats = [
    { value: "1,000+", label: "Clients Served" },
    { value: "95%", label: "Success Rate" },
    { value: "10+", label: "Years Experience" },
    { value: "$2M+", label: "Client Savings" }
  ];

  const testimonials = [
    {
      image: testimonial1,
      quote: "TN Credit Solutions helped me raise my credit score by 150 points in just 6 months. Now I qualified for my dream home!",
      name: "Sarah Johnson",
      credential: "Credit Score: 580 → 730"
    },
    {
      image: testimonial2,
      quote: "The tax services saved me over $5,000 this year. Their team found deductions I never knew existed. Highly recommend!",
      name: "Michael Rodriguez",
      credential: "$5,200 in Tax Savings"
    },
    {
      image: testimonial3,
      quote: "Professional, responsive, and effective. They removed 8 negative items from my report and helped me understand my finances better.",
      name: "Jennifer Williams",
      credential: "8 Items Removed"
    }
  ];

  return (
    <section className="py-12 md:py-20 lg:py-24 px-4 md:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">Trusted by Thousands</h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            Real results from real clients who transformed their financial future
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, index) => (
            <div key={index} className="text-center" data-testid={`stat-${index}`}>
              <div className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary mb-2">{stat.value}</div>
              <div className="text-sm md:text-base text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="hover-elevate transition-all duration-300" data-testid={`testimonial-${index}`}>
              <CardContent className="pt-6">
                <div className="flex justify-center mb-4">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={testimonial.image} alt={testimonial.name} />
                    <AvatarFallback>{testimonial.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex justify-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-center mb-4 italic text-muted-foreground">"{testimonial.quote}"</p>
                <div className="text-center">
                  <div className="font-semibold">{testimonial.name}</div>
                  <div className="text-sm text-primary font-medium">{testimonial.credential}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
