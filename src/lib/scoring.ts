import type { IAppointment, IPatient, RiskScoreResult } from "@/lib/types";
import { calculateAge } from "@/lib/utils";

// No-show risk scoring engine
//
// PRINCIPLE: PURE and DETERMINISTIC function. No side effects. No DB calls.
// Receives data → returns score 0-100 with full breakdown.
//
// In production: replace with XGBoost trained on real data via ONNX/FastAPI.
// Current weights serve as a baseline calibrated against no-show scientific literature.
// The architecture allows replacement without changing the interface.

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
  first_visit: 0.7, // No established doctor relationship → higher chance of skipping
  follow_up: 0.3, // Continuity, patient knows the doctor → more committed
  urgent: 0.1, // Urgent means high motivation to attend
  routine_check: 0.5, // Routine check = lower perceived urgency
};

// Risk map by reminder response
const REMINDER_RISK: Record<string, number> = {
  confirmed: 0.1, // Explicitly confirmed → very likely to attend
  no_response: 0.6, // No response → signal of disinterest or forgetfulness
  declined: 0.9, // Explicitly declined → almost certain no-show
};

// --- Main function ---

export function calculateRiskScore(
  patient: IPatient,
  appointment: IAppointment
): RiskScoreResult {
  const age = calculateAge(patient.dateOfBirth);
  const features: {
    feature: string;
    weight: number;
    rawValue: number | string;
    normalizedValue: number;
  }[] = [];

  // 1. Historical no-show ratio (weight 0.30 — strongest predictor)
  // Justification: best predictor of future behaviour is past behaviour.
  // Prior of 0.3 for patients with no history (moderate uncertainty).
  const noShowRatio =
    patient.stats.totalAppointments > 0
      ? patient.stats.noShows / patient.stats.totalAppointments
      : 0.3;
  features.push({
    feature: "Historial de no-shows",
    weight: 0.3,
    rawValue: `${patient.stats.noShows}/${patient.stats.totalAppointments}`,
    normalizedValue: noShowRatio,
  });

  // 2. Lead time — days until appointment (weight 0.20)
  // Sigmoid transform: rises smoothly beyond 14 days.
  // Logic: near appointment = more salient; distant appointment = easier to forget.
  const leadTime = appointment.leadTimeDays ?? 7;
  const leadTimeNorm = 1 / (1 + Math.exp(-0.15 * (leadTime - 14)));
  features.push({
    feature: "Antelación de la cita",
    weight: 0.2,
    rawValue: `${leadTime} días`,
    normalizedValue: leadTimeNorm,
  });

  // 3. Age (weight 0.10) — inverted-U curve (see ageToRisk)
  const ageNorm = ageToRisk(age);
  features.push({
    feature: "Edad del paciente",
    weight: 0.1,
    rawValue: `${age} años`,
    normalizedValue: ageNorm,
  });

  // 4. Distance to clinic (weight 0.10)
  // Logarithmic transform: saturates around 50km.
  // Difference between 1km and 5km is large; between 60km and 80km is marginal.
  const distNorm = Math.min(
    1,
    Math.log(1 + patient.distanceToClinicKm) / Math.log(50)
  );
  features.push({
    feature: "Distancia al centro",
    weight: 0.1,
    rawValue: `${patient.distanceToClinicKm} km`,
    normalizedValue: distNorm,
  });

  // 5. Appointment type (weight 0.08)
  const typeNorm = TYPE_RISK[appointment.type] ?? 0.5;
  features.push({
    feature: "Tipo de consulta",
    weight: 0.08,
    rawValue: appointment.type,
    normalizedValue: typeNorm,
  });

  // 6. Specialty (weight 0.07)
  // Normalize: remove diacritics and lowercase for robust matching.
  const specialtyKey = patient.specialty
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const specialtyNorm = SPECIALTY_RISK[specialtyKey] ?? 0.5;
  features.push({
    feature: "Especialidad médica",
    weight: 0.07,
    rawValue: patient.specialty,
    normalizedValue: specialtyNorm,
  });

  // 7. Time slot (weight 0.05) — quadratic: worst at day extremes (see timeToRisk)
  const hour = new Date(appointment.date).getHours();
  const timeNorm = timeToRisk(hour);
  features.push({
    feature: "Franja horaria",
    weight: 0.05,
    rawValue: `${String(hour).padStart(2, "0")}:00h`,
    normalizedValue: timeNorm,
  });

  // 8. Condition type: chronic vs acute (weight 0.05)
  // Chronic: established medical routine → lower risk.
  // Acute: one-off episode, less attendance habit → higher risk.
  const conditionNorm = patient.conditionType === "chronic" ? 0.2 : 0.7;
  features.push({
    feature: "Tipo de condición",
    weight: 0.05,
    rawValue: patient.conditionType === "chronic" ? "Crónica" : "Aguda",
    normalizedValue: conditionNorm,
  });

  // 9. Reminder response (weight 0.05)
  // Most valuable short-term signal: confirms or denies intent to attend.
  const reminderKey = appointment.reminderResponse ?? "null";
  const reminderNorm = REMINDER_RISK[reminderKey] ?? 0.5;
  features.push({
    feature: "Respuesta al recordatorio",
    weight: 0.05,
    rawValue: appointment.reminderResponse ?? "Sin respuesta",
    normalizedValue: reminderNorm,
  });

  // Final score = Σ(weight × normalizedValue) × 100
  // Clamped to [0, 100] to guarantee the range invariant.
  const rawScore = features.reduce(
    (sum, f) => sum + f.weight * f.normalizedValue,
    0
  );
  const score = Math.round(Math.min(100, Math.max(0, rawScore * 100)));

  // Breakdown with individual contribution per feature
  const breakdown = features.map((f) => ({
    ...f,
    contribution: Math.round(f.weight * f.normalizedValue * 100 * 10) / 10,
  }));

  // Top 3 factors — sorted by contribution descending.
  // Shown in UI so doctors understand what drives the risk.
  const topFactors = [...breakdown]
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 3)
    .map((f) => f.feature);

  // Risk thresholds
  // low <15: standard intervention, no urgency
  // medium 15-40: reinforcement needed
  // high >40: proactive Ovianta voice agent call
  const level = score < 15 ? "low" : score <= 40 ? "medium" : "high";

  const recommendedIntervention =
    level === "low"
      ? "standard_sms"
      : level === "medium"
        ? "reinforced_sms"
        : "proactive_call";

  return { score, level, breakdown, topFactors, recommendedIntervention };
}
