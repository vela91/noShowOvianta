"use client";

import { useMemo } from "react";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { IAppointment, IPatient } from "@/lib/types";
import { calculateRiskScore } from "@/lib/scoring";
import { formatDate } from "@/lib/utils";
import { RISK_COLORS, RISK_THRESHOLDS, TIMELINE_COLORS } from "@/lib/risk-constants";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

interface RiskTimelineProps {
  patient: IPatient;
  appointments: IAppointment[];
}

const chartConfig: ChartConfig = {
  score: {
    label: "Score de riesgo",
    color: "var(--color-primary)",
  },
};

export function RiskTimeline({ patient, appointments }: RiskTimelineProps) {
  const relevantAppointments = useMemo(
    () => appointments
      .filter((a) => a.status !== "cancelled")
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [appointments]
  );

  const data = useMemo(
    () => relevantAppointments.map((appt, index) => {
      // Build a historical snapshot of the patient's stats at this point in time.
      // Using current stats would incorrectly apply today's no-show ratio to past appointments.
      const pastAppointments = relevantAppointments.slice(0, index);
      const noShowsBefore = pastAppointments.filter((a) => a.status === "no_show").length;
      const totalBefore = pastAppointments.length;
      const attendanceRateBefore =
        totalBefore > 0
          ? (totalBefore - noShowsBefore) / totalBefore
          : 1;

      const patientSnapshot: IPatient = {
        ...patient,
        stats: {
          ...patient.stats,
          totalAppointments: totalBefore,
          noShows: noShowsBefore,
          attendanceRate: attendanceRateBefore,
        },
      };

      const riskScore = calculateRiskScore(patientSnapshot, appt);
      const isFuture = new Date(appt.date) >= new Date();
      return {
        date: formatDate(appt.date),
        score: riskScore.score,
        isFuture,
        status: appt.status,
      };
    }),
    [patient, relevantAppointments]
  );

  if (relevantAppointments.length < 2) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        Se necesitan al menos 2 citas para mostrar la evolución del riesgo
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-48 w-full">
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
        {/* Color zones for risk thresholds */}
        <ReferenceArea y1={0} y2={RISK_THRESHOLDS.low} fill="#dcfce7" fillOpacity={0.4} />
        <ReferenceArea y1={RISK_THRESHOLDS.low} y2={RISK_THRESHOLDS.high} fill="#fef9c3" fillOpacity={0.4} />
        <ReferenceArea y1={RISK_THRESHOLDS.high} y2={100} fill="#fee2e2" fillOpacity={0.4} />

        {/* Threshold lines */}
        <ReferenceLine y={RISK_THRESHOLDS.low} stroke={RISK_COLORS.low} strokeDasharray="3 3" strokeOpacity={0.5} />
        <ReferenceLine y={RISK_THRESHOLDS.high} stroke={RISK_COLORS.medium} strokeDasharray="3 3" strokeOpacity={0.5} />

        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={false}
          width={28}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => [`Score: ${value}`, ""]}
            />
          }
        />
        <Line
          type="monotone"
          dataKey="score"
          stroke="var(--color-primary)"
          strokeWidth={2}
          dot={(props) => {
            const { cx, cy, payload } = props;
            const color = payload.isFuture
              ? TIMELINE_COLORS.future
              : payload.status === "no_show"
                ? RISK_COLORS.high
                : TIMELINE_COLORS.past;
            return (
              <circle
                key={`dot-${cx}-${cy}`}
                cx={cx}
                cy={cy}
                r={payload.isFuture ? 5 : 3}
                fill={color}
                stroke="white"
                strokeWidth={payload.isFuture ? 2 : 1}
              />
            );
          }}
        />
      </LineChart>
    </ChartContainer>
  );
}
