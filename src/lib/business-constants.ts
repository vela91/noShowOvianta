export const PRICE_PER_APPOINTMENT = 65;          // EUR, coste por cita recuperada
// Tasas conservadoras basadas en evidencia clínica publicada
export const SMS_STANDARD_SUCCESS_RATE = 0.09;   //  9% — Kaiser Permanente RCT (The Permanente Journal, 2022): RR 0.91 con SMS dirigido a alto riesgo
export const SMS_REINFORCED_SUCCESS_RATE = 0.25; // 25% — Behavioural Insights Team / NHS Barts Health (2016): cost framing SMS
export const AI_CALL_SUCCESS_RATE = 0.35;         // 35% — Estimación conservadora: MetroHealth RCT (PMC, 2023) ~9% relativo; Robert Wood Johnson llamada humana ~41%
export const CLINIC_HOURS = { start: 8, end: 18 } as const;
export const HISTORY_DISPLAY_LIMIT = 10;
export const ATTENDANCE_THRESHOLDS = { good: 0.85, fair: 0.7 } as const;
