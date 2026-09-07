import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { google } from 'googleapis';
import * as fs from 'fs';
import { CandidateData } from './google-drive.service';

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
      this.logger.error('Failed to initialize Gmail service', error);
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

    const subject = `Nueva postulación: ${candidate.puesto} — ${candidate.nombre}`;
    const body = [
      `Se ha recibido una nueva postulación.`,
      ``,
      `Puesto: ${candidate.puesto}`,
      `Nombre: ${candidate.nombre}`,
      `Cédula: ${candidate.cedula}`,
      `Teléfono: ${candidate.telefono || '-'}`,
      `Email: ${candidate.email}`,
      `Fecha: ${candidate.fechaPostulacion}`,
      ``,
      `Carpeta en Drive: ${driveLink}`,
    ].join('\n');

    const message = this.buildMimeMessage(this.rrhhEmail, this.senderEmail, subject, body);

    try {
      await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw: message },
      });
      this.logger.log(`Notification email sent to ${this.rrhhEmail} for candidate ${candidate.nombre}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to send candidate notification email', error);
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
