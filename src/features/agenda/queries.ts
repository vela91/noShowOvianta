import { cache } from "react";
import { connection } from "next/server";
import dbConnect from "@/lib/db";
import Appointment from "@/models/appointment";
import Patient from "@/models/patient";
import { calculateRiskScore } from "@/lib/scoring";
import { serialize } from "@/lib/utils";
import type { IAppointment, IPatient } from "@/lib/types";

export interface AppointmentWithPatient extends IAppointment {
  patient: IPatient;
  riskScoreComputed: number;
  riskLevelComputed: "low" | "medium" | "high";
}

export const getAppointmentsForDay = cache(
  async (date: Date): Promise<AppointmentWithPatient[]> => {
    await connection();
    await dbConnect();

    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const appointments = await Appointment.find({
      date: { $gte: start, $lte: end },
    })
      .sort({ date: 1 })
      .lean();

    if (appointments.length === 0) return [];

    // Batch-fetch all patients to avoid N+1
    const patientIds = [
      ...new Set(appointments.map((a) => a.patientId.toString())),
    ];
    const patients = await Patient.find({ _id: { $in: patientIds } }).lean();

    const patientMap = new Map<string, IPatient>(
      patients.map((p) => [p._id.toString(), serialize<IPatient>(p)])
    );

    return appointments.map((appt) => {
      const a = serialize<IAppointment>(appt);
      const patient = patientMap.get(a.patientId)!;
      const { score, level } = calculateRiskScore(patient, a);
      return {
        ...a,
        patient,
        riskScoreComputed: score,
        riskLevelComputed: level,
      };
    });
  }
);
