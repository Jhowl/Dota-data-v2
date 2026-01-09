"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Match, Patch } from "@/lib/types";

interface PatchTrendProps {
  patches: Patch[];
  matches: Match[];
}

export function PatchTrend({ patches, matches }: PatchTrendProps) {
  const data = patches
    .slice()
    .reverse()
    .map((patch) => {
      const patchMatches = matches.filter((match) => match.patchId === patch.id);
      const totalDuration = patchMatches.reduce((sum, match) => sum + match.duration, 0);
      const avgDuration = patchMatches.length ? totalDuration / patchMatches.length : 0;

      return {
        name: patch.patch,
        matches: patchMatches.length,
        duration: Number(avgDuration.toFixed(1)),
      };
    });

  return (
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 8, right: 8 }}>
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis yAxisId="left" tick={{ fontSize: 12 }} allowDecimals={false} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{ borderRadius: 12, borderColor: "rgba(0,0,0,0.08)" }}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="matches"
            stroke="var(--chart-2)"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="duration"
            stroke="var(--chart-3)"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
