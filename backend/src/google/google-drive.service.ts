import { Injectable, Logger } from '@nestjs/common';
import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

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

@Injectable()
export class GoogleDriveService {
  private readonly logger = new Logger(GoogleDriveService.name);
  private drive: any;
  private recruitmentFolderId: string;

  constructor() {
    this.recruitmentFolderId = process.env.GOOGLE_DRIVE_RECRUITMENT_FOLDER_ID || '';
    this.initDrive();
  }

  private async initDrive() {
    try {
      const serviceAccountPath = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
      if (!serviceAccountPath) {
        this.logger.warn('GOOGLE_SERVICE_ACCOUNT_JSON not configured');
        return;
      }

      let serviceAccount;
      if (fs.existsSync(serviceAccountPath)) {
        const fileContent = fs.readFileSync(serviceAccountPath, 'utf-8');
        serviceAccount = JSON.parse(fileContent);
      } else {
        serviceAccount = JSON.parse(serviceAccountPath);
      }

      const auth = new google.auth.GoogleAuth({
        credentials: serviceAccount,
        scopes: ['https://www.googleapis.com/auth/drive'],
      });

      this.drive = google.drive({ version: 'v3', auth });
      this.logger.log('Google Drive service initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Google Drive', error);
    }
  }

  async getJobsFromDrive(): Promise<JobVacancy[]> {
    if (!this.drive) {
      this.logger.warn('Drive not initialized');
      return [];
    }

    try {
      const response = await this.drive.files.list({
        q: `'${this.recruitmentFolderId}' in parents and name contains '.json' and mimeType='application/json'`,
        fields: 'files(id, name)',
      });

      const files = response.data.files || [];
      const jobs: JobVacancy[] = [];

      for (const file of files) {
        try {
          const content = await this.getFileContent(file.id);
          if (content) {
            const job = JSON.parse(content) as JobVacancy;
            jobs.push(job);
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
      });
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get file content: ${fileId}`, error);
      return null;
    }
  }

  async createCandidateFolder(candidateName: string, cedula: string): Promise<string | null> {
    if (!this.drive) {
      this.logger.warn('Drive not initialized');
      return null;
    }

    try {
      const folderName = `${candidateName} - ${cedula}`;
      const response = await this.drive.files.create({
        resource: {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [this.recruitmentFolderId],
        },
        fields: 'id',
      });

      this.logger.log(`Candidate folder created: ${folderName} (${response.data.id})`);
      return response.data.id;
    } catch (error) {
      this.logger.error(`Failed to create candidate folder`, error);
      return null;
    }
  }

  async uploadCandidateJson(folderId: string, data: CandidateData): Promise<boolean> {
    if (!this.drive) {
      this.logger.warn('Drive not initialized');
      return false;
    }

    try {
      const jsonContent = JSON.stringify(data, null, 2);
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
      });

      this.logger.log(`candidato.json uploaded to folder ${folderId}`);
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
    if (!this.drive) {
      this.logger.warn('Drive not initialized');
      return null;
    }

    try {
      const response = await this.drive.files.create({
        resource: {
          name: fileName,
          parents: [folderId],
        },
        media: {
          mimeType,
          body: fs.createReadStream(filePath),
        },
        fields: 'id, webViewLink',
      });

      const fileId = response.data.id;
      const link = response.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

      this.logger.log(`File uploaded: ${fileName} (${fileId})`);
      return { fileId, link };
    } catch (error) {
      this.logger.error(`Failed to upload file: ${fileName}`, error);
      return null;
    }
  }

  isConfigured(): boolean {
    return !!this.drive && !!this.recruitmentFolderId;
  }
}
