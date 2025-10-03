import {
  users,
  therapists,
  clientAvailability,
  appointments,
  therapistWorkingHours,
  type User,
  type UpsertUser,
  type Therapist,
  type InsertTherapist,
  type ClientAvailability,
  type InsertClientAvailability,
  type Appointment,
  type InsertAppointment,
  type InsertManualClient,
  type UpdateClient,
  type TherapistWorkingHours,
  type InsertTherapistWorkingHours,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, asc } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUser(userId: string, data: { role: string }): Promise<User>;
  
  // Therapist operations
  getAllTherapists(): Promise<Therapist[]>;
  getTherapist(id: string): Promise<Therapist | undefined>;
  createTherapist(therapist: InsertTherapist): Promise<Therapist>;
  updateTherapist(id: string, therapist: Partial<InsertTherapist>): Promise<Therapist>;
  deleteTherapist(id: string): Promise<void>;
  
  // Client availability operations
  getClientAvailability(userId: string): Promise<ClientAvailability[]>;
  createClientAvailability(availability: InsertClientAvailability): Promise<ClientAvailability>;
  deleteClientAvailability(userId: string): Promise<void>;
  replaceClientAvailability(clientId: string, availabilities: InsertClientAvailability[]): Promise<ClientAvailability[]>;
  
  // Appointment operations
  getAllAppointments(): Promise<Appointment[]>;
  getAppointment(id: string): Promise<Appointment | undefined>;
  getTherapistAppointments(therapistId: string, startDate?: Date, endDate?: Date): Promise<Appointment[]>;
  getClientAppointments(clientId: string): Promise<Appointment[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: string, appointment: Partial<InsertAppointment>): Promise<Appointment>;
  deleteAppointment(id: string): Promise<void>;
  deleteAppointmentSeries(appointmentId: string, scope: "this_only" | "this_and_future"): Promise<void>;
  updateAppointmentSeries(appointmentId: string, scope: "this_only" | "this_and_future", data: Partial<InsertAppointment>): Promise<Appointment[]>;
  changeSeriesFrequency(appointmentId: string, newFrequency: "semanal" | "quincenal"): Promise<Appointment[]>;
  
  // Client operations
  getAllClients(): Promise<User[]>;
  getClient(id: string): Promise<User | undefined>;
  createManualClient(client: InsertManualClient): Promise<User>;
  updateClient(id: string, client: UpdateClient): Promise<User>;
  deleteClient(id: string): Promise<void>;
  
  // Therapist working hours operations
  getTherapistWorkingHours(therapistId: string): Promise<TherapistWorkingHours[]>;
  setTherapistWorkingHours(therapistId: string, hours: InsertTherapistWorkingHours[]): Promise<TherapistWorkingHours[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUser(userId: string, data: { role: string }): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ role: data.role as "admin" | "therapist" | "client" })
      .where(eq(users.id, userId))
      .returning();
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }

  // Therapist operations
  async getAllTherapists(): Promise<Therapist[]> {
    return await db.select().from(therapists).orderBy(asc(therapists.name));
  }

  async getTherapist(id: string): Promise<Therapist | undefined> {
    const [therapist] = await db.select().from(therapists).where(eq(therapists.id, id));
    return therapist;
  }

  async createTherapist(therapistData: InsertTherapist): Promise<Therapist> {
    const [therapist] = await db.insert(therapists).values(therapistData).returning();
    return therapist;
  }

  async updateTherapist(id: string, therapistData: Partial<InsertTherapist>): Promise<Therapist> {
    const [therapist] = await db
      .update(therapists)
      .set({ ...therapistData, updatedAt: new Date() })
      .where(eq(therapists.id, id))
      .returning();
    return therapist;
  }

  async deleteTherapist(id: string): Promise<void> {
    await db.delete(therapists).where(eq(therapists.id, id));
  }

  // Client availability operations
  async getClientAvailability(userId: string): Promise<ClientAvailability[]> {
    return await db.select().from(clientAvailability).where(eq(clientAvailability.userId, userId));
  }

  async createClientAvailability(availabilityData: InsertClientAvailability): Promise<ClientAvailability> {
    const [availability] = await db.insert(clientAvailability).values(availabilityData).returning();
    return availability;
  }

  async deleteClientAvailability(userId: string): Promise<void> {
    await db.delete(clientAvailability).where(eq(clientAvailability.userId, userId));
  }

  async replaceClientAvailability(clientId: string, availabilities: InsertClientAvailability[]): Promise<ClientAvailability[]> {
    await db.delete(clientAvailability).where(eq(clientAvailability.userId, clientId));
    
    if (availabilities.length > 0) {
      const values = availabilities.map(a => ({ ...a, userId: clientId }));
      await db.insert(clientAvailability).values(values);
    }
    
    return await db.select().from(clientAvailability).where(eq(clientAvailability.userId, clientId));
  }

  // Appointment operations
  async getAllAppointments(): Promise<Appointment[]> {
    return await db.select().from(appointments).orderBy(desc(appointments.date));
  }

  async getAppointment(id: string): Promise<Appointment | undefined> {
    const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));
    return appointment;
  }

  async getTherapistAppointments(therapistId: string, startDate?: Date, endDate?: Date): Promise<Appointment[]> {
    if (startDate && endDate) {
      return await db.select().from(appointments).where(
        and(
          eq(appointments.therapistId, therapistId),
          gte(appointments.date, startDate),
          lte(appointments.date, endDate)
        )
      ).orderBy(asc(appointments.date));
    }
    
    return await db.select().from(appointments).where(eq(appointments.therapistId, therapistId)).orderBy(asc(appointments.date));
  }

  async getClientAppointments(clientId: string): Promise<Appointment[]> {
    return await db.select().from(appointments).where(eq(appointments.clientId, clientId)).orderBy(desc(appointments.date));
  }

  async createAppointment(appointmentData: InsertAppointment): Promise<Appointment> {
    const [appointment] = await db.insert(appointments).values(appointmentData).returning();
    return appointment;
  }

  async updateAppointment(id: string, appointmentData: Partial<InsertAppointment>): Promise<Appointment> {
    const [appointment] = await db
      .update(appointments)
      .set({ ...appointmentData, updatedAt: new Date() })
      .where(eq(appointments.id, id))
      .returning();
    return appointment;
  }

  async deleteAppointment(id: string): Promise<void> {
    await db.delete(appointments).where(eq(appointments.id, id));
  }

  // Client operations
  async getAllClients(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, "client")).orderBy(asc(users.firstName));
  }

  async getClient(id: string): Promise<User | undefined> {
    const [client] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return client;
  }

  async createManualClient(clientData: InsertManualClient): Promise<User> {
    const [client] = await db
      .insert(users)
      .values({
        firstName: clientData.firstName,
        lastName: clientData.lastName,
        email: clientData.email || null,
        phone: clientData.phone || null,
        role: "client",
      })
      .returning();
    return client;
  }

  async updateClient(id: string, clientData: UpdateClient): Promise<User> {
    const [client] = await db
      .update(users)
      .set({ 
        ...clientData, 
        email: clientData.email || null,
        phone: clientData.phone || null,
        updatedAt: new Date() 
      })
      .where(eq(users.id, id))
      .returning();
    if (!client) {
      throw new Error("Client not found");
    }
    return client;
  }

  async deleteClient(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Therapist working hours operations
  async getTherapistWorkingHours(therapistId: string): Promise<TherapistWorkingHours[]> {
    return await db.select().from(therapistWorkingHours).where(eq(therapistWorkingHours.therapistId, therapistId)).orderBy(asc(therapistWorkingHours.dayOfWeek));
  }

  async setTherapistWorkingHours(therapistId: string, hours: InsertTherapistWorkingHours[]): Promise<TherapistWorkingHours[]> {
    await db.delete(therapistWorkingHours).where(eq(therapistWorkingHours.therapistId, therapistId));
    
    const created = [];
    for (const hour of hours) {
      const [workingHour] = await db.insert(therapistWorkingHours).values(hour).returning();
      created.push(workingHour);
    }
    
    return created;
  }

  async deleteAppointmentSeries(appointmentId: string, scope: "this_only" | "this_and_future"): Promise<void> {
    if (scope === "this_only") {
      await this.deleteAppointment(appointmentId);
      return;
    }

    const appointment = await this.getAppointment(appointmentId);
    if (!appointment) {
      throw new Error("Appointment not found");
    }

    if (!appointment.seriesId) {
      await this.deleteAppointment(appointmentId);
      return;
    }

    await db
      .delete(appointments)
      .where(
        and(
          eq(appointments.seriesId, appointment.seriesId),
          gte(appointments.date, appointment.date)
        )
      );
  }

  async updateAppointmentSeries(appointmentId: string, scope: "this_only" | "this_and_future", data: Partial<InsertAppointment>): Promise<Appointment[]> {
    const appointment = await this.getAppointment(appointmentId);
    if (!appointment) {
      throw new Error("Appointment not found");
    }

    if (scope === "this_only") {
      const updated = await this.updateAppointment(appointmentId, { 
        ...data, 
        seriesId: null,
        frequency: "puntual"
      });
      return [updated];
    } else {
      if (!appointment.seriesId) {
        const updated = await this.updateAppointment(appointmentId, data);
        return [updated];
      }

      const updatedAppointments = await db
        .update(appointments)
        .set({ ...data, updatedAt: new Date() })
        .where(
          and(
            eq(appointments.seriesId, appointment.seriesId),
            gte(appointments.date, appointment.date)
          )
        )
        .returning();

      return updatedAppointments;
    }
  }

  async changeSeriesFrequency(appointmentId: string, newFrequency: "semanal" | "quincenal"): Promise<Appointment[]> {
    const appointment = await this.getAppointment(appointmentId);
    if (!appointment || !appointment.seriesId) {
      throw new Error("Appointment not found or not part of a series");
    }

    const futureAppointments = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.seriesId, appointment.seriesId),
          gte(appointments.date, appointment.date)
        )
      )
      .orderBy(asc(appointments.date));

    if (futureAppointments.length === 0) {
      return [];
    }

    const intervalDays = newFrequency === "semanal" ? 7 : 14;
    const baseDate = new Date(appointment.date);
    
    const updatedAppointments: Appointment[] = [];
    for (let i = 0; i < futureAppointments.length; i++) {
      const newDate = new Date(baseDate);
      newDate.setDate(baseDate.getDate() + (i * intervalDays));

      const [updated] = await db
        .update(appointments)
        .set({ 
          date: newDate,
          frequency: newFrequency,
          updatedAt: new Date() 
        })
        .where(eq(appointments.id, futureAppointments[i].id))
        .returning();

      updatedAppointments.push(updated);
    }

    return updatedAppointments;
  }
}

export const storage = new DatabaseStorage();
