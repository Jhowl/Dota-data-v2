import { leagues as mockLeagues, matches as mockMatches, patches as mockPatches, teams as mockTeams } from '@/lib/data/mock';
import { supabase } from '@/lib/supabase/client';
import { Hero, League, Match, Patch, PickBanEntry, PickBanStat, Team } from '@/lib/types';

const mapLeague = (row: Record<string, unknown>): League => ({
    id: String(row.league_id ?? row.id ?? ''),
    slug: String(row.slug ?? ''),
    name: String(row.name ?? ''),
    startDate: (row.start_date as string | null) ?? null,
    endDate: (row.end_date as string | null) ?? null,
});

const mapTeam = (row: Record<string, unknown>): Team => ({
    id: String(row.team_id ?? row.id ?? ''),
    slug: String(row.slug ?? ''),
    name: String(row.name ?? ''),
    logoUrl: (row.logo_url as string | null) ?? null,
});

const mapPatch = (row: Record<string, unknown>): Patch => ({
    id: String(row.id ?? ''),
    patch: String(row.patch ?? ''),
});

const mapHero = (row: Record<string, unknown>): Hero => ({
    id: String(row.id ?? ''),
    localizedName: String(row.localized_name ?? row.localizedName ?? ''),
    name: String(row.name ?? ''),
});

const mapMatch = (row: Record<string, unknown>): Match => ({
    id: String(row.match_id ?? row.id ?? ''),
    leagueId: String(row.league_id ?? ''),
    duration: Number(row.duration ?? 0),
    startTime: String(row.start_time ?? ''),
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
    patchId: String(row.patch_id ?? ''),
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
        supabase.from('leagues').select('league_id', { count: 'exact', head: true }),
        supabase.from('teams').select('team_id', { count: 'exact', head: true }),
        supabase.from('matches').select('match_id', { count: 'exact', head: true }),
        supabase.from('heroes').select('id', { count: 'exact', head: true }),
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

    const { data, error } = await supabase.from('leagues').select('*').order('start_date', { ascending: false });

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
    const leagueId = /^\d+$/.test(trimmedSlug) ? trimmedSlug : idMatch ? idMatch[1] : null;

    if (leagueId) {
        const { data, error } = await supabase.from('leagues').select('*').eq('league_id', leagueId).maybeSingle();

        if (!error && data) {
            return mapLeague(data as Record<string, unknown>);
        }
    }

    const { data, error } = await supabase.from('leagues').select('*').eq('slug', trimmedSlug).maybeSingle();

    if (error || !data) {
        return mockLeagues.find((league) => league.slug === slug) ?? null;
    }

    return mapLeague(data as Record<string, unknown>);
}

export async function getTeams(): Promise<Team[]> {
    if (!supabase) {
        return mockTeams;
    }

    const { data, error } = await supabase.from('teams').select('*').order('name', { ascending: true });

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
            .from('matches')
            .select('start_time,radiant_team_id,dire_team_id')
            .order('start_time', { ascending: false })
            .range(from, from + pageSize - 1);

        if (matchError || !matchRows?.length) {
            break;
        }

        (matchRows as Array<Record<string, unknown>>).forEach((row) => {
            const timeValue = Date.parse(String(row.start_time ?? ''));
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

export async function getTeamsByIds(teamIds: string[]): Promise<Team[]> {
    const uniqueTeamIds = Array.from(new Set(teamIds.filter(Boolean)));
    if (!uniqueTeamIds.length) {
        return [];
    }

    if (!supabase) {
        return mockTeams.filter((team) => uniqueTeamIds.includes(team.id));
    }

    const { data, error } = await supabase.from('teams').select('*').in('team_id', uniqueTeamIds);

    if (error || !data) {
        return [];
    }

    return data.map((row) => mapTeam(row as Record<string, unknown>)).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getTeamBySlug(slug: string): Promise<Team | null> {
    if (!supabase) {
        return mockTeams.find((team) => team.slug === slug) ?? null;
    }

    const { data, error } = await supabase.from('teams').select('*').eq('slug', slug).maybeSingle();

    if (error || !data) {
        return mockTeams.find((team) => team.slug === slug) ?? null;
    }

    return mapTeam(data as Record<string, unknown>);
}

export async function getPatches(): Promise<Patch[]> {
    if (!supabase) {
        return mockPatches;
    }

    const { data, error } = await supabase.from('patch').select('*').order('id', { ascending: false });

    if (error || !data) {
        return mockPatches;
    }

    return data.map((row) => mapPatch(row as Record<string, unknown>));
}

export type PatchWithCount = Patch & { matchCount: number };

export async function getPatchesWithCounts(): Promise<PatchWithCount[]> {
    if (!supabase) {
        const counts = mockMatches.reduce<Record<string, number>>((acc, match) => {
            acc[match.patchId] = (acc[match.patchId] ?? 0) + 1;
            return acc;
        }, {});
        return mockPatches.map((patch) => ({
            ...patch,
            matchCount: counts[patch.id] ?? 0,
        }));
    }

    const { data, error } = await supabase.from('patch').select('id,patch,matches(count)').order('id', { ascending: false });

    if (error || !data) {
        return [];
    }

    return data.map((row) => {
        const record = row as Record<string, unknown>;
        const matches = Array.isArray(record.matches) ? (record.matches as Array<Record<string, unknown>>) : [];
        const matchCount = matches[0]?.count ? Number(matches[0].count) : 0;
        return {
            id: String(record.id ?? ''),
            patch: String(record.patch ?? ''),
            matchCount,
        };
    });
}

export async function getPatchBySlug(patchSlug: string): Promise<Patch | null> {
    if (!supabase || !patchSlug) {
        return null;
    }
    const { data, error } = await supabase.from('patch').select('*').eq('patch', patchSlug).maybeSingle();
    if (error || !data) {
        return null;
    }
    return mapPatch(data as Record<string, unknown>);
}

export async function getMatchesByPatch(patchId: string): Promise<Match[]> {
    if (!patchId) {
        return [];
    }

    if (!supabase) {
        return mockMatches.filter((match) => match.patchId === patchId);
    }

    const results: Match[] = [];
    const pageSize = 1000;
    let from = 0;

    while (true) {
        const { data, error } = await supabase
            .from('matches')
            .select(
                'match_id,league_id,duration,start_time,dire_score,radiant_score,radiant_win,radiant_team_id,dire_team_id,first_tower_time,patch_id,picks_bans',
            )
            .eq('patch_id', patchId)
            .order('start_time', { ascending: false })
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

export async function getHeroes(): Promise<Hero[]> {
    if (!supabase) {
        return [];
    }

    const { data, error } = await supabase.from('heroes').select('id, localized_name, name').order('id', { ascending: true });

    if (error || !data) {
        return [];
    }

    return data.map((row) => mapHero(row as Record<string, unknown>));
}

export async function getRecentMatches(limit = 8): Promise<Match[]> {
    if (!supabase) {
        return mockMatches.slice(0, limit);
    }

    const { data, error } = await supabase.from('matches').select('*').order('start_time', { ascending: false }).limit(limit);

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

export type LeagueTeamParticipation = {
    teamId: string;
    matchCount: number;
    wins: number;
    winrate: number;
    mostPickedHeroId: string | null;
    mostPickedTotal: number;
};

export async function getTopPerformersByLeague(leagueId: string): Promise<TopPerformerStat[]> {
    const stats = [
        { key: 'kills', title: 'Most Kills', field: 'kills' },
        { key: 'deaths', title: 'Most Deaths', field: 'deaths' },
        { key: 'assists', title: 'Most Assists', field: 'assists' },
        { key: 'gold', title: 'Most Gold', field: 'gold' },
        { key: 'denies', title: 'Most Denies', field: 'denies' },
        { key: 'hero_damage', title: 'Most Hero Damage', field: 'hero_damage' },
        { key: 'last_hits', title: 'Most Last Hits', field: 'last_hits' },
        { key: 'tower_damage', title: 'Most Tower Damage', field: 'tower_damage' },
        { key: 'hero_healing', title: 'Most Healing', field: 'hero_healing' },
    ];

    const client = supabase;
    if (!client || !leagueId) {
        return stats.map((stat) => ({ key: stat.key, title: stat.title, performer: null }));
    }

    const results = await Promise.all(
        stats.map(async (stat) => {
            const { data, error } = await client
                .from('player_matches')
                .select(`match_id,hero_id,team_id,account_id,kills,deaths,assists,${stat.field},matches!inner(league_id)`)
                .eq('matches.league_id', leagueId)
                .not(stat.field, 'is', null)
                .gt(stat.field, 0)
                .order(stat.field, { ascending: false })
                .limit(1);

            if (error || !data?.length) {
                return { key: stat.key, title: stat.title, performer: null };
            }

            const rows = data as unknown as Array<Record<string, unknown>>;
            const row = rows[0];

            return {
                key: stat.key,
                title: stat.title,
                performer: {
                    matchId: String(row.match_id ?? ''),
                    heroId: row.hero_id ? String(row.hero_id) : null,
                    teamId: row.team_id ? String(row.team_id) : null,
                    accountId: row.account_id ? String(row.account_id) : null,
                    statValue: Number(row[stat.field] ?? 0),
                    kills: Number(row.kills ?? 0),
                    deaths: Number(row.deaths ?? 0),
                    assists: Number(row.assists ?? 0),
                },
            };
        }),
    );

    return results;
}

export async function getTopPerformersByTeam(teamId: string): Promise<TopPerformerStat[]> {
    const stats = [
        { key: 'kills', title: 'Most Kills', field: 'kills' },
        { key: 'deaths', title: 'Most Deaths', field: 'deaths' },
        { key: 'assists', title: 'Most Assists', field: 'assists' },
        { key: 'gold', title: 'Most Gold', field: 'gold' },
        { key: 'denies', title: 'Most Denies', field: 'denies' },
        { key: 'hero_damage', title: 'Most Hero Damage', field: 'hero_damage' },
        { key: 'last_hits', title: 'Most Last Hits', field: 'last_hits' },
        { key: 'tower_damage', title: 'Most Tower Damage', field: 'tower_damage' },
        { key: 'hero_healing', title: 'Most Healing', field: 'hero_healing' },
    ];

    const client = supabase;
    if (!client || !teamId) {
        return stats.map((stat) => ({ key: stat.key, title: stat.title, performer: null }));
    }

    const results = await Promise.all(
        stats.map(async (stat) => {
            const { data, error } = await client
                .from('player_matches')
                .select('match_id,hero_id,team_id,account_id,kills,deaths,assists,' + stat.field)
                .eq('team_id', teamId)
                .not(stat.field, 'is', null)
                .gt(stat.field, 0)
                .order(stat.field, { ascending: false })
                .limit(1);

            if (error || !data?.length) {
                return { key: stat.key, title: stat.title, performer: null };
            }

            const rows = data as unknown as Array<Record<string, unknown>>;
            const row = rows[0];

            return {
                key: stat.key,
                title: stat.title,
                performer: {
                    matchId: String(row.match_id ?? ''),
                    heroId: row.hero_id ? String(row.hero_id) : null,
                    teamId: row.team_id ? String(row.team_id) : null,
                    accountId: row.account_id ? String(row.account_id) : null,
                    statValue: Number(row[stat.field] ?? 0),
                    kills: Number(row.kills ?? 0),
                    deaths: Number(row.deaths ?? 0),
                    assists: Number(row.assists ?? 0),
                },
            };
        }),
    );

    return results;
}

export async function getLeagueTeamParticipation(leagueId: string): Promise<LeagueTeamParticipation[]> {
    if (!supabase || !leagueId) {
        return [];
    }

    const pageSize = 1000;
    let from = 0;
    const matchRows: Array<Record<string, unknown>> = [];

    while (true) {
        const { data, error } = await supabase
            .from('matches')
            .select('radiant_team_id,dire_team_id,radiant_win')
            .eq('league_id', leagueId)
            .order('match_id', { ascending: false })
            .range(from, from + pageSize - 1);

        if (error) {
            break;
        }
        if (!data?.length) {
            break;
        }
        matchRows.push(...data);
        from += pageSize;
    }

    const teamStats = new Map<string, { matches: number; wins: number }>();

    matchRows.forEach((match) => {
        const radiantId = match.radiant_team_id ? String(match.radiant_team_id) : null;
        const direId = match.dire_team_id ? String(match.dire_team_id) : null;
        const radiantWin = Boolean(match.radiant_win);

        if (radiantId) {
            const stats = teamStats.get(radiantId) ?? { matches: 0, wins: 0 };
            stats.matches += 1;
            if (radiantWin) {
                stats.wins += 1;
            }
            teamStats.set(radiantId, stats);
        }

        if (direId) {
            const stats = teamStats.get(direId) ?? { matches: 0, wins: 0 };
            stats.matches += 1;
            if (!radiantWin) {
                stats.wins += 1;
            }
            teamStats.set(direId, stats);
        }
    });

    const heroStats = new Map<string, Map<string, number>>();
    let heroFrom = 0;

    while (true) {
        const { data, error } = await supabase
            .from('player_matches')
            .select('id,team_id,hero_id,matches!inner(league_id)')
            .eq('matches.league_id', leagueId)
            .order('id', { ascending: true })
            .range(heroFrom, heroFrom + pageSize - 1);

        if (error) {
            break;
        }
        if (!data?.length) {
            break;
        }

        data.forEach((row) => {
            const teamId = row.team_id ? String(row.team_id) : null;
            const heroId = row.hero_id ? String(row.hero_id) : null;
            if (!teamId || !heroId) {
                return;
            }
            if (!heroStats.has(teamId)) {
                heroStats.set(teamId, new Map());
            }
            const teamHeroes = heroStats.get(teamId);
            if (!teamHeroes) {
                return;
            }
            teamHeroes.set(heroId, (teamHeroes.get(heroId) ?? 0) + 1);
        });

        heroFrom += pageSize;
    }

    const participation: LeagueTeamParticipation[] = Array.from(teamStats.entries()).map(([teamId, stats]) => {
        const heroes = heroStats.get(teamId) ?? new Map();
        let topHeroId: string | null = null;
        let topHeroCount = 0;
        heroes.forEach((count, heroId) => {
            if (count > topHeroCount) {
                topHeroCount = count;
                topHeroId = heroId;
            }
        });

        return {
            teamId,
            matchCount: stats.matches,
            wins: stats.wins,
            winrate: stats.matches ? Number(((stats.wins / stats.matches) * 100).toFixed(1)) : 0,
            mostPickedHeroId: topHeroId,
            mostPickedTotal: topHeroCount,
        };
    });

    return participation.sort((a, b) => b.matchCount - a.matchCount);
}

export async function getTopPerformersByPatch(patchId: string): Promise<TopPerformerStat[]> {
    const stats = [
        { key: 'kills', title: 'Most Kills', field: 'kills' },
        { key: 'deaths', title: 'Most Deaths', field: 'deaths' },
        { key: 'assists', title: 'Most Assists', field: 'assists' },
        { key: 'gold', title: 'Most Gold', field: 'gold' },
        { key: 'denies', title: 'Most Denies', field: 'denies' },
        { key: 'hero_damage', title: 'Most Hero Damage', field: 'hero_damage' },
        { key: 'last_hits', title: 'Most Last Hits', field: 'last_hits' },
        { key: 'tower_damage', title: 'Most Tower Damage', field: 'tower_damage' },
        { key: 'hero_healing', title: 'Most Healing', field: 'hero_healing' },
    ];

    const client = supabase;
    if (!client || !patchId) {
        return stats.map((stat) => ({ key: stat.key, title: stat.title, performer: null }));
    }

    const results = await Promise.all(
        stats.map(async (stat) => {
            const { data, error } = await client
                .from('player_matches')
                .select(`match_id,hero_id,team_id,account_id,kills,deaths,assists,${stat.field},matches!inner(patch_id)`)
                .eq('matches.patch_id', patchId)
                .not(stat.field, 'is', null)
                .gt(stat.field, 0)
                .order(stat.field, { ascending: false })
                .limit(1);

            if (error || !data?.length) {
                return { key: stat.key, title: stat.title, performer: null };
            }

            const rows = data as unknown as Array<Record<string, unknown>>;
            const row = rows[0];

            return {
                key: stat.key,
                title: stat.title,
                performer: {
                    matchId: String(row.match_id ?? ''),
                    heroId: row.hero_id ? String(row.hero_id) : null,
                    teamId: row.team_id ? String(row.team_id) : null,
                    accountId: row.account_id ? String(row.account_id) : null,
                    statValue: Number(row[stat.field] ?? 0),
                    kills: Number(row.kills ?? 0),
                    deaths: Number(row.deaths ?? 0),
                    assists: Number(row.assists ?? 0),
                },
            };
        }),
    );

    return results;
}

export async function getMatchesByLeague(leagueId: string, limit = 10): Promise<Match[]> {
    if (!supabase) {
        return mockMatches.filter((match) => match.leagueId === leagueId).slice(0, limit);
    }

    const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('league_id', leagueId)
        .order('start_time', { ascending: false })
        .limit(limit);

    if (error || !data) {
        return mockMatches.filter((match) => match.leagueId === leagueId).slice(0, limit);
    }

    return data.map((row) => mapMatch(row as Record<string, unknown>));
}

export async function getAllMatchesByLeague(leagueId: string): Promise<Match[]> {
    if (!leagueId) {
        return [];
    }

    if (!supabase) {
        return mockMatches.filter((match) => match.leagueId === leagueId);
    }

    const results: Match[] = [];
    const pageSize = 1000;
    let from = 0;

    while (true) {
        const { data, error } = await supabase
            .from('matches')
            .select(
                'match_id,league_id,start_time,dire_score,radiant_score,radiant_win,series_id,series_type,radiant_team_id,dire_team_id,patch_id,duration',
            )
            .eq('league_id', leagueId)
            .order('start_time', { ascending: false })
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

export async function getMatchesByTeam(teamId: string, limit = 10): Promise<Match[]> {
    if (!supabase) {
        return mockMatches.filter((match) => match.radiantTeamId === teamId || match.direTeamId === teamId).slice(0, limit);
    }

    const { data, error } = await supabase
        .from('matches')
        .select('*')
        .or(`radiant_team_id.eq.${teamId},dire_team_id.eq.${teamId}`)
        .order('start_time', { ascending: false })
        .limit(limit);

    if (error || !data) {
        return mockMatches.filter((match) => match.radiantTeamId === teamId || match.direTeamId === teamId).slice(0, limit);
    }

    return data.map((row) => mapMatch(row as Record<string, unknown>));
}

export async function getMatchesByTeamForHandicap(teamId: string): Promise<Match[]> {
    if (!teamId) {
        return [];
    }

    if (!supabase) {
        return mockMatches.filter((match) => match.radiantTeamId === teamId || match.direTeamId === teamId);
    }

    const results: Match[] = [];
    const pageSize = 1000;
    let from = 0;

    while (true) {
        const { data, error } = await supabase
            .from('matches')
            .select('match_id,league_id,radiant_team_id,dire_team_id,radiant_score,dire_score,radiant_win,patch_id')
            .or(`radiant_team_id.eq.${teamId},dire_team_id.eq.${teamId}`)
            .order('match_id', { ascending: false })
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
            .from('matches')
            .select('*')
            .in('league_id', leagueIds)
            .order('start_time', { ascending: false })
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

    const { data, error } = await supabase.from('matches').select('*').in('match_id', matchIds);
    if (error || !data) {
        return [];
    }

    return data.map((row) => mapMatch(row as Record<string, unknown>));
}

export async function getMatchesByYear(year: number): Promise<Match[]> {
    if (!year) {
        return [];
    }

    if (!supabase) {
        return mockMatches.filter((match) => new Date(match.startTime).getFullYear() === year);
    }

    const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0)).toISOString();
    const end = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0)).toISOString();

    const results: Match[] = [];
    const pageSize = 1000;
    let from = 0;

    while (true) {
        const { data, error } = await supabase
            .from('matches')
            .select(
                'match_id,league_id,duration,start_time,dire_score,radiant_score,radiant_win,radiant_team_id,dire_team_id,first_tower_time,patch_id,picks_bans',
            )
            .gte('start_time', start)
            .lt('start_time', end)
            .order('start_time', { ascending: true })
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

export async function getLeagueSummary(leagueId: string): Promise<LeagueSummary | null> {
    if (!supabase || !leagueId) {
        return null;
    }
    const { data, error } = await supabase.from('league_snapshots').select('payload').eq('league_id', leagueId).maybeSingle();
    if (error || !data?.payload) {
        return null;
    }
    return data.payload as LeagueSummary;
}

export async function getTeamSummary(teamId: string): Promise<TeamSummary | null> {
    if (!supabase || !teamId) {
        return null;
    }
    const { data, error } = await supabase.from('team_snapshots').select('payload').eq('team_id', teamId).maybeSingle();
    if (error || !data?.payload) {
        return null;
    }
    return data.payload as TeamSummary;
}

export async function getSeasonSnapshot(year: number): Promise<SeasonSnapshot | null> {
    if (!supabase || !year) {
        return null;
    }
    const { data, error } = await supabase.from('season_snapshots').select('payload').eq('year', year).maybeSingle();
    if (error || !data?.payload) {
        return null;
    }
    return data.payload as SeasonSnapshot;
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
    leagues?: Array<{
        id: string;
        name: string;
        slug: string;
        matchCount: number;
        radiantWinrate: number;
        direWinrate: number;
        overallWinrate: number;
        lastMatchTime: string | null;
        startDate?: string | null;
        endDate?: string | null;
    }>;
};

export type SeasonSnapshot = {
    year: number;
    totals: {
        totalMatches: number;
        avgDuration: number;
        avgScore: number;
        avgFirstTowerTime: number | null;
        radiantWinRate: number;
        minScore: number;
        maxScore: number;
        minScoreMatchId: string | null;
        maxScoreMatchId: string | null;
        fastestMatchId: string | null;
        fastestMatchDuration: number | null;
        longestMatchId: string | null;
        longestMatchDuration: number | null;
        lastMatchDate: string | null;
    };
    activeLeagues: number;
    activeTeams: number;
    monthlyDuration: Array<{ month: string; value: number }>;
    monthlyScore: Array<{ month: string; value: number }>;
    leagues: Array<{ id: string; name: string; slug: string; matchCount: number }>;
    teams: Array<{
        id: string;
        name: string;
        slug: string;
        matchCount: number;
        radiantWinrate: number;
        direWinrate: number;
        overallWinrate: number;
    }>;
    pickBan: {
        picked: Array<{ heroId: string; total: number }>;
        banned: Array<{ heroId: string; total: number }>;
        contested: Array<{ heroId: string; total: number }>;
    };
    topPerformers: Array<{
        key: string;
        title: string;
        performer: {
            matchId: string;
            heroId: string | null;
            teamId: string | null;
            accountId: string | null;
            statValue: number;
            kills: number;
            deaths: number;
            assists: number;
        } | null;
    }>;
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
    if (typeof value === 'string') {
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
    const heroId = String(entry.hero_id ?? '');
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
    const heroId = String(entry.hero_id ?? '');
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
            const leagueId = row.league_id ? String(row.league_id) : '';
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
            })),
        );
        return stats;
    }

    const pageSize = 1000;
    let from = 0;

    while (true) {
        const { data, error } = await supabase
            .from('matches')
            .select('league_id,radiant_team_id,dire_team_id,radiant_win')
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
            })),
        );
        return stats;
    }

    const pageSize = 1000;
    let from = 0;

    while (true) {
        const { data, error } = await supabase
            .from('matches')
            .select('start_time,duration,radiant_score,dire_score,radiant_win,radiant_team_id,dire_team_id')
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

    const { data, error } = await supabase.from('league_snapshots').select('payload');
    if (error || !data) {
        return [];
    }

    return data.map((row) => row.payload as LeagueSummary).filter(Boolean);
}

export async function getTeamSummaries(): Promise<TeamSummary[]> {
    if (!supabase) {
        return [];
    }

    const { data, error } = await supabase.from('team_snapshots').select('payload');
    if (error || !data) {
        return [];
    }

    return data.map((row) => row.payload as TeamSummary).filter(Boolean);
}

export async function getLeaguePickBanStats(
    leagueId: string,
    limit = 10,
): Promise<{
    mostPicked: PickBanStat[];
    mostBanned: PickBanStat[];
    mostContested: PickBanStat[];
}> {
    const mostPicked: Record<string, { heroId: string; team: number | null; total: number }> = {};
    const mostBanned: Record<string, { heroId: string; team: number | null; total: number }> = {};
    const mostContested: Record<string, { heroId: string; team: number | null; total: number }> = {};

    const accumulate = (rows: Array<Record<string, unknown>>) => {
        rows.forEach((row) => {
            const entries = parsePickBans(row.picks_bans);
            entries.forEach((entry) => {
                if (entry.is_pick) {
                    incrementBucketByHero(mostPicked, entry);
                } else {
                    incrementBucketByHero(mostBanned, entry);
                }
                incrementBucketByHero(mostContested, entry);
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
            .from('matches')
            .select('picks_bans')
            .eq('league_id', leagueId)
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

export async function getTeamPickBanStats(
    teamId: string,
    limit = 10,
): Promise<{
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
            .from('matches')
            .select('picks_bans,radiant_team_id,dire_team_id')
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

    const { count } = await supabase.from('matches').select('match_id', { count: 'exact', head: true }).eq('league_id', leagueId);

    return count ?? 0;
}

export async function getMatchCountByTeam(teamId: string): Promise<number> {
    if (!supabase) {
        return mockMatches.filter((match) => match.radiantTeamId === teamId || match.direTeamId === teamId).length;
    }

    const { count } = await supabase
        .from('matches')
        .select('match_id', { count: 'exact', head: true })
        .or(`radiant_team_id.eq.${teamId},dire_team_id.eq.${teamId}`);

    return count ?? 0;
}
