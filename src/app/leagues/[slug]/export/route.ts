import { getAllMatchesByLeague, getLeagueBySlug, getPatches, getTeams } from "@/lib/supabase/queries";

export const revalidate = 0;

const csvEscape = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) {
    return "";
  }
  const stringValue = String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, "\"\"")}"`;
  }
  return stringValue;
};

const parseStartTime = (value: string) => {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

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

  const teamLookup = new Map(teams.map((team) => [team.id, team.name]));
  const patchLookup = new Map(patches.map((patch) => [patch.id, patch.patch]));
  const mapNumberByMatchId = new Map<string, number>();
  const seriesMapCounter = new Map<string, number>();

  const matchesByTime = [...matches].sort((a, b) => {
    const timeDiff = parseStartTime(a.startTime) - parseStartTime(b.startTime);
    if (timeDiff !== 0) {
      return timeDiff;
    }
    return a.id.localeCompare(b.id);
  });

  matchesByTime.forEach((match) => {
    if (!match.seriesId) {
      mapNumberByMatchId.set(match.id, 1);
      return;
    }

    const next = (seriesMapCounter.get(match.seriesId) ?? 0) + 1;
    seriesMapCounter.set(match.seriesId, next);
    mapNumberByMatchId.set(match.id, next);
  });

  const rows = matchesByTime.map((match) => {
    const radiantTeam = match.radiantTeamId ? teamLookup.get(match.radiantTeamId) ?? `Team ${match.radiantTeamId}` : "";
    const direTeam = match.direTeamId ? teamLookup.get(match.direTeamId) ?? `Team ${match.direTeamId}` : "";
    const winner = match.radiantWin ? radiantTeam || "Radiant" : direTeam || "Dire";
    const mapNumber = mapNumberByMatchId.get(match.id) ?? 1;
    const patchName = patchLookup.get(match.patchId) ?? "";

    return [
      league.name,
      radiantTeam,
      direTeam,
      match.radiantScore,
      match.direScore,
      mapNumber,
      match.seriesId ?? "",
      winner,
      match.startTime,
      patchName,
    ];
  });

  const header = [
    "tournament",
    "Radiant (team)",
    "Dire (team)",
    "kill team 1",
    "kill team 2",
    "Mapa (1, 2, 3)",
    "series id",
    "vencedor",
    "data",
    "patch",
  ];

  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
  const filename = `league-${league.slug}-matches.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
