import nodemailer from 'nodemailer';

const FROM_EMAIL = process.env.GMAIL_USER || '';
const FROM_NAME = process.env.FROM_NAME || 'GabyGor';

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
}

/**
 * Crea el transporter de Nodemailer con Gmail SMTP.
 * Se crea de forma lazy para no fallar en build time.
 */
function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

/**
 * Envía un email a través de Gmail SMTP (Nodemailer).
 * Retorna el messageId del email o null si falló.
 */
export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<string | null> {
  try {
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailPass) {
      console.warn('[Email] GMAIL_USER o GMAIL_APP_PASSWORD no están configuradas. El correo no se enviará.');
      // Devolver un ID ficticio para no romper los flujos en desarrollo local
      return `mock_email_id_${Date.now()}`;
    }

    // Filtrar destinatarios para omitir 'admin@admin.com' (cuenta de prueba sin buzón real)
    const recipients = Array.isArray(to) ? to : [to];
    const filteredRecipients = recipients
      .map(r => r.trim())
      .filter(r => r.toLowerCase() !== 'admin@admin.com');

    if (filteredRecipients.length === 0) {
      console.log('[Email] Omitiendo envío: todos los destinatarios son admin@admin.com (cuenta ficticia).');
      return `mock_email_id_skipped_${Date.now()}`;
    }

    const transporter = createTransporter();

    const info = await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: filteredRecipients.join(', '),
      subject,
      html,
    });

    console.log('[Email] Enviado correctamente:', info.messageId);
    return info.messageId ?? null;
  } catch (err) {
    console.error('[Email] Error al enviar:', err);
    return null;
  }
}
