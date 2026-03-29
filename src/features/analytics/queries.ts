import { cache } from "react";
import { connection } from "next/server";
import dbConnect from "@/lib/db";
import Patient from "@/models/patient";
import Appointment from "@/models/appointment";
import { calculateRiskScore } from "@/lib/scoring";
import { serialize } from "@/lib/utils";
import type { IAppointment, IPatient } from "@/lib/types";

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
}

export const getAnalyticsStats = cache(async (): Promise<AnalyticsStats> => {
  await connection();
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

  // Overall no-show rate from historical data
  const noShows = historicAppointments.filter(
    (a) => a.status === "no_show"
  ).length;
  const noShowRate =
    historicAppointments.length > 0
      ? noShows / historicAppointments.length
      : 0;

  // Next appointment per patient (earliest upcoming)
  const nextApptMap = new Map<string, IAppointment>();
  for (const appt of upcomingAppointments) {
    const pid = appt.patientId.toString();
    if (!nextApptMap.has(pid)) {
      nextApptMap.set(pid, serialize<IAppointment>(appt));
    }
  }

  // Risk distribution across all patients
  const riskDistribution = { low: 0, medium: 0, high: 0, noAppointment: 0 };
  for (const patient of allPatients) {
    const p = serialize<IPatient>(patient);
    const nextAppt = nextApptMap.get(p._id);
    if (!nextAppt) {
      riskDistribution.noAppointment++;
      continue;
    }
    const { level } = calculateRiskScore(p, nextAppt);
    riskDistribution[level]++;
  }

  // Aggregate stats per specialty (from pre-computed patient.stats)
  const specialtyMap = new Map<
    string,
    { count: number; totalNoShows: number; totalAppts: number }
  >();
  for (const patient of allPatients) {
    const sp = patient.specialty;
    if (!specialtyMap.has(sp)) {
      specialtyMap.set(sp, { count: 0, totalNoShows: 0, totalAppts: 0 });
    }
    const entry = specialtyMap.get(sp)!;
    entry.count++;
    entry.totalNoShows += patient.stats.noShows;
    entry.totalAppts += patient.stats.totalAppointments;
  }

  const bySpecialty = [...specialtyMap.entries()]
    .map(([specialty, data]) => ({
      specialty,
      count: data.count,
      avgNoShowRate:
        data.totalAppts > 0
          ? Math.round((data.totalNoShows / data.totalAppts) * 1000) / 1000
          : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    totalPatients,
    upcomingAppointments: upcomingAppointments.length,
    noShowRate: Math.round(noShowRate * 1000) / 1000,
    riskDistribution,
    bySpecialty,
  };
});
