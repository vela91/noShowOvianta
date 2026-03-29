import { getPatients, getSpecialties } from "@/features/patients/queries";
import { PatientsTable } from "@/features/patients/components/patients-table";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { connection } from "next/server";
import { Suspense } from "react";

export const metadata = {
  title: "Pacientes — Ovianta NoShow Shield",
};

// DECISION: Separate dynamic data into async component + Suspense.
// Next.js 16 requires connection() (needed before DB I/O) inside <Suspense>.
// Without this, the page blocks until MongoDB responds.
// With Suspense: header renders immediately, table appears when data arrives.
//
// JSX is constructed outside try/catch to satisfy react-hooks/error-boundaries:
// try/catch cannot intercept errors that occur during React rendering, only
// during the async data-fetch phase. The boundary between the two is explicit.
async function PatientsContent() {
  let patients: Awaited<ReturnType<typeof getPatients>> = [];
  let specialties: string[] = [];

  if (process.env.MONGODB_URI) {
    await connection();
    // DESIGN DECISION: All patients fetched server-side; filtering/sorting done client-side.
    // Intentional for demo scale (<200 patients). queries.ts supports PatientFilters
    // for server-side filtering if scale requires it.
    [patients, specialties] = await Promise.all([getPatients(), getSpecialties()]);
  }

  if (patients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-muted-foreground mb-2">No hay datos en la base de datos.</p>
        <p className="text-sm text-muted-foreground">
          Ejecuta{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">npm run seed</code>{" "}
          para generar datos de prueba.
        </p>
      </div>
    );
  }

  return <PatientsTable patients={patients} specialties={specialties} />;
}

function PatientsTableSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <Skeleton className="h-8 flex-1" />
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-8 w-44" />
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

export default function PacientesPage() {
  return (
    <div className="flex flex-col h-full">
      {/* Header — renders immediately without waiting for DB */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="-ml-1" />
          <div>
            <h1 className="text-xl font-semibold text-foreground">Pacientes</h1>
            <p className="text-sm text-muted-foreground">
              Gestión y seguimiento de pacientes
            </p>
          </div>
        </div>
      </div>

      {/* Table — async load without blocking render */}
      <div className="flex-1 p-6">
        <Suspense fallback={<PatientsTableSkeleton />}>
          <PatientsContent />
        </Suspense>
      </div>
    </div>
  );
}
