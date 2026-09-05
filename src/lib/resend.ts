import { Resend } from 'resend';

const FROM_EMAIL = 'notificacion@gabygor.com.ar';
const FROM_NAME = process.env.FROM_NAME || 'GabyGor';

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
}

/**
 * Envía un email a través de Resend.
 * Retorna el id del email o null si falló.
 */
export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<string | null> {
  try {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      console.warn('[Email] RESEND_API_KEY no está configurada. El correo no se enviará.');
      return `mock_email_id_${Date.now()}`;
    }

    // Crear el cliente de forma lazy para no fallar en build time
    const resend = new Resend(apiKey);

    // Filtrar destinatarios para omitir 'admin@admin.com' (cuenta de prueba sin buzón real)
    const recipients = Array.isArray(to) ? to : [to];
    const filteredRecipients = recipients
      .map(r => r.trim())
      .filter(r => r.toLowerCase() !== 'admin@admin.com');

    if (filteredRecipients.length === 0) {
      console.log('[Email] Omitiendo envío: todos los destinatarios son admin@admin.com (cuenta ficticia).');
      return `mock_email_id_skipped_${Date.now()}`;
    }

    const { data, error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: filteredRecipients,
      subject,
      html,
    });

    if (error) {
      console.error('[Email] Error de Resend:', error);
      return null;
    }

    console.log('[Email] Enviado correctamente:', data?.id);
    return data?.id ?? null;
  } catch (err) {
    console.error('[Email] Error al enviar:', err);
    return null;
  }
}
