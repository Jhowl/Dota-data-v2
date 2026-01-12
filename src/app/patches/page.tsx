import { Breadcrumbs } from "@/components/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/format";
import { getPatchesWithCounts } from "@/lib/supabase/queries";

export const metadata = {
  title: "Dota 2 Patches - Handicap Analysis by Patch",
  description:
    "Browse Dota 2 patches and analyze team handicap statistics for each patch version.",
  keywords: [
    "Dota 2 patches",
    "Dota 2 patch notes",
    "Dota 2 meta",
    "Dota 2 handicap analysis",
    "Dota 2 patch stats",
  ],
  openGraph: {
    title: "Dota 2 Patches - Handicap Analysis by Patch",
    description:
      "Browse Dota 2 patches and analyze team handicap statistics for each patch version.",
    type: "website",
    url: "/patches",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dota 2 Patches - Handicap Analysis by Patch",
    description:
      "Browse Dota 2 patches and analyze team handicap statistics for each patch version.",
  },
  alternates: {
    canonical: "/patches",
  },
};

export const revalidate = 86400;

export default async function PatchesPage() {
  const patches = await getPatchesWithCounts();
  const totalMatches = patches.reduce((sum, patch) => sum + patch.matchCount, 0);

  const parsePatchVersion = (value: string) => {
    const match = /^(\d+)\.(\d+)([a-z])?$/i.exec(value.trim());
    if (!match) {
      return { major: 0, minor: 0, suffix: "" };
    }
    return {
      major: Number(match[1]),
      minor: Number(match[2]),
      suffix: match[3] ?? "",
    };
  };

  const sortedPatches = [...patches].sort((a, b) => {
    const left = parsePatchVersion(a.patch);
    const right = parsePatchVersion(b.patch);
    if (left.major !== right.major) {
      return right.major - left.major;
    }
    if (left.minor !== right.minor) {
      return right.minor - left.minor;
    }
    return right.suffix.localeCompare(left.suffix);
  });
  const latestPatch = sortedPatches[0];

  return (
    <div className="space-y-10">
      <Breadcrumbs items={[{ title: "Patches" }]} />

      <section className="space-y-4">
        <Badge className="w-fit bg-primary/10 text-primary">Patch insights</Badge>
        <h1 className="font-display text-3xl font-semibold md:text-4xl">Dota 2 Patches</h1>
        <p className="max-w-2xl text-muted-foreground">
          Select a patch to analyze team handicap statistics and performance data.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <Card className="border-border/60 bg-card/80">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Total Patches</p>
            <p className="text-2xl font-semibold text-foreground">{formatNumber(patches.length)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/80">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Total Matches</p>
            <p className="text-2xl font-semibold text-foreground">{formatNumber(totalMatches)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/80">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Latest Patch</p>
            <p className="text-2xl font-semibold text-foreground">{latestPatch?.patch ?? "N/A"}</p>
          </CardContent>
        </Card>
      </section>

      <Card className="border-border/60 bg-card/80">
        <CardHeader>
          <CardTitle>Available Patches</CardTitle>
          <p className="text-sm text-muted-foreground">Click on a patch to analyze team handicap statistics.</p>
        </CardHeader>
        <CardContent>
          {patches.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border border-border/60 text-sm">
                <thead className="bg-muted/60">
                  <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3">Patch</th>
                    <th className="px-4 py-3">Matches</th>
                    <th className="px-4 py-3">Release Date</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPatches.map((patch) => {
                    const matchCount = patch.matchCount ?? 0;
                    return (
                      <tr key={patch.id} className="border-t border-border/60">
                        <td className="px-4 py-3 font-semibold text-foreground">Patch {patch.patch}</td>
                        <td className="px-4 py-3 text-muted-foreground">{formatNumber(matchCount)}</td>
                        <td className="px-4 py-3 text-muted-foreground">N/A</td>
                        <td className="px-4 py-3">
                          {matchCount > 0 ? (
                            <Button size="sm" variant="outline" asChild>
                              <Link href={`/patches/${encodeURIComponent(patch.patch)}`}>View Patch</Link>
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">No matches</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No patch data is available in the database.</p>
          )}
        </CardContent>
      </Card>

      <section className="rounded-2xl border border-border/60 bg-card/80 p-6">
        <h2 className="font-display text-xl font-semibold">How to Use Patch Handicap Analysis</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {[
            {
              step: "1",
              title: "Select Patch",
              description: "Choose a patch version to analyze team performance data from that meta.",
            },
            {
              step: "2",
              title: "Choose Teams",
              description: "Select one team for individual analysis or two teams for comparison.",
            },
            {
              step: "3",
              title: "Analyze Data",
              description: "View detailed handicap statistics for victories, losses, and patterns.",
            },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                {item.step}
              </div>
              <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
