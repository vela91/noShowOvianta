export const RISK_COLORS = {
  low: "#22c55e",
  medium: "#f59e0b",
  high: "#ef4444",
} as const;

export const RISK_THRESHOLDS = { low: 15, high: 40 } as const;

export const TIMELINE_COLORS = {
  future: "#0EA5E9",
  past: "#64748b",
} as const;

export const FEATURE_DESCRIPTIONS: Record<string, string> = {
  "Historial de no-shows":
    "Ratio de no-shows en el historial del paciente. Es el predictor más fuerte.",
  "Antelación de la cita":
    "Días entre hoy y la cita. Cuanto más lejos, más fácil de olvidar.",
  "Edad del paciente":
    "Jóvenes (18-35) y muy mayores (85+) tienen más no-shows. Mínimo en 50-65 años.",
  "Distancia al centro":
    "Distancia en km al centro médico. Más distancia = más probabilidad de no ir.",
  "Tipo de consulta":
    "Primera visita tiene más riesgo que follow-up. Urgente tiene menos riesgo.",
  "Especialidad médica":
    "Psiquiatría y dermatología tienen más no-shows. Cardiología tiene menos.",
  "Franja horaria":
    "Citas muy tempranas (8-9h) o tardías (18h+) tienen más no-shows.",
  "Tipo de condición":
    "Condiciones crónicas tienen menos no-shows (rutina establecida).",
  "Respuesta al recordatorio":
    "Si el paciente confirmó el recordatorio de Ovianta, el riesgo baja significativamente.",
};
