"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface YearlyMetricPoint {
  month: string;
  value: number;
}

interface YearlyMetricLineProps {
  data: YearlyMetricPoint[];
  color: string;
}

export function YearlyMetricLine({ data, color }: YearlyMetricLineProps) {
  return (
    <div className="h-[260px] min-w-0">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <LineChart data={data} margin={{ left: 8, right: 8, top: 8 }}>
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              borderColor: "rgba(15, 23, 42, 0.8)",
              backgroundColor: "rgba(15, 23, 42, 0.95)",
            }}
            itemStyle={{ color: "#e2e8f0" }}
            labelStyle={{ color: "#f8fafc", fontWeight: 600 }}
          />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
