-- ============================================================
-- SISTEMA DE GESTIÓN DE TURNOS PARA BARBERO
-- Schema PostgreSQL para Supabase
-- ============================================================
-- Ejecutar este archivo en el SQL Editor de Supabase
-- o migrarlo mediante supabase CLI.
-- ============================================================


-- ============================================================
-- 0. EXTENSIONES NECESARIAS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================
-- 1. TIPOS ENUMERADOS (ENUMS)
-- ============================================================

-- Estados posibles de un turno (RF-09, RF-11, RF-24)
CREATE TYPE appointment_status AS ENUM (
  'pending',        -- Reservado, pendiente de atención
  'confirmed',      -- Confirmado
  'completed',      -- Completado / Atendido
  'cancelled',      -- Cancelado por el cliente o barbero
  'rescheduled',    -- Reprogramado (estado transitorio, se crea nuevo turno)
  'no_show'         -- El cliente no se presentó
);

-- Tipos de acción en el historial de turnos
CREATE TYPE appointment_action AS ENUM (
  'created',        -- Turno creado
  'rescheduled',    -- Turno reprogramado
  'cancelled',      -- Turno cancelado
  'completed',      -- Turno completado
  'no_show'         -- Cliente no se presentó
);

-- Tipos de bloqueo de fechas (RF-23)
CREATE TYPE block_type AS ENUM (
  'vacation',       -- Vacaciones
  'holiday',        -- Feriado
  'personal',       -- Evento personal
  'other'           -- Otro motivo
);

-- Segmentación de campañas de correo (RF-30)
CREATE TYPE campaign_segment AS ENUM (
  'all',                    -- Todos los clientes
  'with_appointments',      -- Clientes con al menos un turno
  'active_last_months'      -- Clientes activos en los últimos X meses
);

-- Estado de campaña de correo
CREATE TYPE campaign_status AS ENUM (
  'draft',          -- Borrador
  'sending',        -- En proceso de envío
  'sent',           -- Enviada
  'failed'          -- Falló el envío
);


-- ============================================================
-- 2. TABLAS PRINCIPALES
-- ============================================================

-- ------------------------------------------------------------
-- 2.1 SERVICIOS (RF-01, RF-02, RF-21)
-- ------------------------------------------------------------
-- Almacena los servicios ofrecidos por el barbero.
-- El administrador puede crear, editar, eliminar,
-- activar/desactivar y modificar precios.
-- ------------------------------------------------------------
CREATE TABLE services (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  description      TEXT,
  price            DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  duration_minutes INTEGER DEFAULT 30 CHECK (duration_minutes > 0),
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  display_order    INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE services IS 'Servicios ofrecidos por el barbero (RF-01, RF-21)';
COMMENT ON COLUMN services.name IS 'Nombre del servicio';
COMMENT ON COLUMN services.description IS 'Descripción opcional del servicio';
COMMENT ON COLUMN services.price IS 'Precio del servicio';
COMMENT ON COLUMN services.duration_minutes IS 'Duración estimada en minutos';
COMMENT ON COLUMN services.is_active IS 'Si el servicio está activo y visible para reservas';
COMMENT ON COLUMN services.display_order IS 'Orden de visualización en la lista de servicios';


-- ------------------------------------------------------------
-- 2.2 CLIENTES (RF-05, RF-25)
-- ------------------------------------------------------------
-- El correo electrónico es el identificador principal.
-- Se genera un token de acceso único para permitir
-- la gestión de turnos sin login (RF-08).
-- ------------------------------------------------------------
CREATE TABLE clients (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name        TEXT NOT NULL,
  email            TEXT NOT NULL,
  phone            TEXT,
  access_token     UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT clients_email_unique UNIQUE (email)
);

COMMENT ON TABLE clients IS 'Clientes registrados en el sistema (RF-25)';
COMMENT ON COLUMN clients.full_name IS 'Nombre completo del cliente';
COMMENT ON COLUMN clients.email IS 'Correo electrónico - identificador principal';
COMMENT ON COLUMN clients.phone IS 'Teléfono de contacto (opcional)';
COMMENT ON COLUMN clients.access_token IS 'Token UUID único para acceso al portal de gestión sin login (RF-08)';


-- ------------------------------------------------------------
-- 2.3 TURNOS / CITAS (RF-06, RF-09, RF-10, RF-11, RF-24)
-- ------------------------------------------------------------
-- Tabla principal de turnos. Cada turno se asocia a un
-- cliente y a un servicio. Incluye control de recordatorios.
-- ------------------------------------------------------------
CREATE TABLE appointments (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id              UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  service_id             UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  appointment_date       DATE NOT NULL,
  start_time             TIME NOT NULL,
  end_time               TIME NOT NULL,
  status                 appointment_status NOT NULL DEFAULT 'pending',

  -- Control de recordatorios (RF-17, RF-18)
  reminder_client_sent   BOOLEAN NOT NULL DEFAULT FALSE,
  reminder_barber_sent   BOOLEAN NOT NULL DEFAULT FALSE,

  -- Si fue reprogramado, referencia al turno original
  original_appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,

  -- Notas internas del barbero
  notes                  TEXT,

  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Validación: hora fin debe ser posterior a hora inicio
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

COMMENT ON TABLE appointments IS 'Turnos/Citas del barbero (RF-06, RF-09, RF-24)';
COMMENT ON COLUMN appointments.appointment_date IS 'Fecha del turno';
COMMENT ON COLUMN appointments.start_time IS 'Hora de inicio del turno';
COMMENT ON COLUMN appointments.end_time IS 'Hora de finalización del turno';
COMMENT ON COLUMN appointments.status IS 'Estado actual del turno';
COMMENT ON COLUMN appointments.reminder_client_sent IS 'Si ya se envió recordatorio al cliente (RF-17)';
COMMENT ON COLUMN appointments.reminder_barber_sent IS 'Si ya se envió recordatorio al barbero (RF-18)';
COMMENT ON COLUMN appointments.original_appointment_id IS 'Referencia al turno original si fue reprogramado (RF-10)';


-- ------------------------------------------------------------
-- 2.4 HISTORIAL DE TURNOS (RF-09 historial)
-- ------------------------------------------------------------
-- Registra cada acción realizada sobre un turno para
-- mantener trazabilidad completa.
-- ------------------------------------------------------------
CREATE TABLE appointment_history (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id         UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  action                 appointment_action NOT NULL,

  -- Datos previos (para reprogramaciones)
  previous_date          DATE,
  previous_start_time    TIME,
  previous_end_time      TIME,

  -- Datos nuevos (para reprogramaciones)
  new_date               DATE,
  new_start_time         TIME,
  new_end_time           TIME,

  -- Quién realizó la acción
  performed_by           TEXT NOT NULL DEFAULT 'client', -- 'client' | 'admin'

  notes                  TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE appointment_history IS 'Historial de acciones sobre turnos (trazabilidad)';
COMMENT ON COLUMN appointment_history.action IS 'Tipo de acción realizada';
COMMENT ON COLUMN appointment_history.performed_by IS 'Quién realizó la acción: client o admin';


-- ------------------------------------------------------------
-- 2.5 HORARIOS LABORALES (RF-22)
-- ------------------------------------------------------------
-- Configuración de días y horarios de atención del barbero.
-- Un registro por cada día de la semana (0=Domingo, 6=Sábado).
-- ------------------------------------------------------------
CREATE TABLE working_hours (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week       INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  is_working_day    BOOLEAN NOT NULL DEFAULT TRUE,
  start_time        TIME,
  end_time          TIME,
  interval_minutes  INTEGER NOT NULL DEFAULT 30 CHECK (interval_minutes > 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT working_hours_day_unique UNIQUE (day_of_week),
  CONSTRAINT valid_working_time CHECK (
    (is_working_day = FALSE) OR
    (start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)
  )
);

COMMENT ON TABLE working_hours IS 'Configuración de horarios laborales por día (RF-22)';
COMMENT ON COLUMN working_hours.day_of_week IS 'Día de la semana: 0=Domingo, 1=Lunes, ..., 6=Sábado';
COMMENT ON COLUMN working_hours.is_working_day IS 'Si el barbero atiende este día';
COMMENT ON COLUMN working_hours.start_time IS 'Hora de inicio de la jornada';
COMMENT ON COLUMN working_hours.end_time IS 'Hora de fin de la jornada';
COMMENT ON COLUMN working_hours.interval_minutes IS 'Duración de cada intervalo de atención en minutos';


-- ------------------------------------------------------------
-- 2.6 FECHAS BLOQUEADAS (RF-23)
-- ------------------------------------------------------------
-- Fechas específicas en las que el barbero no atiende:
-- vacaciones, feriados, eventos personales, etc.
-- ------------------------------------------------------------
CREATE TABLE blocked_dates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocked_date  DATE NOT NULL,
  end_date      DATE,
  reason        TEXT,
  block_type    block_type NOT NULL DEFAULT 'other',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT blocked_dates_date_unique UNIQUE (blocked_date),
  CONSTRAINT valid_date_range CHECK (
    end_date IS NULL OR end_date >= blocked_date
  )
);

COMMENT ON TABLE blocked_dates IS 'Fechas bloqueadas por el barbero (RF-23)';
COMMENT ON COLUMN blocked_dates.blocked_date IS 'Fecha de inicio del bloqueo';
COMMENT ON COLUMN blocked_dates.end_date IS 'Fecha de fin del bloqueo (NULL si es un solo día)';
COMMENT ON COLUMN blocked_dates.reason IS 'Motivo del bloqueo';
COMMENT ON COLUMN blocked_dates.block_type IS 'Tipo de bloqueo: vacation, holiday, personal, other';


-- ------------------------------------------------------------
-- 2.7 CONFIGURACIÓN DEL SITIO (RF-26, RF-27, RF-28)
-- ------------------------------------------------------------
-- Configuración general del sitio: ciudad actual,
-- mensajes informativos, personalización del encabezado, etc.
-- Tabla de clave-valor para máxima flexibilidad.
-- ------------------------------------------------------------
CREATE TABLE site_settings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key   TEXT NOT NULL,
  setting_value TEXT,
  setting_group TEXT NOT NULL DEFAULT 'general',
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT site_settings_key_unique UNIQUE (setting_key)
);

COMMENT ON TABLE site_settings IS 'Configuración general del sitio (RF-26, RF-27, RF-28)';
COMMENT ON COLUMN site_settings.setting_key IS 'Clave de la configuración';
COMMENT ON COLUMN site_settings.setting_value IS 'Valor de la configuración';
COMMENT ON COLUMN site_settings.setting_group IS 'Grupo: general, header, contact, booking';


-- ------------------------------------------------------------
-- 2.8 CAMPAÑAS DE CORREO ELECTRÓNICO (RF-29, RF-30, RF-31)
-- ------------------------------------------------------------
-- Historial de campañas de correo masivo enviadas
-- a los clientes con segmentación básica.
-- ------------------------------------------------------------
CREATE TABLE email_campaigns (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject           TEXT NOT NULL,
  content           TEXT NOT NULL,
  segment_type      campaign_segment NOT NULL DEFAULT 'all',
  segment_value     INTEGER,
  recipients_count  INTEGER NOT NULL DEFAULT 0,
  status            campaign_status NOT NULL DEFAULT 'draft',
  sent_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE email_campaigns IS 'Campañas de correo masivo (RF-29, RF-30, RF-31)';
COMMENT ON COLUMN email_campaigns.subject IS 'Asunto del correo';
COMMENT ON COLUMN email_campaigns.content IS 'Contenido HTML del correo';
COMMENT ON COLUMN email_campaigns.segment_type IS 'Tipo de segmentación de destinatarios';
COMMENT ON COLUMN email_campaigns.segment_value IS 'Valor de segmentación (ej: meses para active_last_months)';
COMMENT ON COLUMN email_campaigns.recipients_count IS 'Cantidad de destinatarios';
COMMENT ON COLUMN email_campaigns.status IS 'Estado de la campaña';


-- ------------------------------------------------------------
-- 2.9 REGISTRO DE CORREOS ENVIADOS
-- ------------------------------------------------------------
-- Log de cada correo individual enviado por el sistema:
-- confirmaciones, recordatorios, campañas, etc.
-- ------------------------------------------------------------
CREATE TABLE email_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient     TEXT NOT NULL,
  subject       TEXT NOT NULL,
  email_type    TEXT NOT NULL, -- 'confirmation', 'reminder', 'cancellation', 'reschedule', 'campaign', 'barber_notification'
  reference_id  UUID,          -- ID del turno o campaña asociada
  status        TEXT NOT NULL DEFAULT 'sent', -- 'sent', 'failed', 'bounced'
  error_message TEXT,
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE email_logs IS 'Registro de todos los correos enviados por el sistema';
COMMENT ON COLUMN email_logs.email_type IS 'Tipo: confirmation, reminder, cancellation, reschedule, campaign, barber_notification';
COMMENT ON COLUMN email_logs.reference_id IS 'ID del turno o campaña asociada';


-- ============================================================
-- 3. ÍNDICES PARA RENDIMIENTO (RNF-07)
-- ============================================================

-- Turnos: búsquedas frecuentes por fecha, estado y cliente
CREATE INDEX idx_appointments_date
  ON appointments (appointment_date);

CREATE INDEX idx_appointments_status
  ON appointments (status);

CREATE INDEX idx_appointments_client_id
  ON appointments (client_id);

CREATE INDEX idx_appointments_date_status
  ON appointments (appointment_date, status);

CREATE INDEX idx_appointments_service_id
  ON appointments (service_id);

-- Buscar turnos pendientes de recordatorio (para cron job RF-17, RF-18)
CREATE INDEX idx_appointments_reminder_pending
  ON appointments (appointment_date, start_time)
  WHERE reminder_client_sent = FALSE AND status IN ('pending', 'confirmed');

CREATE INDEX idx_appointments_reminder_barber_pending
  ON appointments (appointment_date, start_time)
  WHERE reminder_barber_sent = FALSE AND status IN ('pending', 'confirmed');

-- Clientes: búsqueda por email y token de acceso
CREATE INDEX idx_clients_email
  ON clients (email);

CREATE INDEX idx_clients_access_token
  ON clients (access_token);

-- Servicios activos
CREATE INDEX idx_services_active
  ON services (is_active, display_order)
  WHERE is_active = TRUE;

-- Fechas bloqueadas
CREATE INDEX idx_blocked_dates_range
  ON blocked_dates (blocked_date, end_date);

-- Historial de turnos
CREATE INDEX idx_appointment_history_appointment
  ON appointment_history (appointment_id);

-- Campañas de correo
CREATE INDEX idx_email_campaigns_status
  ON email_campaigns (status);

-- Logs de correo
CREATE INDEX idx_email_logs_type
  ON email_logs (email_type, sent_at);

CREATE INDEX idx_email_logs_reference
  ON email_logs (reference_id);

-- Configuración del sitio
CREATE INDEX idx_site_settings_group
  ON site_settings (setting_group);


-- ============================================================
-- 4. FUNCIONES Y TRIGGERS
-- ============================================================

-- ------------------------------------------------------------
-- 4.1 Trigger: Actualizar updated_at automáticamente
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a todas las tablas con updated_at
CREATE TRIGGER trigger_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_working_hours_updated_at
  BEFORE UPDATE ON working_hours
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_site_settings_updated_at
  BEFORE UPDATE ON site_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_email_campaigns_updated_at
  BEFORE UPDATE ON email_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ------------------------------------------------------------
-- 4.2 Función: Verificar disponibilidad de horario
-- ------------------------------------------------------------
-- Verifica que no exista un turno activo en la misma
-- fecha y rango horario antes de insertar uno nuevo.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_appointment_availability()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo verificar para turnos activos (no cancelados)
  IF NEW.status IN ('pending', 'confirmed') THEN
    IF EXISTS (
      SELECT 1 FROM appointments
      WHERE id != NEW.id
        AND appointment_date = NEW.appointment_date
        AND status IN ('pending', 'confirmed')
        AND (
          (NEW.start_time >= start_time AND NEW.start_time < end_time) OR
          (NEW.end_time > start_time AND NEW.end_time <= end_time) OR
          (NEW.start_time <= start_time AND NEW.end_time >= end_time)
        )
    ) THEN
      RAISE EXCEPTION 'El horario seleccionado ya está ocupado'
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_availability
  BEFORE INSERT OR UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION check_appointment_availability();


-- ------------------------------------------------------------
-- 4.3 Función: Verificar fecha no bloqueada
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_date_not_blocked()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('pending', 'confirmed') THEN
    IF EXISTS (
      SELECT 1 FROM blocked_dates
      WHERE NEW.appointment_date >= blocked_date
        AND NEW.appointment_date <= COALESCE(end_date, blocked_date)
    ) THEN
      RAISE EXCEPTION 'La fecha seleccionada está bloqueada'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_date_blocked
  BEFORE INSERT OR UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION check_date_not_blocked();


-- ------------------------------------------------------------
-- 4.4 Función: Registrar historial automáticamente
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION log_appointment_history()
RETURNS TRIGGER AS $$
BEGIN
  -- Al crear un turno nuevo
  IF TG_OP = 'INSERT' THEN
    INSERT INTO appointment_history (appointment_id, action, new_date, new_start_time, new_end_time)
    VALUES (NEW.id, 'created', NEW.appointment_date, NEW.start_time, NEW.end_time);
    RETURN NEW;
  END IF;

  -- Al actualizar un turno
  IF TG_OP = 'UPDATE' THEN
    -- Si cambió el estado a cancelado
    IF OLD.status != 'cancelled' AND NEW.status = 'cancelled' THEN
      INSERT INTO appointment_history (appointment_id, action, previous_date, previous_start_time, previous_end_time)
      VALUES (NEW.id, 'cancelled', OLD.appointment_date, OLD.start_time, OLD.end_time);
    END IF;

    -- Si cambió el estado a completado
    IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
      INSERT INTO appointment_history (appointment_id, action)
      VALUES (NEW.id, 'completed');
    END IF;

    -- Si cambió el estado a no_show
    IF OLD.status != 'no_show' AND NEW.status = 'no_show' THEN
      INSERT INTO appointment_history (appointment_id, action)
      VALUES (NEW.id, 'no_show');
    END IF;

    -- Si cambió la fecha u hora (reprogramación)
    IF (OLD.appointment_date != NEW.appointment_date OR OLD.start_time != NEW.start_time)
       AND NEW.status IN ('pending', 'confirmed') THEN
      INSERT INTO appointment_history (
        appointment_id, action,
        previous_date, previous_start_time, previous_end_time,
        new_date, new_start_time, new_end_time
      )
      VALUES (
        NEW.id, 'rescheduled',
        OLD.appointment_date, OLD.start_time, OLD.end_time,
        NEW.appointment_date, NEW.start_time, NEW.end_time
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_appointment_history
  AFTER INSERT OR UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION log_appointment_history();


-- ------------------------------------------------------------
-- 4.5 Función: Obtener horarios disponibles para una fecha
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_available_slots(
  p_date DATE,
  p_service_id UUID DEFAULT NULL
)
RETURNS TABLE (
  slot_start TIME,
  slot_end   TIME
) AS $$
DECLARE
  v_day_of_week   INTEGER;
  v_start_time    TIME;
  v_end_time      TIME;
  v_interval      INTEGER;
  v_duration      INTEGER;
  v_current_slot  TIME;
BEGIN
  -- Obtener día de la semana (0=Domingo en PostgreSQL con EXTRACT(DOW))
  v_day_of_week := EXTRACT(DOW FROM p_date)::INTEGER;

  -- Verificar si la fecha está bloqueada
  IF EXISTS (
    SELECT 1 FROM blocked_dates
    WHERE p_date >= blocked_date
      AND p_date <= COALESCE(end_date, blocked_date)
  ) THEN
    RETURN; -- No hay slots disponibles
  END IF;

  -- Obtener configuración del día
  SELECT wh.start_time, wh.end_time, wh.interval_minutes
  INTO v_start_time, v_end_time, v_interval
  FROM working_hours wh
  WHERE wh.day_of_week = v_day_of_week
    AND wh.is_working_day = TRUE;

  -- Si no es día laboral, no hay slots
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Obtener duración del servicio (o usar intervalo por defecto)
  IF p_service_id IS NOT NULL THEN
    SELECT s.duration_minutes INTO v_duration
    FROM services s WHERE s.id = p_service_id AND s.is_active = TRUE;

    IF NOT FOUND THEN
      v_duration := v_interval;
    END IF;
  ELSE
    v_duration := v_interval;
  END IF;

  -- Generar slots disponibles
  v_current_slot := v_start_time;

  WHILE v_current_slot + (v_duration || ' minutes')::INTERVAL <= v_end_time LOOP
    -- Verificar que el slot no esté ocupado
    IF NOT EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.appointment_date = p_date
        AND a.status IN ('pending', 'confirmed')
        AND (
          (v_current_slot >= a.start_time AND v_current_slot < a.end_time) OR
          (v_current_slot + (v_duration || ' minutes')::INTERVAL > a.start_time
           AND v_current_slot + (v_duration || ' minutes')::INTERVAL <= a.end_time) OR
          (v_current_slot <= a.start_time
           AND v_current_slot + (v_duration || ' minutes')::INTERVAL >= a.end_time)
        )
    ) THEN
      slot_start := v_current_slot;
      slot_end := v_current_slot + (v_duration || ' minutes')::INTERVAL;
      RETURN NEXT;
    END IF;

    v_current_slot := v_current_slot + (v_interval || ' minutes')::INTERVAL;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_available_slots IS 'Devuelve los horarios disponibles para una fecha dada (RF-04)';


-- ------------------------------------------------------------
-- 4.6 Función: Obtener fechas disponibles en un rango
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_available_dates(
  p_start_date DATE,
  p_end_date   DATE,
  p_service_id UUID DEFAULT NULL
)
RETURNS TABLE (
  available_date    DATE,
  available_slots   INTEGER
) AS $$
DECLARE
  v_current_date DATE;
  v_slot_count   INTEGER;
BEGIN
  v_current_date := p_start_date;

  WHILE v_current_date <= p_end_date LOOP
    -- Contar slots disponibles para esta fecha
    SELECT COUNT(*) INTO v_slot_count
    FROM get_available_slots(v_current_date, p_service_id);

    -- Solo devolver fechas con al menos un slot disponible
    IF v_slot_count > 0 THEN
      available_date := v_current_date;
      available_slots := v_slot_count;
      RETURN NEXT;
    END IF;

    v_current_date := v_current_date + INTERVAL '1 day';
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_available_dates IS 'Devuelve las fechas con disponibilidad en un rango (RF-03)';


-- ------------------------------------------------------------
-- 4.7 Función: Métricas del dashboard (RF-20)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_dashboard_metrics()
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'appointments_today', (
      SELECT COUNT(*) FROM appointments
      WHERE appointment_date = CURRENT_DATE
        AND status IN ('pending', 'confirmed', 'completed')
    ),
    'appointments_week', (
      SELECT COUNT(*) FROM appointments
      WHERE appointment_date >= date_trunc('week', CURRENT_DATE)
        AND appointment_date < date_trunc('week', CURRENT_DATE) + INTERVAL '7 days'
        AND status IN ('pending', 'confirmed', 'completed')
    ),
    'appointments_month', (
      SELECT COUNT(*) FROM appointments
      WHERE appointment_date >= date_trunc('month', CURRENT_DATE)
        AND appointment_date < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
        AND status IN ('pending', 'confirmed', 'completed')
    ),
    'upcoming_appointments', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT
          a.id,
          a.appointment_date,
          a.start_time,
          a.end_time,
          a.status,
          c.full_name AS client_name,
          c.email AS client_email,
          s.name AS service_name,
          s.price AS service_price
        FROM appointments a
        JOIN clients c ON c.id = a.client_id
        JOIN services s ON s.id = a.service_id
        WHERE a.appointment_date >= CURRENT_DATE
          AND a.status IN ('pending', 'confirmed')
        ORDER BY a.appointment_date, a.start_time
        LIMIT 10
      ) t
    ),
    'top_services', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT
          s.name,
          COUNT(a.id) AS total_appointments
        FROM services s
        LEFT JOIN appointments a ON a.service_id = s.id
          AND a.status IN ('pending', 'confirmed', 'completed')
        WHERE s.is_active = TRUE
        GROUP BY s.id, s.name
        ORDER BY total_appointments DESC
        LIMIT 5
      ) t
    ),
    'total_clients', (
      SELECT COUNT(*) FROM clients
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_dashboard_metrics IS 'Métricas generales para el dashboard (RF-20)';


-- ------------------------------------------------------------
-- 4.8 Función: Obtener turnos pendientes de recordatorio
-- ------------------------------------------------------------
-- Utilizada por el Cron Job para enviar recordatorios
-- 24 horas antes del turno (RF-17, RF-18).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_appointments_needing_reminder(
  p_hours_before INTEGER DEFAULT 24
)
RETURNS TABLE (
  appointment_id       UUID,
  client_name          TEXT,
  client_email         TEXT,
  service_name         TEXT,
  appointment_date     DATE,
  start_time           TIME,
  reminder_client_sent BOOLEAN,
  reminder_barber_sent BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id AS appointment_id,
    c.full_name AS client_name,
    c.email AS client_email,
    s.name AS service_name,
    a.appointment_date,
    a.start_time,
    a.reminder_client_sent,
    a.reminder_barber_sent
  FROM appointments a
  JOIN clients c ON c.id = a.client_id
  JOIN services s ON s.id = a.service_id
  WHERE a.status IN ('pending', 'confirmed')
    AND (a.reminder_client_sent = FALSE OR a.reminder_barber_sent = FALSE)
    AND (a.appointment_date + a.start_time)
        <= (NOW() + (p_hours_before || ' hours')::INTERVAL)
    AND (a.appointment_date + a.start_time) > NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_appointments_needing_reminder IS 'Turnos que necesitan recordatorio (RF-17, RF-18)';


-- ------------------------------------------------------------
-- 4.9 Función: Verificar si un turno puede ser modificado
-- ------------------------------------------------------------
-- No se permite modificar turnos dentro de las últimas
-- 2 horas previas al turno (RF-12).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION can_modify_appointment(
  p_appointment_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_appointment_datetime TIMESTAMPTZ;
BEGIN
  SELECT (appointment_date + start_time)::TIMESTAMPTZ
  INTO v_appointment_datetime
  FROM appointments
  WHERE id = p_appointment_id
    AND status IN ('pending', 'confirmed');

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Verificar que falten más de 2 horas (RF-12)
  RETURN v_appointment_datetime > (NOW() + INTERVAL '2 hours');
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION can_modify_appointment IS 'Verifica si un turno puede ser reprogramado o cancelado (RF-12)';


-- ------------------------------------------------------------
-- 4.10 Función: Obtener clientes por segmento (RF-30)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_clients_by_segment(
  p_segment_type campaign_segment,
  p_months       INTEGER DEFAULT NULL
)
RETURNS TABLE (
  client_id   UUID,
  full_name   TEXT,
  email       TEXT
) AS $$
BEGIN
  IF p_segment_type = 'all' THEN
    RETURN QUERY SELECT c.id, c.full_name, c.email FROM clients c;

  ELSIF p_segment_type = 'with_appointments' THEN
    RETURN QUERY SELECT DISTINCT c.id, c.full_name, c.email
    FROM clients c
    INNER JOIN appointments a ON a.client_id = c.id;

  ELSIF p_segment_type = 'active_last_months' THEN
    RETURN QUERY SELECT DISTINCT c.id, c.full_name, c.email
    FROM clients c
    INNER JOIN appointments a ON a.client_id = c.id
    WHERE a.created_at >= (NOW() - (COALESCE(p_months, 3) || ' months')::INTERVAL);
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_clients_by_segment IS 'Obtiene clientes según segmentación para campañas (RF-30)';


-- ============================================================
-- 5. ROW LEVEL SECURITY (RLS) - SUPABASE
-- ============================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE working_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- 5.1 Políticas para SERVICIOS
-- ------------------------------------------------------------
-- Lectura pública (los clientes ven los servicios activos)
CREATE POLICY "services_public_read"
  ON services FOR SELECT
  USING (is_active = TRUE);

-- CRUD completo para admin autenticado
CREATE POLICY "services_admin_all"
  ON services FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- 5.2 Políticas para CLIENTES
-- ------------------------------------------------------------
-- Un cliente puede verse a sí mismo mediante su access_token
-- (esto se maneja a nivel de API, no de RLS directo)
CREATE POLICY "clients_admin_all"
  ON clients FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Permitir inserción anónima (al reservar un turno)
CREATE POLICY "clients_anon_insert"
  ON clients FOR INSERT
  WITH CHECK (TRUE);

-- Lectura anónima por access_token (se filtra en la query)
CREATE POLICY "clients_anon_read"
  ON clients FOR SELECT
  USING (TRUE);

-- ------------------------------------------------------------
-- 5.3 Políticas para TURNOS
-- ------------------------------------------------------------
-- Admin puede hacer todo
CREATE POLICY "appointments_admin_all"
  ON appointments FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Inserción anónima (el cliente reserva sin login)
CREATE POLICY "appointments_anon_insert"
  ON appointments FOR INSERT
  WITH CHECK (TRUE);

-- Lectura anónima (filtrado por client_id en la query)
CREATE POLICY "appointments_anon_read"
  ON appointments FOR SELECT
  USING (TRUE);

-- Actualización anónima (cancelar/reprogramar)
CREATE POLICY "appointments_anon_update"
  ON appointments FOR UPDATE
  USING (TRUE)
  WITH CHECK (TRUE);

-- ------------------------------------------------------------
-- 5.4 Políticas para HISTORIAL DE TURNOS
-- ------------------------------------------------------------
CREATE POLICY "appointment_history_admin_read"
  ON appointment_history FOR SELECT
  USING (auth.role() = 'authenticated');

-- Lectura anónima (el cliente ve su historial)
CREATE POLICY "appointment_history_anon_read"
  ON appointment_history FOR SELECT
  USING (TRUE);

-- Inserción por trigger (se ejecuta como SECURITY DEFINER implícitamente)
CREATE POLICY "appointment_history_insert"
  ON appointment_history FOR INSERT
  WITH CHECK (TRUE);

-- ------------------------------------------------------------
-- 5.5 Políticas para HORARIOS LABORALES
-- ------------------------------------------------------------
-- Lectura pública
CREATE POLICY "working_hours_public_read"
  ON working_hours FOR SELECT
  USING (TRUE);

-- Admin puede modificar
CREATE POLICY "working_hours_admin_all"
  ON working_hours FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- 5.6 Políticas para FECHAS BLOQUEADAS
-- ------------------------------------------------------------
-- Lectura pública (para calcular disponibilidad)
CREATE POLICY "blocked_dates_public_read"
  ON blocked_dates FOR SELECT
  USING (TRUE);

-- Admin puede modificar
CREATE POLICY "blocked_dates_admin_all"
  ON blocked_dates FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- 5.7 Políticas para CONFIGURACIÓN DEL SITIO
-- ------------------------------------------------------------
-- Lectura pública
CREATE POLICY "site_settings_public_read"
  ON site_settings FOR SELECT
  USING (TRUE);

-- Admin puede modificar
CREATE POLICY "site_settings_admin_all"
  ON site_settings FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- 5.8 Políticas para CAMPAÑAS DE CORREO
-- ------------------------------------------------------------
-- Solo admin
CREATE POLICY "email_campaigns_admin_all"
  ON email_campaigns FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- 5.9 Políticas para LOG DE CORREOS
-- ------------------------------------------------------------
-- Solo admin
CREATE POLICY "email_logs_admin_all"
  ON email_logs FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Permitir inserción desde funciones del servidor
CREATE POLICY "email_logs_insert"
  ON email_logs FOR INSERT
  WITH CHECK (TRUE);


-- ============================================================
-- 6. DATOS INICIALES (SEED)
-- ============================================================

-- ------------------------------------------------------------
-- 6.1 Horarios laborales por defecto
-- ------------------------------------------------------------
-- Lunes a Sábado: 09:00 a 19:00, intervalos de 30 minutos
-- Domingo: cerrado
-- ------------------------------------------------------------
INSERT INTO working_hours (day_of_week, is_working_day, start_time, end_time, interval_minutes) VALUES
  (0, FALSE, NULL, NULL, 30),           -- Domingo (cerrado)
  (1, TRUE, '09:00', '19:00', 30),      -- Lunes
  (2, TRUE, '09:00', '19:00', 30),      -- Martes
  (3, TRUE, '09:00', '19:00', 30),      -- Miércoles
  (4, TRUE, '09:00', '19:00', 30),      -- Jueves
  (5, TRUE, '09:00', '19:00', 30),      -- Viernes
  (6, TRUE, '09:00', '14:00', 30);      -- Sábado (media jornada)

-- ------------------------------------------------------------
-- 6.2 Configuración del sitio por defecto (RF-26, RF-27, RF-28)
-- ------------------------------------------------------------
INSERT INTO site_settings (setting_key, setting_value, setting_group) VALUES
  -- Encabezado (RF-28)
  ('main_title', 'Gaby Gord', 'header'),
  ('subtitle', 'Barbería & Estilismo', 'header'),
  ('info_text', 'Reservá tu turno de forma rápida y sencilla', 'header'),

  -- Ubicación (RF-26)
  ('current_city', 'Puerto Iguazú', 'general'),

  -- Mensaje informativo (RF-27)
  ('info_message', 'Actualmente me encuentro atendiendo en Puerto Iguazú. Los turnos disponibles corresponden únicamente a esta ubicación.', 'general'),
  ('info_message_visible', 'true', 'general'),

  -- Contacto
  ('barber_email', '', 'contact'),
  ('barber_phone', '', 'contact'),
  ('barber_instagram', '', 'contact'),

  -- Configuración de reservas (RF-12)
  ('min_hours_before_modification', '2', 'booking'),
  ('max_days_advance_booking', '30', 'booking'),
  ('reminder_hours_before', '24', 'booking');

-- ------------------------------------------------------------
-- 6.3 Servicios de ejemplo (RF-01)
-- ------------------------------------------------------------
INSERT INTO services (name, description, price, duration_minutes, is_active, display_order) VALUES
  ('Corte de Cabello', 'Corte clásico o moderno adaptado a tu estilo', 3500.00, 30, TRUE, 1),
  ('Barba', 'Perfilado y diseño de barba con navaja', 2500.00, 20, TRUE, 2),
  ('Corte + Barba', 'Combo completo: corte de cabello y barba', 5500.00, 45, TRUE, 3),
  ('Cejas', 'Diseño y perfilado de cejas', 1000.00, 10, TRUE, 4);


-- ============================================================
-- 7. VISTAS ÚTILES
-- ============================================================

-- ------------------------------------------------------------
-- 7.1 Vista: Próximos turnos con detalle completo
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW upcoming_appointments_view AS
SELECT
  a.id,
  a.appointment_date,
  a.start_time,
  a.end_time,
  a.status,
  a.notes,
  a.created_at,
  c.id AS client_id,
  c.full_name AS client_name,
  c.email AS client_email,
  c.phone AS client_phone,
  s.id AS service_id,
  s.name AS service_name,
  s.price AS service_price,
  s.duration_minutes AS service_duration
FROM appointments a
JOIN clients c ON c.id = a.client_id
JOIN services s ON s.id = a.service_id
WHERE a.appointment_date >= CURRENT_DATE
  AND a.status IN ('pending', 'confirmed')
ORDER BY a.appointment_date, a.start_time;

-- ------------------------------------------------------------
-- 7.2 Vista: Historial de turnos completo
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW appointments_history_view AS
SELECT
  a.id,
  a.appointment_date,
  a.start_time,
  a.end_time,
  a.status,
  a.notes,
  a.created_at AS appointment_created_at,
  c.id AS client_id,
  c.full_name AS client_name,
  c.email AS client_email,
  s.id AS service_id,
  s.name AS service_name,
  s.price AS service_price,
  ah.action AS last_action,
  ah.created_at AS last_action_at
FROM appointments a
JOIN clients c ON c.id = a.client_id
JOIN services s ON s.id = a.service_id
LEFT JOIN LATERAL (
  SELECT action, created_at
  FROM appointment_history
  WHERE appointment_id = a.id
  ORDER BY created_at DESC
  LIMIT 1
) ah ON TRUE
ORDER BY a.appointment_date DESC, a.start_time DESC;

-- ------------------------------------------------------------
-- 7.3 Vista: Turnos del día
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW today_appointments_view AS
SELECT
  a.id,
  a.start_time,
  a.end_time,
  a.status,
  c.full_name AS client_name,
  c.email AS client_email,
  c.phone AS client_phone,
  s.name AS service_name,
  s.price AS service_price
FROM appointments a
JOIN clients c ON c.id = a.client_id
JOIN services s ON s.id = a.service_id
WHERE a.appointment_date = CURRENT_DATE
  AND a.status IN ('pending', 'confirmed', 'completed')
ORDER BY a.start_time;


-- ============================================================
-- FIN DEL SCHEMA
-- ============================================================
-- Para aplicar en Supabase:
-- 1. Ir a SQL Editor en el dashboard de Supabase
-- 2. Pegar este archivo completo
-- 3. Ejecutar
--
-- Nota: Crear el usuario admin desde Authentication > Users
-- en el dashboard de Supabase para el acceso administrativo (RF-19).
-- ============================================================
