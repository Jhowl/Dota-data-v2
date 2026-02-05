import Link from "next/link";

import { HomeDashboardTable } from "@/components/home-dashboard-table";
import { LeagueActivity } from "@/components/charts/league-activity";
import { PatchTrend } from "@/components/charts/patch-trend";
import { YearlyMetricLine } from "@/components/charts/yearly-metric-line";
import { YearlyMetrics } from "@/components/charts/yearly-metrics";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { formatNumber, formatPercent } from "@/lib/format";
import { summarizeMatches } from "@/lib/stats";
import { getCounts, getLeagues, getPatches, getPatchTrendStats, getRecentMatches } from "@/lib/supabase/queries";

export const metadata = {
  title: "DotaData - Professional Dota 2 Statistics, Team Analysis & League Data",
  description:
    "Comprehensive Dota 2 competitive statistics and analysis. Track professional matches, teams, and league performance data.",
  keywords: [
    "Dota 2 stats",
    "Dota 2 esports",
    "Dota 2 leagues",
    "Dota 2 teams",
    "Dota 2 match analysis",
    "Dota 2 meta",
    "Dota 2 analytics",
  ],
  openGraph: {
    title: "DotaData - Professional Dota 2 Statistics, Team Analysis & League Data",
    description:
      "Comprehensive Dota 2 competitive statistics and analysis. Track professional matches, teams, and league performance data.",
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "DotaData - Professional Dota 2 Statistics, Team Analysis & League Data",
    description:
      "Comprehensive Dota 2 competitive statistics and analysis. Track professional matches, teams, and league performance data.",
  },
  alternates: {
    canonical: "/",
  },
};

export const revalidate = 86400;

const formatMinutes = (seconds: number) => `${(seconds / 60).toFixed(1)}m`;

export default async function HomePage() {
  const currentYear = new Date().getFullYear();
  const [counts, leagues, patches, matches, patchTrendStats] = await Promise.all([
    getCounts(),
    getLeagues(),
    getPatches(),
    getRecentMatches(2000),
    getPatchTrendStats(),
  ]);

  const leagueLookup = new Map(leagues.map((league) => [league.id, league]));

  const yearMatches = matches.filter((match) => {
    const year = new Date(match.startTime).getFullYear();
    return Number.isFinite(year) && year === currentYear;
  });

  const yearSummary = summarizeMatches(yearMatches);

  const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "short" });
  const monthlyBuckets = Array.from({ length: 12 }, (_, index) => ({
    month: monthFormatter.format(new Date(currentYear, index, 1)),
    matchCount: 0,
    durationSum: 0,
    scoreSum: 0,
    count: 0,
  }));

  yearMatches.forEach((match) => {
    const parsed = new Date(match.startTime);
    if (Number.isNaN(parsed.getTime())) {
      return;
    }

    const bucket = monthlyBuckets[parsed.getMonth()];
    bucket.matchCount += 1;
    bucket.durationSum += match.duration;
    bucket.scoreSum += match.radiantScore + match.direScore;
    bucket.count += 1;
  });

  const matchVolume = monthlyBuckets.map((bucket) => ({
    month: bucket.month,
    value: bucket.matchCount,
  }));

  const yearlyMetrics = monthlyBuckets.map((bucket) => ({
    month: bucket.month,
    avgDuration: bucket.count ? Number(((bucket.durationSum / bucket.count) / 60).toFixed(1)) : 0,
    avgScore: bucket.count ? Number((bucket.scoreSum / bucket.count).toFixed(1)) : 0,
  }));

  const leagueStats = yearMatches.reduce<Record<string, { matches: number; durationSum: number; scoreSum: number; radiantWins: number }>>(
    (acc, match) => {
      const entry = acc[match.leagueId] ?? { matches: 0, durationSum: 0, scoreSum: 0, radiantWins: 0 };
      entry.matches += 1;
      entry.durationSum += match.duration;
      entry.scoreSum += match.radiantScore + match.direScore;
      entry.radiantWins += match.radiantWin ? 1 : 0;
      acc[match.leagueId] = entry;
      return acc;
    },
    {}
  );

  const leagueRows = Object.entries(leagueStats)
    .map(([leagueId, stats]) => {
      const league = leagueLookup.get(leagueId);
      if (!league) {
        return null;
      }

      return {
        leagueId,
        leagueName: league.name,
        leagueSlug: league.slug,
        matches: stats.matches,
        avgDuration: stats.matches ? stats.durationSum / stats.matches : 0,
        avgScore: stats.matches ? stats.scoreSum / stats.matches : 0,
        radiantWinRate: stats.matches ? (stats.radiantWins / stats.matches) * 100 : 0,
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .sort((a, b) => b.matches - a.matches)
    .slice(0, 12);

  return (
    <div className="space-y-12">
      <section className="space-y-4">
        <Badge className="w-fit bg-primary/10 text-primary">Home dashboard</Badge>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold md:text-4xl">Season pulse</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Headline KPIs, trends, and league breakdowns for professional Dota 2 matches.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="sm">
              <Link href="/leagues">Explore leagues</Link>
            </Button>
            <Button asChild size="sm" variant="secondary">
              <Link href="/teams">Browse teams</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/patches">Patch analysis</Link>
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Assumption: trend metrics and league breakdowns use the latest 2,000 matches (existing data feed). Add filters
          for full-season coverage and time ranges when available.
        </p>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-display text-2xl font-semibold">Headline KPIs</h2>
          <p className="text-sm text-muted-foreground">Totals and current-year performance highlights.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total matches" value={formatNumber(counts.matches)} hint="All-time" />
          <StatCard label={`${currentYear} matches`} value={formatNumber(yearSummary.totalMatches)} hint="Season to date" />
          <StatCard
            label="Avg duration"
            value={yearSummary.totalMatches ? formatMinutes(yearSummary.avgDuration) : "—"}
            hint="Season average"
          />
          <StatCard
            label="Radiant win rate"
            value={yearSummary.totalMatches ? formatPercent(yearSummary.radiantWinRate) : "—"}
            hint="Season average"
          />
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-display text-2xl font-semibold">Trends</h2>
          <p className="text-sm text-muted-foreground">Monthly season patterns and patch-level signals.</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-border/60 bg-card/80">
            <CardHeader>
              <CardTitle>{currentYear} Match volume</CardTitle>
              <p className="text-sm text-muted-foreground">Monthly match count (current year).</p>
            </CardHeader>
            <CardContent>
              <YearlyMetricLine data={matchVolume} color="var(--chart-1)" />
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-card/80">
            <CardHeader>
              <CardTitle>{currentYear} Avg duration & kills</CardTitle>
              <p className="text-sm text-muted-foreground">Average duration (minutes) and kills by month.</p>
            </CardHeader>
            <CardContent>
              <YearlyMetrics data={yearlyMetrics} />
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-border/60 bg-card/80">
            <CardHeader>
              <CardTitle>Patch trend</CardTitle>
              <p className="text-sm text-muted-foreground">Matches and average duration (min) by patch.</p>
            </CardHeader>
            <CardContent>
              <PatchTrend patches={patches} stats={patchTrendStats} />
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-card/80">
            <CardHeader>
              <CardTitle>League activity</CardTitle>
              <p className="text-sm text-muted-foreground">Match volume across active leagues.</p>
            </CardHeader>
            <CardContent>
              <LeagueActivity leagues={leagues} matches={yearMatches} />
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-display text-2xl font-semibold">League breakdown</h2>
          <p className="text-sm text-muted-foreground">Top leagues by match volume this season.</p>
        </div>
        <Card className="border-border/60 bg-card/80">
          <CardHeader>
            <CardTitle>League performance snapshot</CardTitle>
            <p className="text-sm text-muted-foreground">Sortable metrics for the most active leagues.</p>
          </CardHeader>
          <CardContent>
            <HomeDashboardTable rows={leagueRows} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
