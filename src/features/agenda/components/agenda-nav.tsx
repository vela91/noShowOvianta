"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function parseSelectedDate(dateParam?: string): Date {
  if (!dateParam) return new Date();
  const parsed = new Date(dateParam + "T12:00:00");
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

function toDateParam(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

// Client Component: reads searchParams on the client to render
// navigation and day title without blocking Server render.
export function AgendaNav() {
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date") ?? undefined;
  const selectedDate = parseSelectedDate(dateParam);
  const isTodayView = isSameDay(selectedDate, new Date());

  const dateLabel = new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(selectedDate);
  const weekday = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
  }).format(selectedDate);

  const prevDate = addDays(selectedDate, -1);
  const nextDate = addDays(selectedDate, 1);

  return (
    <div className="flex items-center justify-between w-full gap-3">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Agenda</h1>
        <p className="text-sm text-muted-foreground capitalize">
          {weekday}, {dateLabel}
        </p>
      </div>

      <div className="flex items-center gap-1">
        <Link
          href={`?date=${toDateParam(prevDate)}`}
          className="inline-flex items-center justify-center rounded-md p-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          aria-label="Día anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        {!isTodayView && (
          <Link
            href="/dashboard/agenda"
            className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium border transition-colors hover:bg-accent"
          >
            Hoy
          </Link>
        )}
        <Link
          href={`?date=${toDateParam(nextDate)}`}
          className="inline-flex items-center justify-center rounded-md p-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          aria-label="Día siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
