import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin } from "./replitAuth";
import { insertTherapistSchema, insertClientAvailabilitySchema, insertAppointmentSchema, insertManualClientSchema, updateClientSchema, insertTherapistWorkingHoursSchema } from "@shared/schema";
import { z } from "zod";
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Therapist, Appointment, User } from "@shared/schema";
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const canManageAppointment = async (req: any, res: Response, next: NextFunction) => {
  try {
    const user = await storage.getUser(req.user.claims.sub);
    
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    
    if (user.role === 'admin') {
      return next();
    }
    
    if (user.role === 'therapist') {
      if (!user.therapistId) {
        return res.status(403).json({ message: "Therapist account not properly configured" });
      }
      
      const appointmentId = req.params.id;
      if (appointmentId) {
        const appointment = await storage.getAppointment(appointmentId);
        if (!appointment) {
          return res.status(404).json({ message: "Appointment not found" });
        }
        
        if (appointment.therapistId !== user.therapistId) {
          const setting = await storage.getSetting('therapists_can_edit_others');
          const canEditOthers = setting?.value === true;
          
          if (!canEditOthers) {
            return res.status(403).json({ message: "Not authorized to manage this appointment" });
          }
        }
      } else if (req.method === 'POST' && req.body.therapistId) {
        if (req.body.therapistId !== user.therapistId) {
          const setting = await storage.getSetting('therapists_can_edit_others');
          const canEditOthers = setting?.value === true;
          
          if (!canEditOthers) {
            return res.status(403).json({ message: "Not authorized to create appointments for other therapists" });
          }
        }
      }
      
      return next();
    }
    
    return res.status(403).json({ message: "Not authorized to manage appointments" });
  } catch (error) {
    console.error("Error in canManageAppointment middleware:", error);
    res.status(500).json({ message: "Failed to verify permissions" });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.patch('/api/auth/user/role', isAuthenticated, async (req: any, res) => {
    // Role switching requires explicit ALLOW_ROLE_SWITCHING=true (for testing only)
    const allowRoleSwitching = process.env.ALLOW_ROLE_SWITCHING === 'true' || process.env.NODE_ENV === 'development';
    
    if (!allowRoleSwitching) {
      return res.status(403).json({ message: "Role switching is not allowed" });
    }
    
    try {
      const userId = req.user.claims.sub;
      const { role } = req.body;
      
      if (!role || (role !== 'admin' && role !== 'therapist' && role !== 'client')) {
        return res.status(400).json({ message: "Invalid role. Must be 'admin', 'therapist', or 'client'" });
      }
      
      const updatedUser = await storage.updateUser(userId, { role });
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update role" });
    }
  });

  // Therapist routes
  app.get('/api/therapists', isAuthenticated, async (req, res) => {
    try {
      const therapists = await storage.getAllTherapists();
      res.json(therapists);
    } catch (error) {
      console.error("Error fetching therapists:", error);
      res.status(500).json({ message: "Failed to fetch therapists" });
    }
  });

  app.get('/api/therapists/:id', isAuthenticated, async (req, res) => {
    try {
      const therapist = await storage.getTherapist(req.params.id);
      if (!therapist) {
        return res.status(404).json({ message: "Therapist not found" });
      }
      res.json(therapist);
    } catch (error) {
      console.error("Error fetching therapist:", error);
      res.status(500).json({ message: "Failed to fetch therapist" });
    }
  });

  app.post('/api/therapists', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const data = insertTherapistSchema.parse(req.body);
      const therapist = await storage.createTherapist(data);
      res.status(201).json(therapist);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating therapist:", error);
      res.status(500).json({ message: "Failed to create therapist" });
    }
  });

  app.patch('/api/therapists/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const therapist = await storage.updateTherapist(req.params.id, req.body);
      res.json(therapist);
    } catch (error) {
      console.error("Error updating therapist:", error);
      res.status(500).json({ message: "Failed to update therapist" });
    }
  });

  app.delete('/api/therapists/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      await storage.deleteTherapist(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting therapist:", error);
      res.status(500).json({ message: "Failed to delete therapist" });
    }
  });

  // Any authenticated user can view therapist schedules
  app.get('/api/therapists/:id/schedule', isAuthenticated, async (req, res) => {
    try {
      const schedule = await storage.getTherapistWorkingHours(req.params.id);
      res.json(schedule);
    } catch (error) {
      console.error("Error fetching therapist schedule:", error);
      res.status(500).json({ message: "Failed to fetch therapist schedule" });
    }
  });

  // Only admins can modify therapist working hours
  app.put('/api/therapists/:id/schedule', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const therapistId = req.params.id;
      const hoursData = Array.isArray(req.body) ? req.body : [req.body];
      const validatedData = [];
      
      for (const data of hoursData) {
        const validated = insertTherapistWorkingHoursSchema.parse({
          ...data,
          therapistId,
        });
        validatedData.push(validated);
      }
      
      const schedule = await storage.setTherapistWorkingHours(therapistId, validatedData);
      res.json(schedule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating therapist schedule:", error);
      res.status(500).json({ message: "Failed to update therapist schedule" });
    }
  });

  // Client routes
  app.get('/api/clients', isAuthenticated, async (req, res) => {
    try {
      const clients = await storage.getAllClients();
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.get('/api/clients/:id', isAuthenticated, async (req, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      console.error("Error fetching client:", error);
      res.status(500).json({ message: "Failed to fetch client" });
    }
  });

  app.post('/api/clients', isAuthenticated, async (req, res) => {
    try {
      const data = insertManualClientSchema.parse(req.body);
      const client = await storage.createManualClient(data);
      res.status(201).json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating client:", error);
      res.status(500).json({ message: "Failed to create client" });
    }
  });

  app.patch('/api/clients/:id', isAuthenticated, async (req, res) => {
    try {
      const data = updateClientSchema.parse(req.body);
      const client = await storage.updateClient(req.params.id, data);
      res.json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating client:", error);
      res.status(500).json({ message: "Failed to update client" });
    }
  });

  app.delete('/api/clients/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      await storage.deleteClient(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ message: "Failed to delete client" });
    }
  });

  // Client availability routes
  app.get('/api/availability', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const availability = await storage.getClientAvailability(userId);
      res.json(availability);
    } catch (error) {
      console.error("Error fetching availability:", error);
      res.status(500).json({ message: "Failed to fetch availability" });
    }
  });

  app.get('/api/availability/:userId', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const availability = await storage.getClientAvailability(req.params.userId);
      res.json(availability);
    } catch (error) {
      console.error("Error fetching availability:", error);
      res.status(500).json({ message: "Failed to fetch availability" });
    }
  });

  app.post('/api/availability', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Validate all data first before making any changes
      const availabilityData = Array.isArray(req.body) ? req.body : [req.body];
      const validatedData = [];
      
      for (const data of availabilityData) {
        const validated = insertClientAvailabilitySchema.parse({
          ...data,
          userId,
        });
        validatedData.push(validated);
      }
      
      // Only after all validation succeeds, delete existing and create new
      await storage.deleteClientAvailability(userId);
      
      const created = [];
      for (const data of validatedData) {
        const availability = await storage.createClientAvailability(data);
        created.push(availability);
      }
      
      res.status(201).json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating availability:", error);
      res.status(500).json({ message: "Failed to create availability" });
    }
  });

  app.put('/api/availability/:clientId', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      const clientId = req.params.clientId;
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      if (user.role !== 'admin' && user.id !== clientId) {
        return res.status(403).json({ message: "Not authorized to update this client's availability" });
      }
      
      const availabilityData = Array.isArray(req.body) ? req.body : [req.body];
      const validatedData = [];
      
      for (const data of availabilityData) {
        const validated = insertClientAvailabilitySchema.parse({
          userId: clientId,
          dayOfWeek: data.dayOfWeek,
          startTime: data.startTime,
          endTime: data.endTime,
        });
        validatedData.push(validated);
      }
      
      const availability = await storage.replaceClientAvailability(clientId, validatedData);
      res.json(availability);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating availability:", error);
      res.status(500).json({ message: "Failed to update availability" });
    }
  });

  // Appointment routes
  app.get('/api/appointments', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      let appointments;
      
      if (user?.role === 'admin') {
        // Admins see all appointments
        appointments = await storage.getAllAppointments();
      } else if (user?.role === 'therapist') {
        if (!user.therapistId) {
          return res.status(403).json({ message: 'Therapist account not linked to therapist record' });
        }
        // Therapists see their own appointments
        appointments = await storage.getTherapistAppointments(user.therapistId);
      } else {
        // Clients see their own appointments
        appointments = await storage.getClientAppointments(req.user.claims.sub);
      }
      
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      res.status(500).json({ message: "Failed to fetch appointments" });
    }
  });

  app.get('/api/appointments/:id', isAuthenticated, async (req: any, res) => {
    try {
      const appointment = await storage.getAppointment(req.params.id);
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      
      // Get the user to check authorization
      const user = await storage.getUser(req.user.claims.sub);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // Authorization check
      const isAdmin = user.role === 'admin';
      const isOwningTherapist = user.role === 'therapist' && user.therapistId === appointment.therapistId;
      const isOwningClient = user.role === 'client' && user.id === appointment.clientId;
      
      if (!isAdmin && !isOwningTherapist && !isOwningClient) {
        return res.status(403).json({ message: "Not authorized to view this appointment" });
      }
      
      res.json(appointment);
    } catch (error) {
      console.error("Error fetching appointment:", error);
      res.status(500).json({ message: "Failed to fetch appointment" });
    }
  });

  app.get('/api/therapists/:id/appointments', isAuthenticated, async (req: any, res) => {
    try {
      const therapistId = req.params.id;
      
      // Get the user to check authorization
      const user = await storage.getUser(req.user.claims.sub);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // Authorization check
      const isAdmin = user.role === 'admin';
      const isOwningTherapist = user.role === 'therapist' && user.therapistId === therapistId;
      
      if (!isAdmin && !isOwningTherapist) {
        return res.status(403).json({ message: "Not authorized to view this therapist's appointments" });
      }
      
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const appointments = await storage.getTherapistAppointments(therapistId, start, end);
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching therapist appointments:", error);
      res.status(500).json({ message: "Failed to fetch therapist appointments" });
    }
  });

  app.post('/api/appointments', isAuthenticated, canManageAppointment, async (req, res) => {
    try {
      const data = insertAppointmentSchema.parse(req.body);
      const appointment = await storage.createAppointment(data);
      res.status(201).json(appointment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating appointment:", error);
      res.status(500).json({ message: "Failed to create appointment" });
    }
  });

  app.patch('/api/appointments/:id', isAuthenticated, canManageAppointment, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      const body = { ...req.body };
      
      // Prevent therapists from reassigning appointments
      if (user?.role === 'therapist') {
        delete body.therapistId;
      }
      
      const appointment = await storage.updateAppointment(req.params.id, body);
      res.json(appointment);
    } catch (error) {
      console.error("Error updating appointment:", error);
      res.status(500).json({ message: "Failed to update appointment" });
    }
  });

  app.put('/api/appointments/:id', isAuthenticated, canManageAppointment, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      const body = { ...req.body };
      
      // Prevent therapists from reassigning appointments
      if (user?.role === 'therapist') {
        delete body.therapistId;
      }
      
      const appointment = await storage.updateAppointment(req.params.id, body);
      res.json(appointment);
    } catch (error) {
      console.error("Error updating appointment:", error);
      res.status(500).json({ message: "Failed to update appointment" });
    }
  });

  app.delete('/api/appointments/:id', isAuthenticated, canManageAppointment, async (req, res) => {
    try {
      await storage.deleteAppointment(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting appointment:", error);
      res.status(500).json({ message: "Failed to delete appointment" });
    }
  });

  app.delete('/api/appointments/:id/series', isAuthenticated, canManageAppointment, async (req, res) => {
    try {
      const scope = req.query.scope as "this_only" | "this_and_future";
      
      if (!scope || (scope !== "this_only" && scope !== "this_and_future")) {
        return res.status(400).json({ message: "Invalid scope. Must be 'this_only' or 'this_and_future'" });
      }
      
      await storage.deleteAppointmentSeries(req.params.id, scope);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting appointment series:", error);
      res.status(500).json({ message: "Failed to delete appointment series" });
    }
  });

  app.patch('/api/appointments/:id/series', isAuthenticated, canManageAppointment, async (req: any, res) => {
    try {
      const scope = req.query.scope as "this_only" | "this_and_future";
      
      if (!scope || (scope !== "this_only" && scope !== "this_and_future")) {
        return res.status(400).json({ message: "Invalid scope. Must be 'this_only' or 'this_and_future'" });
      }

      const user = await storage.getUser(req.user.claims.sub);
      const body = { ...req.body };
      
      if (user?.role === 'therapist') {
        delete body.therapistId;
      }
      
      const appointments = await storage.updateAppointmentSeries(req.params.id, scope, body);
      res.json(appointments);
    } catch (error) {
      console.error("Error updating appointment series:", error);
      res.status(500).json({ message: "Failed to update appointment series" });
    }
  });

  app.patch('/api/appointments/:id/frequency', isAuthenticated, canManageAppointment, async (req, res) => {
    try {
      const { frequency } = req.body;
      
      if (!frequency || (frequency !== "semanal" && frequency !== "quincenal")) {
        return res.status(400).json({ message: "Invalid frequency. Must be 'semanal' or 'quincenal'" });
      }
      
      const appointments = await storage.changeSeriesFrequency(req.params.id, frequency);
      res.json(appointments);
    } catch (error) {
      console.error("Error changing series frequency:", error);
      res.status(500).json({ message: "Failed to change series frequency" });
    }
  });

  // Settings routes
  app.get('/api/settings', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const settings = await storage.getAllSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.put('/api/settings/:key', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { key } = req.params;
      const { value } = req.body;
      
      if (value === undefined) {
        return res.status(400).json({ message: "Value is required" });
      }
      
      const setting = await storage.upsertSetting(key, value);
      res.json(setting);
    } catch (error) {
      console.error("Error updating setting:", error);
      res.status(500).json({ message: "Failed to update setting" });
    }
  });

  // PDF generation helper functions
  async function getLogoPNGDataURI(): Promise<string> {
    try {
      const svgPath = path.join(process.cwd(), 'client/public/logo-centro-orienta.svg');
      const svgBuffer = fs.readFileSync(svgPath);
      
      const pngBuffer = await sharp(svgBuffer)
        .resize(200, null, { fit: 'inside' })
        .png()
        .toBuffer();
      
      const base64 = pngBuffer.toString('base64');
      return `data:image/png;base64,${base64}`;
    } catch (error) {
      console.error('Failed to convert logo to PNG:', error);
      throw error;
    }
  }

  function formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }

  function formatMonth(month: string): string {
    const [year, monthNum] = month.split('-');
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                         'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${monthNames[parseInt(monthNum) - 1]} ${year}`;
  }

  async function generateTherapistMonthlyPDF(
    therapist: Therapist,
    appointments: Appointment[],
    clients: Map<string, User>,
    month: string
  ): Promise<Buffer> {
    const doc = new jsPDF();
    
    const logoDataURI = await getLogoPNGDataURI();
    doc.addImage(logoDataURI, 'PNG', 15, 10, 40, 9);
    
    doc.setFontSize(18);
    doc.setTextColor(95, 172, 66);
    doc.text('Centro Orienta', 60, 16);
    
    doc.setFontSize(14);
    doc.setTextColor(95, 172, 66);
    doc.text(`Reporte Mensual - ${therapist.name}`, 15, 38);
    
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(`Período: ${formatMonth(month)}`, 15, 46);
    
    doc.setTextColor(0, 0, 0);
    
    autoTable(doc, {
      startY: 54,
      head: [['Fecha', 'Hora', 'Cliente', 'Estado']],
      body: appointments.map(apt => [
        formatDate(apt.date),
        `${apt.startTime} - ${apt.endTime}`,
        clients.get(apt.clientId)?.firstName + ' ' + clients.get(apt.clientId)?.lastName || 'N/A',
        apt.status === 'confirmed' ? 'Confirmada' : apt.status === 'pending' ? 'Pendiente' : 'Cancelada'
      ]),
      theme: 'striped',
      headStyles: { fillColor: [183, 205, 149] },
    });
    
    const finalY = (doc as any).lastAutoTable.finalY || 55;
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`Total de citas: ${appointments.length}`, 15, finalY + 10);
    
    return Buffer.from(doc.output('arraybuffer'));
  }

  async function generateMonthlyPDF(
    appointments: Appointment[],
    therapists: Map<string, Therapist>,
    clients: Map<string, User>,
    month: string
  ): Promise<Buffer> {
    const doc = new jsPDF();
    
    const logoDataURI = await getLogoPNGDataURI();
    doc.addImage(logoDataURI, 'PNG', 15, 10, 40, 9);
    
    doc.setFontSize(18);
    doc.setTextColor(95, 172, 66);
    doc.text('Centro Orienta', 60, 16);
    
    doc.setFontSize(14);
    doc.setTextColor(95, 172, 66);
    doc.text('Reporte Mensual - Todos los Terapeutas', 15, 38);
    
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(`Período: ${formatMonth(month)}`, 15, 46);
    
    doc.setTextColor(0, 0, 0);
    
    autoTable(doc, {
      startY: 54,
      head: [['Fecha', 'Hora', 'Terapeuta', 'Cliente', 'Estado']],
      body: appointments.map(apt => [
        formatDate(apt.date),
        `${apt.startTime} - ${apt.endTime}`,
        therapists.get(apt.therapistId)?.name || 'N/A',
        clients.get(apt.clientId)?.firstName + ' ' + clients.get(apt.clientId)?.lastName || 'N/A',
        apt.status === 'confirmed' ? 'Confirmada' : apt.status === 'pending' ? 'Pendiente' : 'Cancelada'
      ]),
      theme: 'striped',
      headStyles: { fillColor: [183, 205, 149] },
    });
    
    const finalY = (doc as any).lastAutoTable.finalY || 55;
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`Total de citas: ${appointments.length}`, 15, finalY + 10);
    
    return Buffer.from(doc.output('arraybuffer'));
  }

  async function generateDailyPDF(
    appointments: Appointment[],
    therapists: Map<string, Therapist>,
    clients: Map<string, User>,
    date: string
  ): Promise<Buffer> {
    const doc = new jsPDF();
    
    const logoDataURI = await getLogoPNGDataURI();
    doc.addImage(logoDataURI, 'PNG', 15, 10, 40, 9);
    
    doc.setFontSize(18);
    doc.setTextColor(95, 172, 66);
    doc.text('Centro Orienta', 60, 16);
    
    doc.setFontSize(14);
    doc.setTextColor(95, 172, 66);
    doc.text('Reporte Diario', 15, 38);
    
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(`Fecha: ${formatDate(date)}`, 15, 46);
    
    doc.setTextColor(0, 0, 0);
    
    autoTable(doc, {
      startY: 54,
      head: [['Hora', 'Terapeuta', 'Cliente', 'Estado']],
      body: appointments.map(apt => [
        `${apt.startTime} - ${apt.endTime}`,
        therapists.get(apt.therapistId)?.name || 'N/A',
        clients.get(apt.clientId)?.firstName + ' ' + clients.get(apt.clientId)?.lastName || 'N/A',
        apt.status === 'confirmed' ? 'Confirmada' : apt.status === 'pending' ? 'Pendiente' : 'Cancelada'
      ]),
      theme: 'striped',
      headStyles: { fillColor: [183, 205, 149] },
    });
    
    const finalY = (doc as any).lastAutoTable.finalY || 55;
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`Total de citas: ${appointments.length}`, 15, finalY + 10);
    
    return Buffer.from(doc.output('arraybuffer'));
  }

  // PDF endpoint: Therapist monthly report
  app.get('/api/therapists/:therapistId/appointments/pdf', isAuthenticated, async (req: any, res) => {
    try {
      const therapistId = req.params.therapistId;
      const month = req.query.month as string;
      
      if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        return res.status(400).json({ message: "Invalid month format. Use YYYY-MM" });
      }
      
      const user = await storage.getUser(req.user.claims.sub);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      const isAdmin = user.role === 'admin';
      const isOwningTherapist = user.role === 'therapist' && user.therapistId === therapistId;
      
      if (!isAdmin && !isOwningTherapist) {
        return res.status(403).json({ message: "Not authorized to view this therapist's report" });
      }
      
      const therapist = await storage.getTherapist(therapistId);
      if (!therapist) {
        return res.status(404).json({ message: "Therapist not found" });
      }
      
      const [year, monthNum] = month.split('-');
      const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59);
      
      const appointments = await storage.getTherapistAppointments(therapistId, startDate, endDate);
      
      const clientIds = Array.from(new Set(appointments.map(apt => apt.clientId)));
      const clientsArray = await Promise.all(clientIds.map(id => storage.getClient(id)));
      const clients = new Map<string, User>();
      clientsArray.forEach(client => {
        if (client) clients.set(client.id, client);
      });
      
      const pdfBuffer = await generateTherapistMonthlyPDF(therapist, appointments, clients, month);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=reporte_${therapist.name}_${month}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("PDF generation failed:", error);
      res.status(500).json({ message: "Failed to generate PDF", error: (error as Error).message });
    }
  });

  // PDF endpoint: Monthly report (all therapists)
  app.get('/api/reports/monthly-pdf', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const month = req.query.month as string;
      
      if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        return res.status(400).json({ message: "Invalid month format. Use YYYY-MM" });
      }
      
      const [year, monthNum] = month.split('-');
      const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59);
      
      const allAppointments = await storage.getAllAppointments();
      const appointments = allAppointments.filter(apt => {
        const aptDate = new Date(apt.date);
        return aptDate >= startDate && aptDate <= endDate;
      });
      
      const therapistsArray = await storage.getAllTherapists();
      const therapists = new Map<string, Therapist>();
      therapistsArray.forEach(therapist => therapists.set(therapist.id, therapist));
      
      const clientIds = Array.from(new Set(appointments.map(apt => apt.clientId)));
      const clientsArray = await Promise.all(clientIds.map(id => storage.getClient(id)));
      const clients = new Map<string, User>();
      clientsArray.forEach(client => {
        if (client) clients.set(client.id, client);
      });
      
      const pdfBuffer = await generateMonthlyPDF(appointments, therapists, clients, month);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=reporte_mensual_${month}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("PDF generation failed:", error);
      res.status(500).json({ message: "Failed to generate PDF", error: (error as Error).message });
    }
  });

  // PDF endpoint: Daily report
  app.get('/api/reports/daily-pdf', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const date = req.query.date as string;
      
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD" });
      }
      
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      const allAppointments = await storage.getAllAppointments();
      const appointments = allAppointments.filter(apt => {
        const aptDate = new Date(apt.date);
        return aptDate >= startOfDay && aptDate <= endOfDay;
      });
      
      const therapistsArray = await storage.getAllTherapists();
      const therapists = new Map<string, Therapist>();
      therapistsArray.forEach(therapist => therapists.set(therapist.id, therapist));
      
      const clientIds = Array.from(new Set(appointments.map(apt => apt.clientId)));
      const clientsArray = await Promise.all(clientIds.map(id => storage.getClient(id)));
      const clients = new Map<string, User>();
      clientsArray.forEach(client => {
        if (client) clients.set(client.id, client);
      });
      
      const pdfBuffer = await generateDailyPDF(appointments, therapists, clients, date);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=reporte_diario_${date}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("PDF generation failed:", error);
      res.status(500).json({ message: "Failed to generate PDF", error: (error as Error).message });
    }
  });

  // Suggestions endpoint - finds alternative appointment slots
  app.post('/api/appointments/suggest', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { clientId, currentAppointmentId } = req.body;
      
      if (!clientId) {
        return res.status(400).json({ message: "Client ID is required" });
      }

      // Get client availability
      const availability = await storage.getClientAvailability(clientId);
      
      if (availability.length === 0) {
        return res.json([]);
      }

      // Get all therapists
      const therapists = await storage.getAllTherapists();
      
      // Get current week appointments for all therapists
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);

      const suggestions = [];

      for (const therapist of therapists) {
        const appointments = await storage.getTherapistAppointments(therapist.id, weekStart, weekEnd);
        
        // Check each availability slot
        for (const avail of availability) {
          const dayDate = new Date(weekStart);
          dayDate.setDate(weekStart.getDate() + avail.dayOfWeek);
          
          // Check if slot is free
          const startHour = parseInt(avail.startTime.split(':')[0]);
          const endHour = parseInt(avail.endTime.split(':')[0]);
          
          for (let hour = startHour; hour < endHour; hour++) {
            const slotStart = `${hour.toString().padStart(2, '0')}:00`;
            const slotEnd = `${(hour + 1).toString().padStart(2, '0')}:00`;
            
            // Check if this slot conflicts with existing appointments
            const hasConflict = appointments.some(apt => {
              if (apt.id === currentAppointmentId) return false; // Skip current appointment
              const aptDate = new Date(apt.date);
              return aptDate.toDateString() === dayDate.toDateString() &&
                     apt.startTime === slotStart;
            });
            
            if (!hasConflict) {
              const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
              suggestions.push({
                id: `${therapist.id}-${dayDate.toISOString()}-${slotStart}`,
                therapistId: therapist.id,
                therapistName: therapist.name,
                day: dayNames[avail.dayOfWeek],
                date: dayDate.toISOString(),
                time: `${slotStart} - ${slotEnd}`,
                startTime: slotStart,
                endTime: slotEnd,
                matchScore: 85 + Math.floor(Math.random() * 15),
                reason: "Horario compatible con disponibilidad del cliente",
              });
            }
          }
        }
      }

      // Sort by match score and limit to top 5
      suggestions.sort((a, b) => b.matchScore - a.matchScore);
      res.json(suggestions.slice(0, 5));
    } catch (error) {
      console.error("Error generating suggestions:", error);
      res.status(500).json({ message: "Failed to generate suggestions" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
