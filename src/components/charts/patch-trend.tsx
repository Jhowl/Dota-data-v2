"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Patch } from "@/lib/types";

interface PatchTrendProps {
  patches: Patch[];
  stats: Array<{ patchId: string; matches: number; avgDuration: number }>;
}

export function PatchTrend({ patches, stats }: PatchTrendProps) {
  const statsLookup = new Map(stats.map((item) => [item.patchId, item]));
  const data = patches
    .slice()
    .reverse()
    .map((patch) => {
      const patchStats = statsLookup.get(patch.id);
      const avgDuration = patchStats?.avgDuration ?? 0;

      return {
        name: patch.patch,
        matches: patchStats?.matches ?? 0,
        duration: Number(avgDuration.toFixed(1)),
      };
    });

  return (
    <div className="h-[280px] min-w-0">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <LineChart data={data} margin={{ left: 8, right: 8 }}>
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis yAxisId="left" tick={{ fontSize: 12 }} allowDecimals={false} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              borderColor: "rgba(15, 23, 42, 0.8)",
              backgroundColor: "rgba(15, 23, 42, 0.95)",
            }}
            itemStyle={{ color: "#e2e8f0" }}
            labelStyle={{ color: "#f8fafc", fontWeight: 600 }}
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
