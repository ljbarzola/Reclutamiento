import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { google } from 'googleapis';
import * as fs from 'fs';
import { CandidateData } from './google-drive.service';
import { sanitizeLine, describeError } from '../common/sanitize.util';

@Injectable()
export class GoogleEmailService implements OnModuleInit {
  private readonly logger = new Logger(GoogleEmailService.name);
  private gmail: any;
  private senderEmail: string = process.env.GMAIL_SEND_EMAIL || '';
  private rrhhEmail: string = process.env.RRHH_EMAIL || '';

  async onModuleInit() {
    await this.initGmail();
  }

  private async initGmail() {
    if (!this.senderEmail || !this.rrhhEmail) {
      this.logger.warn('GMAIL_SEND_EMAIL or RRHH_EMAIL not configured');
      return;
    }

    try {
      const serviceAccountBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64;
      const serviceAccountRaw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
      const serviceAccountPath = process.env.GOOGLE_SERVICE_ACCOUNT_FILE;

      let serviceAccount;

      if (serviceAccountBase64) {
        const decoded = Buffer.from(serviceAccountBase64.trim(), 'base64').toString('utf-8');
        serviceAccount = JSON.parse(decoded);
      } else if (serviceAccountRaw) {
        serviceAccount = JSON.parse(serviceAccountRaw);
      } else if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
        serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
      } else {
        this.logger.warn('GOOGLE_SERVICE_ACCOUNT_JSON not configured');
        return;
      }

      const auth = new google.auth.GoogleAuth({
        credentials: serviceAccount,
        scopes: ['https://www.googleapis.com/auth/gmail.send'],
        clientOptions: { subject: this.senderEmail },
      });

      this.gmail = google.gmail({ version: 'v1', auth });
      this.logger.log(`Gmail service initialized, sending as ${this.senderEmail}`);
    } catch (error) {
      this.logger.error(`Failed to initialize Gmail service: ${describeError(error)}`);
    }
  }

  isConfigured(): boolean {
    return !!this.gmail;
  }

  async sendCandidateNotification(candidate: CandidateData, driveLink: string): Promise<boolean> {
    if (!this.gmail) {
      this.logger.warn('Gmail service not initialized, skipping notification email');
      return false;
    }

    try {
      // Cada valor del postulante entra como DATO de una sola línea y de largo acotado:
      // no puede fabricar líneas nuevas (p. ej. un falso "Carpeta en Drive").
      const clean = (v: unknown) => sanitizeLine(v, 200);
      const datos = candidate.datosFormulario || {};
      const puesto = clean(candidate.puesto);
      const nombre = clean(datos['Nombre completo']) || 'Sin nombre';
      const cedula = clean(datos['Cédula']) || 'Sin cédula';
      const telefono = clean(datos['Teléfono']) || '-';
      const email = clean(datos['Email']) || 'Sin email';

      const subject = `Nueva postulación: ${puesto} — ${nombre}`;
      const body = [
        `Se ha recibido una nueva postulación.`,
        ``,
        `Puesto: ${puesto}`,
        `Nombre: ${nombre}`,
        `Cédula: ${cedula}`,
        `Teléfono: ${telefono}`,
        `Email: ${email}`,
        `Fecha: ${clean(candidate.fechaPostulacion)}`,
        ``,
        `Carpeta en Drive: ${driveLink}`,
      ].join('\n');

      const message = this.buildMimeMessage(this.rrhhEmail, this.senderEmail, subject, body);

      await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw: message },
      });
      this.logger.log(`Notification email sent to ${this.rrhhEmail}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send candidate notification email: ${describeError(error)}`);
      return false;
    }
  }

  private buildMimeMessage(to: string, from: string, subject: string, body: string): string {
    const messageParts = [
      `From: ${from}`,
      `To: ${to}`,
      `Content-Type: text/plain; charset=utf-8`,
      `MIME-Version: 1.0`,
      `Subject: =?utf-8?B?${Buffer.from(subject, 'utf-8').toString('base64')}?=`,
      '',
      body,
    ];
    const message = messageParts.join('\n');

    return Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
}
