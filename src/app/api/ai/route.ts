import type {
  AIInterventionResponse,
  IAppointment,
  IPatient,
  RiskScoreResult,
} from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const AiRequestSchema = z.object({
  patient: z
    .object({
      _id: z.string(),
      firstName: z.string(),
      lastName: z.string(),
      primaryCondition: z.string(),
      conditionType: z.enum(["chronic", "acute"]),
      specialty: z.string(),
      preferredChannel: z.array(z.string()),
      preferredContactTime: z.array(z.string()),
      stats: z.object({
        totalAppointments: z.number(),
        noShows: z.number(),
        attendanceRate: z.number(),
      }),
    })
    .passthrough(),
  appointment: z
    .object({
      _id: z.string(),
      date: z.union([z.string(), z.date()]),
      type: z.string(),
      leadTimeDays: z.number().optional(),
      reminderResponse: z.string().nullable().optional(),
    })
    .passthrough(),
  riskScore: z
    .object({
      score: z.number().min(0).max(100),
      level: z.enum(["low", "medium", "high"]),
      topFactors: z.array(z.string()),
      recommendedIntervention: z.string(),
    })
    .passthrough(),
});

const AiResponseSchema = z.object({
  explanation: z.string(),
  nudge_type: z.enum([
    "waits_framing",
    "cost_framing",
    "clinical_relevance",
    "urgency",
    "social_proof",
  ]),
  message: z.string(),
  recommended_channel: z.enum(["sms", "whatsapp", "call"]),
  recommended_timing: z.string(),
  escalation: z.enum([
    "none",
    "waitlist_activate",
    "offer_teleconsult",
    "overbooking_slot",
  ]),
});

// DECISION: Route Handler for AI (NOT Server Action)
// Reasons:
// 1. Needs explicit request/response control (headers, error codes)
// 2. Easier to test with curl or Postman
// 3. Allows adding SSE streaming in the future without architecture changes
// 4. Server Actions are optimized for data mutations (CRUD)

const SYSTEM_PROMPT = `Eres un asistente especializado en comunicación médica para prevenir no-shows en clínicas.
Recibirás el perfil de un paciente, su próxima cita y el análisis de riesgo calculado.

TU ROL: NO predecir (el scoring ya está hecho). TU ROL: interpretar, personalizar y generar la intervención.

SIEMPRE responde en JSON válido con esta estructura exacta (sin markdown, solo JSON puro):
{
  "explanation": "Explicación del riesgo en 2-3 frases, tono empático, para el médico/staff",
  "nudge_type": "waits_framing|cost_framing|clinical_relevance|urgency|social_proof",
  "message": "Mensaje personalizado para el paciente",
  "recommended_channel": "sms|whatsapp|call",
  "recommended_timing": "Ej: '48h antes, entre 18:00-20:00'",
  "escalation": "none|waitlist_activate|offer_teleconsult|overbooking_slot"
}

REGLAS DE NUDGE según nivel de riesgo:
- BAJO (score < 15): nudge_type=waits_framing — Frase tipo "Su próxima cita disponible si cancela sería en X semanas"
- MEDIO (score 15-40): nudge_type=cost_framing o clinical_relevance — Coste del no-show + relevancia para SU condición concreta
- ALTO (score > 40): nudge_type=urgency — Guion para llamada proactiva del agente de voz

REGLAS DE CANAL:
El paciente puede tener uno o varios canales habilitados. Elige el MÁS EFECTIVO de los disponibles según el riesgo:
- ALTO riesgo: prioridad call > whatsapp > sms
- MEDIO riesgo: prioridad whatsapp > sms > call
- BAJO riesgo: prioridad sms > whatsapp > call
Solo puedes elegir un canal que aparezca en la lista de canales del paciente. Si ninguno del orden preferido está disponible, usa el primero de la lista.

Formato según canal elegido:
- SMS: MÁXIMO 160 caracteres. Directo. Sin emojis. Sin saludos largos.
- WhatsApp: Cálido, cercano. Puede usar 1-2 emojis relevantes (📅🏥). Máximo 280 chars.
- Call: Texto hablado puro, sin etiquetas ni secciones. Comienza SIEMPRE con el placeholder literal "{SALUDO}, ¿hablo con [apellido del paciente]?" — el sistema reemplazará {SALUDO} por el saludo apropiado según la hora. Continúa con el guion de forma natural, como si fuera una llamada real. Sin emojis, sin corchetes, sin comillas especiales, sin palabras meta como "introducción", "cuerpo", "cierre", "guion" o "llamada proactiva". Solo el texto que se hablaría.

ADAPTA siempre el mensaje a la condición médica específica:
- Diabetes tipo 2: mencionar control glucémico, HbA1c, complicaciones si no se controla
- Lumbalgia/Traumatología: progreso en recuperación, riesgo de recaída
- Ansiedad/Depresión/Psiquiatría: continuidad del tratamiento (tono empático, NO estigmatizante)
- Hipertensión/Cardiología: control de factores de riesgo cardiovascular
- Dermatología: riesgo de empeoramiento, nueva cita tardía

ESCALATION:
- none: riesgo bajo/medio, no requiere acción adicional
- waitlist_activate: paciente de alto riesgo, activar lista de espera por si cancela
- offer_teleconsult: ofrecer teleconsulta SOLO si: (1) la distancia es un factor significativo (>30 km) Y (2) la especialidad lo permite clínicamente. APTA: psiquiatría (seguimiento), medicina general (revisión de analíticas, renovación de receta), endocrinología (revisión de HbA1c/TSH sin ajuste complejo). NO APTA: cardiología (necesita auscultación, ECG, toma de tensión), traumatología (exploración física), dermatología (evaluación visual presencial). Para first_visit evitar teleconsulta salvo psiquiatría.
- overbooking_slot: riesgo muy alto (score > 70), reservar slot de overbooking`;

function buildPrompt(
  patient: IPatient,
  appointment: IAppointment,
  riskScore: RiskScoreResult
): string {
  const appointmentDate = new Date(appointment.date);
  const hora = appointmentDate.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const fecha = appointmentDate.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return `PERFIL DEL PACIENTE:
- Nombre: ${patient.firstName} ${patient.lastName}
- Condición: ${patient.primaryCondition} (${patient.conditionType === "chronic" ? "crónica" : "aguda"})
- Especialidad: ${patient.specialty}
- Canal preferido: ${(Array.isArray(patient.preferredChannel) ? patient.preferredChannel : [patient.preferredChannel]).join(", ")}
- Horario preferido: ${(Array.isArray(patient.preferredContactTime) ? patient.preferredContactTime : [patient.preferredContactTime]).join(", ")}
- Historial: ${patient.stats.noShows} no-shows en ${patient.stats.totalAppointments} citas (${Math.round(patient.stats.attendanceRate * 100)}% asistencia)

PRÓXIMA CITA:
- Fecha: ${fecha} a las ${hora}
- Tipo: ${appointment.type}
- Días de antelación: ${appointment.leadTimeDays}
- Respuesta al recordatorio: ${appointment.reminderResponse ?? "Sin respuesta"}

ANÁLISIS DE RIESGO:
- Score: ${riskScore.score}/100
- Nivel: ${riskScore.level === "high" ? "ALTO" : riskScore.level === "medium" ? "MEDIO" : "BAJO"}
- Intervención recomendada: ${riskScore.recommendedIntervention}
- Top 3 factores de riesgo: ${riskScore.topFactors.join(", ")}

Genera la intervención personalizada para este paciente.`;
}

export async function POST(request: NextRequest) {
  const parsed = AiRequestSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos incompletos o inválidos" },
      { status: 400 }
    );
  }

  const { patient, appointment, riskScore } = parsed.data as unknown as {
    patient: IPatient;
    appointment: IAppointment;
    riskScore: RiskScoreResult;
  };

  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === "sk-ant-") {
    // Demo mode: return simulated response if no API key
    return NextResponse.json(getDemoResponse(patient, riskScore));
  }

  try {
    // Direct Anthropic API call with fetch
    // Ref: https://docs.anthropic.com/en/api/messages
    // Required headers:
    // - x-api-key: your API key
    // - anthropic-version: API version (required on all requests)
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      signal: AbortSignal.timeout(15000),
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        // system is a top-level param, NOT a message with role 'system'
        // Ref: https://docs.anthropic.com/en/api/messages
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: buildPrompt(patient, appointment, riskScore),
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Anthropic API error:", response.status, errorData);
      return NextResponse.json(
        { error: `Error de la API: ${response.status}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const block = data.content?.[0];
    if (!block || block.type !== "text") {
      return NextResponse.json(
        { error: "Respuesta inesperada de la API" },
        { status: 502 }
      );
    }
    const text = block.text;

    // Strip possible markdown code fences before parsing
    const cleanText = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const parsed = AiResponseSchema.safeParse(JSON.parse(cleanText));
    if (!parsed.success) {
      console.error("Invalid LLM response shape:", parsed.error.issues);
      return NextResponse.json(
        { error: "Respuesta inválida del modelo" },
        { status: 502 }
      );
    }
    return NextResponse.json(parsed.data);
  } catch (err) {
    console.error("Error in /api/ai:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// Selects most effective channel from available ones based on risk level.
// Same logic as Claude's system prompt for consistency in demo mode.
function pickOptimalChannel(
  available: string[],
  level: "low" | "medium" | "high"
): "sms" | "whatsapp" | "call" {
  const priority: Record<string, ("call" | "whatsapp" | "sms")[]> = {
    high:   ["call", "whatsapp", "sms"],
    medium: ["whatsapp", "sms", "call"],
    low:    ["sms", "whatsapp", "call"],
  };
  const ordered = priority[level];
  return ordered.find((c) => available.includes(c)) ?? "sms";
}

// Demo response when no API key is configured
function getDemoResponse(
  patient: IPatient,
  riskScore: RiskScoreResult
): AIInterventionResponse {
  const isHighRisk = riskScore.level === "high";
  const isMediumRisk = riskScore.level === "medium";

  const messages: Record<string, string> = {
    high: `Hola ${patient.firstName}, le llamamos del centro médico. Tiene cita próxima y queremos confirmar que todo esté bien para asistir. ¿Podría confirmarnos su asistencia?`,
    medium: `Estimado/a ${patient.firstName}, recuerde que tiene cita médica próximamente para el control de su ${patient.primaryCondition}. Un seguimiento regular es clave para su salud. ¿Algún problema para asistir?`,
    low: `Hola ${patient.firstName}, recordatorio de su cita médica. Si no puede asistir, la próxima cita disponible sería en varias semanas. Por favor confírmenos su asistencia.`,
  };

  return {
    explanation: `El paciente ${patient.firstName} ${patient.lastName} tiene un score de riesgo de ${riskScore.score}/100 (${riskScore.level === "high" ? "ALTO" : riskScore.level === "medium" ? "MEDIO" : "BAJO"}). Los principales factores son: ${riskScore.topFactors.join(", ")}. ${isHighRisk ? "Se recomienda contacto proactivo inmediato." : isMediumRisk ? "Un recordatorio reforzado puede reducir el riesgo." : "Un recordatorio estándar es suficiente."}`,
    nudge_type: isHighRisk ? "urgency" : isMediumRisk ? "clinical_relevance" : "waits_framing",
    message: messages[riskScore.level],
    recommended_channel: pickOptimalChannel(
      Array.isArray(patient.preferredChannel) ? patient.preferredChannel : [patient.preferredChannel],
      riskScore.level
    ),
    recommended_timing: isHighRisk ? "72h antes, entre 10:00-12:00" : "48h antes, entre 18:00-20:00",
    escalation: isHighRisk ? "waitlist_activate" : "none",
  };
}
