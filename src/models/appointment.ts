import mongoose, { Schema } from "mongoose";
import type { IAppointment } from "@/lib/types";

// DESIGN NOTE: patientId type separation
// IAppointment.patientId = string (serializable for Server Components)
// MongoDB stores ObjectId — Mongoose converts automatically.
// With .lean(), ObjectIds are serialized as strings in Next.js.
// With .populate(), patientId becomes the full IPatient document.
type AppointmentSchemaType = Omit<IAppointment, "patientId"> & {
  patientId: mongoose.Types.ObjectId;
};

const AppointmentSchema = new Schema<AppointmentSchemaType>(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    doctorName: { type: String, required: true },
    specialty: { type: String, required: true },
    date: { type: Date, required: true },
    duration: { type: Number, default: 30 }, // minutes
    type: {
      type: String,
      enum: ["first_visit", "follow_up", "urgent", "routine_check"],
      required: true,
    },
    status: {
      type: String,
      enum: ["scheduled", "confirmed", "attended", "no_show", "cancelled"],
      required: true,
    },
    reminderSent: { type: Boolean, default: false },
    reminderResponse: {
      type: String,
      enum: ["confirmed", "no_response", "declined", null],
      default: null,
    },
    // Computed fields — populated at appointment creation time
    riskScore: { type: Number },
    riskLevel: { type: String, enum: ["low", "medium", "high"] },
    leadTimeDays: { type: Number }, // days between createdAt and date
  },
  {
    timestamps: true,
  }
);

// Index on patientId for fast history queries
AppointmentSchema.index({ patientId: 1, date: -1 });
// Index on date for the daily agenda view
AppointmentSchema.index({ date: 1 });

export default mongoose.models.Appointment ||
  mongoose.model<AppointmentSchemaType>("Appointment", AppointmentSchema);
