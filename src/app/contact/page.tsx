import { Breadcrumbs } from "@/components/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const metadata = {
  title: "Contact Us - Get in Touch",
  description:
    "Contact the DotaData team for questions, feedback, or support.",
};

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
            <form className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-muted-foreground">Name *</label>
                  <Input placeholder="Your name" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-muted-foreground">Email *</label>
                  <Input placeholder="you@email.com" type="email" />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-muted-foreground">Subject *</label>
                <Input placeholder="What's this about?" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-muted-foreground">Message *</label>
                <textarea
                  className="min-h-[140px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Tell us more about your question or feedback..."
                />
              </div>
              <Button type="submit" className="w-full">
                Send Message
              </Button>
            </form>
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
              <div>
                <h3 className="text-lg font-medium text-foreground">Email</h3>
                <p className="text-sm text-muted-foreground">hello@dotadata.com</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
