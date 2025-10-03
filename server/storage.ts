import {
  users,
  therapists,
  clientAvailability,
  appointments,
  therapistWorkingHours,
  settings,
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
  type Setting,
  type InsertSetting,
  type UpdateSetting,
  type SwapSuggestion,
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
  detectConflictAndSuggestSwap(therapistId: string, date: string, startTime: string, endTime: string, clientId: string): Promise<SwapSuggestion | null>;
  
  // Client operations
  getAllClients(): Promise<User[]>;
  getClient(id: string): Promise<User | undefined>;
  createManualClient(client: InsertManualClient): Promise<User>;
  updateClient(id: string, client: UpdateClient): Promise<User>;
  deleteClient(id: string): Promise<void>;
  
  // Therapist working hours operations
  getTherapistWorkingHours(therapistId: string): Promise<TherapistWorkingHours[]>;
  setTherapistWorkingHours(therapistId: string, hours: InsertTherapistWorkingHours[]): Promise<TherapistWorkingHours[]>;
  
  // Settings operations
  getAllSettings(): Promise<Setting[]>;
  getSetting(key: string): Promise<Setting | undefined>;
  upsertSetting(key: string, value: any): Promise<Setting>;
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

  async detectConflictAndSuggestSwap(
    therapistId: string,
    date: string,
    startTime: string,
    endTime: string,
    clientId: string
  ): Promise<SwapSuggestion | null> {
    const appointmentDate = new Date(date);
    appointmentDate.setHours(0, 0, 0, 0);
    
    const nextDay = new Date(appointmentDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    const conflictingAppointments = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.therapistId, therapistId),
          gte(appointments.date, appointmentDate),
          lte(appointments.date, nextDay),
          eq(appointments.status, "confirmed")
        )
      );
    
    const conflictingAppointment = conflictingAppointments.find(apt => {
      if (apt.startTime >= endTime || apt.endTime <= startTime) {
        return false;
      }
      return true;
    });
    
    if (!conflictingAppointment) {
      return null;
    }
    
    const conflictingClient = await this.getClient(conflictingAppointment.clientId);
    if (!conflictingClient) {
      return null;
    }
    
    const conflictingClientAvailability = await this.getClientAvailability(conflictingAppointment.clientId);
    
    if (conflictingClientAvailability.length === 0) {
      return null;
    }
    
    const therapistWorkingHours = await this.getTherapistWorkingHours(therapistId);
    
    const duration = conflictingAppointment.durationMinutes;
    const searchStartDate = new Date();
    searchStartDate.setHours(0, 0, 0, 0);
    const searchEndDate = new Date(searchStartDate);
    searchEndDate.setDate(searchEndDate.getDate() + 14);
    
    const existingAppointments = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.therapistId, therapistId),
          gte(appointments.date, searchStartDate),
          lte(appointments.date, searchEndDate),
          eq(appointments.status, "confirmed")
        )
      );
    
    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
      const checkDate = new Date(searchStartDate);
      checkDate.setDate(checkDate.getDate() + dayOffset);
      const dayOfWeek = checkDate.getDay();
      
      const clientAvailableSlots = conflictingClientAvailability.filter(
        av => av.dayOfWeek === dayOfWeek
      );
      
      if (clientAvailableSlots.length === 0) {
        continue;
      }
      
      const therapistWorkingDay = therapistWorkingHours.filter(
        wh => wh.dayOfWeek === dayOfWeek
      );
      
      if (therapistWorkingDay.length === 0) {
        continue;
      }
      
      for (const clientSlot of clientAvailableSlots) {
        for (const workingHour of therapistWorkingDay) {
          const slotStart = clientSlot.startTime > workingHour.startTime 
            ? clientSlot.startTime 
            : workingHour.startTime;
          
          const slotEnd = clientSlot.endTime < workingHour.endTime 
            ? clientSlot.endTime 
            : workingHour.endTime;
          
          if (slotStart >= slotEnd) {
            continue;
          }
          
          const slotStartMinutes = parseInt(slotStart.split(':')[0]) * 60 + parseInt(slotStart.split(':')[1]);
          const slotEndMinutes = parseInt(slotEnd.split(':')[0]) * 60 + parseInt(slotEnd.split(':')[1]);
          
          if (slotEndMinutes - slotStartMinutes < duration) {
            continue;
          }
          
          const appointmentEndMinutes = slotStartMinutes + duration;
          const appointmentEndHour = Math.floor(appointmentEndMinutes / 60);
          const appointmentEndMin = appointmentEndMinutes % 60;
          const proposedEndTime = `${appointmentEndHour.toString().padStart(2, '0')}:${appointmentEndMin.toString().padStart(2, '0')}`;
          
          const nextDayCheck = new Date(checkDate);
          nextDayCheck.setDate(nextDayCheck.getDate() + 1);
          
          const dayAppointments = existingAppointments.filter(apt => {
            const aptDate = new Date(apt.date);
            aptDate.setHours(0, 0, 0, 0);
            return aptDate.getTime() === checkDate.getTime();
          });
          
          const hasConflict = dayAppointments.some(apt => {
            if (apt.id === conflictingAppointment.id) {
              return false;
            }
            return !(slotStart >= apt.endTime || proposedEndTime <= apt.startTime);
          });
          
          if (hasConflict) {
            continue;
          }
          
          const suggestion: SwapSuggestion = {
            conflictingAppointmentId: conflictingAppointment.id,
            conflictingClientId: conflictingClient.id,
            conflictingClientName: `${conflictingClient.firstName} ${conflictingClient.lastName}`,
            conflictingClientPhone: conflictingClient.phone || undefined,
            currentSlot: {
              date: conflictingAppointment.date.toISOString().split('T')[0],
              startTime: conflictingAppointment.startTime,
              endTime: conflictingAppointment.endTime,
            },
            suggestedSlot: {
              date: checkDate.toISOString().split('T')[0],
              startTime: slotStart,
              endTime: proposedEndTime,
            },
            rationale: `Cliente ${conflictingClient.firstName} ${conflictingClient.lastName} puede ser movido al ${checkDate.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} de ${slotStart} a ${proposedEndTime}, horario compatible con su disponibilidad.`,
          };
          
          return suggestion;
        }
      }
    }
    
    return null;
  }

  // Settings operations
  async getAllSettings(): Promise<Setting[]> {
    return await db.select().from(settings);
  }

  async getSetting(key: string): Promise<Setting | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting;
  }

  async upsertSetting(key: string, value: any): Promise<Setting> {
    const [setting] = await db
      .insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({
        target: settings.key,
        set: {
          value,
          updatedAt: new Date(),
        },
      })
      .returning();
    return setting;
  }
}

export const storage = new DatabaseStorage();
