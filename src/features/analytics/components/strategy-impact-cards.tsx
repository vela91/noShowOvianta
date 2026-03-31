"use client";

import { Info, MessageSquare, Phone, TrendingUp, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AnalyticsStats } from "@/features/analytics/queries";

interface StrategyImpactCardsProps {
  impact: AnalyticsStats["interventionImpact"];
}

const strategies = [
  {
    key: "smsStandard" as const,
    title: "Nudge SMS",
    subtitle: "Waits framing — bajo riesgo",
    rate: "9% éxito est.",
    source: "Kaiser Permanente RCT (The Permanente Journal, 2022): SMS dirigido a pacientes de alto riesgo logró RR 0.91 — reducción del 9% en no-shows.",
    icon: MessageSquare,
    cardClass: "border-green-200 bg-green-50/30 dark:bg-green-950/10",
    badgeClass: "bg-green-100 text-green-700 hover:bg-green-100",
    iconClass: "text-green-600",
    iconBg: "bg-green-100",
  },
  {
    key: "smsReinforced" as const,
    title: "Nudge Reforzado",
    subtitle: "Cost / clinical framing — riesgo medio",
    rate: "25% éxito est.",
    source: "Behavioural Insights Team — NHS Barts Health (2016): SMS con coste de la cita (£160) redujo no-shows un 25% en ensayo controlado.",
    icon: Zap,
    cardClass: "border-amber-200 bg-amber-50/30 dark:bg-amber-950/10",
    badgeClass: "bg-amber-100 text-amber-700 hover:bg-amber-100",
    iconClass: "text-amber-600",
    iconBg: "bg-amber-100",
  },
  {
    key: "aiCall" as const,
    title: "Llamada IA",
    subtitle: "4 técnicas conductuales — alto riesgo",
    rate: "35% éxito est.",
    source: "Estimación conservadora. MetroHealth RCT (PMC, 2023): llamadas a pacientes de riesgo ≥15% redujeron no-shows del 36,2% al 32,8%. Robert Wood Johnson: recordatorio telefónico humano redujo no-shows del 23,1% al 13,6% (~41%).",
    icon: Phone,
    cardClass: "border-primary ring-1 ring-primary/20 bg-primary/5",
    badgeClass: "bg-primary/10 text-primary hover:bg-primary/10",
    iconClass: "text-primary",
    iconBg: "bg-primary/10",
    note: "Urgency · waits · cost · clinical framing",
  },
] as const;

export function StrategyImpactCards({ impact }: StrategyImpactCardsProps) {
  return (
    <TooltipProvider>
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Impacto de nuestras estrategias
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Reducción estimada de no-shows por tipo de intervención
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {strategies.map((s) => {
            const stat = impact[s.key];
            return (
              <Card key={s.key} className={s.cardClass}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className={`rounded-lg p-1.5 ${s.iconBg} shrink-0`}>
                      <s.icon className={`h-4 w-4 ${s.iconClass}`} />
                    </div>
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge className={`text-[10px] font-medium px-1.5 py-0 cursor-help gap-1 ${s.badgeClass}`}>
                          {s.rate}
                          <Info className="h-2.5 w-2.5" />
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-64 text-xs leading-relaxed">
                        {s.source}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <CardTitle className="text-sm font-semibold mt-2">{s.title}</CardTitle>
                  <p className="text-xs text-muted-foreground">{s.subtitle}</p>
                </CardHeader>
                <CardContent className="space-y-1.5 pt-0">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Pacientes objetivo</span>
                    <span className="font-medium tabular-nums">{stat.targetPatients}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Citas recuperadas</span>
                    <span className="font-semibold tabular-nums text-foreground">
                      ~{stat.estimatedRecovered}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Ahorro estimado</span>
                    <span className="font-bold tabular-nums text-foreground">
                      €{stat.estimatedSavings.toLocaleString("es-ES")}
                    </span>
                  </div>
                  {"note" in s && s.note && (
                    <p className="text-[10px] text-muted-foreground pt-1 border-t border-primary/10">
                      {s.note}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {/* Total card */}
          <Card className="bg-muted/40 border-border">
            <CardHeader className="pb-2">
              <div className="rounded-lg p-1.5 bg-muted shrink-0 w-fit">
                <TrendingUp className="h-4 w-4 text-foreground" />
              </div>
              <CardTitle className="text-sm font-semibold mt-2">Impacto total</CardTitle>
              <p className="text-xs text-muted-foreground">Todas las estrategias</p>
            </CardHeader>
            <CardContent className="space-y-1.5 pt-0">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Citas recuperadas</span>
                <span className="font-semibold tabular-nums text-foreground">
                  ~{impact.total.estimatedRecovered}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground font-medium">Ahorro total</span>
                <span className="font-bold tabular-nums text-foreground">
                  €{impact.total.estimatedSavings.toLocaleString("es-ES")}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </TooltipProvider>
  );
}
