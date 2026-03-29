import { cn } from "@/lib/utils";

interface RiskScoreBadgeProps {
  score: number;
  level: "low" | "medium" | "high";
  size?: "sm" | "md" | "lg";
  showScore?: boolean;
}

const levelConfig = {
  low: {
    label: "Bajo",
    classes: "bg-green-50 text-green-700 border-green-200",
    dot: "bg-green-500",
  },
  medium: {
    label: "Medio",
    classes: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  high: {
    label: "Alto",
    classes: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-500",
  },
};

const sizeClasses = {
  sm: "px-2 py-0.5 text-xs gap-1",
  md: "px-2.5 py-1 text-sm gap-1.5",
  lg: "px-3 py-1.5 text-base gap-2",
};

const dotSizes = {
  sm: "w-1.5 h-1.5",
  md: "w-2 h-2",
  lg: "w-2.5 h-2.5",
};

export function RiskScoreBadge({
  score,
  level,
  size = "md",
  showScore = true,
}: RiskScoreBadgeProps) {
  const config = levelConfig[level];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        config.classes,
        sizeClasses[size]
      )}
    >
      <span
        className={cn("rounded-full flex-shrink-0", config.dot, dotSizes[size])}
      />
      {showScore && (
        <span className="font-bold tabular-nums">{score}</span>
      )}
      <span>{config.label}</span>
    </span>
  );
}
