"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RiskScoreResult } from "@/lib/types";
import { HelpCircle } from "lucide-react";

interface Props {
  riskScore: RiskScoreResult;
}

// Interpretive phrase generator for each factor using the patient's actual value
const INTERPRETATIONS: Record<string, (rawValue: string) => string> = {
  "Historial de no-shows": (v) =>
    `${v} citas — el predictor más fuerte del modelo. Un ratio alto indica patrón de abandono.`,
  "Antelación de la cita": (v) =>
    `${v} — cuanto más lejos en el tiempo, más fácil de olvidar o posponer.`,
  "Edad del paciente": (v) =>
    `${v} — los jóvenes (18-35) y mayores (>80) tienen más no-shows. El mínimo de riesgo está en 50-65 años.`,
  "Distancia al centro": (v) =>
    `${v} — más kilómetros implican más fricción para asistir (transporte, tiempo, coste).`,
  "Tipo de consulta": (v) =>
    `${v === "first_visit" ? "Primera visita" : v === "follow_up" ? "Seguimiento" : v === "urgent" ? "Urgente" : "Revisión"} — las primeras visitas tienen más riesgo; las urgentes el menor.`,
  "Especialidad médica": (v) =>
    `${v} — psiquiatría y dermatología tienen las tasas más altas de abandono; cardiología las más bajas.`,
  "Franja horaria": (v) =>
    `${v} — las citas a primera hora (8-9h) y las tardías (≥18h) tienen más no-shows.`,
  "Tipo de condición": (v) =>
    `${v === "Crónica" ? "Crónica" : "Aguda"} — los pacientes crónicos tienen rutinas médicas establecidas y menos abandono.`,
  "Respuesta al recordatorio": (v) =>
    `${v === "Sin respuesta" ? "Sin respuesta al recordatorio" : v} — confirmar explícitamente reduce el riesgo significativamente.`,
};

const LEVEL_SUMMARY: Record<
  string,
  (score: number, topFactors: string[]) => string
> = {
  low: (score, top) =>
    `Con ${score} puntos el riesgo es bajo. Los factores que más contribuyen son ${top[0] ?? "—"} y ${top[1] ?? "—"}. Un recordatorio estándar suele ser suficiente.`,
  medium: (score, top) =>
    `Con ${score} puntos el riesgo es moderado, principalmente por ${top[0] ?? "—"} y ${top[1] ?? "—"}. Se recomienda un recordatorio reforzado.`,
  high: (score, top) =>
    `Con ${score} puntos el riesgo es alto. Los factores críticos son ${top[0] ?? "—"}, ${top[1] ?? "—"} y ${top[2] ?? "—"}. Se recomienda contacto proactivo directo.`,
};

export function RiskScoreExplanationDialog({ riskScore }: Props) {
  const sorted = [...riskScore.breakdown].sort(
    (a, b) => b.contribution - a.contribution
  );
  const maxContribution = sorted[0]?.contribution ?? 1;

  const summary =
    LEVEL_SUMMARY[riskScore.level]?.(
      riskScore.score,
      riskScore.topFactors
    ) ?? "";

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs text-muted-foreground"
          />
        }
      >
        <HelpCircle className="h-3.5 w-3.5" />
        ¿Cómo se calcula?
      </DialogTrigger>

      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>¿Por qué el score es {riskScore.score}/100?</DialogTitle>
        </DialogHeader>

        {/* Summary */}
        <p className="text-sm text-muted-foreground">{summary}</p>

        {/* Factors */}
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Contribución por factor
          </p>

          {sorted.map((item) => {
            const isTop = riskScore.topFactors.includes(item.feature);
            const barWidth =
              maxContribution > 0
                ? (item.contribution / maxContribution) * 100
                : 0;
            const interpret =
              INTERPRETATIONS[item.feature]?.(String(item.rawValue)) ??
              "Variable del modelo de riesgo.";

            return (
              <div key={item.feature} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "text-sm",
                      isTop
                        ? "font-semibold text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {item.feature}
                  </span>
                  <span className="text-xs font-mono font-semibold tabular-nums text-foreground">
                    +{item.contribution.toFixed(1)} pts
                  </span>
                </div>

                {/* Bar */}
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      isTop ? "bg-primary" : "bg-muted-foreground/40"
                    )}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>

                {/* Interpretation */}
                <p className="text-xs text-muted-foreground">{interpret}</p>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <p className="text-xs text-muted-foreground border-t pt-3">
          Modelo heurístico con 9 variables ponderadas (suma = 100). En producción
          se reemplazaría por XGBoost entrenado con datos reales.
        </p>
      </DialogContent>
    </Dialog>
  );
}
