import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HomeDashboardTable } from "@/components/home-dashboard-table";
import { LeagueActivity } from "@/components/charts/league-activity";
import { YearlyMetrics } from "@/components/charts/yearly-metrics";
import { YearlyMetricLine } from "@/components/charts/yearly-metric-line";
import { PatchTrend } from "@/components/charts/patch-trend";
import { ShareButton } from "@/components/share-button";
import { formatDate, formatNumber, formatPercent } from "@/lib/format";
import { summarizeMatches } from "@/lib/stats";
import { getCounts, getLeagues, getMatchesByYear, getPatches } from "@/lib/supabase/queries";

export const metadata = {
  title: "DotaData - Dota 2 Analytics Dashboard, Leagues & Match Insights",
  description:
    "Dota 2 analytics dashboard covering league activity, patch trends, and season KPIs. Track pro matches, teams, and meta shifts in one place.",
  keywords: [
    "Dota 2 stats",
    "Dota 2 esports",
    "Dota 2 dashboard",
    "Dota 2 leagues",
    "Dota 2 teams",
    "Dota 2 match analysis",
    "Dota 2 analytics dashboard",
    "Dota 2 meta",
    "Dota 2 analytics",
  ],
  openGraph: {
    title: "DotaData - Dota 2 Analytics Dashboard, Leagues & Match Insights",
    description:
      "Dota 2 analytics dashboard covering league activity, patch trends, and season KPIs. Track pro matches, teams, and meta shifts in one place.",
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "DotaData - Dota 2 Analytics Dashboard, Leagues & Match Insights",
    description:
      "Dota 2 analytics dashboard covering league activity, patch trends, and season KPIs. Track pro matches, teams, and meta shifts in one place.",
  },
  alternates: {
    canonical: "/",
  },
};

export const revalidate = 86400;

const fmt = (seconds: number) => `${(seconds / 60).toFixed(1)} min`;

export default async function HomePage() {
  const currentYear = new Date().getFullYear();
  const [counts, leagues, patches, matches] = await Promise.all([
    getCounts(),
    getLeagues(),
    getPatches(),
    getMatchesByYear(currentYear),
  ]);

  const leagueLookup = new Map(leagues.map((l) => [l.id, l]));
  const patchLookup = new Map(patches.map((p) => [p.id, p]));

  const yearSummary = summarizeMatches(matches);

  const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "short" });
  const monthlyBuckets = Array.from({ length: 12 }, (_, index) => ({
    month: monthFormatter.format(new Date(currentYear, index, 1)),
    matchCount: 0,
    durationSum: 0,
    scoreSum: 0,
    count: 0,
  }));

  matches.forEach((match) => {
    const parsed = new Date(match.startTime);
    if (Number.isNaN(parsed.getTime())) return;
    const bucket = monthlyBuckets[parsed.getMonth()];
    bucket.matchCount += 1;
    bucket.durationSum += match.duration;
    bucket.scoreSum += match.radiantScore + match.direScore;
    bucket.count += 1;
  });

  const matchVolume = monthlyBuckets.map((b) => ({ month: b.month, value: b.matchCount }));
  const yearlyMetrics = monthlyBuckets.map((b) => ({
    month: b.month,
    avgDuration: b.count ? Number(((b.durationSum / b.count) / 60).toFixed(1)) : 0,
    avgScore: b.count ? Number((b.scoreSum / b.count).toFixed(1)) : 0,
  }));

  const patchTotals = matches.reduce<Record<string, { matches: number; durationSum: number }>>(
    (acc, match) => {
      const key = match.patchId;
      const entry = acc[key] ?? { matches: 0, durationSum: 0 };
      entry.matches += 1;
      entry.durationSum += match.duration;
      acc[key] = entry;
      return acc;
    },
    {},
  );

  const patchTrendStats = Object.entries(patchTotals).map(([patchId, entry]) => ({
    patchId,
    matches: entry.matches,
    avgDuration: entry.matches ? entry.durationSum / entry.matches / 60 : 0,
  }));

  const leagueStats = matches.reduce<
    Record<string, { matches: number; durationSum: number; scoreSum: number; radiantWins: number }>
  >((acc, match) => {
    const entry = acc[match.leagueId] ?? {
      matches: 0,
      durationSum: 0,
      scoreSum: 0,
      radiantWins: 0,
    };
    entry.matches += 1;
    entry.durationSum += match.duration;
    entry.scoreSum += match.radiantScore + match.direScore;
    entry.radiantWins += match.radiantWin ? 1 : 0;
    acc[match.leagueId] = entry;
    return acc;
  }, {});

  const leagueRows = Object.entries(leagueStats)
    .map(([leagueId, stats]) => {
      const league = leagueLookup.get(leagueId);
      if (!league) return null;
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
    .filter((r): r is NonNullable<typeof r> => Boolean(r))
    .sort((a, b) => b.matches - a.matches)
    .slice(0, 12);

  const parseMatchTime = (v: string) => {
    const t = Date.parse(v);
    return Number.isNaN(t) ? 0 : t;
  };

  const latestMatch = matches.reduce<(typeof matches)[number] | null>((acc, m) => {
    if (!acc) return m;
    return parseMatchTime(m.startTime) > parseMatchTime(acc.startTime) ? m : acc;
  }, null);

  const latestPatch = latestMatch ? patchLookup.get(latestMatch.patchId) ?? null : null;

  // Curiosity card data
  const fastestLeague = yearSummary.fastestMatch
    ? leagueLookup.get(yearSummary.fastestMatch.leagueId) ?? null
    : null;
  const longestLeague = yearSummary.longestMatch
    ? leagueLookup.get(yearSummary.longestMatch.leagueId) ?? null
    : null;
  const maxScoreLeague = yearSummary.maxScoreMatch
    ? leagueLookup.get(yearSummary.maxScoreMatch.leagueId) ?? null
    : null;
  const spotlightLeagues = leagueRows.slice(0, 4);

  return (
    <div className="space-y-12">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-border/60 bg-card/80 p-6 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xl space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-primary/10 text-primary">Live · {currentYear}</Badge>
              {latestPatch && (
                <Badge variant="outline" className="text-muted-foreground">
                  Patch {latestPatch.patch}
                </Badge>
              )}
            </div>
            <h1 className="font-display text-3xl font-semibold leading-tight md:text-4xl">
              Competitive Dota&nbsp;2<br />analytics, match by match
            </h1>
            <p className="text-muted-foreground">
              <span className="font-semibold text-foreground">
                {formatNumber(counts.matches)}
              </span>{" "}
              matches indexed across{" "}
              <span className="font-semibold text-foreground">
                {formatNumber(counts.leagues)}
              </span>{" "}
              leagues and{" "}
              <span className="font-semibold text-foreground">
                {formatNumber(counts.teams)}
              </span>{" "}
              teams.
              {latestMatch?.startTime && (
                <>
                  {" "}Last updated{" "}
                  <span className="text-foreground">{formatDate(latestMatch.startTime)}</span>.
                </>
              )}
            </p>
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

          {/* Season at-a-glance numbers */}
          <div className="grid grid-cols-2 gap-3 md:min-w-[240px]">
            {[
              {
                label: `${currentYear} matches`,
                value: formatNumber(yearSummary.totalMatches),
              },
              {
                label: "Radiant winrate",
                value: yearSummary.totalMatches
                  ? formatPercent(yearSummary.radiantWinRate)
                  : "—",
              },
              {
                label: "Avg duration",
                value: yearSummary.totalMatches ? fmt(yearSummary.avgDuration) : "—",
              },
              {
                label: "Avg kills",
                value: yearSummary.totalMatches
                  ? yearSummary.avgScore.toFixed(1)
                  : "—",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-border/60 bg-background/50 p-4 text-center"
              >
                <p className="text-xl font-semibold text-foreground">{item.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Season curiosities ───────────────────────────────────────────── */}
      {yearSummary.totalMatches > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="font-display text-2xl font-semibold">Season curiosities</h2>
            <p className="text-sm text-muted-foreground">
              Standout facts from {currentYear} competitive play — shareable in one click.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {yearSummary.fastestMatch && (
              <CuriosityCard
                icon="⚡"
                label="Fastest match"
                value={fmt(yearSummary.fastestMatch.duration)}
                context={fastestLeague?.name ?? "—"}
                shareTitle="Fastest pro Dota 2 match"
                shareText={`⚡ The fastest pro Dota 2 match in ${currentYear}: ${fmt(yearSummary.fastestMatch.duration)} in ${fastestLeague?.name ?? "unknown league"} — check DotaData for more!`}
                shareUrl={fastestLeague ? `/leagues/${fastestLeague.slug}` : "/leagues"}
                exploreUrl={fastestLeague ? `/leagues/${fastestLeague.slug}` : "/leagues"}
              />
            )}

            {yearSummary.longestMatch && (
              <CuriosityCard
                icon="⏱️"
                label="Longest match"
                value={fmt(yearSummary.longestMatch.duration)}
                context={longestLeague?.name ?? "—"}
                shareTitle="Longest pro Dota 2 match"
                shareText={`⏱️ The longest pro Dota 2 marathon in ${currentYear}: ${fmt(yearSummary.longestMatch.duration)} in ${longestLeague?.name ?? "unknown league"} — check DotaData!`}
                shareUrl={longestLeague ? `/leagues/${longestLeague.slug}` : "/leagues"}
                exploreUrl={longestLeague ? `/leagues/${longestLeague.slug}` : "/leagues"}
              />
            )}

            {yearSummary.maxScoreMatch && (
              <CuriosityCard
                icon="💥"
                label="Highest kill game"
                value={`${yearSummary.maxScore} kills`}
                context={maxScoreLeague?.name ?? "—"}
                shareTitle="Highest kill Dota 2 game"
                shareText={`💥 The bloodiest pro Dota 2 game in ${currentYear}: ${yearSummary.maxScore} total kills in ${maxScoreLeague?.name ?? "unknown league"} — check DotaData!`}
                shareUrl={maxScoreLeague ? `/leagues/${maxScoreLeague.slug}` : "/leagues"}
                exploreUrl={maxScoreLeague ? `/leagues/${maxScoreLeague.slug}` : "/leagues"}
              />
            )}

            {leagueRows[0] && (
              <CuriosityCard
                icon="🏆"
                label="Most active league"
                value={`${formatNumber(leagueRows[0].matches)} matches`}
                context={leagueRows[0].leagueName}
                shareTitle="Most active Dota 2 tournament"
                shareText={`🏆 The most active Dota 2 tournament in ${currentYear}: ${leagueRows[0].leagueName} with ${formatNumber(leagueRows[0].matches)} matches — check DotaData!`}
                shareUrl={`/leagues/${leagueRows[0].leagueSlug}`}
                exploreUrl={`/leagues/${leagueRows[0].leagueSlug}`}
              />
            )}
          </div>
        </section>
      )}

      {/* ── Tournament spotlight ─────────────────────────────────────────── */}
      {spotlightLeagues.length > 0 && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-semibold">Tournament spotlight</h2>
              <p className="text-sm text-muted-foreground">
                Most active leagues in {currentYear}, sorted by match volume.
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/leagues">All leagues</Link>
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {spotlightLeagues.map((league) => (
              <LeagueSpotlightCard key={league.leagueId} league={league} />
            ))}
          </div>
        </section>
      )}

      {/* ── Trends ───────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="font-display text-2xl font-semibold">Trends</h2>
          <p className="text-sm text-muted-foreground">
            Monthly season patterns and patch-level signals.
          </p>
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
              <CardTitle>{currentYear} Avg duration &amp; kills</CardTitle>
              <p className="text-sm text-muted-foreground">
                Average duration (minutes) and kills by month.
              </p>
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
              <p className="text-sm text-muted-foreground">
                Matches and average duration (min) by patch.
              </p>
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
              <LeagueActivity leagues={leagues} matches={matches} />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── League breakdown table ───────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="font-display text-2xl font-semibold">League breakdown</h2>
          <p className="text-sm text-muted-foreground">
            Top leagues by match volume — sortable by any column.
          </p>
        </div>
        <Card className="border-border/60 bg-card/80">
          <CardContent className="pt-6">
            <HomeDashboardTable rows={leagueRows} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

// ─── Curiosity card ───────────────────────────────────────────────────────────

interface CuriosityCardProps {
  icon: string;
  label: string;
  value: string;
  context: string;
  shareTitle: string;
  shareText: string;
  shareUrl: string;
  exploreUrl: string;
}

function CuriosityCard({
  icon,
  label,
  value,
  context,
  shareTitle,
  shareText,
  shareUrl,
  exploreUrl,
}: CuriosityCardProps) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-border/60 bg-card/80 p-5">
      <div className="space-y-2">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <span>{icon}</span>
          {label}
        </p>
        <p className="text-3xl font-semibold text-primary">{value}</p>
        <p className="truncate text-sm text-muted-foreground">{context}</p>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <ShareButton title={shareTitle} text={shareText} url={shareUrl} />
        <Link
          href={exploreUrl}
          className="ml-auto text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          View league →
        </Link>
      </div>
    </div>
  );
}

// ─── League spotlight card ────────────────────────────────────────────────────

interface LeagueSpotlightCardProps {
  league: {
    leagueId: string;
    leagueName: string;
    leagueSlug: string;
    matches: number;
    avgDuration: number;
    avgScore: number;
    radiantWinRate: number;
  };
}

function LeagueSpotlightCard({ league }: LeagueSpotlightCardProps) {
  return (
    <Link
      href={`/leagues/${league.leagueSlug}`}
      className="group flex flex-col rounded-2xl border border-border/60 bg-card/80 p-5 transition-colors hover:border-primary/40 hover:bg-card"
    >
      <p className="line-clamp-2 font-display text-base font-semibold text-foreground group-hover:text-primary">
        {league.leagueName}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {[
          { label: "Matches", value: formatNumber(league.matches) },
          { label: "Avg duration", value: fmt(league.avgDuration) },
          { label: "Avg kills", value: league.avgScore.toFixed(1) },
          { label: "Radiant win", value: formatPercent(league.radiantWinRate) },
        ].map((item) => (
          <div key={item.label}>
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="mt-0.5 text-sm font-semibold text-foreground">{item.value}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
        Explore full stats →
      </p>
    </Link>
  );
}
