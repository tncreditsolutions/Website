import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function Disclaimer() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <Link href="/">
          <Button variant="ghost" className="mb-6" data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <h1 className="text-4xl md:text-5xl font-bold mb-8">Disclaimer</h1>
        
        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-bold mb-4">General Disclaimer</h2>
            <p className="text-muted-foreground">
              The information provided on this website by TN Credit Solutions is for general informational purposes only. All information on the site is provided on an "as-is" basis without any representations or warranties, express or implied. We make no representations or warranties of any kind, express or implied, about the completeness, accuracy, reliability, suitability, or availability with respect to the website or the information, products, services, or related graphics contained on the website for any purpose.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Professional Advice Disclaimer</h2>
            <p className="text-muted-foreground mb-4">
              TN Credit Solutions is not a law firm. The information provided on this website should not be construed as legal, financial, or professional advice. Any information contained herein is for general informational purposes only. Before taking any action based on the information contained on this website, you should seek professional advice from a qualified attorney, financial advisor, or other licensed professional.
            </p>
            <p className="text-muted-foreground">
              Your use of this website does not establish an attorney-client relationship, financial advisory relationship, or any other professional relationship between you and TN Credit Solutions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Results Disclaimer</h2>
            <p className="text-muted-foreground">
              Past performance and results do not guarantee future performance or results. Every individual's financial situation is unique. The results described on this website may not be typical and do not guarantee that you will achieve the same results. TN Credit Solutions does not guarantee any specific outcomes or results from using our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Third-Party Links Disclaimer</h2>
            <p className="text-muted-foreground">
              This website may contain links to third-party websites that are not under the control of TN Credit Solutions. We are not responsible for the content of any linked site. The inclusion of any link does not imply endorsement by us of the site or any association with its operators. Your use of third-party websites is at your own risk and subject to their terms and conditions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">No Guarantee of Service Results</h2>
            <p className="text-muted-foreground">
              TN Credit Solutions does not guarantee that our services will result in improved credit scores, tax refunds, or any other specific financial outcomes. Credit improvement and tax situations depend on numerous factors beyond our control, including creditor policies, credit bureau practices, and individual financial circumstances.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Limitation of Liability</h2>
            <p className="text-muted-foreground">
              In no event shall TN Credit Solutions, its owners, employees, or agents be liable for any direct, indirect, incidental, special, or consequential damages arising out of or in any way connected with your access to or use of this website or the information contained herein.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Medical/Health Disclaimer</h2>
            <p className="text-muted-foreground">
              This website does not provide medical or health-related advice. If you have health-related concerns, please consult with a qualified healthcare professional.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Changes to Disclaimer</h2>
            <p className="text-muted-foreground">
              TN Credit Solutions reserves the right to modify this disclaimer at any time. Changes will be effective immediately upon posting to the website. Your continued use of the website following the posting of modifications constitutes your acceptance of the modified disclaimer.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Contact Us</h2>
            <p className="text-muted-foreground">
              If you have any questions about this Disclaimer, please contact us through the contact form on our website or via our live chat support.
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Last Updated: {new Date().toLocaleDateString()}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
