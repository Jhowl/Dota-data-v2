import { Breadcrumbs } from "@/components/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ContactForm } from "@/components/contact-form";

export const metadata = {
  title: "Contact Us - Get in Touch",
  description:
    "Contact the DotaData team for questions, feedback, or support.",
  keywords: [
    "DotaData contact",
    "Dota 2 support",
    "Dota 2 analytics contact",
    "Dota 2 feedback",
  ],
  openGraph: {
    title: "Contact Us - Get in Touch",
    description:
      "Contact the DotaData team for questions, feedback, or support.",
    type: "website",
    url: "/contact",
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact Us - Get in Touch",
    description:
      "Contact the DotaData team for questions, feedback, or support.",
  },
  alternates: {
    canonical: "/contact",
  },
};

export const revalidate = 86400;

export default function ContactPage() {
  return (
    <div className="space-y-10">
      <Breadcrumbs items={[{ title: "Contact" }]} />

      <section className="space-y-4 text-center">
        <Badge className="mx-auto w-fit bg-primary/10 text-primary">Contact</Badge>
        <h1 className="font-display text-3xl font-semibold md:text-4xl">Contact Us</h1>
        <p className="mx-auto max-w-2xl text-muted-foreground">
          Have questions about our Dota 2 statistics? Need help with data analysis? Want to suggest new features? We’d
          love to hear from you.
        </p>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="border-border/60 bg-card/80">
          <CardContent className="space-y-6 p-8">
            <h2 className="text-2xl font-semibold text-foreground">Send us a Message</h2>
            <ContactForm />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border/60 bg-card/80">
            <CardContent className="space-y-6 p-8">
              <h2 className="text-2xl font-semibold text-foreground">Get in Touch</h2>
              <div>
                <h3 className="text-lg font-medium text-foreground">Quick Response</h3>
                <p className="text-sm text-muted-foreground">We typically respond within 24 hours.</p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground">Data Questions</h3>
                <p className="text-sm text-muted-foreground">Ask about our statistics, methodology, or sources.</p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground">Feature Requests</h3>
                <p className="text-sm text-muted-foreground">Suggest new features or improvements.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
