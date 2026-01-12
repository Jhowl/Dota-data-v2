import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = {
  title: "Dota 2 Seasons by Year - League and Team Performance",
  description:
    "Browse Dota 2 seasons by year with league and team summaries, match trends, and historical stats.",
  openGraph: {
    title: "Dota 2 Seasons by Year - League and Team Performance",
    description:
      "Browse Dota 2 seasons by year with league and team summaries, match trends, and historical stats.",
    type: "website",
    url: "/seasons",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dota 2 Seasons by Year - League and Team Performance",
    description:
      "Browse Dota 2 seasons by year with league and team summaries, match trends, and historical stats.",
  },
  alternates: {
    canonical: "/seasons",
  },
};

export const revalidate = 86400;

export default function SeasonsPage() {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: Math.max(0, currentYear - 2022) }, (_, index) => 2023 + index);

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <Badge className="w-fit bg-primary/10 text-primary">Season archive</Badge>
        <h1 className="font-display text-3xl font-semibold md:text-4xl">Dota 2 Seasons by Year</h1>
        <p className="max-w-2xl text-muted-foreground">
          Explore yearly snapshots of the competitive scene with league coverage, team activity, and monthly trends.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {years.map((year) => (
          <Card key={year} className="border-border/60 bg-card/80">
            <CardContent className="p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Season</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{year}</p>
              <Link href={`/seasons/${year}`} className="mt-3 inline-flex text-sm font-semibold text-primary">
                View season →
              </Link>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
