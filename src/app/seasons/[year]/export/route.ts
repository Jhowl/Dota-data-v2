import { buildMatchCsv } from "@/lib/exports/match-csv";
import { getLeagues, getMatchesByYear, getPatches, getTeams } from "@/lib/supabase/queries";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ year: string }> }) {
  const { year } = await params;
  const seasonYear = Number(year);

  if (!Number.isFinite(seasonYear)) {
    return new Response("Invalid season year.", { status: 400 });
  }

  const [matches, teams, patches, leagues] = await Promise.all([
    getMatchesByYear(seasonYear),
    getTeams(),
    getPatches(),
    getLeagues(),
  ]);

  const leagueLookup = new Map(leagues.map((league) => [league.id, league.name]));
  const csv = buildMatchCsv({
    matches,
    teams,
    patches,
    tournamentResolver: (match) => leagueLookup.get(match.leagueId) ?? `League ${match.leagueId}`,
    seriesKeyResolver: (match) => (match.seriesId ? `${match.leagueId}-${match.seriesId}` : null),
  });
  const filename = `season-${seasonYear}-matches.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
