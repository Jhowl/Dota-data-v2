import { buildMatchCsv } from "@/lib/exports/match-csv";
import { getAllMatchesByLeague, getLeagueBySlug, getPatches, getTeams } from "@/lib/supabase/queries";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const league = await getLeagueBySlug(slug);

  if (!league) {
    return new Response("League not found.", { status: 404 });
  }

  const [matches, teams, patches] = await Promise.all([
    getAllMatchesByLeague(league.id),
    getTeams(),
    getPatches(),
  ]);
  const csv = buildMatchCsv({
    matches,
    teams,
    patches,
    tournamentResolver: () => league.name,
    seriesKeyResolver: (match) => match.seriesId ?? null,
  });
  const filename = `league-${league.slug}-matches.csv`;

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
