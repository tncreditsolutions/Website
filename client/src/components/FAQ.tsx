import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function FAQ() {
  const faqs = [
    {
      question: "How long does credit repair take?",
      answer: "Most clients see significant improvements within 3-6 months. The timeline varies based on your unique situation, the number of items being disputed, and how quickly credit bureaus respond. We provide monthly updates on your progress."
    },
    {
      question: "Is credit repair legal?",
      answer: "Yes, credit repair is completely legal. The Fair Credit Reporting Act (FCRA) gives you the right to dispute inaccurate or unverifiable information on your credit report. We use legitimate, legal strategies to help improve your credit score."
    },
    {
      question: "What tax deductions am I missing?",
      answer: "Many people miss common deductions like home office expenses, vehicle mileage, education costs, medical expenses, and charitable contributions. Our licensed tax professionals conduct a thorough review to identify all deductions you qualify for, potentially saving thousands of dollars."
    },
    {
      question: "Do you offer guarantees?",
      answer: "While we cannot guarantee specific score increases (as this depends on many factors), we do guarantee our commitment to working diligently on your behalf. Most clients see an average increase of 100+ points within the first year."
    }
  ];

  return (
    <section className="py-12 md:py-20 lg:py-24 px-4 md:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">Frequently Asked Questions</h2>
          <p className="text-lg md:text-xl text-muted-foreground">
            Get answers to common questions about our services
          </p>
        </div>

        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem 
              key={index} 
              value={`item-${index}`}
              className="border rounded-lg px-6"
              data-testid={`accordion-item-${index}`}
            >
              <AccordionTrigger className="text-left font-semibold hover:no-underline">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
