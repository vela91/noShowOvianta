// TypeScript domain interfaces — type contracts for the entire app

export interface IPatient {
  _id: string;
  firstName: string;
  lastName: string;
  // DESIGN DECISION: dateOfBirth instead of age
  // Reason: age is a DERIVED value that changes over time.
  // Storing age=35 becomes incorrect the following year.
  // dateOfBirth is the immutable source datum. Age is calculated dynamically with calculateAge().
  dateOfBirth: Date | string;
  gender: "male" | "female" | "other";
  phone: string;
  email: string;
  address: string;
  distanceToClinicKm: number;

  primaryCondition: string;
  conditionType: "chronic" | "acute";
  specialty: string;

  preferredChannel: ("sms" | "whatsapp" | "call" | "email")[];
  preferredContactTime: ("morning" | "afternoon" | "evening")[];

  consents: {
    automatedReminders: boolean;
    predictiveProfiling: boolean;
    dataProcessing: boolean;
  };

  // Stats pre-calculated from appointment history.
  // Persisted in DB to avoid on-the-fly aggregation on every query.
  stats: {
    totalAppointments: number;
    noShows: number;
    cancellations: number;
    attendanceRate: number; // (total - noShows - cancellations) / total
  };

  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface IAppointment {
  _id: string;
  patientId: string; // ref → Patient
  doctorName: string;
  specialty: string;
  date: Date | string;
  duration: number; // minutes
  type: "first_visit" | "follow_up" | "urgent" | "routine_check";
  status: "scheduled" | "confirmed" | "attended" | "no_show" | "cancelled";
  reminderSent: boolean;
  reminderResponse: "confirmed" | "no_response" | "declined" | null;
  riskScore?: number;
  riskLevel?: "low" | "medium" | "high";
  leadTimeDays?: number;
  createdAt: Date | string;
}

export interface RiskScoreBreakdownItem {
  feature: string;
  weight: number;
  rawValue: number | string;
  normalizedValue: number; // 0-1
  contribution: number; // weight × normalizedValue × 100
}

export interface RiskScoreResult {
  score: number; // 0-100
  level: "low" | "medium" | "high"; // <15 low, 15-40 medium, >40 high
  breakdown: RiskScoreBreakdownItem[];
  topFactors: string[]; // Top 3 highest-contribution features (for UI display)
  recommendedIntervention:
    | "standard_sms"
    | "reinforced_sms"
    | "proactive_call";
}

export interface AIInterventionResponse {
  explanation: string; // Explanation for staff/doctor
  nudge_type:
    | "waits_framing"
    | "cost_framing"
    | "clinical_relevance"
    | "urgency"
    | "social_proof";
  message: string; // Personalized message for the patient
  recommended_channel: "sms" | "whatsapp" | "call";
  recommended_timing: string; // e.g. "48h antes, a las 20:00"
  escalation:
    | "none"
    | "waitlist_activate"
    | "offer_teleconsult"
    | "overbooking_slot";
}

// Patient with computed risk score (used in table and detail views)
export interface PatientWithScore extends IPatient {
  nextAppointment?: IAppointment;
  riskScore?: RiskScoreResult;
}

// Filters for the patients table
export interface PatientFilters {
  riskLevel?: "low" | "medium" | "high" | "all";
  specialty?: string;
  search?: string;
}
