import Link from "next/link";
import Script from "next/script";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDate, formatNumber, formatPercent } from "@/lib/format";
import { getCounts, getTeamSummaries, getTeams } from "@/lib/supabase/queries";

export const metadata = {
  title: "Professional Dota 2 Teams - Statistics, Match History & Analysis",
  description:
    "Browse professional Dota 2 teams with match history and performance analysis. Find detailed team data and competitive insights.",
  keywords: [
    "Dota 2 teams",
    "Dota 2 esports teams",
    "Dota 2 team stats",
    "Dota 2 match history",
    "Dota 2 rosters",
    "Dota 2 competitive",
  ],
  openGraph: {
    title: "Professional Dota 2 Teams - Statistics, Match History & Analysis",
    description:
      "Browse professional Dota 2 teams with match history and performance analysis. Find detailed team data and competitive insights.",
    type: "website",
    url: "/teams",
  },
  twitter: {
    card: "summary_large_image",
    title: "Professional Dota 2 Teams - Statistics, Match History & Analysis",
    description:
      "Browse professional Dota 2 teams with match history and performance analysis. Find detailed team data and competitive insights.",
  },
  alternates: {
    canonical: "/teams",
  },
};

export const revalidate = 86400;

interface TeamsPageProps {
  searchParams?: Promise<{ search?: string }>;
}

const formatMinutes = (seconds: number) => `${(seconds / 60).toFixed(1)}m`;

export default async function TeamsPage({ searchParams }: TeamsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const query = resolvedSearchParams?.search?.toLowerCase().trim() ?? "";

  const [counts, teams, teamSummaries] = await Promise.all([
    getCounts(),
    getTeams(),
    getTeamSummaries(),
  ]);

  const filteredTeams = query
    ? teams.filter((team) => team.name.toLowerCase().includes(query))
    : teams;

  const summaryByTeam = new Map(teamSummaries.map((summary) => [summary.teamId, summary]));

  return (
    <>
      <Script id="teams-ld-json" type="application/ld+json" strategy="afterInteractive">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Dota 2 Teams",
          url: "https://dotadata.com/teams",
          about: {
            "@type": "Thing",
            name: "Dota 2 esports teams",
          },
          mainEntity: {
            "@type": "ItemList",
            itemListElement: filteredTeams.slice(0, 50).map((team, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: team.name,
              url: `https://dotadata.com/teams/${team.slug}`,
            })),
          },
        })}
      </Script>
      <div className="space-y-10">
      <section className="space-y-4">
        <Badge className="w-fit bg-primary/10 text-primary">Teams index</Badge>
        <h1 className="font-display text-3xl font-semibold md:text-4xl">Dota 2 Teams</h1>
        <p className="max-w-2xl text-muted-foreground">
          Explore professional Dota 2 teams, their match history, and performance stats.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/60 bg-card/80">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Teams tracked</p>
            <p className="mt-2 text-2xl font-semibold">{formatNumber(counts.teams)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/80">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Matches analyzed</p>
            <p className="mt-2 text-2xl font-semibold">{formatNumber(counts.matches)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/80">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Latest team</p>
            <p className="mt-2 text-2xl font-semibold">{teams[0]?.name ?? "—"}</p>
          </CardContent>
        </Card>
      </section>

      <section className="rounded-2xl border border-border/60 bg-card/80 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <form className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
            <Input
              name="search"
              defaultValue={resolvedSearchParams?.search ?? ""}
              placeholder="Search teams..."
              className="w-full md:w-64"
            />
            <Button type="submit">Search</Button>
          </form>
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Total Teams:</span> {formatNumber(filteredTeams.length)}
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full border border-border/60 text-sm">
            <thead className="bg-muted/60">
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Logo</th>
                <th className="px-4 py-3">Team Name</th>
                <th className="px-4 py-3">Total Matches</th>
                <th className="px-4 py-3">Avg Duration</th>
                <th className="px-4 py-3">Radiant Winrate</th>
                <th className="px-4 py-3">Dire Winrate</th>
                <th className="px-4 py-3">Last Match</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeams.length ? (
                filteredTeams.map((team) => {
                  const summary = summaryByTeam.get(team.id);
                  const totalMatches = summary?.totalMatches ?? 0;
                  const avgDuration = summary?.avgDuration ?? 0;
                  const radiantRate = summary?.radiantWinrate ?? null;
                  const direRate = summary?.direWinrate ?? null;

                  return (
                    <tr key={team.id} className="border-t border-border/60">
                      <td className="px-4 py-3">
                        {team.logoUrl ? (
                          <img
                            src={team.logoUrl}
                            alt={`${team.name} logo`}
                            className="h-10 w-10 rounded-full object-contain"
                          />
                        ) : (
                          <span className="inline-block h-10 w-10 rounded-full bg-muted" />
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold text-primary">
                        <Link href={`/teams/${team.slug}`}>{team.name}</Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatNumber(totalMatches)}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {totalMatches ? formatMinutes(avgDuration) : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {radiantRate !== null ? formatPercent(radiantRate) : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {direRate !== null ? formatPercent(direRate) : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {summary?.lastMatchTime ? formatDate(summary.lastMatchTime) : "—"}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                    No teams found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      </div>
    </>
  );
}
