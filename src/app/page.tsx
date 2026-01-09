import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatNumber, formatPercent } from "@/lib/format";
import { summarizeMatches } from "@/lib/stats";
import { getCounts, getLeagues, getRecentMatches, getTeams } from "@/lib/supabase/queries";

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

const formatMinutes = (seconds: number) => `${(seconds / 60).toFixed(1)}m`;

export default async function HomePage() {
  const currentYear = new Date().getFullYear();
  const [counts, leagues, teams, matches] = await Promise.all([
    getCounts(),
    getLeagues(),
    getTeams(),
    getRecentMatches(2000),
  ]);

  const teamLookup = new Map(teams.map((team) => [team.id, team]));
  const leagueLookup = new Map(leagues.map((league) => [league.id, league]));

  const yearMatches = matches.filter((match) => {
    const year = new Date(match.startTime).getFullYear();
    return Number.isFinite(year) && year === currentYear;
  });

  const yearSummary = summarizeMatches(yearMatches);

  const topLeagues = Object.entries(
    yearMatches.reduce<Record<string, number>>((acc, match) => {
      acc[match.leagueId] = (acc[match.leagueId] ?? 0) + 1;
      return acc;
    }, {})
  )
    .map(([leagueId, matchCount]) => ({
      league: leagueLookup.get(leagueId),
      matchCount,
    }))
    .filter((entry) => entry.league)
    .sort((a, b) => b.matchCount - a.matchCount)
    .slice(0, 6);

  const topTeams = Object.entries(
    yearMatches.reduce<Record<string, number>>((acc, match) => {
      if (match.radiantTeamId) {
        acc[match.radiantTeamId] = (acc[match.radiantTeamId] ?? 0) + 1;
      }
      if (match.direTeamId) {
        acc[match.direTeamId] = (acc[match.direTeamId] ?? 0) + 1;
      }
      return acc;
    }, {})
  )
    .map(([teamId, matchCount]) => ({
      team: teamLookup.get(teamId),
      matchCount,
    }))
    .filter((entry) => entry.team)
    .sort((a, b) => b.matchCount - a.matchCount)
    .slice(0, 6);

  const recentMatches = matches.slice(0, 6);
  const recentLeagues = leagues
    .slice()
    .sort((a, b) => String(b.startDate ?? "").localeCompare(String(a.startDate ?? "")))
    .slice(0, 6);

  return (
    <div className="space-y-16">
      <section className="rounded-3xl border border-border/60 bg-card/80 p-10 shadow-sm">
        <div className="space-y-6 text-center">
          <Badge className="mx-auto w-fit bg-primary/10 text-primary">DotaData</Badge>
          <h1 className="font-display text-4xl font-semibold text-foreground md:text-5xl">
            Welcome to DotaData
          </h1>
          <p className="mx-auto max-w-3xl text-lg text-muted-foreground">
            Your comprehensive source for Dota 2 competitive data, statistics, and analysis. Explore leagues, teams,
            and matches with detailed insights.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/leagues">Explore Leagues</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/teams">Browse Teams</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/patches">Patch Analysis</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-8">
        <div className="text-center">
          <h2 className="font-display text-3xl font-semibold">Project Overview</h2>
          <p className="text-muted-foreground">Comprehensive Dota 2 competitive data collection and analysis.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border/60 bg-card/80">
            <CardContent className="p-6 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total Matches</p>
              <p className="mt-3 text-3xl font-semibold text-primary">{formatNumber(counts.matches)}</p>
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-card/80">
            <CardContent className="p-6 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Teams</p>
              <p className="mt-3 text-3xl font-semibold text-foreground">{formatNumber(counts.teams)}</p>
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-card/80">
            <CardContent className="p-6 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Leagues</p>
              <p className="mt-3 text-3xl font-semibold text-foreground">{formatNumber(counts.leagues)}</p>
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-card/80">
            <CardContent className="p-6 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Heroes</p>
              <p className="mt-3 text-3xl font-semibold text-foreground">{formatNumber(counts.heroes)}</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-8">
        <div className="text-center">
          <h2 className="font-display text-3xl font-semibold">{currentYear} Season Overview</h2>
          <p className="text-muted-foreground">Key statistics and performance data for the current year.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border/60 bg-card/80">
            <CardContent className="p-6 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Matches</p>
              <p className="mt-3 text-2xl font-semibold text-primary">
                {formatNumber(yearSummary.totalMatches)}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-card/80">
            <CardContent className="p-6 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Avg Duration</p>
              <p className="mt-3 text-2xl font-semibold text-foreground">
                {yearSummary.totalMatches ? formatMinutes(yearSummary.avgDuration) : "—"}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-card/80">
            <CardContent className="p-6 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Avg Kills</p>
              <p className="mt-3 text-2xl font-semibold text-foreground">
                {yearSummary.totalMatches ? yearSummary.avgScore.toFixed(1) : "—"}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-card/80">
            <CardContent className="p-6 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Radiant Win Rate</p>
              <p className="mt-3 text-2xl font-semibold text-foreground">
                {yearSummary.totalMatches ? formatPercent(yearSummary.radiantWinRate) : "—"}
              </p>
            </CardContent>
          </Card>
        </div>

        {topLeagues.length ? (
          <Card className="border-border/60 bg-card/80">
            <CardHeader>
              <CardTitle>Top Leagues in {currentYear}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {topLeagues.map(({ league, matchCount }) => (
                <div
                  key={league!.id}
                  className="rounded-2xl border border-border/60 bg-background/60 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{league!.name}</p>
                      <p className="text-sm text-muted-foreground">{formatNumber(matchCount)} matches</p>
                    </div>
                    <Link
                      href={`/leagues/${league!.slug}`}
                      className="text-sm font-semibold text-primary"
                    >
                      View →
                    </Link>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {topTeams.length ? (
          <Card className="border-border/60 bg-card/80">
            <CardHeader>
              <CardTitle>Most Active Teams in {currentYear}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {topTeams.map(({ team, matchCount }) => (
                <div
                  key={team!.id}
                  className="rounded-2xl border border-border/60 bg-background/60 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{team!.name}</p>
                      <p className="text-sm text-muted-foreground">{formatNumber(matchCount)} matches</p>
                    </div>
                    <Link
                      href={`/teams/${team!.slug}`}
                      className="text-sm font-semibold text-primary"
                    >
                      View →
                    </Link>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        <Card className="border-border/60 bg-card/80">
          <CardHeader>
            <CardTitle>Most Picked Heroes in {currentYear}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Hero pick trends will appear after match data migration.</p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-8">
        <div className="text-center">
          <h2 className="font-display text-3xl font-semibold">Recent Activity</h2>
          <p className="text-muted-foreground">Latest matches and league updates.</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <Card className="border-border/60 bg-card/80">
            <CardHeader>
              <CardTitle>Recent Matches</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentMatches.length ? (
                recentMatches.map((match) => {
                  const radiant = match.radiantTeamId ? teamLookup.get(match.radiantTeamId)?.name ?? `Team ${match.radiantTeamId}` : "Radiant";
                  const dire = match.direTeamId ? teamLookup.get(match.direTeamId)?.name ?? `Team ${match.direTeamId}` : "Dire";
                  const leagueName = leagueLookup.get(match.leagueId)?.name ?? `League ${match.leagueId}`;
                  return (
                    <div key={match.id} className="rounded-2xl border border-border/60 bg-background/60 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-foreground">
                            {match.radiantWin ? "Radiant" : "Dire"} Victory
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {radiant} vs {dire}
                          </div>
                          <div className="text-xs text-muted-foreground">{leagueName}</div>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          {formatMinutes(match.duration)}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">No recent matches available.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/80">
            <CardHeader>
              <CardTitle>Recent Leagues</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentLeagues.length ? (
                recentLeagues.map((league) => (
                  <div key={league.id} className="rounded-2xl border border-border/60 bg-background/60 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{league.name}</p>
                        <p className="text-sm text-muted-foreground">{formatDate(league.startDate)}</p>
                      </div>
                      <Link href={`/leagues/${league.slug}`} className="text-sm font-semibold text-primary">
                        View →
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No recent leagues available.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-8">
        <div className="text-center">
          <h2 className="font-display text-3xl font-semibold">Key Features</h2>
          <p className="text-muted-foreground">What makes DotaData special.</p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {[
            {
              title: "Comprehensive Statistics",
              description:
                "Detailed match data, team performance metrics, and player statistics across competitive Dota 2 events.",
            },
            {
              title: "Handicap Analysis",
              description:
                "Advanced kill-score handicap analysis to understand team performance under different scenarios.",
            },
            {
              title: "Real-time Updates",
              description:
                "Stay current with the latest competitive Dota 2 data, including recent matches, leagues, and teams.",
            },
          ].map((feature) => (
            <Card key={feature.title} className="border-border/60 bg-card/80 text-center">
              <CardContent className="space-y-3 p-6">
                <h3 className="text-xl font-semibold text-foreground">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-primary px-6 py-12 text-center text-primary-foreground">
        <h2 className="font-display text-3xl font-semibold">Ready to Explore?</h2>
        <p className="mt-3 text-lg text-primary-foreground/80">
          Start exploring the world of competitive Dota 2 data today.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <Button asChild size="lg" variant="secondary">
            <Link href="/leagues">Browse Leagues</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-primary-foreground text-primary-foreground">
            <Link href="/teams">View Teams</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
