"use client";

import { updatePatient } from "@/features/patients/actions";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { cn, formatDate } from "@/lib/utils";
import { CHANNEL_LABELS } from "@/lib/appointment-config";
import type { IPatient } from "@/lib/types";
import { CalendarIcon, Edit } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

function normalizeArray<T>(val: T | T[]): T[] {
  return Array.isArray(val) ? val : [val];
}

interface PatientEditFormProps {
  patient: IPatient;
}

export function PatientEditForm({ patient }: PatientEditFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showDiscardAlert, setShowDiscardAlert] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState(patient.firstName);
  const [lastName, setLastName] = useState(patient.lastName);
  // DESIGN DECISION: store dateOfBirth not age — immutable source datum
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>(
    new Date(patient.dateOfBirth)
  );
  const [preferredChannel, setPreferredChannel] = useState<("sms" | "whatsapp" | "call" | "email")[]>(
    normalizeArray(patient.preferredChannel)
  );
  const [preferredContactTime, setPreferredContactTime] = useState<("morning" | "afternoon" | "evening")[]>(
    normalizeArray(patient.preferredContactTime)
  );
  const [consentReminders, setConsentReminders] = useState(
    patient.consents.automatedReminders
  );
  const [consentProfiling, setConsentProfiling] = useState(
    patient.consents.predictiveProfiling
  );
  const [consentData] = useState(patient.consents.dataProcessing);

  const initialChannels = normalizeArray(patient.preferredChannel);
  const initialTimes = normalizeArray(patient.preferredContactTime);

  const isDirty =
    firstName !== patient.firstName ||
    lastName !== patient.lastName ||
    (dateOfBirth && new Date(patient.dateOfBirth).toDateString() !== dateOfBirth.toDateString()) ||
    preferredChannel.slice().sort().join() !== initialChannels.slice().sort().join() ||
    preferredContactTime.slice().sort().join() !== initialTimes.slice().sort().join() ||
    consentReminders !== patient.consents.automatedReminders ||
    consentProfiling !== patient.consents.predictiveProfiling;

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const result = await updatePatient(patient._id, {
        firstName,
        lastName,
        dateOfBirth: dateOfBirth,
        preferredChannel,
        preferredContactTime,
        consents: {
          automatedReminders: consentReminders,
          predictiveProfiling: consentProfiling,
          dataProcessing: consentData,
        },
      });
      if (result.success) {
        setOpen(false);
        router.refresh();
      } else {
        setSaveError(result.error);
      }
    } catch {
      setSaveError("Error inesperado al guardar");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFirstName(patient.firstName);
    setLastName(patient.lastName);
    setDateOfBirth(new Date(patient.dateOfBirth));
    setPreferredChannel(normalizeArray(patient.preferredChannel));
    setPreferredContactTime(normalizeArray(patient.preferredContactTime));
    setConsentReminders(patient.consents.automatedReminders);
    setConsentProfiling(patient.consents.predictiveProfiling);
    setSaveError(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && isDirty && !saving) {
      setShowDiscardAlert(true);
      return;
    }
    if (!next) resetForm();
    setOpen(next);
  };

  const handleConfirmDiscard = () => {
    resetForm();
    setShowDiscardAlert(false);
    setOpen(false);
  };

  return (
    <>
    <AlertDialog open={showDiscardAlert} onOpenChange={setShowDiscardAlert}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Descartar cambios?</AlertDialogTitle>
          <AlertDialogDescription>
            Tienes cambios sin guardar. Si cierras, se perderán.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmDiscard}>
            Descartar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Edit className="h-4 w-4 mr-2" />
        Editar paciente
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar paciente</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Name */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">Nombre</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Apellidos</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          {/* Date of birth (NOT age)
              Reason: age is a derived value that goes stale over time.
              dateOfBirth is the immutable source datum, always correct. */}
          <div className="space-y-1.5">
            <Label>Fecha de nacimiento</Label>
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateOfBirth && "text-muted-foreground"
                    )}
                  />
                }
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateOfBirth ? formatDate(dateOfBirth) : "Seleccionar fecha"}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateOfBirth}
                  onSelect={setDateOfBirth}
                  defaultMonth={dateOfBirth}
                  captionLayout="dropdown-years"
                  fromYear={1930}
                  toYear={new Date().getFullYear() - 16}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Preferred channel and contact time */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Canal preferido</Label>
              <div role="group" aria-label="Canal preferido" className="flex flex-wrap gap-2">
                {(["whatsapp", "sms", "call", "email"] as const).map((ch) => {
                  const active = preferredChannel.includes(ch);
                  return (
                    <button
                      key={ch}
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        setPreferredChannel((prev) =>
                          active
                            ? prev.length > 1 ? prev.filter((c) => c !== ch) : prev
                            : [...prev, ch]
                        )
                      }
                      className={cn(
                        "rounded-md border px-3 py-1.5 text-sm transition-colors",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input bg-background text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {CHANNEL_LABELS[ch]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Horario de contacto</Label>
              <div role="group" aria-label="Horario de contacto" className="flex flex-wrap gap-2">
                {(["morning", "afternoon", "evening"] as const).map((t) => {
                  const labels = { morning: "Mañana", afternoon: "Tarde", evening: "Noche" };
                  const active = preferredContactTime.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        setPreferredContactTime((prev) =>
                          active
                            ? prev.length > 1 ? prev.filter((c) => c !== t) : prev
                            : [...prev, t]
                        )
                      }
                      className={cn(
                        "rounded-md border px-3 py-1.5 text-sm transition-colors",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input bg-background text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {labels[t]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* GDPR consents */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Consentimientos RGPD</Label>

            <div className="rounded-lg border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Recordatorios automáticos</p>
                  <p className="text-xs text-muted-foreground">
                    Recibir SMS/WhatsApp/llamadas de recordatorio
                  </p>
                </div>
                <Switch
                  checked={consentReminders}
                  onCheckedChange={setConsentReminders}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Perfilado predictivo</p>
                  <p className="text-xs text-muted-foreground">
                    Uso de datos para calcular riesgo de no-show
                  </p>
                </div>
                <Switch
                  checked={consentProfiling}
                  onCheckedChange={setConsentProfiling}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Tratamiento de datos</p>
                  <p className="text-xs text-muted-foreground">
                    Almacenamiento y procesamiento de datos médicos
                  </p>
                </div>
                <Switch
                  checked={consentData}
                  disabled // Data processing consent is required
                />
              </div>
            </div>
          </div>

          {saveError && (
            <p className="text-sm text-red-600">{saveError}</p>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving || !isDirty}>
              {saving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
