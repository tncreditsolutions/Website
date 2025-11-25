import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <Link href="/">
          <Button variant="ghost" className="mb-6" data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <h1 className="text-4xl md:text-5xl font-bold mb-8">Privacy Policy</h1>
        
        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-bold mb-4">Introduction</h2>
            <p className="text-muted-foreground">
              TN Credit Solutions ("Company", "we", "us", or "our") operates the website. This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our service and the choices you have associated with that data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Information Collection and Use</h2>
            <p className="text-muted-foreground mb-4">
              We collect several different types of information for various purposes to provide and improve our service to you.
            </p>
            <h3 className="text-lg font-semibold mb-2">Types of Data Collected:</h3>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li><strong>Personal Data:</strong> While using our service, we may ask you to provide us with certain personally identifiable information that can be used to contact or identify you ("Personal Data"). This may include, but is not limited to:
                <ul className="list-circle list-inside ml-4 mt-2 space-y-1">
                  <li>Email address</li>
                  <li>First name and last name</li>
                  <li>Phone number</li>
                  <li>Service preferences</li>
                  <li>Messages and communications</li>
                </ul>
              </li>
              <li><strong>Usage Data:</strong> We may also collect information on how the service is accessed and used ("Usage Data"). This may include information such as your computer's Internet Protocol address (e.g. IP address), browser type, browser version, pages visited, and the time and date of your visit.</li>
              <li><strong>Tracking & Cookies Data:</strong> We use cookies and similar tracking technologies to track activity on our service and hold certain information.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Use of Data</h2>
            <p className="text-muted-foreground mb-4">
              TN Credit Solutions uses the collected data for various purposes:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>To provide and maintain our service</li>
              <li>To notify you about changes to our service</li>
              <li>To respond to your inquiries and provide customer support</li>
              <li>To gather analysis or valuable information so that we can improve our service</li>
              <li>To monitor the usage of our service</li>
              <li>To send you promotional communications (with your consent)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Security of Data</h2>
            <p className="text-muted-foreground">
              The security of your data is important to us but remember that no method of transmission over the Internet or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your Personal Data, we cannot guarantee its absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Contact Us</h2>
            <p className="text-muted-foreground">
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <div className="bg-card border rounded-md p-4 mt-4">
              <p className="font-semibold">TN Credit Solutions</p>
              <p className="text-sm text-muted-foreground">
                For privacy inquiries, please use the contact form on our website or reach out through our live chat support.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Changes to This Privacy Policy</h2>
            <p className="text-muted-foreground">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.
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
