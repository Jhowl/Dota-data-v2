import Link from "next/link";
import Script from "next/script";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatNumber, formatPercent } from "@/lib/format";
import { createHeroImageResolver } from "@/lib/hero";
import {
  getHeroes,
  getMatchesByIds,
  getTeamBySlug,
  getTeamPickBanStats,
  getTeamSummary,
  getTeams,
  getTopPerformersByTeam,
} from "@/lib/supabase/queries";

interface TeamPageProps {
  params: Promise<{ slug: string }>;
}

const formatMinutes = (seconds: number) => `${(seconds / 60).toFixed(1)} min`;

export async function generateMetadata({ params }: TeamPageProps) {
  const { slug } = await params;
  const team = await getTeamBySlug(slug);

  if (!team) {
    return { title: "Team not found" };
  }

  return {
    title: `${team.name} - Dota 2 Team Statistics & Performance Analysis`,
    description: `Comprehensive statistics for ${team.name} with match history and performance analysis.`,
    keywords: [
      "Dota 2 team",
      "Dota 2 roster",
      "Dota 2 stats",
      "Dota 2 match history",
      "Dota 2 esports",
      team.name,
    ],
    openGraph: {
      title: `${team.name} - Dota 2 Team Statistics & Performance Analysis`,
      description: `Comprehensive statistics for ${team.name} with match history and performance analysis.`,
      type: "article",
      url: `/teams/${team.slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${team.name} - Dota 2 Team Statistics & Performance Analysis`,
      description: `Comprehensive statistics for ${team.name} with match history and performance analysis.`,
    },
    alternates: {
      canonical: `/teams/${team.slug}`,
    },
  };
}

export const revalidate = 86400;

export default async function TeamPage({ params }: TeamPageProps) {
  const { slug } = await params;
  const team = await getTeamBySlug(slug);

  if (!team) {
    return <div className="py-20 text-center text-muted-foreground">Team not found.</div>;
  }

  const [teamSummary, teams, heroes, topPerformers, pickBanStats] = await Promise.all([
    getTeamSummary(team.id),
    getTeams(),
    getHeroes(),
    getTopPerformersByTeam(team.id),
    getTeamPickBanStats(team.id, 5),
  ]);

  const highlightMatchIds = [
    teamSummary?.minScoreMatchId,
    teamSummary?.maxScoreMatchId,
    teamSummary?.fastestMatchId,
    teamSummary?.longestMatchId,
  ].filter(Boolean) as string[];

  const highlightMatches = await getMatchesByIds([...new Set(highlightMatchIds)]);

  const teamLookup = new Map(teams.map((entry) => [entry.id, entry.name]));
  const heroLookup = new Map(heroes.map((hero) => [hero.id, hero.localizedName]));
  const matchById = new Map(highlightMatches.map((match) => [match.id, match]));
  const summary = {
    totalMatches: teamSummary?.totalMatches ?? 0,
    avgDuration: teamSummary?.avgDuration ?? 0,
    avgScore: teamSummary?.avgScore ?? 0,
    minScore: teamSummary?.minScore ?? 0,
    maxScore: teamSummary?.maxScore ?? 0,
    avgFirstTowerTime: teamSummary?.avgFirstTowerTime ?? null,
    fastestMatch: teamSummary?.fastestMatchId ? matchById.get(teamSummary.fastestMatchId) ?? null : null,
    longestMatch: teamSummary?.longestMatchId ? matchById.get(teamSummary.longestMatchId) ?? null : null,
    minScoreMatch: teamSummary?.minScoreMatchId ? matchById.get(teamSummary.minScoreMatchId) ?? null : null,
    maxScoreMatch: teamSummary?.maxScoreMatchId ? matchById.get(teamSummary.maxScoreMatchId) ?? null : null,
  };
  const teamLeagues = teamSummary?.leagues ?? [];

  const overallWinRate = summary.totalMatches
    ? ((teamSummary?.radiantWinrate ?? 0) * (teamSummary?.radiantMatches ?? 0) +
        (teamSummary?.direWinrate ?? 0) * (teamSummary?.direMatches ?? 0)) /
        summary.totalMatches
    : 0;
  const radiantWinRate = teamSummary?.radiantWinrate ?? 0;
  const direWinRate = teamSummary?.direWinrate ?? 0;
  const buildHeroImageUrl = createHeroImageResolver(heroes);

  return (
    <>
      <Script id="team-ld-json" type="application/ld+json" strategy="afterInteractive">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SportsTeam",
          name: team.name,
          sport: "Dota 2",
          url: `https://dotadata.com/teams/${team.slug}`,
          logo: team.logoUrl ?? undefined,
          memberOf: {
            "@type": "Organization",
            name: "DotaData",
            url: "https://dotadata.com",
          },
        })}
      </Script>
      <div className="space-y-10">
      <Breadcrumbs
        items={[
          { title: "Teams", url: "/teams" },
          { title: team.name },
        ]}
      />

      <section className="space-y-3">
        <Badge className="w-fit bg-primary/10 text-primary">Team overview</Badge>
        <h1 className="font-display text-3xl font-semibold md:text-4xl">{team.name}</h1>
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span>Team ID: {team.id}</span>
          {team.logoUrl ? (
            <img src={team.logoUrl} alt={`${team.name} logo`} className="h-10 w-10 rounded-full" />
          ) : null}
        </div>
      </section>

      {!summary.totalMatches ? (
        <Card className="border-border/60 bg-card/80">
          <CardContent className="p-8 text-center">
            <h3 className="text-xl font-semibold text-foreground">No Match Data Available</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This team doesn't have any matches in the database yet.
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
                  <p className="text-xs text-muted-foreground">Match ID: {summary.minScoreMatch?.id ?? "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Max Score</p>
                  <p className="text-2xl font-semibold text-foreground">{summary.maxScore}</p>
                  <p className="text-xs text-muted-foreground">Match ID: {summary.maxScoreMatch?.id ?? "N/A"}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/60 bg-card/80">
              <CardHeader>
                <CardTitle>Winrate</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-6 md:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Overall</p>
                  <p className="text-2xl font-semibold text-foreground">{formatPercent(overallWinRate)}</p>
                  <p className="text-xs text-muted-foreground">{formatNumber(summary.totalMatches)} matches</p>
                </div>
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                  <p className="text-sm font-semibold text-emerald-300">Radiant</p>
                  <p className="text-2xl font-semibold text-emerald-200">{formatPercent(radiantWinRate)}</p>
                </div>
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                  <p className="text-sm font-semibold text-red-300">Dire</p>
                  <p className="text-2xl font-semibold text-red-200">{formatPercent(direWinRate)}</p>
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
                    Radiant: {summary.fastestMatch.radiantTeamId ? teamLookup.get(summary.fastestMatch.radiantTeamId) : "Unknown"}
                  </p>
                  <p>
                    Dire: {summary.fastestMatch.direTeamId ? teamLookup.get(summary.fastestMatch.direTeamId) : "Unknown"}
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
                    Radiant: {summary.longestMatch.radiantTeamId ? teamLookup.get(summary.longestMatch.radiantTeamId) : "Unknown"}
                  </p>
                  <p>
                    Dire: {summary.longestMatch.direTeamId ? teamLookup.get(summary.longestMatch.direTeamId) : "Unknown"}
                  </p>
                  <p>Winner: {summary.longestMatch.radiantWin ? "Radiant" : "Dire"}</p>
                </CardContent>
              </Card>
            ) : null}
          </section>

          <Card className="border-border/60 bg-card/80">
            <CardHeader>
              <CardTitle>League Participation</CardTitle>
              <p className="text-sm text-muted-foreground">Performance across leagues this team competed in.</p>
            </CardHeader>
            <CardContent>
              {teamLeagues.length ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-border/60 text-sm">
                    <thead className="bg-muted/60">
                      <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-4 py-3">League</th>
                        <th className="px-4 py-3">Matches</th>
                        <th className="px-4 py-3">Overall</th>
                        <th className="px-4 py-3">Radiant</th>
                        <th className="px-4 py-3">Dire</th>
                        <th className="px-4 py-3">Last Match</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamLeagues.map((league) => (
                        <tr key={league.id} className="border-t border-border/60">
                          <td className="px-4 py-3 font-semibold text-primary">
                            <Link href={`/leagues/${league.slug}`}>{league.name}</Link>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{formatNumber(league.matchCount)}</td>
                          <td className="px-4 py-3 text-muted-foreground">{formatPercent(league.overallWinrate)}</td>
                          <td className="px-4 py-3 text-emerald-200">{formatPercent(league.radiantWinrate)}</td>
                          <td className="px-4 py-3 text-red-200">{formatPercent(league.direWinrate)}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {league.lastMatchTime ? formatDate(league.lastMatchTime) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No league participation data yet.</p>
              )}
            </CardContent>
          </Card>

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
                        <div key={entry.heroId} className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/40 p-3">
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
                            <p className="text-xs text-muted-foreground">{team.name}</p>
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
              <CardTitle>Player Performance</CardTitle>
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
        </>
      )}
      </div>
    </>
  );
}
