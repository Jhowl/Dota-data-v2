import Link from "next/link";
import Script from "next/script";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatNumber, formatPercent } from "@/lib/format";
import { createHeroImageResolver } from "@/lib/hero";
import { summarizeMatches } from "@/lib/stats";
import {
  getHeroes,
  getLeaguePickBanStats,
  getLeagues,
  getMatchesByLeagueIds,
  getTeams,
  getTopPerformersByLeague,
} from "@/lib/supabase/queries";

export const metadata = {
  title: "The International - Dota 2 World Championship",
  description:
    "Browse every edition of The International and explore aggregated match statistics across the premier Dota 2 event.",
  keywords: [
    "The International",
    "Dota 2 TI",
    "Dota 2 world championship",
    "Dota 2 stats",
    "Dota 2 esports",
  ],
  openGraph: {
    title: "The International - Dota 2 World Championship",
    description:
      "Browse every edition of The International and explore aggregated match statistics across the premier Dota 2 event.",
    type: "website",
    url: "/the-international",
  },
  twitter: {
    card: "summary_large_image",
    title: "The International - Dota 2 World Championship",
    description:
      "Browse every edition of The International and explore aggregated match statistics across the premier Dota 2 event.",
  },
  alternates: {
    canonical: "/the-international",
  },
};

export const revalidate = 3600;

const formatMinutes = (seconds: number) => `${(seconds / 60).toFixed(1)} min`;

export default async function InternationalPage() {
  const [leagues, teams, heroes] = await Promise.all([getLeagues(), getTeams(), getHeroes()]);

  const internationalLeagues = leagues.filter((league) =>
    league.name.toLowerCase().includes("international")
  );
  const leagueIds = new Set(internationalLeagues.map((league) => league.id));
  const internationalMatches = await getMatchesByLeagueIds([...leagueIds]);
  const summary = summarizeMatches(internationalMatches);

  const teamLookup = new Map(teams.map((team) => [team.id, team.name]));
  const heroLookup = new Map(heroes.map((hero) => [hero.id, hero.localizedName]));
  const buildHeroImageUrl = createHeroImageResolver(heroes);

  const topPerformersByStat = (
    await Promise.all([...leagueIds].map((leagueId) => getTopPerformersByLeague(leagueId)))
  )
    .flat()
    .reduce((acc, entry) => {
      if (!entry.performer) {
        return acc;
      }
      const current = acc.get(entry.key);
      if (!current || entry.performer.statValue > current.performer.statValue) {
        acc.set(entry.key, entry);
      }
      return acc;
    }, new Map());

  const aggregatedTopPerformers = Array.from(topPerformersByStat.values());

  const pickBanBuckets = [...leagueIds].length
    ? (
        await Promise.all([...leagueIds].map((leagueId) => getLeaguePickBanStats(leagueId, 50)))
      ).reduce(
        (acc, stat) => {
          stat.mostPicked.forEach((entry) => {
            acc.picked[entry.heroId] = (acc.picked[entry.heroId] ?? 0) + entry.total;
          });
          stat.mostBanned.forEach((entry) => {
            acc.banned[entry.heroId] = (acc.banned[entry.heroId] ?? 0) + entry.total;
          });
          stat.mostContested.forEach((entry) => {
            acc.contested[entry.heroId] = (acc.contested[entry.heroId] ?? 0) + entry.total;
          });
          return acc;
        },
        {
          picked: {} as Record<string, number>,
          banned: {} as Record<string, number>,
          contested: {} as Record<string, number>,
        }
      )
    : { picked: {}, banned: {}, contested: {} };

  const toTopHeroes = (bucket: Record<string, number>, limit = 5) =>
    Object.entries(bucket)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([heroId, total]) => ({ heroId, total }));

  return (
    <>
      <Script id="ti-ld-json" type="application/ld+json" strategy="afterInteractive">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "EventSeries",
          name: "The International",
          sport: "Dota 2",
          url: "https://dotadata.com/the-international",
          organizer: {
            "@type": "Organization",
            name: "DotaData",
            url: "https://dotadata.com",
          },
        })}
      </Script>
      <div className="space-y-10">
      <section className="space-y-4">
        <Badge className="w-fit bg-primary/10 text-primary">Premier event</Badge>
        <h1 className="font-display text-3xl font-semibold md:text-4xl">The International</h1>
        <p className="max-w-3xl text-muted-foreground">
          The International is Dota 2&apos;s flagship world championship. This page brings every edition together,
          combining match outcomes, hero trends, and standout performances into one unified history of the event.
        </p>
        <div className="rounded-2xl border-l-4 border-primary bg-primary/10 p-4 text-sm text-muted-foreground">
          <strong className="text-foreground">About this page:</strong> Explore all International editions, compare
          winrates and match lengths across years, and see the heroes and players that defined the biggest stage in
          Dota 2.
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-border/60 bg-background/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total Editions</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{formatNumber(internationalLeagues.length)}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total Matches</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{formatNumber(summary.totalMatches)}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Avg Duration</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{formatMinutes(summary.avgDuration)}</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl font-semibold text-foreground">All The International Editions</h2>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Jump into each year&apos;s tournament page to see match timelines, team performance, and patch-specific
          shifts that shaped the meta.
        </p>
        <ul className="mt-4 list-disc space-y-1 pl-6 text-sm text-muted-foreground">
          {internationalLeagues.length ? (
            internationalLeagues.map((league) => (
              <li key={league.id}>
                <Link href={`/leagues/${league.slug}`} className="font-semibold text-primary">
                  {league.name}
                </Link>
                <span className="ml-2 text-muted-foreground">
                  ({league.startDate ? new Date(league.startDate).getFullYear() : ""})
                </span>
              </li>
            ))
          ) : (
            <li>No International events found.</li>
          )}
        </ul>
      </section>

      {!summary.totalMatches ? (
        <Card className="border-border/60 bg-card/80">
          <CardContent className="p-8 text-center">
            <h3 className="text-xl font-semibold text-foreground">No Match Data Available</h3>
            <p className="mt-2 text-sm text-muted-foreground">No matches for The International yet.</p>
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
              <CardContent className="grid gap-4 md:grid-cols-2">
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
                <div>
                  <p className="text-sm text-muted-foreground">Fastest Match</p>
                  <p className="text-2xl font-semibold text-foreground">
                    {summary.fastestMatch ? formatMinutes(summary.fastestMatch.duration) : "N/A"}
                  </p>
                  <p className="text-xs text-muted-foreground">Match ID: {summary.fastestMatch?.id ?? "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Longest Match</p>
                  <p className="text-2xl font-semibold text-foreground">
                    {summary.longestMatch ? formatMinutes(summary.longestMatch.duration) : "N/A"}
                  </p>
                  <p className="text-xs text-muted-foreground">Match ID: {summary.longestMatch?.id ?? "N/A"}</p>
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
                  <p className="text-2xl font-semibold text-foreground">
                    {formatPercent(100 - summary.radiantWinRate)}
                  </p>
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

          <section className="grid gap-6 lg:grid-cols-3">
            {[
              { title: "Most Picked", entries: toTopHeroes(pickBanBuckets.picked) },
              { title: "Most Banned", entries: toTopHeroes(pickBanBuckets.banned) },
              { title: "Most Contested", entries: toTopHeroes(pickBanBuckets.contested) },
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
              {aggregatedTopPerformers.length ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {aggregatedTopPerformers.map((entry) => {
                    if (!entry.performer) {
                      return null;
                    }
                    const performer = entry.performer;
                    const heroName = performer.heroId ? heroLookup.get(performer.heroId) ?? performer.heroId : "Unknown";
                    const teamName = performer.teamId ? teamLookup.get(performer.teamId) ?? performer.teamId : "Unknown";
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
        </>
      )}

      <section className="rounded-2xl border border-border/60 bg-card/80 p-6">
        <h2 className="font-display text-xl font-semibold">Event Overview</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {internationalLeagues.map((league) => (
            <div key={league.id} className="rounded-2xl border border-border/60 bg-background/60 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">{league.name}</p>
                  <p className="text-sm text-muted-foreground">{formatDate(league.startDate)}</p>
                </div>
                <Badge variant="outline">League ID {league.id}</Badge>
              </div>
              <Link href={`/leagues/${league.slug}`} className="mt-3 inline-flex text-sm font-semibold text-primary">
                View league stats
              </Link>
            </div>
          ))}
        </div>
      </section>
      </div>
    </>
  );
}
