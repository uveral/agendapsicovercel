import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  phone: varchar("phone"),
  profileImageUrl: varchar("profile_image_url"),
  therapistId: varchar("therapist_id").references(() => therapists.id, { onDelete: "set null" }),
  role: varchar("role", { enum: ["admin", "therapist", "client"] }).notNull().default("client"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

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

// Therapists table
export const therapists = pgTable("therapists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  specialty: varchar("specialty").notNull(),
  email: varchar("email"),
  phone: varchar("phone"),
  color: varchar("color").notNull().default("#3b82f6"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTherapistSchema = createInsertSchema(therapists).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTherapist = z.infer<typeof insertTherapistSchema>;
export type Therapist = typeof therapists.$inferSelect;

// Client availability table
export const clientAvailability = pgTable("client_availability", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(), // 0-6 (Sunday-Saturday)
  startTime: varchar("start_time").notNull(), // Format: "HH:mm"
  endTime: varchar("end_time").notNull(), // Format: "HH:mm"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertClientAvailabilitySchema = createInsertSchema(clientAvailability).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertClientAvailability = z.infer<typeof insertClientAvailabilitySchema>;
export type ClientAvailability = typeof clientAvailability.$inferSelect;

// Therapist working hours table
export const therapistWorkingHours = pgTable("therapist_working_hours", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  therapistId: varchar("therapist_id").notNull().references(() => therapists.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(), // 0-6 (Sunday-Saturday)
  startTime: varchar("start_time").notNull(), // Format: "HH:mm"
  endTime: varchar("end_time").notNull(), // Format: "HH:mm"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTherapistWorkingHoursSchema = createInsertSchema(therapistWorkingHours).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTherapistWorkingHours = z.infer<typeof insertTherapistWorkingHoursSchema>;
export type TherapistWorkingHours = typeof therapistWorkingHours.$inferSelect;

// Appointments table
export const appointments = pgTable("appointments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  therapistId: varchar("therapist_id").notNull().references(() => therapists.id, { onDelete: "cascade" }),
  clientId: varchar("client_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: timestamp("date").notNull(),
  startTime: varchar("start_time").notNull(), // Format: "HH:mm"
  endTime: varchar("end_time").notNull(), // Format: "HH:mm"
  status: varchar("status", { enum: ["pending", "confirmed", "cancelled"] }).notNull().default("pending"),
  notes: text("notes"),
  seriesId: varchar("series_id"),
  frequency: varchar("frequency", { enum: ["puntual", "semanal", "quincenal"] }).notNull().default("puntual"),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  pendingReason: text("pending_reason"),
  optimizationScore: integer("optimization_score"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  date: z.union([z.string(), z.date()]).transform((val) => typeof val === "string" ? new Date(val) : val),
});

export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointments.$inferSelect;

// Settings table
export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key").notNull().unique(),
  value: jsonb("value").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSettingSchema = createInsertSchema(settings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateSettingSchema = z.object({
  value: z.any(),
});

export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type UpdateSetting = z.infer<typeof updateSettingSchema>;
export type Setting = typeof settings.$inferSelect;
