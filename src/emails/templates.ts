// ============================================================
// Plantillas de email (HTML inline)
// Todas las funciones retornan { subject, html }
// ============================================================

import { formatDate, formatTime, formatPrice, getClientPortalUrl, getAppUrl } from '@/lib/utils';
import { APP_NAME } from '@/lib/constants';

// --- Estilos base compartidos ---
const baseStyles = `
  body { margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; }
  .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
  .header { background-color: #111111; padding: 32px; text-align: center; }
  .header h1 { color: #C8A960; font-size: 28px; margin: 0; font-family: Georgia, serif; }
  .body { padding: 32px; color: #333333; line-height: 1.6; }
  .body h2 { color: #111111; margin-top: 0; }
  .detail-box { background-color: #f9f9f9; border-left: 4px solid #C8A960; padding: 16px; margin: 20px 0; }
  .detail-box p { margin: 4px 0; }
  .detail-label { color: #666666; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
  .detail-value { color: #111111; font-size: 16px; font-weight: 600; }
  .btn { display: inline-block; padding: 14px 28px; background-color: #C8A960; color: #111111; text-decoration: none; font-weight: 600; border-radius: 4px; margin-top: 16px; }
  .btn-mp { display: inline-block; padding: 14px 28px; background-color: #009EE3; color: #ffffff; text-decoration: none; font-weight: 600; border-radius: 4px; margin-top: 16px; }
  .footer { padding: 24px 32px; background-color: #f5f5f5; text-align: center; color: #999999; font-size: 12px; }
  .badge-paid { display: inline-block; background-color: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 9999px; font-size: 13px; font-weight: 600; }
`;

function layout(content: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><style>${baseStyles}</style></head>
<body>
  <div class="container">
    <div class="header"><h1>${APP_NAME}</h1></div>
    <div class="body">${content}</div>
    <div class="footer">
      <p>${APP_NAME}</p>
      <p>Este es un correo automático, no responder.</p>
    </div>
  </div>
</body>
</html>`;
}

// --- Confirmación de turno (RF-13) ---
export function confirmationEmail(params: {
  clientName: string;
  serviceName: string;
  date: string;
  startTime: string;
  price: number;
  accessToken: string;
}) {
  const portalUrl = getClientPortalUrl(params.accessToken);

  return {
    subject: `Turno confirmado — ${formatDate(params.date)}`,
    html: layout(`
      <h2>¡Hola ${params.clientName}!</h2>
      <p>Tu turno ha sido reservado con éxito. Acá están los detalles:</p>
      <div class="detail-box">
        <p class="detail-label">Servicio</p>
        <p class="detail-value">${params.serviceName}</p>
        <p class="detail-label">Fecha</p>
        <p class="detail-value">${formatDate(params.date)}</p>
        <p class="detail-label">Hora</p>
        <p class="detail-value">${formatTime(params.startTime)} hs</p>
        <p class="detail-label">Precio</p>
        <p class="detail-value">${formatPrice(params.price)}</p>
      </div>
      <p>Podés gestionar tu turno (reprogramar o cancelar) desde tu portal:</p>
      <a href="${portalUrl}" class="btn">Ver mis turnos</a>
      <p style="margin-top: 24px; font-size: 13px; color: #666;">
        Recordá que podés modificar tu turno hasta 2 horas antes de la cita.
      </p>
    `),
  };
}

// --- Recordatorio al cliente (RF-17) ---
export function reminderClientEmail(params: {
  clientName: string;
  serviceName: string;
  date: string;
  startTime: string;
  accessToken: string;
}) {
  const portalUrl = getClientPortalUrl(params.accessToken);

  return {
    subject: `Recordatorio: Tu turno es mañana — ${formatTime(params.startTime)} hs`,
    html: layout(`
      <h2>¡Hola ${params.clientName}!</h2>
      <p>Te recordamos que tenés un turno mañana:</p>
      <div class="detail-box">
        <p class="detail-label">Servicio</p>
        <p class="detail-value">${params.serviceName}</p>
        <p class="detail-label">Fecha</p>
        <p class="detail-value">${formatDate(params.date)}</p>
        <p class="detail-label">Hora</p>
        <p class="detail-value">${formatTime(params.startTime)} hs</p>
      </div>
      <p>Si necesitás cancelar o reprogramar, hacelo desde tu portal:</p>
      <a href="${portalUrl}" class="btn">Gestionar turno</a>
    `),
  };
}

// --- Recordatorio al barbero (RF-18) ---
export function reminderBarberEmail(params: {
  clientName: string;
  clientEmail: string;
  serviceName: string;
  date: string;
  startTime: string;
}) {
  return {
    subject: `Recordatorio: Turno mañana con ${params.clientName}`,
    html: layout(`
      <h2>Recordatorio de turno</h2>
      <p>Tenés un turno programado para mañana:</p>
      <div class="detail-box">
        <p class="detail-label">Cliente</p>
        <p class="detail-value">${params.clientName}</p>
        <p class="detail-label">Email</p>
        <p class="detail-value">${params.clientEmail}</p>
        <p class="detail-label">Servicio</p>
        <p class="detail-value">${params.serviceName}</p>
        <p class="detail-label">Fecha</p>
        <p class="detail-value">${formatDate(params.date)}</p>
        <p class="detail-label">Hora</p>
        <p class="detail-value">${formatTime(params.startTime)} hs</p>
      </div>
    `),
  };
}

// --- Cancelación (RF-14) ---
export function cancellationClientEmail(params: {
  clientName: string;
  serviceName: string;
  date: string;
  startTime: string;
}) {
  return {
    subject: `Turno cancelado — ${formatDate(params.date)}`,
    html: layout(`
      <h2>Hola ${params.clientName}</h2>
      <p>Tu turno ha sido cancelado:</p>
      <div class="detail-box">
        <p class="detail-label">Servicio</p>
        <p class="detail-value">${params.serviceName}</p>
        <p class="detail-label">Fecha</p>
        <p class="detail-value">${formatDate(params.date)}</p>
        <p class="detail-label">Hora</p>
        <p class="detail-value">${formatTime(params.startTime)} hs</p>
      </div>
      <p>Si querés reservar un nuevo turno, visitá nuestra página.</p>
    `),
  };
}

export function cancellationBarberEmail(params: {
  clientName: string;
  serviceName: string;
  date: string;
  startTime: string;
}) {
  return {
    subject: `Turno cancelado: ${params.clientName} — ${formatDate(params.date)}`,
    html: layout(`
      <h2>Turno cancelado</h2>
      <p>El siguiente turno fue cancelado:</p>
      <div class="detail-box">
        <p class="detail-label">Cliente</p>
        <p class="detail-value">${params.clientName}</p>
        <p class="detail-label">Servicio</p>
        <p class="detail-value">${params.serviceName}</p>
        <p class="detail-label">Fecha</p>
        <p class="detail-value">${formatDate(params.date)}</p>
        <p class="detail-label">Hora</p>
        <p class="detail-value">${formatTime(params.startTime)} hs</p>
      </div>
    `),
  };
}

// --- Reprogramación (RF-15) ---
export function rescheduleClientEmail(params: {
  clientName: string;
  serviceName: string;
  oldDate: string;
  oldStartTime: string;
  newDate: string;
  newStartTime: string;
  accessToken: string;
}) {
  const portalUrl = getClientPortalUrl(params.accessToken);

  return {
    subject: `Turno reprogramado — ${formatDate(params.newDate)}`,
    html: layout(`
      <h2>Hola ${params.clientName}</h2>
      <p>Tu turno ha sido reprogramado:</p>
      <div class="detail-box">
        <p class="detail-label">Fecha anterior</p>
        <p class="detail-value" style="text-decoration: line-through; color: #999;">${formatDate(params.oldDate)} a las ${formatTime(params.oldStartTime)} hs</p>
        <p class="detail-label">Nueva fecha</p>
        <p class="detail-value">${formatDate(params.newDate)} a las ${formatTime(params.newStartTime)} hs</p>
        <p class="detail-label">Servicio</p>
        <p class="detail-value">${params.serviceName}</p>
      </div>
      <a href="${portalUrl}" class="btn">Ver mis turnos</a>
    `),
  };
}

export function rescheduleBarberEmail(params: {
  clientName: string;
  serviceName: string;
  oldDate: string;
  oldStartTime: string;
  newDate: string;
  newStartTime: string;
}) {
  return {
    subject: `Turno reprogramado: ${params.clientName}`,
    html: layout(`
      <h2>Turno reprogramado</h2>
      <div class="detail-box">
        <p class="detail-label">Cliente</p>
        <p class="detail-value">${params.clientName}</p>
        <p class="detail-label">Fecha anterior</p>
        <p class="detail-value" style="text-decoration: line-through; color: #999;">${formatDate(params.oldDate)} a las ${formatTime(params.oldStartTime)} hs</p>
        <p class="detail-label">Nueva fecha</p>
        <p class="detail-value">${formatDate(params.newDate)} a las ${formatTime(params.newStartTime)} hs</p>
        <p class="detail-label">Servicio</p>
        <p class="detail-value">${params.serviceName}</p>
      </div>
    `),
  };
}

// --- Notificación de nuevo turno al barbero (RF-16) ---
export function newAppointmentBarberEmail(params: {
  clientName: string;
  clientEmail: string;
  serviceName: string;
  date: string;
  startTime: string;
  price: number;
}) {
  return {
    subject: `Nuevo turno: ${params.clientName} — ${formatDate(params.date)}`,
    html: layout(`
      <h2>Nuevo turno reservado</h2>
      <div class="detail-box">
        <p class="detail-label">Cliente</p>
        <p class="detail-value">${params.clientName}</p>
        <p class="detail-label">Email</p>
        <p class="detail-value">${params.clientEmail}</p>
        <p class="detail-label">Servicio</p>
        <p class="detail-value">${params.serviceName}</p>
        <p class="detail-label">Fecha</p>
        <p class="detail-value">${formatDate(params.date)}</p>
        <p class="detail-label">Hora</p>
        <p class="detail-value">${formatTime(params.startTime)} hs</p>
        <p class="detail-label">Precio</p>
        <p class="detail-value">${formatPrice(params.price)}</p>
      </div>
    `),
  };
}

// --- Email de campaña genérico (RF-29) ---
export function campaignEmail(params: {
  content: string;
}) {
  return {
    html: layout(`${params.content}`),
  };
}

// ============================================================
// HELPERS QUE DEVUELVEN SOLO EL HTML (STRING)
// Requeridos por las llamadas en las rutas de la API
// ============================================================

export function confirmationEmailHtml(params: {
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
  accessUrl: string;
}) {
  return layout(`
    <h2>¡Hola ${params.clientName}!</h2>
    <p>Tu turno ha sido reservado con éxito. Acá están los detalles:</p>
    <div class="detail-box">
      <p class="detail-label">Servicio</p>
      <p class="detail-value">${params.serviceName}</p>
      <p class="detail-label">Fecha</p>
      <p class="detail-value">${params.date}</p>
      <p class="detail-label">Hora</p>
      <p class="detail-value">${params.time}</p>
    </div>
    <p>Podés gestionar tu turno (reprogramar o cancelar) desde tu portal:</p>
    <a href="${params.accessUrl}" class="btn">Ver mis turnos</a>
    <p style="margin-top: 24px; font-size: 13px; color: #666;">
      Recordá que podés modificar tu turno hasta 2 horas antes de la cita.
    </p>
  `);
}

export function barberNotificationHtml(params: {
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
}) {
  return layout(`
    <h2>Nuevo turno reservado</h2>
    <div class="detail-box">
      <p class="detail-label">Cliente</p>
      <p class="detail-value">${params.clientName}</p>
      <p class="detail-label">Servicio</p>
      <p class="detail-value">${params.serviceName}</p>
      <p class="detail-label">Fecha</p>
      <p class="detail-value">${params.date}</p>
      <p class="detail-label">Hora</p>
      <p class="detail-value">${params.time}</p>
    </div>
  `);
}

export function rescheduleClientHtml(params: {
  clientName: string;
  serviceName: string;
  oldDate: string;
  oldTime: string;
  newDate: string;
  newTime: string;
  accessUrl: string;
}) {
  return layout(`
    <h2>Hola ${params.clientName}</h2>
    <p>Tu turno ha sido reprogramado:</p>
    <div class="detail-box">
      <p class="detail-label">Fecha anterior</p>
      <p class="detail-value" style="text-decoration: line-through; color: #999;">${params.oldDate} a las ${params.oldTime}</p>
      <p class="detail-label">Nueva fecha</p>
      <p class="detail-value">${params.newDate} a las ${params.newTime}</p>
      <p class="detail-label">Servicio</p>
      <p class="detail-value">${params.serviceName}</p>
    </div>
    <a href="${params.accessUrl}" class="btn">Ver mis turnos</a>
  `);
}

export function rescheduleBarberHtml(params: {
  clientName: string;
  serviceName: string;
  oldDate: string;
  oldTime: string;
  newDate: string;
  newTime: string;
}) {
  return layout(`
    <h2>Turno reprogramado</h2>
    <div class="detail-box">
      <p class="detail-label">Cliente</p>
      <p class="detail-value">${params.clientName}</p>
      <p class="detail-label">Fecha anterior</p>
      <p class="detail-value" style="text-decoration: line-through; color: #999;">${params.oldDate} a las ${params.oldTime}</p>
      <p class="detail-label">Nueva fecha</p>
      <p class="detail-value">${params.newDate} a las ${params.newTime}</p>
      <p class="detail-label">Servicio</p>
      <p class="detail-value">${params.serviceName}</p>
    </div>
  `);
}

export function cancellationClientHtml(params: {
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
}) {
  return layout(`
    <h2>Hola ${params.clientName}</h2>
    <p>Tu turno ha sido cancelado:</p>
    <div class="detail-box">
      <p class="detail-label">Servicio</p>
      <p class="detail-value">${params.serviceName}</p>
      <p class="detail-label">Fecha</p>
      <p class="detail-value">${params.date}</p>
      <p class="detail-label">Hora</p>
      <p class="detail-value">${params.time}</p>
    </div>
    <p>Si querés reservar un nuevo turno, visitá nuestra página.</p>
  `);
}

export function cancellationBarberHtml(params: {
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
}) {
  return layout(`
    <h2>Turno cancelado</h2>
    <p>El siguiente turno fue cancelado:</p>
    <div class="detail-box">
      <p class="detail-label">Cliente</p>
      <p class="detail-value">${params.clientName}</p>
      <p class="detail-label">Servicio</p>
      <p class="detail-value">${params.serviceName}</p>
      <p class="detail-label">Fecha</p>
      <p class="detail-value">${params.date}</p>
      <p class="detail-label">Hora</p>
      <p class="detail-value">${params.time}</p>
    </div>
  `);
}

export function reminderClientHtml(params: {
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
  accessUrl: string;
}) {
  return layout(`
    <h2>¡Hola ${params.clientName}!</h2>
    <p>Te recordamos que tenés un turno mañana:</p>
    <div class="detail-box">
      <p class="detail-label">Servicio</p>
      <p class="detail-value">${params.serviceName}</p>
      <p class="detail-label">Fecha</p>
      <p class="detail-value">${params.date}</p>
      <p class="detail-label">Hora</p>
      <p class="detail-value">${params.time}</p>
    </div>
    <p>Si necesitás cancelar o reprogramar, hacelo desde tu portal:</p>
    <a href="${params.accessUrl}" class="btn">Gestionar turno</a>
  `);
}

export function reminderBarberHtml(params: {
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
}) {
  return layout(`
    <h2>Recordatorio de turno</h2>
    <p>Tenés un turno programado para mañana:</p>
    <div class="detail-box">
      <p class="detail-label">Cliente</p>
      <p class="detail-value">${params.clientName}</p>
      <p class="detail-label">Servicio</p>
      <p class="detail-value">${params.serviceName}</p>
      <p class="detail-label">Fecha</p>
      <p class="detail-value">${params.date}</p>
      <p class="detail-label">Hora</p>
      <p class="detail-value">${params.time}</p>
    </div>
  `);
}

export function campaignHtml(params: {
  content: string;
}) {
  const appUrl = getAppUrl();
  return layout(`
    <div style="font-size: 15px; line-height: 1.6; color: #333333;">
      <div style="margin-bottom: 30px; white-space: pre-line;">${params.content}</div>
      <div style="text-align: center; margin-top: 30px; margin-bottom: 10px;">
        <a href="${appUrl}" class="btn" style="color: #111111;">Reservar un Turno</a>
      </div>
      <p style="font-size: 13px; color: #888888; text-align: center; margin-top: 25px;">
        Hacé click en el botón de arriba para ver los horarios disponibles y agendar tu próxima cita.
      </p>
    </div>
  `);
}

export function individualEmailHtml(params: {
  clientName: string;
  content: string;
}) {
  const appUrl = getAppUrl();
  return layout(`
    <div style="font-size: 15px; line-height: 1.6; color: #333333;">
      <h2 style="font-size: 18px; color: #111111; margin-top: 0; font-family: Georgia, serif;">Hola ${params.clientName},</h2>
      <div style="margin-bottom: 30px; white-space: pre-line;">${params.content}</div>
      <div style="text-align: center; margin-top: 30px; margin-bottom: 10px;">
        <a href="${appUrl}" class="btn" style="color: #111111;">Visitar nuestra Web</a>
      </div>
    </div>
  `);
}

// ============================================================
// MERCADO PAGO — Plantillas de email
// ============================================================

/**
 * Email al cliente confirmando que su pago via MP fue recibido.
 */
export function mpPaymentReceiptHtml(params: {
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
  amount: string;
  accessUrl: string;
}) {
  return layout(`
    <h2>¡Hola ${params.clientName}! 💳</h2>
    <p>Tu pago fue recibido con éxito. Tu turno está confirmado y pagado.</p>
    <div class="detail-box">
      <p class="detail-label">Servicio</p>
      <p class="detail-value">${params.serviceName}</p>
      <p class="detail-label">Fecha</p>
      <p class="detail-value">${params.date}</p>
      <p class="detail-label">Hora</p>
      <p class="detail-value">${params.time}</p>
      <p class="detail-label">Monto pagado</p>
      <p class="detail-value" style="color: #059669;">${params.amount}</p>
    </div>
    <p>Podés ver los detalles de tu turno desde tu portal:</p>
    <a href="${params.accessUrl}" class="btn">Ver mis turnos</a>
    <p style="margin-top: 24px; font-size: 13px; color: #666;">
      ¡Gracias por confiar en ${APP_NAME}!
    </p>
  `);
}

/**
 * Email al admin cuando un cliente paga via MP (notificado por webhook).
 */
export function mpPaymentAdminNotificationHtml(params: {
  clientName: string;
  clientEmail: string;
  serviceName: string;
  date: string;
  time: string;
  amount: string;
  mpPaymentId: string;
}) {
  return layout(`
    <h2>💳 Pago recibido via Mercado Pago</h2>
    <p>Un cliente pagó su turno anticipadamente.</p>
    <div class="detail-box">
      <p class="detail-label">Cliente</p>
      <p class="detail-value">${params.clientName}</p>
      <p class="detail-label">Email</p>
      <p class="detail-value">${params.clientEmail}</p>
      <p class="detail-label">Servicio</p>
      <p class="detail-value">${params.serviceName}</p>
      <p class="detail-label">Fecha del turno</p>
      <p class="detail-value">${params.date}</p>
      <p class="detail-label">Hora</p>
      <p class="detail-value">${params.time}</p>
      <p class="detail-label">Monto acreditado</p>
      <p class="detail-value" style="color: #059669; font-size: 20px;">${params.amount}</p>
      <p class="detail-label">ID de pago MP</p>
      <p class="detail-value" style="font-size: 13px; color: #666;">${params.mpPaymentId}</p>
    </div>
    <p style="font-size: 13px; color: #666;">
      El pago ya fue acreditado en tu cuenta de Mercado Pago.<br>
      En caso de cancelación, podés realizar la devolución desde el panel de administración o directamente desde mercadopago.com.ar.
    </p>
  `);
}

/**
 * Email al cliente cuando se devuelve su pago via MP.
 */
export function mpRefundClientHtml(params: {
  clientName: string;
  serviceName: string;
  date: string;
  amount: string;
}) {
  return layout(`
    <h2>Hola ${params.clientName}</h2>
    <p>El reembolso de tu pago fue procesado exitosamente.</p>
    <div class="detail-box">
      <p class="detail-label">Servicio</p>
      <p class="detail-value">${params.serviceName}</p>
      <p class="detail-label">Fecha del turno</p>
      <p class="detail-value">${params.date}</p>
      <p class="detail-label">Monto devuelto</p>
      <p class="detail-value" style="color: #2563eb;">${params.amount}</p>
    </div>
    <p style="font-size: 13px; color: #666;">
      El monto será acreditado en tu medio de pago original en los próximos días hábiles según Mercado Pago.<br>
      Si tenés dudas, podés contactarte con nosotros.
    </p>
  `);
}
