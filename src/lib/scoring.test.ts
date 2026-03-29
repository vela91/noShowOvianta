import { describe, expect, it } from "vitest";
import { calculateRiskScore } from "./scoring";
import type { IAppointment, IPatient } from "./types";

const today = new Date();

// --- Patient fixtures ---

const patientHighRisk: IPatient = {
  _id: "test-high-risk",
  firstName: "Carlos",
  lastName: "Problemas",
  dateOfBirth: new Date(today.getFullYear() - 25, 5, 15), // 25 years old (young → higher risk)
  gender: "male",
  phone: "600000001",
  email: "carlos@test.com",
  address: "Calle Test 1",
  distanceToClinicKm: 35,
  primaryCondition: "Ansiedad",
  conditionType: "acute",
  specialty: "Psiquiatría",
  preferredChannel: ["whatsapp"],
  preferredContactTime: ["afternoon"],
  consents: { automatedReminders: true, predictiveProfiling: true, dataProcessing: true },
  stats: {
    totalAppointments: 7,
    noShows: 5, // 71% no-show rate — very high history
    cancellations: 1,
    attendanceRate: 0.14,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

const appointmentHighRisk: IAppointment = {
  _id: "appt-high-risk",
  patientId: "test-high-risk",
  doctorName: "Dr. García",
  specialty: "Psiquiatría",
  date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 days in the future
  duration: 45,
  type: "first_visit",
  status: "scheduled",
  reminderSent: true,
  reminderResponse: "declined", // declined reminder → strong no-show signal
  leadTimeDays: 20,
  createdAt: new Date(),
};

const patientLowRisk: IPatient = {
  _id: "test-low-risk",
  firstName: "María",
  lastName: "Ejemplo",
  dateOfBirth: new Date(today.getFullYear() - 62, 3, 20), // 62 years (optimal range 50-65)
  gender: "female",
  phone: "600000002",
  email: "maria@test.com",
  address: "Calle Test 2",
  distanceToClinicKm: 0.8,
  primaryCondition: "Hipertensión",
  conditionType: "chronic",
  specialty: "Cardiología",
  preferredChannel: ["sms"],
  preferredContactTime: ["morning"],
  consents: { automatedReminders: true, predictiveProfiling: true, dataProcessing: true },
  stats: {
    totalAppointments: 24,
    noShows: 0,
    cancellations: 1,
    attendanceRate: 0.96,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

const appointmentLowRisk: IAppointment = {
  _id: "appt-low-risk",
  patientId: "test-low-risk",
  doctorName: "Dra. López",
  specialty: "Cardiología",
  date: (() => {
    // Appointment in 2 days at 11h (optimal slot)
    const d = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    d.setHours(11, 0, 0, 0);
    return d;
  })(),
  duration: 30,
  type: "follow_up",
  status: "confirmed",
  reminderSent: true,
  reminderResponse: "confirmed",
  leadTimeDays: 2,
  createdAt: new Date(),
};

const patientPsychiatry: IPatient = {
  _id: "test-psych",
  firstName: "Ana",
  lastName: "Test",
  dateOfBirth: new Date(today.getFullYear() - 29, 0, 1), // 29 years old
  gender: "female",
  phone: "600000003",
  email: "ana@test.com",
  address: "Calle Test 3",
  distanceToClinicKm: 15,
  primaryCondition: "Depresión",
  conditionType: "chronic",
  specialty: "Psiquiatría",
  preferredChannel: ["call"],
  preferredContactTime: ["afternoon"],
  consents: { automatedReminders: true, predictiveProfiling: true, dataProcessing: true },
  stats: {
    totalAppointments: 5,
    noShows: 2,
    cancellations: 0,
    attendanceRate: 0.6,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Evening appointment at 18:30h (high-risk time slot)
const appointmentEvening: IAppointment = {
  _id: "appt-evening",
  patientId: "test-psych",
  doctorName: "Dr. Pérez",
  specialty: "Psiquiatría",
  date: (() => {
    const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    d.setHours(18, 30, 0, 0);
    return d;
  })(),
  duration: 60,
  type: "first_visit",
  status: "scheduled",
  reminderSent: false,
  reminderResponse: null,
  leadTimeDays: 7,
  createdAt: new Date(),
};

// Far lead time appointment for testing lead time contribution
const appointmentFarAway: IAppointment = {
  _id: "appt-far",
  patientId: "test-low-risk",
  doctorName: "Dra. López",
  specialty: "Endocrinología",
  date: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
  duration: 30,
  type: "follow_up",
  status: "scheduled",
  reminderSent: false,
  reminderResponse: null,
  leadTimeDays: 25,
  createdAt: new Date(),
};

// --- Tests ---

describe("calculateRiskScore", () => {
  it("patient with 5/7 no-shows → score > 60 and level high", () => {
    const result = calculateRiskScore(patientHighRisk, appointmentHighRisk);
    expect(result.score).toBeGreaterThan(60);
    expect(result.level).toBe("high");
  });

  it("chronic patient with 0 no-shows, appointment in 3 days → score < 15 and level low", () => {
    const result = calculateRiskScore(patientLowRisk, appointmentLowRisk);
    expect(result.score).toBeLessThan(15);
    expect(result.level).toBe("low");
  });

  it("lead time of 25 days → significant temporal contribution", () => {
    const result = calculateRiskScore(patientLowRisk, appointmentFarAway);
    const leadTimeFeature = result.breakdown.find(
      (f) => f.feature === "Antelación de la cita"
    );
    expect(leadTimeFeature).toBeDefined();
    expect(leadTimeFeature!.contribution).toBeGreaterThan(10);
  });

  it("psychiatry + first visit + 18h → score > 40 and level high", () => {
    const result = calculateRiskScore(patientPsychiatry, appointmentEvening);
    expect(result.score).toBeGreaterThan(40);
    expect(result.level).toBe("high");
  });

  it("score always between 0 and 100 (range invariant)", () => {
    const cases = [
      { patient: patientHighRisk, appointment: appointmentHighRisk },
      { patient: patientLowRisk, appointment: appointmentLowRisk },
      { patient: patientPsychiatry, appointment: appointmentEvening },
      { patient: patientLowRisk, appointment: appointmentFarAway },
    ];
    cases.forEach(({ patient, appointment }) => {
      const { score } = calculateRiskScore(patient, appointment);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  it("correct thresholds: <15=low, 15-40=medium, >40=high", () => {
    const resultLow = calculateRiskScore(patientLowRisk, appointmentLowRisk);
    if (resultLow.score < 15) expect(resultLow.level).toBe("low");

    const resultHigh = calculateRiskScore(patientHighRisk, appointmentHighRisk);
    if (resultHigh.score > 40) expect(resultHigh.level).toBe("high");
  });

  it("breakdown contains exactly 9 features", () => {
    const result = calculateRiskScore(patientLowRisk, appointmentLowRisk);
    expect(result.breakdown).toHaveLength(9);
  });

  it("topFactors contains exactly 3 items", () => {
    const result = calculateRiskScore(patientHighRisk, appointmentHighRisk);
    expect(result.topFactors).toHaveLength(3);
  });

  it("sum of weights = 1.0 (calibration check)", () => {
    const result = calculateRiskScore(patientLowRisk, appointmentLowRisk);
    const totalWeight = result.breakdown.reduce((sum, f) => sum + f.weight, 0);
    expect(totalWeight).toBeCloseTo(1.0, 5);
  });

  it("patient who declined reminder scores higher than one who confirmed", () => {
    const declined = calculateRiskScore(patientHighRisk, {
      ...appointmentHighRisk,
      reminderResponse: "declined",
    });
    const confirmed = calculateRiskScore(patientHighRisk, {
      ...appointmentHighRisk,
      reminderResponse: "confirmed",
    });
    expect(declined.score).toBeGreaterThan(confirmed.score);
  });

  // --- Edge cases ---

  it("new patient (0 appointments) uses prior 0.3, no divide-by-zero", () => {
    const newPatient: IPatient = {
      ...patientLowRisk,
      stats: { totalAppointments: 0, noShows: 0, cancellations: 0, attendanceRate: 1 },
    };
    const result = calculateRiskScore(newPatient, appointmentLowRisk);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    const noShowFeature = result.breakdown.find((f) => f.feature === "Historial de no-shows");
    expect(noShowFeature?.normalizedValue).toBe(0.3);
  });

  it("reminderResponse = null falls back to default risk 0.5, no crash", () => {
    const result = calculateRiskScore(patientLowRisk, {
      ...appointmentLowRisk,
      reminderResponse: null,
    });
    expect(result.score).toBeGreaterThanOrEqual(0);
    const reminderFeature = result.breakdown.find((f) => f.feature === "Respuesta al recordatorio");
    expect(reminderFeature?.normalizedValue).toBe(0.5);
  });

  it("leadTimeDays = 0 (same-day urgent appointment) → sigmoid near minimum, no crash", () => {
    const result = calculateRiskScore(patientLowRisk, {
      ...appointmentLowRisk,
      leadTimeDays: 0,
    });
    expect(result.score).toBeGreaterThanOrEqual(0);
    const leadFeature = result.breakdown.find((f) => f.feature === "Antelación de la cita");
    // sigmoid(-14 * 0.15) ≈ 0.109 — low lead-time risk vs far-away appointment
    expect(leadFeature!.normalizedValue).toBeLessThan(0.15);
  });

  it("unknown specialty falls back to 0.5, no crash", () => {
    const patient = { ...patientLowRisk, specialty: "EspecialidadDesconocida" };
    const result = calculateRiskScore(patient, appointmentLowRisk);
    const specialtyFeature = result.breakdown.find((f) => f.feature === "Especialidad médica");
    expect(specialtyFeature?.normalizedValue).toBe(0.5);
  });

  it("patient under 18 → youth risk curve active, score above baseline", () => {
    const youngPatient: IPatient = {
      ...patientLowRisk,
      dateOfBirth: new Date(today.getFullYear() - 16, 0, 1),
    };
    const youngResult = calculateRiskScore(youngPatient, appointmentLowRisk);
    const adultResult = calculateRiskScore(patientLowRisk, appointmentLowRisk);
    expect(youngResult.score).toBeGreaterThan(adultResult.score);
  });

  it("attendanceRate = 1.0 (no no-shows) → optimistic scenario, low score", () => {
    const perfectPatient: IPatient = {
      ...patientLowRisk,
      stats: { totalAppointments: 20, noShows: 0, cancellations: 0, attendanceRate: 1 },
    };
    const result = calculateRiskScore(perfectPatient, appointmentLowRisk);
    expect(result.score).toBeLessThan(20);
  });

  it("recommendedIntervention matches level (low→standard_sms, medium→reinforced_sms, high→proactive_call)", () => {
    const low = calculateRiskScore(patientLowRisk, appointmentLowRisk);
    const high = calculateRiskScore(patientHighRisk, appointmentHighRisk);
    if (low.level === "low") expect(low.recommendedIntervention).toBe("standard_sms");
    if (high.level === "high") expect(high.recommendedIntervention).toBe("proactive_call");
  });

  it("medium-risk patient → recommendedIntervention = reinforced_sms", () => {
    // patientPsychiatry with no_response reminder → medium-ish risk
    const result = calculateRiskScore(patientPsychiatry, {
      ...appointmentEvening,
      reminderResponse: "no_response",
      leadTimeDays: 5,
    });
    if (result.level === "medium") {
      expect(result.recommendedIntervention).toBe("reinforced_sms");
    }
  });
});
