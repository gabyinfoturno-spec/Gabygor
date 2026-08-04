// ============================================================
// Tipos TypeScript para el sistema de turnos
// Derivados del schema de Supabase (supabase/schema.sql)
// ============================================================

// --- Enums ---

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'rescheduled'
  | 'no_show';

export type AppointmentAction =
  | 'created'
  | 'rescheduled'
  | 'cancelled'
  | 'completed'
  | 'no_show';

export type BlockType = 'vacation' | 'holiday' | 'personal' | 'other';

export type CampaignSegment = 'all' | 'with_appointments' | 'active_last_months';

export type CampaignStatus = 'draft' | 'sending' | 'sent' | 'failed';

// --- Tablas principales ---

export interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  is_active: boolean;
  display_order: number;
  compatible_services: string[];
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  access_token: string;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  client_id: string;
  service_id: string;
  appointment_date: string; // DATE como string (YYYY-MM-DD)
  start_time: string;       // TIME como string (HH:MM:SS)
  end_time: string;         // TIME como string (HH:MM:SS)
  status: AppointmentStatus;
  reminder_client_sent: boolean;
  reminder_barber_sent: boolean;
  original_appointment_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Turno con datos del servicio y cliente (joins) */
export interface AppointmentWithDetails extends Appointment {
  service: Service;
  client: Client;
}

export interface AppointmentHistory {
  id: string;
  appointment_id: string;
  action: AppointmentAction;
  previous_date: string | null;
  previous_start_time: string | null;
  previous_end_time: string | null;
  new_date: string | null;
  new_start_time: string | null;
  new_end_time: string | null;
  performed_by: string;
  notes: string | null;
  created_at: string;
}

export interface WorkingHours {
  id: string;
  day_of_week: number;   // 0=Domingo, 6=Sábado
  is_working_day: boolean;
  start_time: string | null;
  end_time: string | null;
  interval_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface BlockedDate {
  id: string;
  blocked_date: string;
  end_date: string | null;
  reason: string | null;
  block_type: BlockType;
  created_at: string;
}

export interface SiteSetting {
  id: string;
  setting_key: string;
  setting_value: string | null;
  setting_group: string;
  updated_at: string;
}

export interface EmailCampaign {
  id: string;
  subject: string;
  content: string;
  segment_type: CampaignSegment;
  segment_value: number | null;
  recipients_count: number;
  status: CampaignStatus;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailLog {
  id: string;
  recipient: string;
  subject: string;
  email_type: string;
  reference_id: string | null;
  status: string;
  error_message: string | null;
  sent_at: string;
}

// --- Tipos de funciones RPC de Supabase ---

export interface AvailableSlot {
  slot_start: string;
  slot_end: string;
}

export interface AvailableDate {
  available_date: string;
  available_slots: number;
}

export interface DashboardMetrics {
  appointments_today: number;
  appointments_week: number;
  appointments_month: number;
  total_clients: number;
  upcoming_appointments: UpcomingAppointment[];
  top_services: TopService[];
}

export interface UpcomingAppointment {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  client_name: string;
  client_email: string;
  service_name: string;
  service_price: number;
}

export interface TopService {
  name: string;
  total_appointments: number;
}

export interface ReminderAppointment {
  appointment_id: string;
  client_name: string;
  client_email: string;
  service_name: string;
  appointment_date: string;
  start_time: string;
  reminder_client_sent: boolean;
  reminder_barber_sent: boolean;
}

// --- Tipos para formularios y API ---

export interface ServiceFormData {
  name: string;
  description?: string;
  price: number;
  duration_minutes: number;
  is_active: boolean;
}

export interface AppointmentActionPayload {
  action: 'reschedule' | 'cancel' | 'complete' | 'no_show' | 'confirm';
  newDate?: string;
  newStartTime?: string;
  newEndTime?: string;
  performedBy?: 'client' | 'admin';
}

export interface CampaignFormData {
  subject: string;
  content: string;
  segment_type: CampaignSegment;
  segment_value?: number;
}

/** Mapa de configuración (clave-valor plano) */
export type SiteSettingsMap = Record<string, string>;

/** Cliente con conteo de turnos (para admin) */
export interface ClientWithCount extends Client {
  appointment_count: number;
}

/** Respuesta estándar de la API */
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

export interface BookingStepDefinition {
  id: number;
  title: string;
}

