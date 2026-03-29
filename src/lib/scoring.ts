import type { IAppointment, IPatient, RiskScoreResult } from "@/lib/types";
import { calculateAge } from "@/lib/utils";
import { RISK_THRESHOLDS } from "@/lib/risk-constants";

// No-show risk scoring engine
//
// PRINCIPLE: PURE and DETERMINISTIC function. No side effects. No DB calls.
// Receives data → returns score 0-100 with full breakdown.
//
// In production: replace with XGBoost trained on real data via ONNX/FastAPI.
// Current weights serve as a baseline calibrated against no-show scientific literature.
// The architecture allows replacement without changing the interface.

// --- Feature weights (top-level for easy calibration) ---

const FEATURE_WEIGHTS = {
  noShowHistory:    0.30,
  leadTime:         0.20,
  age:              0.10,
  distance:         0.10,
  appointmentType:  0.08,
  specialty:        0.07,
  timeSlot:         0.05,
  conditionType:    0.05,
  reminderResponse: 0.05,
} as const;

// --- Transformation functions ---

// Inverted-U curve for age risk
// - Young 18-30: more no-shows (less medical habit, higher impulsivity)
// - Elderly 85+: more no-shows (reduced mobility, caregiver dependency)
// - Minimum at 50-65: stronger health commitment, established medical routines
function ageToRisk(age: number): number {
  const youngRisk = Math.max(0, Math.exp(-((age - 18) / 15)) * 0.8);
  const oldRisk = Math.max(0, Math.exp(-((90 - age) / 12)) * 0.8);
  const baseRisk = 0.15; // minimum risk (ideal 50-65 patient)
  return Math.min(1, baseRisk + youngRisk + oldRisk);
}

// Quadratic function for appointment time slot
// - Worst: 8-9h (early morning, patients haven't "started the day")
// - Worst: 18h+ (traffic, fatigue, temptation to skip)
// - Optimal: 10-13h (mid-morning — patient is already active)
function timeToRisk(hour: number): number {
  if (hour < 8) return 0.9;
  if (hour <= 9) return 0.75 - (hour - 8) * 0.2; // 8h=0.75, 9h=0.55
  if (hour <= 13) return 0.15 + (Math.abs(hour - 11.5) / 2.5) * 0.15; // minimum at 11.5h
  if (hour <= 17) return 0.25 + ((hour - 13) / 4) * 0.3; // gradual increase
  return Math.min(0.9, 0.55 + (hour - 17) * 0.1); // sharp increase after 17h
}

// Risk map by specialty
// Based on adherence literature:
// - Psiquiatría: high stigma, higher treatment dropout
// - Dermatología: perceived as "non-urgent", easy to postpone
// - Cardiología: high perceived life urgency, lower dropout
const SPECIALTY_RISK: Record<string, number> = {
  psiquiatría: 0.8,
  psiquiatria: 0.8,
  "salud mental": 0.8,
  dermatología: 0.7,
  dermatologia: 0.7,
  traumatología: 0.5,
  traumatologia: 0.5,
  endocrinología: 0.4,
  endocrinologia: 0.4,
  "medicina general": 0.4,
  medicina_general: 0.4,
  cardiología: 0.3,
  cardiologia: 0.3,
};

// Risk map by appointment type
const TYPE_RISK: Record<string, number> = {
  first_visit: 0.7,    // No established doctor relationship → higher chance of skipping
  follow_up: 0.3,      // Continuity, patient knows the doctor → more committed
  urgent: 0.1,         // Urgent means high motivation to attend
  routine_check: 0.5,  // Routine check = lower perceived urgency
};

// Risk map by reminder response
const REMINDER_RISK: Record<string, number> = {
  confirmed: 0.1,    // Explicitly confirmed → very likely to attend
  no_response: 0.6,  // No response → signal of disinterest or forgetfulness
  declined: 0.9,     // Explicitly declined → almost certain no-show
};

// --- Internal feature type (before contribution is computed) ---

type Feature = {
  feature: string;
  weight: number;
  rawValue: number | string;
  normalizedValue: number;
};

// --- Pure sub-functions ---

function normalizeFeatures(patient: IPatient, appointment: IAppointment): Feature[] {
  const age = calculateAge(patient.dateOfBirth);

  // 1. Historical no-show ratio (weight 0.30 — strongest predictor)
  // Prior of 0.3 for patients with no history (moderate uncertainty).
  const noShowRatio =
    patient.stats.totalAppointments > 0
      ? patient.stats.noShows / patient.stats.totalAppointments
      : 0.3;

  // 2. Lead time — days until appointment (weight 0.20)
  // Sigmoid transform: rises smoothly beyond 14 days.
  const leadTime = appointment.leadTimeDays ?? 7;
  const leadTimeNorm = 1 / (1 + Math.exp(-0.15 * (leadTime - 14)));

  // 3. Age — transformed via ageToRisk() inline in the return array

  // 4. Distance to clinic (weight 0.10)
  // Logarithmic transform: saturates around 50km.
  const distNorm = Math.min(
    1,
    Math.log(1 + patient.distanceToClinicKm) / Math.log(50)
  );

  // 5. Appointment type — mapped via TYPE_RISK inline in the return array

  // 6. Specialty — normalize: remove diacritics and lowercase for robust matching
  const specialtyKey = patient.specialty
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  // 7. Time slot
  const hour = new Date(appointment.date).getHours();

  return [
    {
      feature: "Historial de no-shows",
      weight: FEATURE_WEIGHTS.noShowHistory,
      rawValue: `${patient.stats.noShows}/${patient.stats.totalAppointments}`,
      normalizedValue: noShowRatio,
    },
    {
      feature: "Antelación de la cita",
      weight: FEATURE_WEIGHTS.leadTime,
      rawValue: `${leadTime} días`,
      normalizedValue: leadTimeNorm,
    },
    {
      feature: "Edad del paciente",
      weight: FEATURE_WEIGHTS.age,
      rawValue: `${age} años`,
      normalizedValue: ageToRisk(age),
    },
    {
      feature: "Distancia al centro",
      weight: FEATURE_WEIGHTS.distance,
      rawValue: `${patient.distanceToClinicKm} km`,
      normalizedValue: distNorm,
    },
    {
      feature: "Tipo de consulta",
      weight: FEATURE_WEIGHTS.appointmentType,
      rawValue: appointment.type,
      normalizedValue: TYPE_RISK[appointment.type] ?? 0.5,
    },
    {
      feature: "Especialidad médica",
      weight: FEATURE_WEIGHTS.specialty,
      rawValue: patient.specialty,
      normalizedValue: SPECIALTY_RISK[specialtyKey] ?? 0.5,
    },
    {
      feature: "Franja horaria",
      weight: FEATURE_WEIGHTS.timeSlot,
      rawValue: `${String(hour).padStart(2, "0")}:00h`,
      normalizedValue: timeToRisk(hour),
    },
    {
      feature: "Tipo de condición",
      weight: FEATURE_WEIGHTS.conditionType,
      rawValue: patient.conditionType === "chronic" ? "Crónica" : "Aguda",
      normalizedValue: patient.conditionType === "chronic" ? 0.2 : 0.7,
    },
    {
      feature: "Respuesta al recordatorio",
      weight: FEATURE_WEIGHTS.reminderResponse,
      rawValue: appointment.reminderResponse ?? "Sin respuesta",
      normalizedValue: REMINDER_RISK[appointment.reminderResponse ?? "null"] ?? 0.5,
    },
  ];
}

// Final score = Σ(weight × normalizedValue) × 100, clamped to [0, 100]
function aggregateScore(features: Feature[]): number {
  const raw = features.reduce((sum, f) => sum + f.weight * f.normalizedValue, 0);
  return Math.round(Math.min(100, Math.max(0, raw * 100)));
}

// low <15: standard intervention, no urgency
// medium 15-40: reinforcement needed
// high >40: proactive Ovianta voice agent call
function classifyRiskLevel(score: number): "low" | "medium" | "high" {
  if (score < RISK_THRESHOLDS.low) return "low";
  if (score <= RISK_THRESHOLDS.high) return "medium";
  return "high";
}

function recommendIntervention(
  level: "low" | "medium" | "high"
): RiskScoreResult["recommendedIntervention"] {
  if (level === "low") return "standard_sms";
  if (level === "medium") return "reinforced_sms";
  return "proactive_call";
}

// --- Public interface (unchanged) ---

export function calculateRiskScore(
  patient: IPatient,
  appointment: IAppointment
): RiskScoreResult {
  const features = normalizeFeatures(patient, appointment);
  const score = aggregateScore(features);
  const level = classifyRiskLevel(score);

  const breakdown = features.map((f) => ({
    ...f,
    contribution: Math.round(f.weight * f.normalizedValue * 100 * 10) / 10,
  }));

  const topFactors = [...breakdown]
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 3)
    .map((f) => f.feature);

  return {
    score,
    level,
    breakdown,
    topFactors,
    recommendedIntervention: recommendIntervention(level),
  };
}
