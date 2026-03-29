"use client";

import { RiskScoreBadge } from "@/features/patients/components/risk-score-badge";
import { usePatientTable } from "@/features/patients/hooks/use-patient-table";
import type { SortKey, SortDir } from "@/features/patients/hooks/use-patient-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { calculateAge, formatDateTime } from "@/lib/utils";
import type { PatientWithScore } from "@/lib/types";
import { ArrowUpDown, ChevronDown, ChevronUp, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface PatientsTableProps {
  patients: PatientWithScore[];
  specialties: string[];
}

interface SortableHeaderProps {
  label: string;
  col: SortKey;
  activeSortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
}

function SortableHeader({ label, col, activeSortKey, sortDir, onSort }: SortableHeaderProps) {
  const active = activeSortKey === col;
  const Icon = active ? (sortDir === "asc" ? ChevronUp : ChevronDown) : ArrowUpDown;
  const ariaLabel = active
    ? `${label}: ordenar ${sortDir === "asc" ? "descendente" : "ascendente"}`
    : `Ordenar por ${label}`;
  return (
    <button
      onClick={() => onSort(col)}
      aria-label={ariaLabel}
      className="flex items-center gap-1 font-semibold text-foreground hover:text-primary transition-colors"
    >
      {label}
      <Icon className={`h-3.5 w-3.5 ${active ? "text-primary" : "text-muted-foreground/50"}`} />
    </button>
  );
}

// DESIGN DECISION: Client-side filtering for demo scale (<200 patients).
// queries.ts supports server-side PatientFilters (riskLevel, specialty, text search)
// if scale requires moving filters to the server via searchParams.
export function PatientsTable({ patients, specialties }: PatientsTableProps) {
  const router = useRouter();
  const {
    search,
    setSearch,
    riskFilter,
    specialtyFilter,
    sortKey,
    sortDir,
    sorted,
    hasFilters,
    setFilterParam,
    handleSort,
    clearFilters,
    getSortAriaSort,
    attendanceColor,
  } = usePatientTable(patients);

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            placeholder="Buscar paciente…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            name="patient-search"
            autoComplete="off"
            aria-label="Buscar paciente por nombre"
          />
        </div>

        <Select value={riskFilter} onValueChange={(v) => setFilterParam("risk", v ?? "all", "all")}>
          <SelectTrigger className="w-40" aria-label="Filtrar por nivel de riesgo">
            <SelectValue placeholder="Nivel de riesgo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los riesgos</SelectItem>
            <SelectItem value="high"><span aria-hidden="true">🔴</span> Alto riesgo</SelectItem>
            <SelectItem value="medium"><span aria-hidden="true">🟡</span> Riesgo medio</SelectItem>
            <SelectItem value="low"><span aria-hidden="true">🟢</span> Bajo riesgo</SelectItem>
          </SelectContent>
        </Select>

        <Select value={specialtyFilter} onValueChange={(v) => setFilterParam("specialty", v ?? "all", "all")}>
          <SelectTrigger className="w-44" aria-label="Filtrar por especialidad">
            <SelectValue placeholder="Especialidad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las especialidades</SelectItem>
            {specialties.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" aria-hidden="true" />
            Limpiar
          </Button>
        )}

        <Badge variant="secondary" className="ml-auto">
          {sorted.length} paciente{sorted.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead aria-sort={getSortAriaSort("name")}>
                <SortableHeader label="Paciente" col="name" activeSortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              </TableHead>
              <TableHead aria-sort={getSortAriaSort("age")}>
                <SortableHeader label="Edad" col="age" activeSortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              </TableHead>
              <TableHead aria-sort={getSortAriaSort("specialty")}>
                <SortableHeader label="Especialidad" col="specialty" activeSortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              </TableHead>
              <TableHead aria-sort={getSortAriaSort("nextAppointment")}>
                <SortableHeader label="Próxima cita" col="nextAppointment" activeSortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              </TableHead>
              <TableHead aria-sort={getSortAriaSort("attendance")}>
                <SortableHeader label="Asistencia" col="attendance" activeSortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              </TableHead>
              <TableHead aria-sort={getSortAriaSort("risk")}>
                <SortableHeader label="Riesgo" col="risk" activeSortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-32 text-center text-muted-foreground"
                >
                  {hasFilters
                    ? "No hay pacientes que coincidan con los filtros"
                    : "No hay pacientes registrados"}
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((patient, index) => (
                <TableRow
                  key={patient._id}
                  tabIndex={0}
                  onClick={() => router.push(`/dashboard/pacientes/${patient._id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(`/dashboard/pacientes/${patient._id}`);
                    }
                  }}
                  className={`cursor-pointer transition-colors hover:bg-primary/5 ${
                    index % 2 === 0 ? "" : "bg-muted/20"
                  }`}
                >
                  <TableCell className="font-medium">
                    <div>
                      <Link
                        href={`/dashboard/pacientes/${patient._id}`}
                        className="font-semibold text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                      >
                        {patient.firstName} {patient.lastName}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {patient.primaryCondition}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {calculateAge(patient.dateOfBirth)} años
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {patient.specialty}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {patient.nextAppointment
                      ? formatDateTime(patient.nextAppointment.date)
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`font-semibold tabular-nums ${attendanceColor(
                        patient.stats.attendanceRate
                      )}`}
                    >
                      {Math.round(patient.stats.attendanceRate * 100)}%
                    </span>
                  </TableCell>
                  <TableCell>
                    {patient.riskScore ? (
                      <RiskScoreBadge
                        score={patient.riskScore.score}
                        level={patient.riskScore.level}
                        size="sm"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Sin cita
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
