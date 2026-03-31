import { getAppointmentsForDay } from "@/features/agenda/queries";
import { AgendaNav } from "@/features/agenda/components/agenda-nav";
import { RiskScoreBadge } from "@/features/patients/components/risk-score-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { formatDate } from "@/lib/utils";
import { AlertCircle, Calendar, CheckCircle, Clock } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import {
  APPOINTMENT_STATUS_CONFIG,
  APPOINTMENT_TYPE_LABELS,
} from "@/lib/appointment-config";
import { CLINIC_HOURS } from "@/lib/business-constants";

export const metadata = {
  title: "Agenda — Ovianta NoShow Shield",
};

function getHourSlots() {
  return Array.from(
    { length: CLINIC_HOURS.end - CLINIC_HOURS.start + 1 },
    (_, i) => i + CLINIC_HOURS.start
  );
}

function parseSelectedDate(dateParam?: string): Date {
  if (!dateParam) return new Date();
  const parsed = new Date(dateParam + "T12:00:00");
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

// DECISION: AgendaContent is async inside Suspense — the searchParams await
// happens at request-time, avoiding Next.js 16 blocking-route error.
// Ref: https://nextjs.org/docs/messages/blocking-route
async function AgendaContent({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const selectedDate = parseSelectedDate(dateParam);

  let appointments: Awaited<ReturnType<typeof getAppointmentsForDay>> = [];
  if (process.env.MONGODB_URI) {
    appointments = await getAppointmentsForDay(selectedDate);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selectedDay = new Date(selectedDate);
  selectedDay.setHours(0, 0, 0, 0);
  const isPastDay = selectedDay < today;

  const totalDay = appointments.length;
  const highRisk = appointments.filter((a) => a.riskLevelComputed === "high").length;
  const noShows = isPastDay ? appointments.filter((a) => a.status === "no_show").length : 0;
  const confirmed = !isPastDay ? appointments.filter((a) => a.status === "confirmed").length : 0;
  const attended = isPastDay ? appointments.filter((a) => a.status === "attended").length : 0;

  const slotMap = new Map<number, typeof appointments>();
  getHourSlots().forEach((h) => slotMap.set(h, []));
  appointments.forEach((appt) => {
    const h = new Date(appt.date).getUTCHours();
    if (slotMap.has(h)) slotMap.get(h)!.push(appt);
  });

  const slotBg = (appt: (typeof appointments)[number]) => {
    if (isPastDay) {
      return APPOINTMENT_STATUS_CONFIG[appt.status]?.classes ?? "bg-muted/20 border-transparent";
    }
    return {
      low: "bg-green-50 border-green-200",
      medium: "bg-amber-50 border-amber-200",
      high: "bg-red-50 border-red-200",
    }[appt.riskLevelComputed] ?? "bg-muted/20 border-transparent";
  };

  return (
    <>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Citas {isPastDay ? "ese día" : "hoy"}
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums text-foreground">{totalDay}</p>
          </CardContent>
        </Card>

        {isPastDay ? (
          <>
            <Card className={noShows > 0 ? "border-red-200 bg-red-50/30" : ""}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  No-shows
                </CardTitle>
                <AlertCircle className={`h-4 w-4 ${noShows > 0 ? "text-red-500" : "text-muted-foreground"}`} />
              </CardHeader>
              <CardContent>
                <p className={`text-3xl font-bold tabular-nums ${noShows > 0 ? "text-red-600" : "text-foreground"}`}>
                  {noShows}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Asistieron
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold tabular-nums text-foreground">{attended}</p>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card className={highRisk > 0 ? "border-red-200 bg-red-50/30" : ""}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Alto riesgo
                </CardTitle>
                <AlertCircle className={`h-4 w-4 ${highRisk > 0 ? "text-red-500" : "text-muted-foreground"}`} />
              </CardHeader>
              <CardContent>
                <p className={`text-3xl font-bold tabular-nums ${highRisk > 0 ? "text-red-600" : "text-foreground"}`}>
                  {highRisk}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Confirmadas
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold tabular-nums text-foreground">{confirmed}</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Heatmap / Day summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {isPastDay ? "Resumen del día" : "Heatmap de riesgo"} — {formatDate(selectedDate)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {totalDay === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <Clock className="h-8 w-8 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground text-sm">
                No hay citas {isPastDay ? "registradas" : "programadas"} para este día
              </p>
              {!isPastDay ? (
                <p className="text-xs text-muted-foreground mt-1">
                  Ejecuta{" "}
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">npm run seed</code>{" "}
                  para generar datos de prueba
                </p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-1.5">
              {getHourSlots().map((hour) => {
                const slotAppts = slotMap.get(hour) || [];
                const hourLabel = `${String(hour).padStart(2, "0")}:00`;
                return (
                  <div key={hour} className="flex items-start gap-3">
                    <span className="w-12 text-xs text-muted-foreground pt-2 flex-shrink-0 tabular-nums">
                      {hourLabel}
                    </span>
                    <div className="flex-1 flex flex-wrap gap-2">
                      {slotAppts.length === 0 ? (
                        <div className="h-10 flex-1 rounded-lg border border-dashed border-muted" />
                      ) : (
                        slotAppts.map((appt) => {
                          const statusInfo = APPOINTMENT_STATUS_CONFIG[appt.status];
                          return (
                            <Link
                              key={appt._id}
                              href={`/dashboard/pacientes/${appt.patient._id}`}
                              className={`flex-1 min-w-40 rounded-lg border p-2.5 transition-opacity hover:opacity-80 ${slotBg(appt)}`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">
                                    {appt.patient.firstName} {appt.patient.lastName}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {APPOINTMENT_TYPE_LABELS[appt.type] ?? "Cita"}
                                  </p>
                                </div>
                                {isPastDay ? (
                                  <span
                                    className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium flex-shrink-0 ${statusInfo?.classes ?? ""}`}
                                  >
                                    {statusInfo?.label ?? appt.status}
                                  </span>
                                ) : (
                                  <RiskScoreBadge
                                    score={appt.riskScoreComputed}
                                    level={appt.riskLevelComputed}
                                    size="sm"
                                  />
                                )}
                              </div>
                            </Link>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function AgendaSkeleton() {
  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
      <Skeleton className="h-96 rounded-xl" />
    </>
  );
}

// DECISION: AgendaPage is SYNCHRONOUS — only creates the Suspense boundary.
// AgendaContent and AgendaNav (client) handle searchParams access inside
// Suspense and on the client respectively.
// Without this, Next.js 16 throws blocking-route for dynamic data outside Suspense.
// Ref: https://nextjs.org/docs/messages/blocking-route
export default function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Header — AgendaNav in Suspense: useSearchParams requires boundary in Next.js 16 */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="-ml-1" />
          <Suspense
            fallback={
              <div>
                <p className="text-xl font-semibold text-foreground">Agenda</p>
                <p className="text-sm text-muted-foreground h-5" />
              </div>
            }
          >
            <AgendaNav />
          </Suspense>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        <Suspense fallback={<AgendaSkeleton />}>
          <AgendaContent searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
