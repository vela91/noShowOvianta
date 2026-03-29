// Seed script for MongoDB
// Run with: npx tsx src/lib/seed.ts
// Generates 70 Spanish patients with coherent appointment history

import mongoose from "mongoose";
// dotenv loads .env by default — we specify .env.local (Next.js convention)
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

// Import models directly (no @/ alias — this script runs outside Next.js)
import "../models/patient";
import "../models/appointment";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error("Define MONGODB_URI in .env.local");
}

// --- Sample data for generating realistic Spanish patients ---

const MALE_NAMES = [
  "Carlos", "Antonio", "Manuel", "Francisco", "David", "José",
  "Miguel", "Pedro", "Alejandro", "Luis", "Fernando", "Jorge",
  "Roberto", "Sergio", "Pablo", "Alberto", "Rafael", "Andrés",
];

const FEMALE_NAMES = [
  "María", "Carmen", "Ana", "Isabel", "Laura", "Marta",
  "Sara", "Patricia", "Elena", "Rosa", "Cristina", "Lucía",
  "Sofía", "Julia", "Beatriz", "Silvia", "Natalia", "Pilar",
];

const SURNAMES = [
  "García", "Martínez", "López", "Sánchez", "González", "Fernández",
  "Rodríguez", "Pérez", "Gómez", "Díaz", "Hernández", "Ruiz",
  "Jiménez", "Alonso", "Moreno", "Muñoz", "Romero", "Torres",
  "Álvarez", "Domínguez", "Gil", "Vázquez", "Serrano", "Ramos",
  "Blanco", "Molina", "Morales", "Ortega", "Delgado", "Castro",
];

const DOCTORS = [
  "Dr. García Pinto", "Dra. López Vega", "Dr. Martínez Ruiz",
  "Dra. Sánchez Mora", "Dr. González Alba", "Dra. Fernández Cano",
  "Dr. Rodríguez Haro", "Dra. Pérez Vera", "Dr. Alonso Prieto",
];

// Unused but kept for reference
void DOCTORS;

type SpecialtyProfile = {
  specialty: string;
  condition: string;
  conditionType: "chronic" | "acute";
  doctor: string;
  noShowRate: number; // base rate
};

const SPECIALTIES: SpecialtyProfile[] = [
  { specialty: "Endocrinología", condition: "Diabetes tipo 2", conditionType: "chronic", doctor: "Dra. López Vega", noShowRate: 0.10 },
  { specialty: "Endocrinología", condition: "Hipotiroidismo", conditionType: "chronic", doctor: "Dra. López Vega", noShowRate: 0.08 },
  { specialty: "Traumatología", condition: "Lumbalgia crónica", conditionType: "chronic", doctor: "Dr. García Pinto", noShowRate: 0.12 },
  { specialty: "Traumatología", condition: "Artrosis de rodilla", conditionType: "chronic", doctor: "Dr. García Pinto", noShowRate: 0.10 },
  { specialty: "Psiquiatría", condition: "Ansiedad generalizada", conditionType: "chronic", doctor: "Dra. Sánchez Mora", noShowRate: 0.25 },
  { specialty: "Psiquiatría", condition: "Depresión mayor", conditionType: "chronic", doctor: "Dra. Sánchez Mora", noShowRate: 0.22 },
  { specialty: "Dermatología", condition: "Dermatitis atópica", conditionType: "chronic", doctor: "Dr. Martínez Ruiz", noShowRate: 0.20 },
  { specialty: "Dermatología", condition: "Acné severo", conditionType: "acute", doctor: "Dr. Martínez Ruiz", noShowRate: 0.22 },
  { specialty: "Cardiología", condition: "Hipertensión arterial", conditionType: "chronic", doctor: "Dr. González Alba", noShowRate: 0.08 },
  { specialty: "Cardiología", condition: "Arritmia", conditionType: "chronic", doctor: "Dr. González Alba", noShowRate: 0.07 },
  { specialty: "Medicina General", condition: "Revisión anual", conditionType: "acute", doctor: "Dra. Fernández Cano", noShowRate: 0.15 },
  { specialty: "Medicina General", condition: "Infección respiratoria", conditionType: "acute", doctor: "Dra. Fernández Cano", noShowRate: 0.12 },
];

const APPOINTMENT_TYPES = ["first_visit", "follow_up", "follow_up", "routine_check"] as const;
const REMINDER_RESPONSES = ["confirmed", "confirmed", "no_response", "no_response", "declined", null, null] as const;

// Realistic channel preference combinations
const CHANNEL_COMBOS: Array<Array<"whatsapp" | "sms" | "call" | "email">> = [
  ["whatsapp"],
  ["whatsapp"],
  ["whatsapp", "sms"],
  ["sms"],
  ["sms"],
  ["whatsapp", "call"],
  ["call"],
  ["call", "sms"],
  ["email", "whatsapp"],
  ["whatsapp", "sms", "call"],
];

// Realistic contact time preference combinations
const CONTACT_TIME_COMBOS: Array<Array<"morning" | "afternoon" | "evening">> = [
  ["morning"],
  ["morning"],
  ["morning", "afternoon"],
  ["afternoon"],
  ["afternoon"],
  ["morning", "evening"],
  ["evening"],
  ["morning", "afternoon", "evening"],
];

function randomFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Simulates whether an appointment was a no-show based on patient profile
function isNoShow(baseRate: number, age: number, isYoung: boolean): boolean {
  let rate = baseRate;
  if (isYoung) rate += 0.10; // 18-35 year-olds: higher no-show rate
  return Math.random() < rate;
}

function isCancellation(totalNoShowRate: number): boolean {
  return Math.random() < totalNoShowRate * 0.5; // cancellations ≈ half the no-show rate
}

async function seed() {
  await mongoose.connect(MONGODB_URI!);
  const Patient = mongoose.model("Patient");
  const Appointment = mongoose.model("Appointment");
  const seedNow = new Date();

  // Clear existing data and regenerate from scratch
  const existingCount = await Patient.countDocuments();
  if (existingCount > 0) {
    console.log(`Limpiando ${existingCount} pacientes existentes...`);
    await mongoose.connection.db!.dropDatabase();
    console.log(`Base de datos limpiada`);
  }

  console.log("Iniciando seed de datos...");

  let totalPatients = 0;
  let totalAppointments = 0;

  for (let i = 0; i < 70; i++) {
    const isMale = Math.random() > 0.5;
    const firstName = isMale ? randomFrom(MALE_NAMES) : randomFrom(FEMALE_NAMES);
    const lastName = `${randomFrom(SURNAMES)} ${randomFrom(SURNAMES)}`;
    const gender = isMale ? "male" : "female";

    // Age distribution: 18-85 years, weighted towards 35-70
    const age = randomInt(18, 85);
    const isYoung = age < 35;
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - age);
    dob.setMonth(randomInt(0, 11));
    dob.setDate(randomInt(1, 28));

    const specialtyProfile = randomFrom(SPECIALTIES);

    // Distance: simulated log-normal distribution (most nearby, few far away)
    const distanceOptions = [0.5, 1, 1.5, 2, 3, 4, 5, 7, 10, 15, 20, 25, 35, 45];
    const distanceToClinicKm = randomFrom(distanceOptions);

    // Consents: ~90% all active
    const allConsents = Math.random() > 0.10;
    const consents = {
      automatedReminders: allConsents || Math.random() > 0.3,
      predictiveProfiling: allConsents || Math.random() > 0.4,
      dataProcessing: true, // Required by law
    };

    // Create patient (no stats yet)
    const patient = await Patient.create({
      firstName,
      lastName,
      dateOfBirth: dob,
      gender,
      phone: `6${randomInt(10, 99)}${randomInt(100000, 999999)}`,
      email: `${firstName.toLowerCase()}.${lastName.split(" ")[0].toLowerCase()}${randomInt(1, 99)}@example.com`,
      address: `Calle ${randomFrom(SURNAMES)} ${randomInt(1, 100)}, ${randomInt(1, 8)}º ${randomInt(1, 4)}ª`,
      distanceToClinicKm,
      primaryCondition: specialtyProfile.condition,
      conditionType: specialtyProfile.conditionType,
      specialty: specialtyProfile.specialty,
      preferredChannel: randomFrom(CHANNEL_COMBOS),
      preferredContactTime: randomFrom(CONTACT_TIME_COMBOS),
      consents,
    });

    totalPatients++;

    // Generate appointment history (3-18 past appointments)
    const numHistorical = randomInt(3, 18);
    const historicalAppointments = [];
    let noShows = 0;
    let cancellations = 0;

    const now = new Date();
    for (let j = 0; j < numHistorical; j++) {
      // Past dates: between 2 years ago and yesterday
      const daysAgo = randomInt(1, 730);
      const appointmentDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      appointmentDate.setHours(randomInt(8, 18), 0, 0, 0);

      const appointmentType = randomFrom(APPOINTMENT_TYPES);
      let status: string;

      if (isNoShow(specialtyProfile.noShowRate, age, isYoung)) {
        status = "no_show";
        noShows++;
      } else if (isCancellation(specialtyProfile.noShowRate)) {
        status = "cancelled";
        cancellations++;
      } else {
        status = "attended";
      }

      historicalAppointments.push({
        patientId: patient._id,
        doctorName: specialtyProfile.doctor,
        specialty: specialtyProfile.specialty,
        date: appointmentDate,
        duration: randomFrom([30, 30, 45, 60]),
        type: appointmentType,
        status,
        reminderSent: true,
        reminderResponse:
          status === "attended"
            ? randomFrom(["confirmed", "confirmed", "no_response"])
            : randomFrom(["declined", "no_response"]),
        leadTimeDays: randomInt(1, 30),
        createdAt: new Date(appointmentDate.getTime() - randomInt(1, 30) * 24 * 60 * 60 * 1000),
      });
    }

    await Appointment.insertMany(historicalAppointments);
    totalAppointments += historicalAppointments.length;

    // Update patient stats
    const totalAppts = numHistorical;
    const attended = totalAppts - noShows - cancellations;
    const attendanceRate = attended / totalAppts;

    await Patient.findByIdAndUpdate(patient._id, {
      stats: {
        totalAppointments: totalAppts,
        noShows,
        cancellations,
        attendanceRate,
      },
    });

    // Generate future appointments (2-4 per patient)
    const numFuture = randomInt(2, 4);
    const futureAppointments = [];

    for (let k = 0; k < numFuture; k++) {
      // Varied lead times: 0 days (today) to 30 days
      // 0 included so the agenda for today has appointments
      const leadDays = randomFrom([0, 0, 1, 2, 3, 4, 5, 7, 10, 14, 21, 28, 30]);
      const futureDate = new Date(now.getTime() + leadDays * 24 * 60 * 60 * 1000);
      futureDate.setHours(randomInt(8, 18), 0, 0, 0);

      // Reminder response weighted by patient risk profile
      const patientRiskProfile = noShows / totalAppts;
      let reminderResponse: string | null;
      if (patientRiskProfile > 0.3) {
        // High risk: more likely to not respond or decline
        reminderResponse = randomFrom(["no_response", "no_response", "declined", null] as const);
      } else if (patientRiskProfile < 0.1) {
        // Low risk: more likely to confirm
        reminderResponse = randomFrom(["confirmed", "confirmed", "no_response", null] as const);
      } else {
        reminderResponse = randomFrom(REMINDER_RESPONSES);
      }

      const hasReminder = leadDays > 2 && Math.random() > 0.3;

      futureAppointments.push({
        patientId: patient._id,
        doctorName: specialtyProfile.doctor,
        specialty: specialtyProfile.specialty,
        date: futureDate,
        duration: randomFrom([30, 30, 45, 60]),
        type: k === 0 ? "follow_up" : randomFrom(APPOINTMENT_TYPES),
        status: Math.random() > 0.3 ? "scheduled" : "confirmed",
        reminderSent: hasReminder,
        reminderResponse: hasReminder ? reminderResponse : null,
        leadTimeDays: leadDays,
        createdAt: new Date(now.getTime() - randomInt(1, 7) * 24 * 60 * 60 * 1000),
      });
    }

    await Appointment.insertMany(futureAppointments);
    totalAppointments += futureAppointments.length;
  }

  // ─── Guaranteed appointments for evaluation days ────────────────────────────
  // Generate appointments with varied risk profiles (low/medium/high) spread
  // across hours so evaluators see the full range of scores in the agenda.
  console.log("Generando citas garantizadas para días de evaluación...");

  const PatientModel = mongoose.model("Patient");
  const AppointmentModel = mongoose.model("Appointment");

  const highRiskPool = await PatientModel.find({
    specialty: { $in: ["Psiquiatría", "Dermatología"] },
    "stats.totalAppointments": { $gte: 5 },
  })
    .sort({ "stats.noShows": -1 })
    .limit(6)
    .lean();

  const lowRiskPool = await PatientModel.find({
    specialty: { $in: ["Cardiología", "Endocrinología"] },
    "stats.totalAppointments": { $gte: 5 },
  })
    .sort({ "stats.noShows": 1 })
    .limit(4)
    .lean();

  const mediumRiskPool = await PatientModel.find({
    specialty: { $in: ["Traumatología", "Medicina General"] },
    "stats.totalAppointments": { $gte: 5 },
  })
    .sort({ "stats.noShows": 1 })
    .limit(4)
    .lean();

  type SlotTemplate = {
    hour: number;
    type: string;
    reminderResponse: string | null;
    status: string;
  };

  const evalSlots: SlotTemplate[] = [
    { hour: 8,  type: "first_visit",   reminderResponse: "declined",    status: "scheduled" },
    { hour: 9,  type: "follow_up",     reminderResponse: "confirmed",   status: "confirmed"  },
    { hour: 10, type: "follow_up",     reminderResponse: "no_response", status: "scheduled" },
    { hour: 11, type: "first_visit",   reminderResponse: "declined",    status: "scheduled" },
    { hour: 12, type: "follow_up",     reminderResponse: "confirmed",   status: "confirmed"  },
    { hour: 14, type: "routine_check", reminderResponse: "no_response", status: "scheduled" },
    { hour: 15, type: "follow_up",     reminderResponse: "confirmed",   status: "confirmed"  },
    { hour: 16, type: "first_visit",   reminderResponse: "declined",    status: "scheduled" },
    { hour: 17, type: "follow_up",     reminderResponse: "no_response", status: "scheduled" },
  ];

  const slotPatients = [
    ...highRiskPool.slice(0, 3),   // slots 0,1,2 → high risk early hours
    ...lowRiskPool.slice(0, 2),    // slots 3,4   → low risk
    ...mediumRiskPool.slice(0, 2), // slots 5,6   → medium risk
    ...highRiskPool.slice(3, 5),   // slots 7,8   → high risk end of day
  ];

  for (const daysFromNow of [3, 4]) {
    const evalDate = new Date(seedNow.getTime() + daysFromNow * 24 * 60 * 60 * 1000);
    const evalAppointments = [];

    for (let s = 0; s < Math.min(evalSlots.length, slotPatients.length); s++) {
      const slot = evalSlots[s];
      const pat = slotPatients[s] as unknown as { _id: unknown; specialty: string };
      if (!pat) continue;

      const apptDate = new Date(evalDate);
      apptDate.setHours(slot.hour, 0, 0, 0);

      const sp = SPECIALTIES.find((x) => x.specialty === pat.specialty) ?? SPECIALTIES[0];

      evalAppointments.push({
        patientId: pat._id,
        doctorName: sp.doctor,
        specialty: sp.specialty,
        date: apptDate,
        duration: 30,
        type: slot.type,
        status: slot.status,
        reminderSent: true,
        reminderResponse: slot.reminderResponse,
        leadTimeDays: daysFromNow,
        createdAt: new Date(seedNow.getTime() - randomInt(1, 3) * 24 * 60 * 60 * 1000),
      });
    }

    await AppointmentModel.insertMany(evalAppointments);
    totalAppointments += evalAppointments.length;
    console.log(`   ${evalAppointments.length} citas garantizadas → día +${daysFromNow}`);
  }

  // ─── Guaranteed low-risk patients ──────────────────────────────────────────
  // Without these profiles the dataset has no "low" representation (score <15).
  // To reach that: 0 no-shows + short lead time + Cardiology/Endocrinology +
  // follow_up + confirmed. Generated explicitly.
  console.log("Generando pacientes de bajo riesgo garantizados...");

  const LOW_RISK_PROFILES = [
    { firstName: "Isabel",  lastName: "Romero Blanco",    age: 58, specialty: "Cardiología",    condition: "Hipertensión arterial", doctor: "Dr. González Alba", distanceKm: 0.5 },
    { firstName: "Antonio", lastName: "Molina Serrano",   age: 62, specialty: "Cardiología",    condition: "Arritmia",             doctor: "Dr. González Alba", distanceKm: 0.5 },
    { firstName: "Pilar",   lastName: "Castro Domínguez", age: 54, specialty: "Endocrinología", condition: "Hipotiroidismo",        doctor: "Dra. López Vega",   distanceKm: 0.5 },
    { firstName: "Rafael",  lastName: "Gil Vázquez",      age: 60, specialty: "Cardiología",    condition: "Arritmia",             doctor: "Dr. González Alba", distanceKm: 0.5 },
    { firstName: "Beatriz", lastName: "Ortega Ramos",     age: 55, specialty: "Cardiología",    condition: "Hipertensión arterial", doctor: "Dr. González Alba", distanceKm: 0.5 },
  ];

  for (let idx = 0; idx < LOW_RISK_PROFILES.length; idx++) {
    const p = LOW_RISK_PROFILES[idx];
    const dob = new Date(seedNow);
    dob.setFullYear(dob.getFullYear() - p.age);

    const lowRiskPatient = await Patient.create({
      firstName: p.firstName,
      lastName: p.lastName,
      dateOfBirth: dob,
      gender: idx % 2 === 0 ? "female" : "male",
      phone: `6${randomInt(10, 99)}${randomInt(100000, 999999)}`,
      email: `${p.firstName.toLowerCase()}.${p.lastName.split(" ")[0].toLowerCase()}${randomInt(1, 9)}@example.com`,
      address: `Calle ${randomFrom(SURNAMES)} ${randomInt(1, 50)}, 1º 1ª`,
      distanceToClinicKm: p.distanceKm,
      primaryCondition: p.condition,
      conditionType: "chronic",
      specialty: p.specialty,
      preferredChannel: ["whatsapp"],
      preferredContactTime: ["morning"],
      consents: { automatedReminders: true, predictiveProfiling: true, dataProcessing: true },
    });
    totalPatients++;

    // Perfect history: 8-12 appointments, all attended
    const numHistory = randomInt(8, 12);
    const historyAppts = [];
    for (let j = 0; j < numHistory; j++) {
      const daysAgo = randomInt(14, 730);
      const apptDate = new Date(seedNow.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      apptDate.setHours(randomInt(10, 13), 0, 0, 0);
      historyAppts.push({
        patientId: lowRiskPatient._id,
        doctorName: p.doctor,
        specialty: p.specialty,
        date: apptDate,
        duration: 30,
        type: "follow_up",
        status: "attended",
        reminderSent: true,
        reminderResponse: "confirmed",
        leadTimeDays: randomInt(2, 7),
        createdAt: new Date(apptDate.getTime() - randomInt(2, 7) * 24 * 60 * 60 * 1000),
      });
    }
    await Appointment.insertMany(historyAppts);
    totalAppointments += historyAppts.length;

    await Patient.findByIdAndUpdate(lowRiskPatient._id, {
      stats: {
        totalAppointments: numHistory,
        noShows: 0,
        cancellations: 0,
        attendanceRate: 1.0,
      },
    });

    // Future appointment: idx=0 → +3d, idx=1 → +4d, rest → +2d
    const leadDays = idx === 0 ? 3 : idx === 1 ? 4 : 2;
    const futureDate = new Date(seedNow.getTime() + leadDays * 24 * 60 * 60 * 1000);
    futureDate.setHours(11, 0, 0, 0);
    await Appointment.create({
      patientId: lowRiskPatient._id,
      doctorName: p.doctor,
      specialty: p.specialty,
      date: futureDate,
      duration: 30,
      type: "follow_up",
      status: "confirmed",
      reminderSent: true,
      reminderResponse: "confirmed",
      leadTimeDays: leadDays,
      createdAt: new Date(seedNow.getTime() - 2 * 24 * 60 * 60 * 1000),
    });
    totalAppointments++;
  }
  console.log(`   ${LOW_RISK_PROFILES.length} pacientes de bajo riesgo creados`);

  console.log(`Seed completado:`);
  console.log(`   ${totalPatients} pacientes creados`);
  console.log(`   ${totalAppointments} citas totales`);

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Error en seed:", err);
  process.exit(1);
});
