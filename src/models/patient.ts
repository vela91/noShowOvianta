import mongoose, { Schema } from "mongoose";
import type { IPatient } from "@/lib/types";

const PatientSchema = new Schema<IPatient>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: true,
    },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    address: { type: String, required: true },
    distanceToClinicKm: { type: Number, required: true },

    primaryCondition: { type: String, required: true },
    conditionType: { type: String, enum: ["chronic", "acute"], required: true },
    specialty: { type: String, required: true },

    preferredChannel: { type: [String], default: [] },
    preferredContactTime: { type: [String], default: [] },

    consents: {
      automatedReminders: { type: Boolean, default: true },
      predictiveProfiling: { type: Boolean, default: true },
      dataProcessing: { type: Boolean, default: true },
    },

    stats: {
      totalAppointments: { type: Number, default: 0 },
      noShows: { type: Number, default: 0 },
      cancellations: { type: Number, default: 0 },
      attendanceRate: { type: Number, default: 1 },
    },
  },
  {
    timestamps: true,
  }
);

// CRITICAL Next.js pattern: prevents model recompilation errors during hot reload.
// Ref: https://mongoosejs.com/docs/nextjs.html
// Without this, Next.js recompiles the module on every change and Mongoose throws
// "Cannot overwrite model once compiled".
export default mongoose.models.Patient ||
  mongoose.model<IPatient>("Patient", PatientSchema);
