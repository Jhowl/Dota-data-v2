import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDate, formatNumber, formatPercent } from "@/lib/format";
import { getCounts, getLeagueMatchStats, getLeagues } from "@/lib/supabase/queries";

export const metadata = {
  title: "Dota 2 Leagues & Tournaments - Professional Esports Statistics",
  description:
    "Explore professional Dota 2 leagues and tournaments with match counts, teams, and detailed analysis.",
};

interface LeaguesPageProps {
  searchParams?: Promise<{ search?: string }>;
}

export default async function LeaguesPage({ searchParams }: LeaguesPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const query = resolvedSearchParams?.search?.toLowerCase().trim() ?? "";

  const [counts, leagues, matchStats] = await Promise.all([
    getCounts(),
    getLeagues(),
    getLeagueMatchStats(),
  ]);

  const filteredLeagues = query
    ? leagues.filter((league) => league.name.toLowerCase().includes(query))
    : leagues;

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <Badge className="w-fit bg-primary/10 text-primary">Leagues index</Badge>
        <h1 className="font-display text-3xl font-semibold md:text-4xl">Leagues</h1>
        <p className="max-w-2xl text-muted-foreground">
          Explore professional Dota 2 leagues and tournaments with match coverage and event schedules.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/60 bg-card/80">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total Leagues</p>
            <p className="mt-2 text-2xl font-semibold">{formatNumber(counts.leagues)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/80">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total Matches</p>
            <p className="mt-2 text-2xl font-semibold">{formatNumber(counts.matches)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/80">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Latest League</p>
            <p className="mt-2 text-2xl font-semibold">{formatDate(leagues[0]?.startDate)}</p>
          </CardContent>
        </Card>
      </section>

      <section className="rounded-2xl border border-border/60 bg-card/80 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <form className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
            <Input
              name="search"
              defaultValue={resolvedSearchParams?.search ?? ""}
              placeholder="Search leagues..."
              className="w-full md:w-64"
            />
            <Button type="submit">Search</Button>
          </form>
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Total Leagues:</span> {formatNumber(filteredLeagues.length)}
            <span className="ml-4 font-semibold text-foreground">Total Matches:</span> {formatNumber(counts.matches)}
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full border border-border/60 text-sm">
            <thead className="bg-muted/60">
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Start Date</th>
                <th className="px-4 py-3">End Date</th>
                <th className="px-4 py-3">Total Matches</th>
                <th className="px-4 py-3">Total Teams</th>
                <th className="px-4 py-3">Radiant Winrate</th>
                <th className="px-4 py-3">Dire Winrate</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeagues.length ? (
                filteredLeagues.map((league) => {
                  const stats = matchStats[league.id];
                  const matchesCount = stats?.matches ?? 0;
                  const teamCount = stats?.teams.size ?? 0;
                  const radiantRate = matchesCount ? (stats!.radiantWins / matchesCount) * 100 : null;
                  return (
                    <tr key={league.id} className="border-t border-border/60">
                      <td className="px-4 py-3 font-semibold text-primary">
                        <Link href={`/leagues/${league.slug}`}>{league.name}</Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(league.startDate)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(league.endDate)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatNumber(matchesCount)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatNumber(teamCount)}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {radiantRate !== null ? formatPercent(radiantRate) : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {radiantRate !== null ? formatPercent(100 - radiantRate) : "—"}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                    No leagues found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
