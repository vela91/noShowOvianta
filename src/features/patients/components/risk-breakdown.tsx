"use client";

import { useMemo } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { RiskScoreBreakdownItem } from "@/lib/types";
import { FEATURE_DESCRIPTIONS } from "@/lib/risk-constants";
import { Info } from "lucide-react";

interface RiskBreakdownProps {
  breakdown: RiskScoreBreakdownItem[];
  topFactors: string[];
}

export function RiskBreakdown({ breakdown, topFactors }: RiskBreakdownProps) {
  const sorted = useMemo(
    () => [...breakdown].sort((a, b) => b.contribution - a.contribution),
    [breakdown]
  );
  const maxContribution = useMemo(
    () => Math.max(...breakdown.map((f) => f.contribution)),
    [breakdown]
  );

  return (
    <div className="space-y-3">
      {sorted
        .map((item) => {
          const isTopFactor = topFactors.includes(item.feature);
          const barWidth = maxContribution > 0 ? (item.contribution / maxContribution) * 100 : 0;

          return (
            <div key={item.feature} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  {isTopFactor ? (
                    <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-primary" />
                  ) : (
                    <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                  )}
                  <span
                    className={cn(
                      "text-sm truncate",
                      isTopFactor
                        ? "font-semibold text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {item.feature}
                  </span>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Info className="h-3 w-3 flex-shrink-0 text-muted-foreground/50 cursor-help" />
                      }
                    />
                    <TooltipContent className="max-w-56 text-xs">
                      <p>{FEATURE_DESCRIPTIONS[item.feature] || "Variable del modelo de riesgo."}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-muted-foreground">
                    {String(item.rawValue)}
                  </span>
                  <span
                    className={cn(
                      "text-xs font-mono font-semibold tabular-nums w-8 text-right",
                      isTopFactor ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {item.contribution.toFixed(1)}
                  </span>
                </div>
              </div>

              {/* Proportional bar */}
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    isTopFactor ? "bg-primary" : "bg-muted-foreground/40"
                  )}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}

      <p className="text-xs text-muted-foreground pt-2">
        · Los factores con punto azul son los 3 que más contribuyen al score
      </p>
    </div>
  );
}
