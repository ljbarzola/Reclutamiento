import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { google } from 'googleapis';
import * as fs from 'fs';

export interface JobVacancy {
  id: number;
  puesto: string;
  descripcion: string;
  camposRequeridos: string[];
  archivosRequeridos: string[];
  createdAt: string;
}

export interface CandidateData {
  nombre: string;
  cedula: string;
  telefono: string;
  email: string;
  puesto: string;
  puestoId: number;
  fechaPostulacion: string;
  archivos: { nombre: string; tipo: string }[];
}

const SHARED_DRIVE_OPTIONS = {
  supportsAllDrives: true,
  includeItemsFromAllDrives: true,
};

/**
 * Utility to fix UTF-8 garbled characters from multipart/form-data headers (Latin-1 misencoding)
 */
export function fixUtf8Encoding(str: string | undefined): string {
  if (!str) return '';
  try {
    if (/[\u00C2-\u00F4][\u0080-\u00BF]/.test(str)) {
      return Buffer.from(str, 'latin1').toString('utf8');
    }
  } catch {
    // Return original string if conversion fails
  }
  return str;
}

@Injectable()
export class GoogleDriveService implements OnModuleInit {
  private readonly logger = new Logger(GoogleDriveService.name);
  private drive: any;
  private recruitmentFolderId: string;
  private serviceAccountEmail: string = '';

  constructor() {
    this.recruitmentFolderId = process.env.GOOGLE_DRIVE_RECRUITMENT_FOLDER_ID || '1VM4Ypbbs0xOBvt-TSLQqQuSrTEUp_Bru';
  }

  getServiceAccountEmail(): string {
    return this.serviceAccountEmail;
  }

  async onModuleInit() {
    await this.initDrive();
  }

  private async initDrive() {
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

      this.serviceAccountEmail = serviceAccount.client_email || 'unknown';
      const auth = new google.auth.GoogleAuth({
        credentials: serviceAccount,
        scopes: ['https://www.googleapis.com/auth/drive'],
      });

      this.drive = google.drive({ version: 'v3', auth });
      this.logger.log(`Google Drive service initialized with SA Email: ${this.serviceAccountEmail}`);
    } catch (error) {
      this.logger.error('Failed to initialize Google Drive service', error);
    }
  }

  async getJobsFromDrive(): Promise<JobVacancy[]> {
    if (!this.drive) {
      this.logger.warn('Drive service not initialized');
      return [];
    }

    try {
      const response = await this.drive.files.list({
        q: `'${this.recruitmentFolderId}' in parents and name contains '.json' and mimeType='application/json'`,
        fields: 'files(id, name)',
        ...SHARED_DRIVE_OPTIONS,
      });

      const files = response.data.files || [];
      const jobs: JobVacancy[] = [];

      for (const file of files) {
        try {
          const content = await this.getFileContent(file.id);
          if (content) {
            const job = typeof content === 'string' ? JSON.parse(content) : (content as any);
            jobs.push({
              ...job,
              puesto: fixUtf8Encoding(job.puesto),
              descripcion: fixUtf8Encoding(job.descripcion),
              camposRequeridos: (job.camposRequeridos || []).map((c: string) => fixUtf8Encoding(c)),
              archivosRequeridos: (job.archivosRequeridos || []).map((a: string) => fixUtf8Encoding(a)),
            });
          }
        } catch (error) {
          this.logger.warn(`Failed to read job file: ${file.name}`);
        }
      }

      return jobs;
    } catch (error) {
      this.logger.error('Failed to list jobs from Drive', error);
      return [];
    }
  }

  async getJobByIdFromDrive(jobId: number): Promise<JobVacancy | null> {
    const jobs = await this.getJobsFromDrive();
    return jobs.find((j) => j.id === jobId) || null;
  }

  private async getFileContent(fileId: string): Promise<string | null> {
    try {
      const response = await this.drive.files.get({
        fileId,
        alt: 'media',
        ...SHARED_DRIVE_OPTIONS,
      });
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get file content: ${fileId}`, error);
      return null;
    }
  }

  /**
   * Search or create a dedicated folder for a specific job vacancy (e.g., "Guardia")
   */
  async getOrCreateJobFolder(jobTitle: string): Promise<string | null> {
    if (!this.drive) return null;
    const cleanJobTitle = fixUtf8Encoding(jobTitle).trim();

    try {
      // 1. Search if folder already exists for this job title
      const searchResponse = await this.drive.files.list({
        q: `'${this.recruitmentFolderId}' in parents and name = '${cleanJobTitle}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name)',
        ...SHARED_DRIVE_OPTIONS,
      });

      const existingFolders = searchResponse.data.files || [];
      if (existingFolders.length > 0) {
        this.logger.log(`Job folder exists: ${cleanJobTitle} (${existingFolders[0].id})`);
        return existingFolders[0].id;
      }

      // 2. Create new job folder if it doesn't exist
      const createResponse = await this.drive.files.create({
        resource: {
          name: cleanJobTitle,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [this.recruitmentFolderId],
        },
        fields: 'id',
        ...SHARED_DRIVE_OPTIONS,
      });

      this.logger.log(`Job folder created: ${cleanJobTitle} (${createResponse.data.id})`);
      return createResponse.data.id;
    } catch (error) {
      this.logger.error(`Failed to get or create job folder for: ${cleanJobTitle}`, error);
      return null;
    }
  }

  /**
   * Create candidate folder inside the job vacancy folder
   */
  async createCandidateFolder(
    candidateName: string,
    cedula: string,
    parentFolderId: string,
  ): Promise<string | null> {
    if (!this.drive) return null;

    const cleanName = fixUtf8Encoding(candidateName).trim();
    const cleanCedula = fixUtf8Encoding(cedula).trim();
    const folderName = `${cleanName} - ${cleanCedula}`;

    try {
      const response = await this.drive.files.create({
        resource: {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentFolderId],
        },
        fields: 'id',
        ...SHARED_DRIVE_OPTIONS,
      });

      this.logger.log(`Candidate folder created: ${folderName} (${response.data.id})`);
      return response.data.id;
    } catch (error) {
      this.logger.error(`Failed to create candidate folder: ${folderName}`, error);
      return null;
    }
  }

  async uploadCandidateJson(folderId: string, data: CandidateData): Promise<boolean> {
    if (!this.drive) return false;

    try {
      const cleanData: CandidateData = {
        nombre: fixUtf8Encoding(data.nombre),
        cedula: fixUtf8Encoding(data.cedula),
        telefono: fixUtf8Encoding(data.telefono),
        email: fixUtf8Encoding(data.email),
        puesto: fixUtf8Encoding(data.puesto),
        puestoId: data.puestoId,
        fechaPostulacion: data.fechaPostulacion,
        archivos: (data.archivos || []).map((a) => ({
          nombre: fixUtf8Encoding(a.nombre),
          tipo: a.tipo,
        })),
      };

      const jsonContent = JSON.stringify(cleanData, null, 2);
      const buffer = Buffer.from(jsonContent, 'utf-8');

      await this.drive.files.create({
        resource: {
          name: 'candidato.json',
          parents: [folderId],
        },
        media: {
          mimeType: 'application/json',
          body: buffer,
        },
        fields: 'id',
        ...SHARED_DRIVE_OPTIONS,
      });

      this.logger.log(`candidato.json uploaded successfully to candidate folder ${folderId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to upload candidato.json`, error);
      return false;
    }
  }

  async uploadFile(
    filePath: string,
    fileName: string,
    mimeType: string,
    folderId: string,
  ): Promise<{ fileId: string; link: string } | null> {
    if (!this.drive) return null;

    const cleanFileName = fixUtf8Encoding(fileName).trim();

    try {
      const response = await this.drive.files.create({
        resource: {
          name: cleanFileName,
          parents: [folderId],
        },
        media: {
          mimeType,
          body: fs.createReadStream(filePath),
        },
        fields: 'id, webViewLink',
        ...SHARED_DRIVE_OPTIONS,
      });

      const fileId = response.data.id;
      const link = response.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

      this.logger.log(`File uploaded: ${cleanFileName} (${fileId})`);
      return { fileId, link };
    } catch (error) {
      this.logger.error(`Failed to upload file: ${cleanFileName}`, error);
      return null;
    }
  }

  isConfigured(): boolean {
    return !!this.drive && !!this.recruitmentFolderId;
  }
}
