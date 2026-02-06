import Link from "next/link";
import Script from "next/script";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ExportCsvButton } from "@/components/export-csv-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatNumber, formatPercent } from "@/lib/format";
import { createHeroImageResolver } from "@/lib/hero";
import {
  getLeagueBySlug,
  getHeroes,
  getLeaguePickBanStats,
  getLeagueTeamParticipation,
  getLeagueSummary,
  getMatchesByIds,
  getTopPerformersByLeague,
  getTeams,
} from "@/lib/supabase/queries";

interface LeaguePageProps {
  params: Promise<{ slug: string }>;
}

const formatMinutes = (seconds: number) => `${(seconds / 60).toFixed(1)} min`;

export async function generateMetadata({ params }: LeaguePageProps) {
  const { slug } = await params;
  const league = await getLeagueBySlug(slug);

  if (!league) {
    return { title: "League not found" };
  }

  return {
    title: `${league.name} - Dota 2 League Statistics & Analysis`,
    description: `Complete statistics and analysis for ${league.name}. View match results, team performance, and detailed league insights.`,
    keywords: [
      "Dota 2 league",
      "Dota 2 tournament",
      "Dota 2 stats",
      "Dota 2 matches",
      "Dota 2 teams",
      league.name,
    ],
    openGraph: {
      title: `${league.name} - Dota 2 League Statistics & Analysis`,
      description: `Complete statistics and analysis for ${league.name}. View match results, team performance, and detailed league insights.`,
      type: "article",
      url: `/leagues/${league.slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${league.name} - Dota 2 League Statistics & Analysis`,
      description: `Complete statistics and analysis for ${league.name}. View match results, team performance, and detailed league insights.`,
    },
    alternates: {
      canonical: `/leagues/${league.slug}`,
    },
  };
}

export const revalidate = 86400;

export default async function LeaguePage({ params }: LeaguePageProps) {
  const { slug } = await params;
  const league = await getLeagueBySlug(slug);

  if (!league) {
    return <div className="py-20 text-center text-muted-foreground">League not found.</div>;
  }

  const [leagueSummary, teams, heroes, topPerformers, pickBanStats, teamParticipation] = await Promise.all([
    getLeagueSummary(league.id),
    getTeams(),
    getHeroes(),
    getTopPerformersByLeague(league.id),
    getLeaguePickBanStats(league.id, 5),
    getLeagueTeamParticipation(league.id),
  ]);

  const highlightMatchIds = [
    leagueSummary?.minScoreMatchId,
    leagueSummary?.maxScoreMatchId,
    leagueSummary?.fastestMatchId,
    leagueSummary?.longestMatchId,
  ].filter(Boolean) as string[];

  const highlightMatches = await getMatchesByIds([...new Set(highlightMatchIds)]);

  const teamLookup = new Map(teams.map((team) => [team.id, team]));
  const heroLookup = new Map(heroes.map((hero) => [hero.id, hero.localizedName]));
  const matchById = new Map(highlightMatches.map((match) => [match.id, match]));
  const summary = {
    totalMatches: leagueSummary?.totalMatches ?? 0,
    avgDuration: leagueSummary?.avgDuration ?? 0,
    avgScore: leagueSummary?.avgScore ?? 0,
    minScore: leagueSummary?.minScore ?? 0,
    maxScore: leagueSummary?.maxScore ?? 0,
    avgFirstTowerTime: leagueSummary?.avgFirstTowerTime ?? null,
    radiantWinRate: leagueSummary?.radiantWinrate ?? 0,
    fastestMatch: leagueSummary?.fastestMatchId ? matchById.get(leagueSummary.fastestMatchId) ?? null : null,
    longestMatch: leagueSummary?.longestMatchId ? matchById.get(leagueSummary.longestMatchId) ?? null : null,
    minScoreMatch: leagueSummary?.minScoreMatchId ? matchById.get(leagueSummary.minScoreMatchId) ?? null : null,
    maxScoreMatch: leagueSummary?.maxScoreMatchId ? matchById.get(leagueSummary.maxScoreMatchId) ?? null : null,
  };
  const direWinRate = summary.totalMatches ? 100 - summary.radiantWinRate : 0;
  const buildHeroImageUrl = createHeroImageResolver(heroes);

  return (
    <>
      <Script id="league-ld-json" type="application/ld+json" strategy="afterInteractive">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SportsEvent",
          name: league.name,
          sport: "Dota 2",
          startDate: league.startDate ?? undefined,
          endDate: league.endDate ?? undefined,
          url: `https://dotadata.com/leagues/${league.slug}`,
          organizer: {
            "@type": "Organization",
            name: "DotaData",
            url: "https://dotadata.com",
          },
        })}
      </Script>
      <div className="space-y-10">
      <Breadcrumbs
        items={[
          { title: "Leagues", url: "/leagues" },
          { title: league.name },
        ]}
      />

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Badge className="w-fit bg-primary/10 text-primary">League overview</Badge>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <ExportCsvButton href={`/leagues/${league.slug}/export`} />
            <span className="text-muted-foreground">Download match data for this league.</span>
          </div>
        </div>
        <h1 className="font-display text-3xl font-semibold md:text-4xl">{league.name}</h1>
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span>League ID: {league.id}</span>
          <span>Start: {formatDate(league.startDate)}</span>
          <span>End: {formatDate(league.endDate)}</span>
        </div>
      </section>

      {!summary.totalMatches ? (
        <Card className="border-border/60 bg-card/80">
          <CardContent className="p-8 text-center">
            <h3 className="text-xl font-semibold text-foreground">No Match Data Available</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This league doesn&apos;t have any matches in the database yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-border/60 bg-card/80">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Total Matches</p>
                <p className="text-3xl font-semibold text-primary">{formatNumber(summary.totalMatches)}</p>
              </CardContent>
            </Card>
            <Card className="border-border/60 bg-card/80">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Average Duration</p>
                <p className="text-3xl font-semibold text-foreground">{formatMinutes(summary.avgDuration)}</p>
              </CardContent>
            </Card>
            <Card className="border-border/60 bg-card/80">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Average Score</p>
                <p className="text-3xl font-semibold text-foreground">{summary.avgScore.toFixed(1)}</p>
              </CardContent>
            </Card>
            <Card className="border-border/60 bg-card/80">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Avg First Tower</p>
                <p className="text-3xl font-semibold text-foreground">
                  {summary.avgFirstTowerTime ? formatMinutes(summary.avgFirstTowerTime) : "N/A"}
                </p>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            <Card className="border-border/60 bg-card/80">
              <CardHeader>
                <CardTitle>Score Range</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Min Score</p>
                  <p className="text-2xl font-semibold text-foreground">{summary.minScore}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Max Score</p>
                  <p className="text-2xl font-semibold text-foreground">{summary.maxScore}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/60 bg-card/80">
              <CardHeader>
                <CardTitle>Side Winrate</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Radiant</p>
                  <p className="text-2xl font-semibold text-foreground">{formatPercent(summary.radiantWinRate)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Dire</p>
                  <p className="text-2xl font-semibold text-foreground">{formatPercent(direWinRate)}</p>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            {summary.fastestMatch ? (
              <Card className="border-border/60 bg-card/80">
                <CardHeader>
                  <CardTitle>Fastest Match</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>Duration: {formatMinutes(summary.fastestMatch.duration)}</p>
                  <p>Match ID: {summary.fastestMatch.id}</p>
                  <p>
                    Radiant:{" "}
                    {summary.fastestMatch.radiantTeamId
                      ? teamLookup.get(summary.fastestMatch.radiantTeamId)?.name ?? "Unknown"
                      : "Unknown"}
                  </p>
                  <p>
                    Dire:{" "}
                    {summary.fastestMatch.direTeamId
                      ? teamLookup.get(summary.fastestMatch.direTeamId)?.name ?? "Unknown"
                      : "Unknown"}
                  </p>
                  <p>Winner: {summary.fastestMatch.radiantWin ? "Radiant" : "Dire"}</p>
                </CardContent>
              </Card>
            ) : null}
            {summary.longestMatch ? (
              <Card className="border-border/60 bg-card/80">
                <CardHeader>
                  <CardTitle>Longest Match</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>Duration: {formatMinutes(summary.longestMatch.duration)}</p>
                  <p>Match ID: {summary.longestMatch.id}</p>
                  <p>
                    Radiant:{" "}
                    {summary.longestMatch.radiantTeamId
                      ? teamLookup.get(summary.longestMatch.radiantTeamId)?.name ?? "Unknown"
                      : "Unknown"}
                  </p>
                  <p>
                    Dire:{" "}
                    {summary.longestMatch.direTeamId
                      ? teamLookup.get(summary.longestMatch.direTeamId)?.name ?? "Unknown"
                      : "Unknown"}
                  </p>
                  <p>Winner: {summary.longestMatch.radiantWin ? "Radiant" : "Dire"}</p>
                </CardContent>
              </Card>
            ) : null}
          </section>

          <section className="grid gap-6 lg:grid-cols-3">
            {[
              { title: "Most Picked", entries: pickBanStats.mostPicked },
              { title: "Most Banned", entries: pickBanStats.mostBanned },
              { title: "Most Contested", entries: pickBanStats.mostContested },
            ].map((group) => (
              <Card key={group.title} className="border-border/60 bg-card/80">
                <CardHeader>
                  <CardTitle>{group.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {group.entries.length ? (
                    group.entries.map((entry) => {
                      const heroName = heroLookup.get(entry.heroId) ?? entry.heroId;
                      const heroImage = buildHeroImageUrl(entry.heroId);
                      return (
                        <div key={`${entry.team}-${entry.heroId}`} className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/40 p-3">
                          <div className="h-8 w-8 overflow-hidden rounded-md border border-border/60 bg-muted">
                            {heroImage ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={heroImage} alt={heroName} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                                N/A
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-foreground">{heroName}</p>
                          </div>
                          <div className="text-sm font-semibold text-primary">{formatNumber(entry.total)}</div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground">No picks/bans data yet.</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </section>

          <Card className="border-border/60 bg-card/80">
            <CardHeader>
              <CardTitle>Top Performers</CardTitle>
            </CardHeader>
            <CardContent>
              {topPerformers.some((entry) => entry.performer) ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {topPerformers.map((entry) => {
                    if (!entry.performer) {
                      return (
                        <div key={entry.key} className="rounded-lg border border-border/60 bg-background/40 p-4">
                          <p className="text-sm font-semibold text-foreground">{entry.title}</p>
                          <p className="mt-2 text-sm text-muted-foreground">No data available.</p>
                        </div>
                      );
                    }

                    const performer = entry.performer;
                    const heroName = performer.heroId ? heroLookup.get(performer.heroId) ?? performer.heroId : "Unknown";
                    const teamName = performer.teamId ? teamLookup.get(performer.teamId)?.name ?? performer.teamId : "Unknown";
                    const heroImage = buildHeroImageUrl(performer.heroId);

                    return (
                      <div key={entry.key} className="rounded-lg border border-border/60 bg-background/40 p-4">
                        <div className="flex items-start gap-4">
                          <div className="h-14 w-14 overflow-hidden rounded-lg border border-border/60 bg-muted">
                            {heroImage ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={heroImage} alt={heroName} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                                N/A
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-foreground">{entry.title}</p>
                            <p className="mt-1 text-2xl font-semibold text-primary">
                              {formatNumber(performer.statValue)}
                            </p>
                            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                              <p>Match ID: {performer.matchId}</p>
                              <p>Hero: {heroName}</p>
                              <p>Player: {performer.accountId ?? "Unknown"}</p>
                              <p>Team: {teamName}</p>
                              <p>
                                KDA: {performer.kills}/{performer.deaths}/{performer.assists}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No player match data available yet.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/80">
            <CardHeader>
              <CardTitle>Team Participation</CardTitle>
              <p className="text-sm text-muted-foreground">Win rate and most picked hero per team in this league.</p>
            </CardHeader>
            <CardContent>
              {teamParticipation.length ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-border/60 text-sm">
                    <thead className="bg-muted/60">
                      <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-4 py-3">Team</th>
                        <th className="px-4 py-3">Matches</th>
                        <th className="px-4 py-3">Winrate</th>
                        <th className="px-4 py-3">Most Picked Hero</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamParticipation.map((entry) => {
                        const team = teamLookup.get(entry.teamId);
                        const heroName = entry.mostPickedHeroId
                          ? heroLookup.get(entry.mostPickedHeroId) ?? entry.mostPickedHeroId
                          : null;
                        const heroImage = buildHeroImageUrl(entry.mostPickedHeroId);
                        return (
                          <tr key={entry.teamId} className="border-t border-border/60">
                            <td className="px-4 py-3 font-semibold text-primary">
                              {team ? (
                                <Link href={`/teams/${team.slug}`}>{team.name}</Link>
                              ) : (
                                <span>{entry.teamId}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{formatNumber(entry.matchCount)}</td>
                            <td className="px-4 py-3 text-muted-foreground">{formatPercent(entry.winrate)}</td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {heroName ? (
                                <div className="flex items-center gap-2">
                                  <div className="h-8 w-8 overflow-hidden rounded-md border border-border/60 bg-muted">
                                    {heroImage ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={heroImage} alt={heroName} className="h-full w-full object-cover" />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                                        N/A
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-foreground">{heroName}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatNumber(entry.mostPickedTotal)} picks
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                "—"
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No team participation data available yet.</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
      </div>
    </>
  );
}
