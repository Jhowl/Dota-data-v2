"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { League, Match } from "@/lib/types";

interface LeagueActivityProps {
  leagues: League[];
  matches: Match[];
}

export function LeagueActivity({ leagues, matches }: LeagueActivityProps) {
  const matchesByLeague = matches.reduce<Record<string, number>>((acc, match) => {
    acc[match.leagueId] = (acc[match.leagueId] ?? 0) + 1;
    return acc;
  }, {});

  const data = leagues
    .filter((league) => (matchesByLeague[league.id] ?? 0) > 0)
    .map((league) => ({
      name: league.name,
      shortName: league.name.split(" ").slice(0, 3).join(" "),
      matches: matchesByLeague[league.id] ?? 0,
    }))
    .sort((a, b) => b.matches - a.matches);

  return (
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 8, right: 8 }}>
          <CartesianGrid strokeDasharray="4 4" opacity={0.3} />
          <XAxis
            dataKey="shortName"
            tick={{ fontSize: 12 }}
            interval={0}
            angle={-35}
            height={70}
            tickMargin={8}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            cursor={{ fill: "rgba(24, 185, 157, 0.12)" }}
            contentStyle={{ borderRadius: 12, borderColor: "rgba(0,0,0,0.08)" }}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.name ?? ""}
          />
          <Bar dataKey="matches" fill="var(--primary)" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
