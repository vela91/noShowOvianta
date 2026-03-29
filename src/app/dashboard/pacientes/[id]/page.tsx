import {
  getPatientById,
  getPatientAppointments,
} from "@/features/patients/queries";
import { AiMessagePanel } from "@/features/patients/components/ai-message-panel";
import { PatientEditForm } from "@/features/patients/components/patient-edit-form";
import { RiskBreakdown } from "@/features/patients/components/risk-breakdown";
import { RiskScoreBadge } from "@/features/patients/components/risk-score-badge";
import { RiskScoreExplanationDialog } from "@/features/patients/components/risk-score-explanation-dialog";
import { RiskTimeline } from "@/features/patients/components/risk-timeline";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { calculateAge, formatDate, formatDateTime } from "@/lib/utils";
import {
  APPOINTMENT_STATUS_CONFIG,
  APPOINTMENT_TYPE_LABELS,
  CHANNEL_LABELS,
} from "@/lib/appointment-config";
import {
  ATTENDANCE_THRESHOLDS,
  HISTORY_DISPLAY_LIMIT,
} from "@/lib/business-constants";
import {
  Activity,
  Calendar,
  Clock,
  MapPin,
  Phone,
  User,
} from "lucide-react";
import { notFound } from "next/navigation";
import { Suspense } from "react";

// DECISION: PatientContent in Suspense, receives Promise<params> directly.
//
// Next.js 16: `await params` in the page component (outside Suspense) counts as
// dynamic access outside-of-Suspense and triggers the blocking-route warning.
// Solution: PatientDetailPage is synchronous and passes the unresolved Promise to
// PatientContent, which does the await INSIDE the Suspense boundary.
// Ref: https://nextjs.org/docs/messages/blocking-route
async function PatientContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [patient, appointments] = await Promise.all([
    getPatientById(id),
    getPatientAppointments(id),
  ]);

  if (!patient) notFound();

  const { nextAppointment, riskScore } = patient;

  const now = new Date();
  const historicalAppointments = appointments
    .filter((a) => new Date(a.date) < now)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <>
      {/* Patient header */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="-ml-1" />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold text-foreground">
                  {patient.firstName} {patient.lastName}
                </h1>
                {riskScore ? (
                  <RiskScoreBadge
                    score={riskScore.score}
                    level={riskScore.level}
                    size="md"
                  />
                ) : null}
              </div>
              <p className="text-sm text-muted-foreground">
                {calculateAge(patient.dateOfBirth)} años · {patient.specialty} · {patient.primaryCondition}
              </p>
            </div>
          </div>
          <PatientEditForm patient={patient} />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  Información
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fecha de nacimiento</span>
                  <span className="font-medium">{formatDate(patient.dateOfBirth)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Canal preferido</span>
                  <span className="font-medium">
                    {(Array.isArray(patient.preferredChannel)
                      ? patient.preferredChannel
                      : [patient.preferredChannel]
                    ).map((c) => CHANNEL_LABELS[c]).join(", ")}
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    Teléfono
                  </span>
                  <span className="font-medium">{patient.phone}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Distancia
                  </span>
                  <span className="font-medium">{patient.distanceToClinicKm} km</span>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-muted-foreground text-xs mb-2">Consentimientos RGPD</p>
                  <div className="space-y-1">
                    {[
                      { key: "automatedReminders", label: "Recordatorios" },
                      { key: "predictiveProfiling", label: "Perfilado" },
                      { key: "dataProcessing", label: "Datos" },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{label}</span>
                        <span className={`text-xs font-medium ${
                          patient.consents[key as keyof typeof patient.consents]
                            ? "text-green-600" : "text-red-500"
                        }`}>
                          {patient.consents[key as keyof typeof patient.consents] ? "Activo" : "No"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Estadísticas
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted/40 p-3 text-center">
                  <p className="text-2xl font-bold text-foreground tabular-nums">{patient.stats.totalAppointments}</p>
                  <p className="text-xs text-muted-foreground">Total citas</p>
                </div>
                <div className="rounded-lg bg-red-50 p-3 text-center">
                  <p className="text-2xl font-bold text-red-600 tabular-nums">{patient.stats.noShows}</p>
                  <p className="text-xs text-muted-foreground">No-shows</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3 text-center">
                  <p className="text-2xl font-bold text-foreground tabular-nums">{patient.stats.cancellations}</p>
                  <p className="text-xs text-muted-foreground">Cancelaciones</p>
                </div>
                <div className={`rounded-lg p-3 text-center ${
                  patient.stats.attendanceRate >= ATTENDANCE_THRESHOLDS.good ? "bg-green-50"
                  : patient.stats.attendanceRate >= ATTENDANCE_THRESHOLDS.fair ? "bg-amber-50" : "bg-red-50"
                }`}>
                  <p className={`text-2xl font-bold tabular-nums ${
                    patient.stats.attendanceRate >= ATTENDANCE_THRESHOLDS.good ? "text-green-600"
                    : patient.stats.attendanceRate >= ATTENDANCE_THRESHOLDS.fair ? "text-amber-600" : "text-red-600"
                  }`}>
                    {Math.round(patient.stats.attendanceRate * 100)}%
                  </p>
                  <p className="text-xs text-muted-foreground">Asistencia</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Historial</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-72 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/20 hover:bg-muted/20">
                        <TableHead className="text-xs">Fecha</TableHead>
                        <TableHead className="text-xs">Tipo</TableHead>
                        <TableHead className="text-xs">Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historicalAppointments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-xs text-muted-foreground py-6">
                            Sin historial de citas
                          </TableCell>
                        </TableRow>
                      ) : (
                        historicalAppointments.slice(0, HISTORY_DISPLAY_LIMIT).map((appt) => {
                          const status = APPOINTMENT_STATUS_CONFIG[appt.status] ?? {
                            label: appt.status,
                            classes: "bg-muted text-muted-foreground border-muted",
                          };
                          return (
                            <TableRow key={appt._id}>
                              <TableCell className="text-xs py-2">{formatDate(appt.date)}</TableCell>
                              <TableCell className="text-xs py-2 text-muted-foreground">
                                {APPOINTMENT_TYPE_LABELS[appt.type] ?? appt.type}
                              </TableCell>
                              <TableCell className="py-2">
                                <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${status.classes}`}>
                                  {status.label}
                                </span>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Center column */}
          <div className="space-y-6">
            {nextAppointment && riskScore ? (
              <>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      Próxima cita
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Fecha
                      </span>
                      <span className="font-medium">{formatDateTime(nextAppointment.date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tipo</span>
                      <span className="font-medium">{APPOINTMENT_TYPE_LABELS[nextAppointment.type] ?? nextAppointment.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Antelación</span>
                      <span className="font-medium">{nextAppointment.leadTimeDays} días</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Score de riesgo</span>
                      <RiskScoreBadge score={riskScore.score} level={riskScore.level} size="sm" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Desglose del riesgo</CardTitle>
                      <RiskScoreExplanationDialog riskScore={riskScore} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <RiskBreakdown breakdown={riskScore.breakdown} topFactors={riskScore.topFactors} />
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground text-sm">
                  Este paciente no tiene citas futuras programadas
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Evolución del riesgo</CardTitle>
              </CardHeader>
              <CardContent>
                <RiskTimeline patient={patient} appointments={appointments} />
              </CardContent>
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  Intervención IA
                  <Badge variant="secondary" className="text-xs font-normal">
                    Claude Sonnet
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {nextAppointment && riskScore ? (
                  <AiMessagePanel patient={patient} appointment={nextAppointment} riskScore={riskScore} />
                ) : (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    Sin próxima cita — no hay intervención que generar
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

function PatientSkeleton() {
  return (
    <>
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="-ml-1" />
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      </div>
      <div className="flex-1 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    </>
  );
}

// ⚠️ BREAKING CHANGE NEXTJS 16: params is a Promise
// Ref: https://nextjs.org/blog/next-16#breaking-changes-and-other-updates
//
// PatientDetailPage is SYNCHRONOUS — only creates the Suspense boundary.
// Passes unresolved Promise<params> to PatientContent so the await
// happens inside Suspense and does not block layout render.
export default function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="flex flex-col h-full">
      <Suspense fallback={<PatientSkeleton />}>
        <PatientContent params={params} />
      </Suspense>
    </div>
  );
}
