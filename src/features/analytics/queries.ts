import { cache } from "react";
import dbConnect from "@/lib/db";
import Patient from "@/models/patient";
import Appointment from "@/models/appointment";
import { calculateRiskScore } from "@/lib/scoring";
import { serialize } from "@/lib/utils";
import type { IAppointment, IPatient } from "@/lib/types";
import {
  PRICE_PER_APPOINTMENT,
  SMS_STANDARD_SUCCESS_RATE,
  SMS_REINFORCED_SUCCESS_RATE,
  AI_CALL_SUCCESS_RATE,
} from "@/lib/business-constants";

interface InterventionStat {
  targetPatients: number;
  estimatedRecovered: number;
  estimatedSavings: number;
}

export interface AnalyticsStats {
  totalPatients: number;
  upcomingAppointments: number;
  noShowRate: number; // 0-1
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    noAppointment: number;
  };
  bySpecialty: {
    specialty: string;
    count: number;
    avgNoShowRate: number;
  }[];
  monthlyStats: { month: string; noShowRate: number }[];
  interventionImpact: {
    smsStandard: InterventionStat;
    smsReinforced: InterventionStat;
    aiCall: InterventionStat;
    total: { estimatedRecovered: number; estimatedSavings: number };
  };
}

type HistoricAppointment = { status: string; date: Date };
type RawPatient = { specialty: string; stats: { noShows: number; totalAppointments: number } } & Record<string, unknown>;

function computeNoShowRate(historicAppointments: HistoricAppointment[]): number {
  const noShows = historicAppointments.filter((a) => a.status === "no_show").length;
  return historicAppointments.length > 0 ? noShows / historicAppointments.length : 0;
}

function computeRiskDistribution(
  allPatients: RawPatient[],
  nextApptMap: Map<string, IAppointment>
): AnalyticsStats["riskDistribution"] {
  const dist = { low: 0, medium: 0, high: 0, noAppointment: 0 };
  for (const patient of allPatients) {
    const p = serialize<IPatient>(patient);
    const nextAppt = nextApptMap.get(p._id);
    if (!nextAppt) { dist.noAppointment++; continue; }
    dist[calculateRiskScore(p, nextAppt).level]++;
  }
  return dist;
}

function computeBySpecialty(allPatients: RawPatient[]): AnalyticsStats["bySpecialty"] {
  const specialtyMap = new Map<string, { count: number; totalNoShows: number; totalAppts: number }>();
  for (const patient of allPatients) {
    if (!specialtyMap.has(patient.specialty)) {
      specialtyMap.set(patient.specialty, { count: 0, totalNoShows: 0, totalAppts: 0 });
    }
    const entry = specialtyMap.get(patient.specialty)!;
    entry.count++;
    entry.totalNoShows += patient.stats.noShows;
    entry.totalAppts += patient.stats.totalAppointments;
  }
  return [...specialtyMap.entries()]
    .map(([specialty, data]) => ({
      specialty,
      count: data.count,
      avgNoShowRate: data.totalAppts > 0
        ? Math.round((data.totalNoShows / data.totalAppts) * 1000) / 1000
        : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

function computeMonthlyStats(
  historicAppointments: HistoricAppointment[],
  today: Date
): AnalyticsStats["monthlyStats"] {
  const monthlyMap = new Map<string, { noShows: number; total: number; label: string }>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    monthlyMap.set(key, { noShows: 0, total: 0, label: d.toLocaleDateString("es-ES", { month: "short" }) });
  }
  for (const appt of historicAppointments) {
    const d = new Date(appt.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (monthlyMap.has(key)) {
      const entry = monthlyMap.get(key)!;
      entry.total++;
      if (appt.status === "no_show") entry.noShows++;
    }
  }
  return [...monthlyMap.values()].map(({ noShows, total, label }) => ({
    month: label,
    noShowRate: total > 0 ? Math.round((noShows / total) * 100) : 0,
  }));
}

function computeInterventionImpact(
  riskDistribution: AnalyticsStats["riskDistribution"]
): AnalyticsStats["interventionImpact"] {
  const recoveredStandard   = Math.round(riskDistribution.low    * SMS_STANDARD_SUCCESS_RATE);
  const recoveredReinforced = Math.round(riskDistribution.medium * SMS_REINFORCED_SUCCESS_RATE);
  const recoveredAiCall     = Math.round(riskDistribution.high   * AI_CALL_SUCCESS_RATE);
  const totalRecovered      = recoveredStandard + recoveredReinforced + recoveredAiCall;
  return {
    smsStandard:   { targetPatients: riskDistribution.low,    estimatedRecovered: recoveredStandard,   estimatedSavings: recoveredStandard   * PRICE_PER_APPOINTMENT },
    smsReinforced: { targetPatients: riskDistribution.medium, estimatedRecovered: recoveredReinforced, estimatedSavings: recoveredReinforced * PRICE_PER_APPOINTMENT },
    aiCall:        { targetPatients: riskDistribution.high,   estimatedRecovered: recoveredAiCall,     estimatedSavings: recoveredAiCall     * PRICE_PER_APPOINTMENT },
    total:         { estimatedRecovered: totalRecovered,      estimatedSavings: totalRecovered         * PRICE_PER_APPOINTMENT },
  };
}

export const getAnalyticsStats = cache(async (): Promise<AnalyticsStats> => {
  await dbConnect();

  const today = new Date();

  // Four independent queries — run in parallel
  const [totalPatients, allPatients, upcomingAppointments, historicAppointments] =
    await Promise.all([
      Patient.countDocuments(),
      Patient.find().lean(),
      Appointment.find({
        date: { $gte: today },
        status: { $in: ["scheduled", "confirmed"] },
      })
        .sort({ date: 1 })
        .lean(),
      Appointment.find({
        status: { $in: ["attended", "no_show"] },
      }).lean(),
    ]);

  // Next appointment per patient (earliest upcoming)
  const nextApptMap = new Map<string, IAppointment>();
  for (const appt of upcomingAppointments) {
    const pid = appt.patientId.toString();
    if (!nextApptMap.has(pid)) {
      nextApptMap.set(pid, serialize<IAppointment>(appt));
    }
  }

  const riskDistribution = computeRiskDistribution(allPatients as RawPatient[], nextApptMap);

  return {
    totalPatients,
    upcomingAppointments: upcomingAppointments.length,
    noShowRate: Math.round(computeNoShowRate(historicAppointments) * 1000) / 1000,
    riskDistribution,
    bySpecialty: computeBySpecialty(allPatients as RawPatient[]),
    monthlyStats: computeMonthlyStats(historicAppointments as HistoricAppointment[], today),
    interventionImpact: computeInterventionImpact(riskDistribution),
  };
});
