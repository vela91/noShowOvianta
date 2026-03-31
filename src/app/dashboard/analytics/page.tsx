import { getAnalyticsStats } from "@/features/analytics/queries";
import dynamic from "next/dynamic";

const NoShowAreaChart = dynamic(
  () => import("@/features/analytics/components/charts").then((m) => m.NoShowAreaChart),
  { loading: () => <div className="h-52 w-full animate-pulse rounded-lg bg-muted" /> }
);
const RiskDonutChart = dynamic(
  () => import("@/features/analytics/components/charts").then((m) => m.RiskDonutChart),
  { loading: () => <div className="h-40 w-full animate-pulse rounded-lg bg-muted" /> }
);
import { StrategyImpactCards } from "@/features/analytics/components/strategy-impact-cards";
import { TooltipInfo } from "@/features/analytics/components/tooltip-info";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cacheLife } from "next/cache";
import {
  Activity,
  BarChart3,
  Euro,
  TrendingDown,
  Users,
} from "lucide-react";
import { Suspense } from "react";

export const metadata = {
  title: "Analytics — Ovianta NoShow Shield",
};

// "use cache" — Cache Components from Next.js 16
// Ref: https://nextjs.org/blog/next-16#cache-components
// Analytics change rarely — cache for hours to avoid recalculating on every request.
async function getStats() {
  "use cache";
  cacheLife("hours");
  return getAnalyticsStats();
}

// DECISION: AnalyticsContent in Suspense
// Even though getStats() uses "use cache" (no connection()), Next.js 16 still requires
// Suspense for any async component that accesses external data,
// to avoid blocking the full layout render.
async function AnalyticsContent() {
  let stats = {
    totalPatients: 0,
    upcomingAppointments: 0,
    noShowRate: 0,
    riskDistribution: { low: 0, medium: 0, high: 0, noAppointment: 0 },
    bySpecialty: [] as { specialty: string; count: number; avgNoShowRate: number }[],
    monthlyStats: [] as { month: string; noShowRate: number }[],
    interventionImpact: {
      smsStandard:   { targetPatients: 0, estimatedRecovered: 0, estimatedSavings: 0 },
      smsReinforced: { targetPatients: 0, estimatedRecovered: 0, estimatedSavings: 0 },
      aiCall:        { targetPatients: 0, estimatedRecovered: 0, estimatedSavings: 0 },
      total:         { estimatedRecovered: 0, estimatedSavings: 0 },
    },
  };

  if (process.env.MONGODB_URI) {
    stats = await getStats();
  }

  const highRiskCount = stats.riskDistribution.high;
  const estimatedRecovered = stats.interventionImpact.total.estimatedRecovered;
  const economicImpact = stats.interventionImpact.total.estimatedSavings;
  const noShowRatePct = Math.round(stats.noShowRate * 100);
  const monthlyStats = stats.monthlyStats;

  const totalWithAppt =
    stats.riskDistribution.low +
    stats.riskDistribution.medium +
    stats.riskDistribution.high;

  const distributionData = [
    { name: "Bajo", value: stats.riskDistribution.low },
    { name: "Medio", value: stats.riskDistribution.medium },
    { name: "Alto", value: stats.riskDistribution.high },
  ];

  const kpis = [
    {
      title: "Tasa de no-show",
      value: `${noShowRatePct}%`,
      description: "Global histórico",
      tooltip: "Citas con estado no-show ÷ total de citas históricas registradas en el sistema.",
      icon: TrendingDown,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      title: "Citas recuperadas",
      value: estimatedRecovered,
      description: "Estimado este mes",
      tooltip: "Estimación: pacientes por nivel de riesgo × tasa de éxito de cada estrategia (9% · 25% · 35%).",
      icon: Activity,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "Impacto económico",
      value: `€${economicImpact.toLocaleString("es-ES")}`,
      description: "Estimado con tasas por estrategia",
      tooltip: "Citas recuperadas estimadas × €65 por cita (coste medio documentado, Hospital Costa del Sol, 2015).",
      icon: Euro,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: "Pacientes alto riesgo",
      value: highRiskCount,
      description: "Con próxima cita",
      tooltip: "Pacientes con score > 40 en el motor de riesgo que tienen una próxima cita programada.",
      icon: Users,
      color: "text-red-600",
      bg: "bg-red-50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Subtitle with real data */}
      <p className="text-sm text-muted-foreground -mt-2">
        {stats.totalPatients.toLocaleString("es-ES")} pacientes ·{" "}
        {stats.upcomingAppointments.toLocaleString("es-ES")} citas próximas
      </p>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-1.5">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {kpi.title}
                </CardTitle>
                <TooltipInfo text={kpi.tooltip} />
              </div>
              <div className={`rounded-lg p-1.5 ${kpi.bg}`}>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tabular-nums text-foreground">
                {kpi.value}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {kpi.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center gap-2 pb-3">
            <BarChart3 className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">
              Tasa de no-show — últimos 6 meses
            </CardTitle>
            <TooltipInfo text="Tasa mensual de no-show calculada sobre citas completadas (asistidas + no-show) en los últimos 6 meses." />
          </CardHeader>
          <CardContent>
            <NoShowAreaChart data={monthlyStats} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-3">
            <Activity className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Distribución de riesgo</CardTitle>
            <TooltipInfo text="Clasificación de pacientes con próxima cita según el motor de scoring de 9 factores ponderados." />
          </CardHeader>
          {/* Risk distribution uses real upcoming-appointment data */}
          <CardContent>
            <RiskDonutChart
              distributionData={distributionData}
              totalPatients={totalWithAppt}
            />
          </CardContent>
        </Card>
      </div>

      {/* Strategy Impact Section */}
      <StrategyImpactCards impact={stats.interventionImpact} />
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="lg:col-span-2 h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
      <Skeleton className="h-5 w-56 rounded" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="-ml-1" />
          <div>
            <h1 className="text-xl font-semibold text-foreground">Analytics</h1>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <Suspense fallback={<AnalyticsSkeleton />}>
          <AnalyticsContent />
        </Suspense>
      </div>
    </div>
  );
}
