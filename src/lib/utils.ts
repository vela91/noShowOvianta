import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// cn() — standard shadcn/ui utility for merging Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// calculateAge — computes current age from dateOfBirth
// IMPORTANT: never store age in DB, always compute dynamically.
// Reason: age is a derived value that becomes stale; dateOfBirth is the immutable source.
export function calculateAge(dateOfBirth: Date | string): number {
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

// formatDate — formats a date in Spanish locale (dd/mm/yyyy)
export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

// formatDateTime — formats a date and time in Spanish locale
export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

// serialize<T> — strips Mongoose-specific fields so plain objects can cross
// the Server → Client boundary in Next.js without serialization errors.
// Use this on any .lean() result before passing it to a Client Component.
export function serialize<T>(doc: unknown): T {
  return JSON.parse(JSON.stringify(doc)) as T;
}
