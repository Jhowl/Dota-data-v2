import {
  leagues as mockLeagues,
  matches as mockMatches,
  patches as mockPatches,
  teams as mockTeams,
} from "@/lib/data/mock";
import { Hero, League, Match, Patch, PickBanEntry, PickBanStat, Team } from "@/lib/types";
import { supabase } from "@/lib/supabase/client";

const mapLeague = (row: Record<string, unknown>): League => ({
  id: String(row.league_id ?? row.id ?? ""),
  slug: String(row.slug ?? ""),
  name: String(row.name ?? ""),
  startDate: (row.start_date as string | null) ?? null,
  endDate: (row.end_date as string | null) ?? null,
});

const mapTeam = (row: Record<string, unknown>): Team => ({
  id: String(row.team_id ?? row.id ?? ""),
  slug: String(row.slug ?? ""),
  name: String(row.name ?? ""),
  logoUrl: (row.logo_url as string | null) ?? null,
});

const mapPatch = (row: Record<string, unknown>): Patch => ({
  id: String(row.id ?? ""),
  patch: String(row.patch ?? ""),
});

const mapHero = (row: Record<string, unknown>): Hero => ({
  id: String(row.id ?? ""),
  localizedName: String(row.localized_name ?? row.localizedName ?? ""),
  name: String(row.name ?? ""),
});

const mapMatch = (row: Record<string, unknown>): Match => ({
  id: String(row.match_id ?? row.id ?? ""),
  leagueId: String(row.league_id ?? ""),
  duration: Number(row.duration ?? 0),
  startTime: String(row.start_time ?? ""),
  direScore: Number(row.dire_score ?? 0),
  radiantScore: Number(row.radiant_score ?? 0),
  radiantWin: Boolean(row.radiant_win ?? false),
  seriesType: (row.series_type as string | null) ?? null,
  seriesId: row.series_id ? String(row.series_id) : null,
  radiantTeamId: row.radiant_team_id ? String(row.radiant_team_id) : null,
  direTeamId: row.dire_team_id ? String(row.dire_team_id) : null,
  firstTowerTeamId: row.first_tower_team_id ? String(row.first_tower_team_id) : null,
  firstTowerTime: row.first_tower_time ? Number(row.first_tower_time) : null,
  picksBans: Array.isArray(row.picks_bans) ? (row.picks_bans as PickBanEntry[]) : null,
  patchId: String(row.patch_id ?? ""),
});

export async function getCounts(): Promise<{ leagues: number; teams: number; matches: number; heroes: number }> {
  if (!supabase) {
    return {
      leagues: mockLeagues.length,
      teams: mockTeams.length,
      matches: mockMatches.length,
      heroes: 0,
    };
  }

  const [leagueResult, teamResult, matchResult, heroResult] = await Promise.all([
    supabase.from("leagues").select("league_id", { count: "exact", head: true }),
    supabase.from("teams").select("team_id", { count: "exact", head: true }),
    supabase.from("matches").select("match_id", { count: "exact", head: true }),
    supabase.from("heroes").select("id", { count: "exact", head: true }),
  ]);

  return {
    leagues: leagueResult.count ?? 0,
    teams: teamResult.count ?? 0,
    matches: matchResult.count ?? 0,
    heroes: heroResult.count ?? 0,
  };
}

export async function getLeagues(): Promise<League[]> {
  if (!supabase) {
    return mockLeagues;
  }

  const { data, error } = await supabase
    .from("leagues")
    .select("*")
    .order("start_date", { ascending: false });

  if (error || !data) {
    return mockLeagues;
  }

  return data.map((row) => mapLeague(row as Record<string, unknown>));
}

export async function getLeagueBySlug(slug: string): Promise<League | null> {
  if (!supabase) {
    return mockLeagues.find((league) => league.slug === slug) ?? null;
  }

  if (!slug) {
    return null;
  }

  const trimmedSlug = slug.trim();
  const idMatch = trimmedSlug.match(/-(\d+)$/);
  const leagueId = /^\d+$/.test(trimmedSlug)
    ? trimmedSlug
    : idMatch
      ? idMatch[1]
      : null;

  if (leagueId) {
    const { data, error } = await supabase
      .from("leagues")
      .select("*")
      .eq("league_id", leagueId)
      .maybeSingle();

    if (!error && data) {
      return mapLeague(data as Record<string, unknown>);
    }
  }

  const { data, error } = await supabase
    .from("leagues")
    .select("*")
    .eq("slug", trimmedSlug)
    .maybeSingle();

  if (error || !data) {
    return mockLeagues.find((league) => league.slug === slug) ?? null;
  }

  return mapLeague(data as Record<string, unknown>);
}

export async function getTeams(): Promise<Team[]> {
  if (!supabase) {
    return mockTeams;
  }

  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .order("name", { ascending: true });

  if (error || !data) {
    return mockTeams;
  }

  const teams = data.map((row) => mapTeam(row as Record<string, unknown>));
  const teamIds = new Set(teams.map((team) => team.id));
  const latestMatchByTeam = new Map<string, number>();

  const pageSize = 1000;
  let from = 0;

  while (latestMatchByTeam.size < teamIds.size) {
    const { data: matchRows, error: matchError } = await supabase
      .from("matches")
      .select("start_time,radiant_team_id,dire_team_id")
      .order("start_time", { ascending: false })
      .range(from, from + pageSize - 1);

    if (matchError || !matchRows?.length) {
      break;
    }

    (matchRows as Array<Record<string, unknown>>).forEach((row) => {
      const timeValue = Date.parse(String(row.start_time ?? ""));
      const radiantId = row.radiant_team_id ? String(row.radiant_team_id) : null;
      const direId = row.dire_team_id ? String(row.dire_team_id) : null;

      if (radiantId && teamIds.has(radiantId) && !latestMatchByTeam.has(radiantId) && Number.isFinite(timeValue)) {
        latestMatchByTeam.set(radiantId, timeValue);
      }
      if (direId && teamIds.has(direId) && !latestMatchByTeam.has(direId) && Number.isFinite(timeValue)) {
        latestMatchByTeam.set(direId, timeValue);
      }
    });

    from += pageSize;
  }

  return teams.sort((a, b) => {
    const timeA = latestMatchByTeam.get(a.id) ?? 0;
    const timeB = latestMatchByTeam.get(b.id) ?? 0;
    return timeB - timeA;
  });
}

export async function getTeamBySlug(slug: string): Promise<Team | null> {
  if (!supabase) {
    return mockTeams.find((team) => team.slug === slug) ?? null;
  }

  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) {
    return mockTeams.find((team) => team.slug === slug) ?? null;
  }

  return mapTeam(data as Record<string, unknown>);
}

export async function getPatches(): Promise<Patch[]> {
  if (!supabase) {
    return mockPatches;
  }

  const { data, error } = await supabase
    .from("patch")
    .select("*")
    .order("id", { ascending: false });

  if (error || !data) {
    return mockPatches;
  }

  return data.map((row) => mapPatch(row as Record<string, unknown>));
}

export async function getHeroes(): Promise<Hero[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("heroes")
    .select("id, localized_name, name")
    .order("id", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map((row) => mapHero(row as Record<string, unknown>));
}

export async function getRecentMatches(limit = 8): Promise<Match[]> {
  if (!supabase) {
    return mockMatches.slice(0, limit);
  }

  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .order("start_time", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return mockMatches.slice(0, limit);
  }

  return data.map((row) => mapMatch(row as Record<string, unknown>));
}

export type TopPerformer = {
  matchId: string;
  heroId: string | null;
  teamId: string | null;
  accountId: string | null;
  statValue: number;
  kills: number;
  deaths: number;
  assists: number;
};

export type TopPerformerStat = {
  key: string;
  title: string;
  performer: TopPerformer | null;
};

export async function getTopPerformersByLeague(leagueId: string): Promise<TopPerformerStat[]> {
  const stats = [
    { key: "kills", title: "Most Kills", field: "kills" },
    { key: "deaths", title: "Most Deaths", field: "deaths" },
    { key: "assists", title: "Most Assists", field: "assists" },
    { key: "gold", title: "Most Gold", field: "gold" },
    { key: "denies", title: "Most Denies", field: "denies" },
    { key: "hero_damage", title: "Most Hero Damage", field: "hero_damage" },
    { key: "last_hits", title: "Most Last Hits", field: "last_hits" },
    { key: "tower_damage", title: "Most Tower Damage", field: "tower_damage" },
    { key: "hero_healing", title: "Most Healing", field: "hero_healing" },
  ];

  if (!supabase || !leagueId) {
    return stats.map((stat) => ({ key: stat.key, title: stat.title, performer: null }));
  }

  const results = await Promise.all(
    stats.map(async (stat) => {
      const { data, error } = await supabase
        .from("player_matches")
        .select(
          `match_id,hero_id,team_id,account_id,kills,deaths,assists,${stat.field},matches!inner(league_id)`
        )
        .eq("matches.league_id", leagueId)
        .not(stat.field, "is", null)
        .gt(stat.field, 0)
        .order(stat.field, { ascending: false })
        .limit(1);

      if (error || !data?.length) {
        return { key: stat.key, title: stat.title, performer: null };
      }

      const row = data[0] as Record<string, unknown>;

      return {
        key: stat.key,
        title: stat.title,
        performer: {
          matchId: String(row.match_id ?? ""),
          heroId: row.hero_id ? String(row.hero_id) : null,
          teamId: row.team_id ? String(row.team_id) : null,
          accountId: row.account_id ? String(row.account_id) : null,
          statValue: Number(row[stat.field] ?? 0),
          kills: Number(row.kills ?? 0),
          deaths: Number(row.deaths ?? 0),
          assists: Number(row.assists ?? 0),
        },
      };
    })
  );

  return results;
}

export async function getTopPerformersByTeam(teamId: string): Promise<TopPerformerStat[]> {
  const stats = [
    { key: "kills", title: "Most Kills", field: "kills" },
    { key: "deaths", title: "Most Deaths", field: "deaths" },
    { key: "assists", title: "Most Assists", field: "assists" },
    { key: "gold", title: "Most Gold", field: "gold" },
    { key: "denies", title: "Most Denies", field: "denies" },
    { key: "hero_damage", title: "Most Hero Damage", field: "hero_damage" },
    { key: "last_hits", title: "Most Last Hits", field: "last_hits" },
    { key: "tower_damage", title: "Most Tower Damage", field: "tower_damage" },
    { key: "hero_healing", title: "Most Healing", field: "hero_healing" },
  ];

  if (!supabase || !teamId) {
    return stats.map((stat) => ({ key: stat.key, title: stat.title, performer: null }));
  }

  const results = await Promise.all(
    stats.map(async (stat) => {
      const { data, error } = await supabase
        .from("player_matches")
        .select("match_id,hero_id,team_id,account_id,kills,deaths,assists," + stat.field)
        .eq("team_id", teamId)
        .not(stat.field, "is", null)
        .gt(stat.field, 0)
        .order(stat.field, { ascending: false })
        .limit(1);

      if (error || !data?.length) {
        return { key: stat.key, title: stat.title, performer: null };
      }

      const row = data[0] as Record<string, unknown>;

      return {
        key: stat.key,
        title: stat.title,
        performer: {
          matchId: String(row.match_id ?? ""),
          heroId: row.hero_id ? String(row.hero_id) : null,
          teamId: row.team_id ? String(row.team_id) : null,
          accountId: row.account_id ? String(row.account_id) : null,
          statValue: Number(row[stat.field] ?? 0),
          kills: Number(row.kills ?? 0),
          deaths: Number(row.deaths ?? 0),
          assists: Number(row.assists ?? 0),
        },
      };
    })
  );

  return results;
}

export async function getMatchesByLeague(leagueId: string, limit = 10): Promise<Match[]> {
  if (!supabase) {
    return mockMatches.filter((match) => match.leagueId === leagueId).slice(0, limit);
  }

  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .eq("league_id", leagueId)
    .order("start_time", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return mockMatches.filter((match) => match.leagueId === leagueId).slice(0, limit);
  }

  return data.map((row) => mapMatch(row as Record<string, unknown>));
}

export async function getMatchesByTeam(teamId: string, limit = 10): Promise<Match[]> {
  if (!supabase) {
    return mockMatches
      .filter((match) => match.radiantTeamId === teamId || match.direTeamId === teamId)
      .slice(0, limit);
  }

  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .or(`radiant_team_id.eq.${teamId},dire_team_id.eq.${teamId}`)
    .order("start_time", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return mockMatches
      .filter((match) => match.radiantTeamId === teamId || match.direTeamId === teamId)
      .slice(0, limit);
  }

  return data.map((row) => mapMatch(row as Record<string, unknown>));
}

export async function getMatchesByLeagueIds(leagueIds: string[]): Promise<Match[]> {
  if (!leagueIds.length) {
    return [];
  }

  if (!supabase) {
    return mockMatches.filter((match) => leagueIds.includes(match.leagueId));
  }

  const results: Match[] = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .in("league_id", leagueIds)
      .order("start_time", { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) {
      break;
    }

    if (!data?.length) {
      break;
    }

    results.push(...data.map((row) => mapMatch(row as Record<string, unknown>)));
    from += pageSize;
  }

  return results;
}

export async function getMatchesByIds(matchIds: string[]): Promise<Match[]> {
  if (!matchIds.length) {
    return [];
  }

  if (!supabase) {
    return mockMatches.filter((match) => matchIds.includes(match.id));
  }

  const { data, error } = await supabase.from("matches").select("*").in("match_id", matchIds);
  if (error || !data) {
    return [];
  }

  return data.map((row) => mapMatch(row as Record<string, unknown>));
}

export async function getLeagueSummary(leagueId: string): Promise<LeagueSummary | null> {
  if (!supabase || !leagueId) {
    return null;
  }
  const { data, error } = await supabase.from("league_summaries").select("*").eq("league_id", leagueId).maybeSingle();
  if (error || !data) {
    return null;
  }
  return {
    leagueId: String(data.league_id ?? ""),
    totalMatches: Number(data.total_matches ?? 0),
    totalTeams: data.total_teams ?? null,
    avgDuration: data.avg_duration != null ? Number(data.avg_duration) : null,
    avgScore: data.avg_score != null ? Number(data.avg_score) : null,
    radiantWinrate: data.radiant_winrate != null ? Number(data.radiant_winrate) : null,
    avgFirstTowerTime: data.avg_first_tower_time != null ? Number(data.avg_first_tower_time) : null,
    lastMatchTime: data.last_match_time ?? null,
    minScore: data.min_score != null ? Number(data.min_score) : null,
    maxScore: data.max_score != null ? Number(data.max_score) : null,
    minScoreMatchId: data.min_score_match_id ? String(data.min_score_match_id) : null,
    maxScoreMatchId: data.max_score_match_id ? String(data.max_score_match_id) : null,
    fastestMatchId: data.fastest_match_id ? String(data.fastest_match_id) : null,
    fastestMatchDuration: data.fastest_match_duration != null ? Number(data.fastest_match_duration) : null,
    longestMatchId: data.longest_match_id ? String(data.longest_match_id) : null,
    longestMatchDuration: data.longest_match_duration != null ? Number(data.longest_match_duration) : null,
  };
}

export async function getTeamSummary(teamId: string): Promise<TeamSummary | null> {
  if (!supabase || !teamId) {
    return null;
  }
  const { data, error } = await supabase.from("team_summaries").select("*").eq("team_id", teamId).maybeSingle();
  if (error || !data) {
    return null;
  }
  return {
    teamId: String(data.team_id ?? ""),
    totalMatches: Number(data.total_matches ?? 0),
    avgDuration: data.avg_duration != null ? Number(data.avg_duration) : null,
    avgScore: data.avg_score != null ? Number(data.avg_score) : null,
    avgFirstTowerTime: data.avg_first_tower_time != null ? Number(data.avg_first_tower_time) : null,
    radiantMatches: data.radiant_matches ?? null,
    direMatches: data.dire_matches ?? null,
    radiantWinrate: data.radiant_winrate != null ? Number(data.radiant_winrate) : null,
    direWinrate: data.dire_winrate != null ? Number(data.dire_winrate) : null,
    lastMatchTime: data.last_match_time ?? null,
    minScore: data.min_score != null ? Number(data.min_score) : null,
    maxScore: data.max_score != null ? Number(data.max_score) : null,
    minScoreMatchId: data.min_score_match_id ? String(data.min_score_match_id) : null,
    maxScoreMatchId: data.max_score_match_id ? String(data.max_score_match_id) : null,
    fastestMatchId: data.fastest_match_id ? String(data.fastest_match_id) : null,
    fastestMatchDuration: data.fastest_match_duration != null ? Number(data.fastest_match_duration) : null,
    longestMatchId: data.longest_match_id ? String(data.longest_match_id) : null,
    longestMatchDuration: data.longest_match_duration != null ? Number(data.longest_match_duration) : null,
  };
}

export type LeagueMatchStats = Record<string, { matches: number; teams: Set<string>; radiantWins: number }>;

export type LeagueSummary = {
  leagueId: string;
  totalMatches: number;
  totalTeams: number | null;
  avgDuration: number | null;
  avgScore: number | null;
  radiantWinrate: number | null;
  avgFirstTowerTime: number | null;
  lastMatchTime: string | null;
  minScore: number | null;
  maxScore: number | null;
  minScoreMatchId: string | null;
  maxScoreMatchId: string | null;
  fastestMatchId: string | null;
  fastestMatchDuration: number | null;
  longestMatchId: string | null;
  longestMatchDuration: number | null;
};

export type TeamSummary = {
  teamId: string;
  totalMatches: number;
  avgDuration: number | null;
  avgScore: number | null;
  avgFirstTowerTime: number | null;
  radiantMatches: number | null;
  direMatches: number | null;
  radiantWinrate: number | null;
  direWinrate: number | null;
  lastMatchTime: string | null;
  minScore: number | null;
  maxScore: number | null;
  minScoreMatchId: string | null;
  maxScoreMatchId: string | null;
  fastestMatchId: string | null;
  fastestMatchDuration: number | null;
  longestMatchId: string | null;
  longestMatchDuration: number | null;
};

export type TeamMatchStats = Record<
  string,
  {
    totalMatches: number;
    durationSum: number;
    scoreSum: number;
    radiantMatches: number;
    direMatches: number;
    radiantWins: number;
    direWins: number;
    lastMatch: string | null;
  }
>;

type PickBanBuckets = Record<string, { heroId: string; team: number; total: number }>;

const parsePickBans = (value: unknown): PickBanEntry[] => {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value as PickBanEntry[];
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as PickBanEntry[]) : [];
    } catch {
      return [];
    }
  }
  return [];
};

const incrementBucket = (bucket: PickBanBuckets, entry: PickBanEntry) => {
  const heroId = String(entry.hero_id ?? "");
  if (!heroId) {
    return;
  }
  const key = `${entry.team ?? 0}:${heroId}`;
  if (!bucket[key]) {
    bucket[key] = { heroId, team: Number(entry.team ?? 0), total: 0 };
  }
  bucket[key].total += 1;
};

const incrementBucketByHero = (bucket: Record<string, { heroId: string; team: number | null; total: number }>, entry: PickBanEntry) => {
  const heroId = String(entry.hero_id ?? "");
  if (!heroId) {
    return;
  }
  if (!bucket[heroId]) {
    bucket[heroId] = { heroId, team: null, total: 0 };
  }
  bucket[heroId].total += 1;
};

const bucketToSorted = (bucket: Record<string, { heroId: string; team: number | null; total: number }>, limit = 10): PickBanStat[] =>
  Object.values(bucket)
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
    .map((row) => ({ heroId: row.heroId, team: row.team, total: row.total }));

export async function getLeagueMatchStats(): Promise<LeagueMatchStats> {
  const stats: LeagueMatchStats = {};

  const accumulate = (rows: Array<Record<string, unknown>>) => {
    rows.forEach((row) => {
      const leagueId = row.league_id ? String(row.league_id) : "";
      if (!leagueId) {
        return;
      }
      if (!stats[leagueId]) {
        stats[leagueId] = { matches: 0, teams: new Set(), radiantWins: 0 };
      }
      const entry = stats[leagueId];
      entry.matches += 1;
      if (row.radiant_team_id) {
        entry.teams.add(String(row.radiant_team_id));
      }
      if (row.dire_team_id) {
        entry.teams.add(String(row.dire_team_id));
      }
      if (row.radiant_win) {
        entry.radiantWins += 1;
      }
    });
  };

  if (!supabase) {
    accumulate(
      mockMatches.map((match) => ({
        league_id: match.leagueId,
        radiant_team_id: match.radiantTeamId,
        dire_team_id: match.direTeamId,
        radiant_win: match.radiantWin,
      }))
    );
    return stats;
  }

  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("matches")
      .select("league_id,radiant_team_id,dire_team_id,radiant_win")
      .range(from, from + pageSize - 1);

    if (error) {
      return stats;
    }

    if (!data?.length) {
      break;
    }

    accumulate(data as Array<Record<string, unknown>>);
    from += pageSize;
  }

  return stats;
}

export async function getTeamMatchStats(): Promise<TeamMatchStats> {
  const stats: TeamMatchStats = {};

  const initTeam = (teamId: string) => {
    if (!stats[teamId]) {
      stats[teamId] = {
        totalMatches: 0,
        durationSum: 0,
        scoreSum: 0,
        radiantMatches: 0,
        direMatches: 0,
        radiantWins: 0,
        direWins: 0,
        lastMatch: null,
      };
    }
  };

  const updateLastMatch = (teamId: string, startTime: string | null) => {
    if (!startTime) {
      return;
    }
    const existing = stats[teamId].lastMatch;
    if (!existing || new Date(startTime).getTime() > new Date(existing).getTime()) {
      stats[teamId].lastMatch = startTime;
    }
  };

  const accumulate = (rows: Array<Record<string, unknown>>) => {
    rows.forEach((row) => {
      const radiantId = row.radiant_team_id ? String(row.radiant_team_id) : null;
      const direId = row.dire_team_id ? String(row.dire_team_id) : null;
      const duration = Number(row.duration ?? 0);
      const score = Number(row.radiant_score ?? 0) + Number(row.dire_score ?? 0);
      const startTime = row.start_time ? String(row.start_time) : null;
      const radiantWin = Boolean(row.radiant_win ?? false);

      if (radiantId) {
        initTeam(radiantId);
        stats[radiantId].totalMatches += 1;
        stats[radiantId].durationSum += duration;
        stats[radiantId].scoreSum += score;
        stats[radiantId].radiantMatches += 1;
        if (radiantWin) {
          stats[radiantId].radiantWins += 1;
        }
        updateLastMatch(radiantId, startTime);
      }

      if (direId) {
        initTeam(direId);
        stats[direId].totalMatches += 1;
        stats[direId].durationSum += duration;
        stats[direId].scoreSum += score;
        stats[direId].direMatches += 1;
        if (!radiantWin) {
          stats[direId].direWins += 1;
        }
        updateLastMatch(direId, startTime);
      }
    });
  };

  if (!supabase) {
    accumulate(
      mockMatches.map((match) => ({
        radiant_team_id: match.radiantTeamId,
        dire_team_id: match.direTeamId,
        duration: match.duration,
        radiant_score: match.radiantScore,
        dire_score: match.direScore,
        radiant_win: match.radiantWin,
        start_time: match.startTime,
      }))
    );
    return stats;
  }

  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("matches")
      .select("start_time,duration,radiant_score,dire_score,radiant_win,radiant_team_id,dire_team_id")
      .range(from, from + pageSize - 1);

    if (error) {
      break;
    }

    if (!data?.length) {
      break;
    }

    accumulate(data as Array<Record<string, unknown>>);
    from += pageSize;
  }

  return stats;
}

export async function getLeagueSummaries(): Promise<LeagueSummary[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase.from("league_summaries").select("*");
  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    leagueId: String(row.league_id ?? ""),
    totalMatches: Number(row.total_matches ?? 0),
    totalTeams: row.total_teams ?? null,
    avgDuration: row.avg_duration != null ? Number(row.avg_duration) : null,
    avgScore: row.avg_score != null ? Number(row.avg_score) : null,
    radiantWinrate: row.radiant_winrate != null ? Number(row.radiant_winrate) : null,
    avgFirstTowerTime: row.avg_first_tower_time != null ? Number(row.avg_first_tower_time) : null,
    lastMatchTime: row.last_match_time ?? null,
    minScore: row.min_score != null ? Number(row.min_score) : null,
    maxScore: row.max_score != null ? Number(row.max_score) : null,
    minScoreMatchId: row.min_score_match_id ? String(row.min_score_match_id) : null,
    maxScoreMatchId: row.max_score_match_id ? String(row.max_score_match_id) : null,
    fastestMatchId: row.fastest_match_id ? String(row.fastest_match_id) : null,
    fastestMatchDuration: row.fastest_match_duration != null ? Number(row.fastest_match_duration) : null,
    longestMatchId: row.longest_match_id ? String(row.longest_match_id) : null,
    longestMatchDuration: row.longest_match_duration != null ? Number(row.longest_match_duration) : null,
  }));
}

export async function getTeamSummaries(): Promise<TeamSummary[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase.from("team_summaries").select("*");
  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    teamId: String(row.team_id ?? ""),
    totalMatches: Number(row.total_matches ?? 0),
    avgDuration: row.avg_duration != null ? Number(row.avg_duration) : null,
    avgScore: row.avg_score != null ? Number(row.avg_score) : null,
    avgFirstTowerTime: row.avg_first_tower_time != null ? Number(row.avg_first_tower_time) : null,
    radiantMatches: row.radiant_matches ?? null,
    direMatches: row.dire_matches ?? null,
    radiantWinrate: row.radiant_winrate != null ? Number(row.radiant_winrate) : null,
    direWinrate: row.dire_winrate != null ? Number(row.dire_winrate) : null,
    lastMatchTime: row.last_match_time ?? null,
    minScore: row.min_score != null ? Number(row.min_score) : null,
    maxScore: row.max_score != null ? Number(row.max_score) : null,
    minScoreMatchId: row.min_score_match_id ? String(row.min_score_match_id) : null,
    maxScoreMatchId: row.max_score_match_id ? String(row.max_score_match_id) : null,
    fastestMatchId: row.fastest_match_id ? String(row.fastest_match_id) : null,
    fastestMatchDuration: row.fastest_match_duration != null ? Number(row.fastest_match_duration) : null,
    longestMatchId: row.longest_match_id ? String(row.longest_match_id) : null,
    longestMatchDuration: row.longest_match_duration != null ? Number(row.longest_match_duration) : null,
  }));
}

export async function getLeaguePickBanStats(leagueId: string, limit = 10): Promise<{
  mostPicked: PickBanStat[];
  mostBanned: PickBanStat[];
  mostContested: PickBanStat[];
}> {
  const mostPicked: PickBanBuckets = {};
  const mostBanned: PickBanBuckets = {};
  const mostContested: PickBanBuckets = {};

  const accumulate = (rows: Array<Record<string, unknown>>) => {
    rows.forEach((row) => {
      const entries = parsePickBans(row.picks_bans);
      entries.forEach((entry) => {
        if (entry.is_pick) {
          incrementBucket(mostPicked, entry);
        } else {
          incrementBucket(mostBanned, entry);
        }
        incrementBucket(mostContested, entry);
      });
    });
  };

  if (!supabase || !leagueId) {
    return {
      mostPicked: [],
      mostBanned: [],
      mostContested: [],
    };
  }

  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("matches")
      .select("picks_bans")
      .eq("league_id", leagueId)
      .range(from, from + pageSize - 1);

    if (error) {
      break;
    }

    if (!data?.length) {
      break;
    }

    accumulate(data as Array<Record<string, unknown>>);
    from += pageSize;
  }

  return {
    mostPicked: bucketToSorted(mostPicked, limit),
    mostBanned: bucketToSorted(mostBanned, limit),
    mostContested: bucketToSorted(mostContested, limit),
  };
}

export async function getTeamPickBanStats(teamId: string, limit = 10): Promise<{
  mostPicked: PickBanStat[];
  mostBanned: PickBanStat[];
  mostContested: PickBanStat[];
}> {
  const mostPicked: Record<string, { heroId: string; team: number | null; total: number }> = {};
  const mostBanned: Record<string, { heroId: string; team: number | null; total: number }> = {};
  const mostContested: Record<string, { heroId: string; team: number | null; total: number }> = {};

  const accumulate = (rows: Array<Record<string, unknown>>) => {
    rows.forEach((row) => {
      const radiantId = row.radiant_team_id ? String(row.radiant_team_id) : null;
      const direId = row.dire_team_id ? String(row.dire_team_id) : null;
      const side = radiantId === teamId ? 0 : direId === teamId ? 1 : null;
      if (side === null) {
        return;
      }

      const entries = parsePickBans(row.picks_bans);
      entries.forEach((entry) => {
        if (Number(entry.team ?? -1) !== side) {
          return;
        }
        if (entry.is_pick) {
          incrementBucketByHero(mostPicked, entry);
        } else {
          incrementBucketByHero(mostBanned, entry);
        }
        incrementBucketByHero(mostContested, entry);
      });
    });
  };

  if (!supabase || !teamId) {
    return {
      mostPicked: [],
      mostBanned: [],
      mostContested: [],
    };
  }

  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("matches")
      .select("picks_bans,radiant_team_id,dire_team_id")
      .or(`radiant_team_id.eq.${teamId},dire_team_id.eq.${teamId}`)
      .range(from, from + pageSize - 1);

    if (error) {
      break;
    }

    if (!data?.length) {
      break;
    }

    accumulate(data as Array<Record<string, unknown>>);
    from += pageSize;
  }

  return {
    mostPicked: bucketToSorted(mostPicked, limit),
    mostBanned: bucketToSorted(mostBanned, limit),
    mostContested: bucketToSorted(mostContested, limit),
  };
}

export async function getMatchCountByLeague(leagueId: string): Promise<number> {
  if (!supabase) {
    return mockMatches.filter((match) => match.leagueId === leagueId).length;
  }

  const { count } = await supabase
    .from("matches")
    .select("match_id", { count: "exact", head: true })
    .eq("league_id", leagueId);

  return count ?? 0;
}

export async function getMatchCountByTeam(teamId: string): Promise<number> {
  if (!supabase) {
    return mockMatches.filter((match) => match.radiantTeamId === teamId || match.direTeamId === teamId).length;
  }

  const { count } = await supabase
    .from("matches")
    .select("match_id", { count: "exact", head: true })
    .or(`radiant_team_id.eq.${teamId},dire_team_id.eq.${teamId}`);

  return count ?? 0;
}
