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
  datosFormulario: Record<string, string>;
  puesto: string;
  puestoId: number;
  fechaPostulacion: string;
  archivos: { nombre: string; tipo: string }[];
}

const SHARED_DRIVE_OPTIONS = {
  supportsAllDrives: true,
  includeItemsFromAllDrives: true,
};

export function fixUtf8Encoding(str: string | undefined): string {
  if (!str) return '';
  try {
    if (/[\u00C2-\u00F4][\u0080-\u00BF]/.test(str)) {
      return Buffer.from(str, 'latin1').toString('utf8');
    }
  } catch {
    return str;
  }
  return str;
}

@Injectable()
export class GoogleDriveService implements OnModuleInit {
  private readonly logger = new Logger(GoogleDriveService.name);
  private drive: any;
  private recruitmentFolderId: string;

  constructor() {
    this.recruitmentFolderId = process.env.GOOGLE_DRIVE_RECRUITMENT_FOLDER_ID || '1VM4Ypbbs0xOBvt-TSLQqQuSrTEUp_Bru';
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

      const auth = new google.auth.GoogleAuth({
        credentials: serviceAccount,
        scopes: ['https://www.googleapis.com/auth/drive'],
      });

      this.drive = google.drive({ version: 'v3', auth });
      this.logger.log('Google Drive service initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Google Drive service', error);
    }
  }

  private isJobVacancyJson(data: any): boolean {
    return (
      data &&
      typeof data === 'object' &&
      typeof data.id === 'number' &&
      typeof data.puesto === 'string' &&
      Array.isArray(data.archivosRequeridos)
    );
  }

  private normalizeStringArray(arr: any[]): string[] {
    if (!Array.isArray(arr)) return [];
    return arr.map((item) => {
      if (typeof item === 'string') return fixUtf8Encoding(item);
      if (item && typeof item === 'object' && item.nombre) return fixUtf8Encoding(item.nombre);
      return fixUtf8Encoding(String(item));
    });
  }

  private parseJobFromDrive(data: any): JobVacancy {
    return {
      id: data.id,
      puesto: fixUtf8Encoding(data.puesto),
      descripcion: fixUtf8Encoding(data.descripcion || ''),
      camposRequeridos: this.normalizeStringArray(data.camposRequeridos),
      archivosRequeridos: this.normalizeStringArray(data.archivosRequeridos),
      createdAt: data.createdAt || '',
    };
  }

  async getJobsFromDrive(): Promise<JobVacancy[]> {
    if (!this.drive) {
      this.logger.warn('Drive service not initialized');
      return [];
    }

    try {
      const jobs: JobVacancy[] = [];
      const seenIds = new Set<number>();

      const directJsonResponse = await this.drive.files.list({
        q: `'${this.recruitmentFolderId}' in parents and name contains '.json' and mimeType='application/json' and trashed = false`,
        fields: 'files(id, name)',
        ...SHARED_DRIVE_OPTIONS,
      });

      for (const file of directJsonResponse.data.files || []) {
        try {
          const content = await this.getFileContent(file.id);
          if (content) {
            const data = typeof content === 'string' ? JSON.parse(content) : content;
            if (this.isJobVacancyJson(data) && !seenIds.has(data.id)) {
              seenIds.add(data.id);
              jobs.push(this.parseJobFromDrive(data));
            }
          }
        } catch (error) {
          this.logger.warn(`Failed to read job file: ${file.name}`);
        }
      }

      if (jobs.length === 0) {
        const folderResponse = await this.drive.files.list({
          q: `'${this.recruitmentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
          fields: 'files(id, name)',
          ...SHARED_DRIVE_OPTIONS,
        });

        for (const folder of folderResponse.data.files || []) {
          try {
            const folderJsonResponse = await this.drive.files.list({
              q: `'${folder.id}' in parents and name contains '.json' and mimeType='application/json' and trashed = false`,
              fields: 'files(id, name)',
              ...SHARED_DRIVE_OPTIONS,
            });

            for (const file of folderJsonResponse.data.files || []) {
              if (file.name === 'candidato.json') continue;

              try {
                const content = await this.getFileContent(file.id);
                if (content) {
                  const data = typeof content === 'string' ? JSON.parse(content) : content;
                  if (this.isJobVacancyJson(data) && !seenIds.has(data.id)) {
                    seenIds.add(data.id);
                    jobs.push(this.parseJobFromDrive(data));
                  }
                }
              } catch (error) {
                this.logger.warn(`Failed to read job file in folder ${folder.name}: ${file.name}`);
              }
            }
          } catch (error) {
            this.logger.warn(`Failed to list files in folder: ${folder.name}`);
          }
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

  async getOrCreateJobFolder(jobTitle: string): Promise<string | null> {
    if (!this.drive) return null;
    const cleanJobTitle = fixUtf8Encoding(jobTitle).trim();

    try {
      const safeTitle = cleanJobTitle.replace(/'/g, "\\'");
      const searchResponse = await this.drive.files.list({
        q: `'${this.recruitmentFolderId}' in parents and name = '${safeTitle}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name)',
        ...SHARED_DRIVE_OPTIONS,
      });

      const existingFolders = searchResponse.data.files || [];
      if (existingFolders.length > 0) {
        return existingFolders[0].id;
      }

      const createResponse = await this.drive.files.create({
        resource: {
          name: cleanJobTitle,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [this.recruitmentFolderId],
        },
        fields: 'id',
        ...SHARED_DRIVE_OPTIONS,
      });

      return createResponse.data.id;
    } catch (error) {
      this.logger.error(`Failed to get or create job folder for: ${cleanJobTitle}`, error);
      return null;
    }
  }

  async findOrCreateCandidateFolder(
    candidateName: string,
    cedula: string,
    parentFolderId: string,
  ): Promise<string | null> {
    if (!this.drive) return null;

    const cleanName = fixUtf8Encoding(candidateName).trim();
    const cleanCedula = fixUtf8Encoding(cedula).trim();
    const folderName = `${cleanName} -${cleanCedula}`;

    try {
      const safeFolderName = folderName.replace(/'/g, "\\'");
      const searchResponse = await this.drive.files.list({
        q: `'${parentFolderId}' in parents and name = '${safeFolderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name)',
        ...SHARED_DRIVE_OPTIONS,
      });

      const existingFolders = searchResponse.data.files || [];
      if (existingFolders.length > 0) {
        this.logger.log(`Candidate folder found: ${folderName} (${existingFolders[0].id})`);
        return existingFolders[0].id;
      }

      const createResponse = await this.drive.files.create({
        resource: {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentFolderId],
        },
        fields: 'id',
        ...SHARED_DRIVE_OPTIONS,
      });

      this.logger.log(`Candidate folder created: ${folderName} (${createResponse.data.id})`);
      return createResponse.data.id;
    } catch (error) {
      this.logger.error(`Failed to find or create candidate folder: ${folderName}`, error);
      return null;
    }
  }

  async readCandidateJson(folderId: string): Promise<CandidateData | null> {
    if (!this.drive) return null;

    try {
      const searchResponse = await this.drive.files.list({
        q: `'${folderId}' in parents and name = 'candidato.json' and mimeType = 'application/json' and trashed = false`,
        fields: 'files(id)',
        ...SHARED_DRIVE_OPTIONS,
      });

      const files = searchResponse.data.files || [];
      if (files.length === 0) return null;

      const content = await this.getFileContent(files[0].id);
      if (!content) return null;

      return typeof content === 'string' ? JSON.parse(content) : (content as CandidateData);
    } catch (error) {
      this.logger.error(`Failed to read candidato.json from folder ${folderId}`, error);
      return null;
    }
  }

  async uploadCandidateJson(folderId: string, data: CandidateData): Promise<boolean> {
    if (!this.drive) return false;

    try {
      const cleanDatosFormulario: Record<string, string> = {};
      for (const [key, value] of Object.entries(data.datosFormulario)) {
        cleanDatosFormulario[fixUtf8Encoding(key)] = fixUtf8Encoding(value as string);
      }

      const cleanData: CandidateData = {
        datosFormulario: cleanDatosFormulario,
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

      const searchResponse = await this.drive.files.list({
        q: `'${folderId}' in parents and name = 'candidato.json' and mimeType = 'application/json' and trashed = false`,
        fields: 'files(id)',
        ...SHARED_DRIVE_OPTIONS,
      });

      const existingFiles = searchResponse.data.files || [];

      if (existingFiles.length > 0) {
        await this.drive.files.update({
          fileId: existingFiles[0].id,
          media: {
            mimeType: 'application/json',
            body: buffer,
          },
          ...SHARED_DRIVE_OPTIONS,
        });
      } else {
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
      }

      this.logger.log(`candidato.json saved to candidate folder ${folderId}`);
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
