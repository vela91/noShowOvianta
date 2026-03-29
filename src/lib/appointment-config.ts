// Shared display config for appointment status and type labels.
// Used in agenda/page.tsx and pacientes/[id]/page.tsx.

export const APPOINTMENT_STATUS_CONFIG: Record<
  string,
  { label: string; classes: string }
> = {
  attended: {
    label: "Asistió",
    classes: "bg-green-50 text-green-700 border-green-200",
  },
  no_show: {
    label: "No-show",
    classes: "bg-red-50 text-red-700 border-red-200",
  },
  cancelled: {
    label: "Cancelada",
    classes: "bg-slate-100 text-slate-600 border-slate-200",
  },
  scheduled: {
    label: "Programada",
    classes: "bg-blue-50 text-blue-700 border-blue-200",
  },
  confirmed: {
    label: "Confirmada",
    classes: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
};

export const CHANNEL_LABELS: Record<string, string> = {
  sms: "SMS",
  whatsapp: "WhatsApp",
  call: "Llamada",
  email: "Email",
};

export const APPOINTMENT_TYPE_LABELS: Record<string, string> = {
  first_visit: "Primera visita",
  follow_up: "Seguimiento",
  urgent: "Urgente",
  routine_check: "Revisión rutinaria",
};
