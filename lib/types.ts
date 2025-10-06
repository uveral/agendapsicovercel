import { z } from "zod";

// User types
export interface User {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  profileImageUrl?: string | null;
  therapistId?: string | null;
  role: "admin" | "therapist" | "client";
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
}

// Schema for creating clients manually (admin/therapist action)
export const insertManualClientSchema = z.object({
  firstName: z.string().min(1, "Nombre es requerido"),
  lastName: z.string().min(1, "Apellido es requerido"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
});

export type InsertManualClient = z.infer<typeof insertManualClientSchema>;

// Schema for updating clients
export const updateClientSchema = z.object({
  firstName: z.string().min(1, "Nombre es requerido").optional(),
  lastName: z.string().min(1, "Apellido es requerido").optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
});

export type UpdateClient = z.infer<typeof updateClientSchema>;

// Therapist types
export interface Therapist {
  id: string;
  name: string;
  specialty: string;
  email?: string | null;
  phone?: string | null;
  color?: string;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
}

export const insertTherapistSchema = z.object({
  name: z.string().min(1, "Nombre es requerido"),
  specialty: z.string().min(1, "Especialidad es requerida"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  color: z.string().optional(),
});

export type InsertTherapist = z.infer<typeof insertTherapistSchema>;

// Client availability types
export interface ClientAvailability {
  id: string;
  userId: string;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // Format: "HH:mm"
  endTime: string; // Format: "HH:mm"
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
}

export const insertClientAvailabilitySchema = z.object({
  userId: z.string(),
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string(),
  endTime: z.string(),
});

export type InsertClientAvailability = z.infer<typeof insertClientAvailabilitySchema>;

// Therapist working hours types
export interface TherapistWorkingHours {
  id: string;
  therapistId: string;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // Format: "HH:mm"
  endTime: string; // Format: "HH:mm"
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
}

export const insertTherapistWorkingHoursSchema = z.object({
  therapistId: z.string(),
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string(),
  endTime: z.string(),
});

export type InsertTherapistWorkingHours = z.infer<typeof insertTherapistWorkingHoursSchema>;

// Appointment types
export interface Appointment {
  id: string;
  therapistId: string;
  clientId: string;
  date: Date | string;
  startTime: string; // Format: "HH:mm"
  endTime: string; // Format: "HH:mm"
  status: "pending" | "confirmed" | "cancelled";
  notes?: string | null;
  seriesId?: string | null;
  frequency: "puntual" | "semanal" | "quincenal";
  durationMinutes: number;
  pendingReason?: string | null;
  optimizationScore?: number | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
}

export const insertAppointmentSchema = z.object({
  therapistId: z.string(),
  clientId: z.string(),
  date: z.union([z.string(), z.date()]).transform((val) => typeof val === "string" ? new Date(val) : val),
  startTime: z.string(),
  endTime: z.string(),
  status: z.enum(["pending", "confirmed", "cancelled"]).optional(),
  notes: z.string().optional(),
  seriesId: z.string().optional(),
  frequency: z.enum(["puntual", "semanal", "quincenal"]).optional(),
  durationMinutes: z.number().optional(),
  pendingReason: z.string().optional(),
  optimizationScore: z.number().optional(),
});

export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

// Swap suggestion interface
export interface SwapSuggestion {
  conflictingAppointmentId: string;
  conflictingClientId: string;
  conflictingClientName: string;
  conflictingClientPhone?: string;
  currentSlot: {
    date: string;
    startTime: string;
    endTime: string;
  };
  suggestedSlot: {
    date: string;
    startTime: string;
    endTime: string;
  };
  rationale: string;
}

// Settings types
export interface Setting {
  id: string;
  key: string;
  value: any;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
}

export const insertSettingSchema = z.object({
  key: z.string(),
  value: z.any(),
});

export const updateSettingSchema = z.object({
  value: z.any(),
});

export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type UpdateSetting = z.infer<typeof updateSettingSchema>;
