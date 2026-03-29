import { cache } from "react";
import { connection } from "next/server";
import dbConnect from "@/lib/db";
import Patient from "@/models/patient";
import Appointment from "@/models/appointment";
import { calculateRiskScore } from "@/lib/scoring";
import { serialize } from "@/lib/utils";
import type {
  IAppointment,
  IPatient,
  PatientFilters,
  PatientWithScore,
} from "@/lib/types";

export const getSpecialties = cache(async (): Promise<string[]> => {
  await connection();
  await dbConnect();
  const specialties = await Patient.distinct("specialty");
  return (specialties as string[]).sort();
});

export const getNextAppointment = cache(
  async (patientId: string): Promise<IAppointment | null> => {
    await connection();
    await dbConnect();
    const appt = await Appointment.findOne({
      patientId,
      date: { $gte: new Date() },
      status: { $in: ["scheduled", "confirmed"] },
    })
      .sort({ date: 1 })
      .lean();
    return appt ? serialize<IAppointment>(appt) : null;
  }
);

export const getPatients = cache(
  async (filters?: PatientFilters): Promise<PatientWithScore[]> => {
    await connection();
    await dbConnect();

    // Build patient query from filters
    const query: Record<string, unknown> = {};
    if (filters?.specialty && filters.specialty !== "all") {
      query.specialty = filters.specialty;
    }
    if (filters?.search) {
      // Escape special regex chars to prevent ReDoS with user-controlled input
      const escaped = filters.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");
      query.$or = [{ firstName: regex }, { lastName: regex }, { email: regex }];
    }

    // Fetch patients + all upcoming appointments in parallel (avoids N+1)
    const [patients, upcomingAppointments] = await Promise.all([
      Patient.find(query).lean(),
      Appointment.find({
        date: { $gte: new Date() },
        status: { $in: ["scheduled", "confirmed"] },
      })
        .sort({ date: 1 })
        .lean(),
    ]);

    // Map patientId → earliest upcoming appointment
    const nextApptMap = new Map<string, IAppointment>();
    for (const appt of upcomingAppointments) {
      const pid = appt.patientId.toString();
      if (!nextApptMap.has(pid)) {
        nextApptMap.set(pid, serialize<IAppointment>(appt));
      }
    }

    // Build PatientWithScore[] with computed risk scores
    const results: PatientWithScore[] = patients.map((patient) => {
      const p = serialize<IPatient>(patient);
      const nextAppointment = nextApptMap.get(p._id);
      const riskScore = nextAppointment
        ? calculateRiskScore(p, nextAppointment)
        : undefined;
      return { ...p, nextAppointment, riskScore };
    });

    // riskLevel filter is applied post-computation (score is not stored in Patient)
    if (filters?.riskLevel && filters.riskLevel !== "all") {
      return results.filter((r) => r.riskScore?.level === filters.riskLevel);
    }

    return results;
  }
);

export const getPatientById = cache(
  async (id: string): Promise<PatientWithScore | null> => {
    await connection();
    await dbConnect();

    const patient = await Patient.findById(id).lean();
    if (!patient) return null;

    const p = serialize<IPatient>(patient);
    const nextAppointment = (await getNextAppointment(id)) ?? undefined;
    const riskScore = nextAppointment
      ? calculateRiskScore(p, nextAppointment)
      : undefined;

    return { ...p, nextAppointment, riskScore };
  }
);

export const getPatientAppointments = cache(
  async (patientId: string): Promise<IAppointment[]> => {
    await connection();
    await dbConnect();
    const appointments = await Appointment.find({ patientId })
      .sort({ date: -1 })
      .lean();
    return appointments.map((a) => serialize<IAppointment>(a));
  }
);
