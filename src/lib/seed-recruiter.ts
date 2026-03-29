// Pacientes demo para revisión de reclutadores
// Crea 2 pacientes de alto riesgo con cita el próximo martes.
//
// Ejecutar DESPUÉS de npm run seed:
//   npx tsx src/lib/seed-recruiter.ts
//
// IMPORTANTE: npm run seed borra la BD. Volver a ejecutar este script tras cada seed.

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import "../models/patient";
import "../models/appointment";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) throw new Error("Define MONGODB_URI en .env.local");

// Calcula la fecha del próximo martes (nunca hoy si hoy es martes)
function nextTuesday(): Date {
  const d = new Date();
  const daysUntil = ((2 - d.getDay() + 7) % 7) || 7;
  d.setDate(d.getDate() + daysUntil);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Perfiles diseñados para score ~78 (HIGH)
// Factores máximos: historial de no-shows alto, leadTime=28d, distancia larga,
// cita de primera visita, especialidad de alto riesgo, recordatorio rechazado.
const RECRUITER_PATIENTS = [
  {
    firstName: "Javier",
    lastName: "Morales Torres",
    age: 26,
    gender: "male",
    specialty: "Psiquiatría",
    condition: "Depresión mayor",
    conditionType: "chronic" as const,
    doctor: "Dra. Sánchez Mora",
    distanceKm: 35,
    noShowsInHistory: 8,
    totalHistory: 10,
    appointmentHour: 8,    // horario 8h = franja de alto riesgo
    appointmentType: "first_visit",
  },
  {
    firstName: "Lucía",
    lastName: "Herrera Vega",
    age: 22,
    gender: "female",
    specialty: "Dermatología",
    condition: "Acné severo",
    conditionType: "acute" as const,
    doctor: "Dr. Martínez Ruiz",
    distanceKm: 25,
    noShowsInHistory: 7,
    totalHistory: 9,
    appointmentHour: 17,   // horario 17h = franja de riesgo elevado
    appointmentType: "first_visit",
  },
];

async function seed() {
  await mongoose.connect(MONGODB_URI!);
  const Patient = mongoose.model("Patient");
  const Appointment = mongoose.model("Appointment");
  const now = new Date();
  const tuesday = nextTuesday();

  console.log(`Creando pacientes demo para el martes ${tuesday.toLocaleDateString("es-ES")}...`);

  for (const p of RECRUITER_PATIENTS) {
    // Verificar si ya existe (idempotente)
    const exists = await Patient.findOne({ firstName: p.firstName, lastName: p.lastName });
    if (exists) {
      console.log(`  → ${p.firstName} ${p.lastName} ya existe, omitiendo`);
      continue;
    }

    const dob = new Date(now);
    dob.setFullYear(dob.getFullYear() - p.age);

    const patient = await Patient.create({
      firstName: p.firstName,
      lastName: p.lastName,
      dateOfBirth: dob,
      gender: p.gender,
      phone: `6${String(Math.floor(10 + Math.random() * 89))}${String(Math.floor(100000 + Math.random() * 899999))}`,
      email: `${p.firstName.toLowerCase()}.${p.lastName.split(" ")[0].toLowerCase()}@example.com`,
      address: `Calle Mayor ${Math.floor(1 + Math.random() * 99)}, 3º 2ª`,
      distanceToClinicKm: p.distanceKm,
      primaryCondition: p.condition,
      conditionType: p.conditionType,
      specialty: p.specialty,
      preferredChannel: ["whatsapp"],
      preferredContactTime: ["morning"],
      consents: {
        automatedReminders: true,
        predictiveProfiling: true,
        dataProcessing: true,
      },
    });

    // Historial: primeras N citas son no-shows, las últimas son asistidas
    const historyAppts = [];
    for (let j = 0; j < p.totalHistory; j++) {
      const daysAgo = 30 + j * 40; // repartidas ~16 meses atrás
      const apptDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      apptDate.setHours(10, 0, 0, 0);
      const isNoShow = j < p.noShowsInHistory;
      historyAppts.push({
        patientId: patient._id,
        doctorName: p.doctor,
        specialty: p.specialty,
        date: apptDate,
        duration: 30,
        type: "follow_up",
        status: isNoShow ? "no_show" : "attended",
        reminderSent: true,
        reminderResponse: isNoShow ? "declined" : "confirmed",
        leadTimeDays: 14,
        createdAt: new Date(apptDate.getTime() - 7 * 24 * 60 * 60 * 1000),
      });
    }
    await Appointment.insertMany(historyAppts);

    const cancellations = 0;
    const attended = p.totalHistory - p.noShowsInHistory - cancellations;
    await Patient.findByIdAndUpdate(patient._id, {
      stats: {
        totalAppointments: p.totalHistory,
        noShows: p.noShowsInHistory,
        cancellations,
        attendanceRate: attended / p.totalHistory,
      },
    });

    // Cita del martes:
    // - leadTimeDays=28 → agendada hace un mes (sigmoid alto → score alto)
    // - reminderResponse=declined → señal clara de riesgo
    const apptDate = new Date(tuesday);
    apptDate.setHours(p.appointmentHour, 0, 0, 0);
    await Appointment.create({
      patientId: patient._id,
      doctorName: p.doctor,
      specialty: p.specialty,
      date: apptDate,
      duration: 30,
      type: p.appointmentType,
      status: "scheduled",
      reminderSent: true,
      reminderResponse: "declined",
      leadTimeDays: 28,
      createdAt: new Date(now.getTime() - 26 * 24 * 60 * 60 * 1000),
    });

    const score = "~78"; // HIGH: validado contra scoring.ts
    console.log(`  ✓ ${p.firstName} ${p.lastName} — ${p.specialty}, score ${score}, martes ${p.appointmentHour}:00h`);
  }

  console.log("Listo.");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
