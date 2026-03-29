"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import dbConnect from "@/lib/db";
import Patient from "@/models/patient";
import { serialize } from "@/lib/utils";
import type { IPatient } from "@/lib/types";

const UpdatePatientSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  email: z.string().email().optional(),
  address: z.string().min(1).optional(),
  distanceToClinicKm: z.number().positive().optional(),
  preferredChannel: z
    .array(z.enum(["sms", "whatsapp", "call", "email"]))
    .optional(),
  preferredContactTime: z
    .array(z.enum(["morning", "afternoon", "evening"]))
    .optional(),
  consents: z
    .object({
      automatedReminders: z.boolean(),
      predictiveProfiling: z.boolean(),
      dataProcessing: z.boolean(),
    })
    .optional(),
});

export type UpdatePatientInput = z.infer<typeof UpdatePatientSchema>;

type UpdatePatientResult =
  | { success: true; patient: IPatient }
  | { success: false; error: string };

export async function updatePatient(
  id: string,
  data: UpdatePatientInput
): Promise<UpdatePatientResult> {
  const parsed = UpdatePatientSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }

  await dbConnect();

  const updated = await Patient.findByIdAndUpdate(id, parsed.data, {
    new: true,
    runValidators: true,
  }).lean();

  if (!updated) {
    return { success: false, error: "Paciente no encontrado" };
  }

  revalidatePath("/patients");
  revalidatePath(`/patients/${id}`);

  return { success: true, patient: serialize<IPatient>(updated) };
}
