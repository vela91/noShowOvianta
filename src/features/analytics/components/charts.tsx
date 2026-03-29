"use client";

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { RISK_COLORS } from "@/lib/risk-constants";

const lineChartConfig: ChartConfig = {
  noShowRate: {
    label: "Tasa no-show",
    color: "var(--color-primary)",
  },
};

const donutColors = [RISK_COLORS.low, RISK_COLORS.medium, RISK_COLORS.high];

export function NoShowAreaChart({
  data,
}: {
  data: { month: string; noShowRate: number }[];
}) {
  return (
    <ChartContainer config={lineChartConfig} className="h-52 w-full">
      <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="noShowGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.15} />
            <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}%`}
          width={36}
        />
        <ChartTooltip
          content={<ChartTooltipContent formatter={(v) => [`${v}%`, "Tasa"]} />}
        />
        <Area
          type="monotone"
          dataKey="noShowRate"
          stroke="var(--color-primary)"
          strokeWidth={2}
          fill="url(#noShowGradient)"
        />
      </AreaChart>
    </ChartContainer>
  );
}

export function RiskDonutChart({
  distributionData,
  totalPatients,
}: {
  distributionData: { name: string; value: number }[];
  totalPatients: number;
}) {
  return (
    <>
      <ChartContainer
        config={{
          bajo: { label: "Bajo", color: RISK_COLORS.low },
          medio: { label: "Medio", color: RISK_COLORS.medium },
          alto: { label: "Alto", color: RISK_COLORS.high },
        }}
        className="h-40 w-full"
      >
        <PieChart>
          <Pie
            data={distributionData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={70}
            dataKey="value"
            paddingAngle={2}
          >
            {distributionData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={donutColors[index]} />
            ))}
          </Pie>
          <ChartTooltip content={<ChartTooltipContent />} />
        </PieChart>
      </ChartContainer>

      <div className="mt-3 space-y-1.5">
        {distributionData.map((item, i) => (
          <div key={item.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: donutColors[i] }}
              />
              <span className="text-muted-foreground">{item.name} riesgo</span>
            </div>
            <span className="font-medium tabular-nums">
              {totalPatients > 0
                ? Math.round((item.value / totalPatients) * 100)
                : 0}%
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
