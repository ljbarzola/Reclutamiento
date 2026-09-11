import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import {
  GoogleDriveService,
  CandidateData,
  ArchivoRequerido,
  fixUtf8Encoding,
} from '../../google/google-drive.service';
import { GoogleEmailService } from '../../google/google-email.service';
import { SubmitApplicationDto } from './dto/submit-application.dto';
import * as fs from 'fs';

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png'];
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;

@Injectable()
export class RecruitmentService {
  private readonly logger = new Logger(RecruitmentService.name);

  constructor(
    private driveService: GoogleDriveService,
    private emailService: GoogleEmailService,
  ) {}

  async getActiveJobs() {
    return this.driveService.getJobsFromDrive();
  }

  async getJobById(id: number) {
    const job = await this.driveService.getJobByIdFromDrive(id);
    if (!job) {
      throw new BadRequestException('Job not found');
    }
    return job;
  }

  async submitApplication(
    dto: SubmitApplicationDto,
    files: Express.Multer.File[],
  ) {
    try {
      const jobId = parseInt(dto.jobId, 10);
      if (isNaN(jobId)) {
        throw new BadRequestException('Invalid job ID');
      }

      const job = await this.getJobById(jobId);

      this.validateFiles(files);
      this.validateRequiredFiles(job.archivosRequeridos || [], files || []);

      const jobFolderId = await this.driveService.getOrCreateJobFolder(job.puesto);
      if (!jobFolderId) {
        throw new BadRequestException('Failed to resolve job folder in Google Drive');
      }

      const candidateName = fixUtf8Encoding(dto.nombre);
      const candidateCedula = fixUtf8Encoding(dto.cedula);
      const candidateFolderId = await this.driveService.findOrCreateCandidateFolder(
        candidateName,
        candidateCedula,
        jobFolderId,
      );

      if (!candidateFolderId) {
        throw new BadRequestException('Failed to resolve candidate folder in Google Drive');
      }

      const uploadedFiles: { nombre: string; tipo: string }[] = [];

      if (files && files.length > 0) {
        for (const file of files) {
          const safeOriginalName = fixUtf8Encoding(file.originalname).replace(/[\/\\:*?"<>|]/g, '_');
          const result = await this.driveService.uploadFile(
            file.path,
            safeOriginalName,
            file.mimetype,
            candidateFolderId,
          );
          if (result) {
            uploadedFiles.push({
              nombre: safeOriginalName,
              tipo: file.mimetype,
            });
          }
        }
      }

      const existingData = await this.driveService.readCandidateJson(candidateFolderId);

      const datosFormulario: Record<string, string> = {
        'Nombre completo': candidateName,
        'Cédula': candidateCedula,
        'Teléfono': fixUtf8Encoding(dto.telefono || ''),
        'Email': fixUtf8Encoding(dto.email),
      };

      if (dto.extraFields) {
        try {
          const extras = JSON.parse(dto.extraFields);
          Object.assign(datosFormulario, extras);
        } catch {
          this.logger.warn('Failed to parse extraFields JSON');
        }
      }

      if (existingData?.datosFormulario) {
        for (const [key, value] of Object.entries(existingData.datosFormulario)) {
          if (!(key in datosFormulario)) {
            datosFormulario[key] = value as string;
          }
        }
      }

      const existingFiles = existingData?.archivos || [];
      const allFiles = [...existingFiles, ...uploadedFiles];

      const candidateData: CandidateData = {
        datosFormulario,
        puesto: fixUtf8Encoding(job.puesto),
        puestoId: job.id,
        fechaPostulacion: existingData?.fechaPostulacion || new Date().toISOString(),
        archivos: allFiles,
      };

      await this.driveService.uploadCandidateJson(candidateFolderId, candidateData);

      const folderLink = `https://drive.google.com/drive/folders/${candidateFolderId}`;
      await this.emailService.sendCandidateNotification(candidateData, folderLink);

      return {
        success: true,
        message: 'Application submitted successfully',
        application: {
          candidateName,
          candidateEmail: datosFormulario['Email'] || '',
          jobTitle: candidateData.puesto,
          status: 'PENDING',
          createdAt: candidateData.fechaPostulacion,
        },
      };
    } finally {
      this.cleanupTempFiles(files);
    }
  }

  private validateRequiredFiles(
    requiredFiles: ArchivoRequerido[],
    files: Express.Multer.File[],
  ) {
    const missing = requiredFiles.filter(
      (req) =>
        req.obligatorio &&
        !files.some((f) =>
          fixUtf8Encoding(f.originalname).toLowerCase().startsWith(req.nombre.toLowerCase()),
        ),
    );
    if (missing.length > 0) {
      throw new BadRequestException(
        `Faltan documentos requeridos: ${missing.map((m) => m.nombre).join(', ')}`,
      );
    }
  }

  private validateFiles(files: Express.Multer.File[]) {
    for (const file of files || []) {
      const extension = ('.' + (file.originalname.split('.').pop() || '')).toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(extension)) {
        throw new BadRequestException(
          `File type not allowed: ${file.originalname}. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`,
        );
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        throw new BadRequestException(`File exceeds maximum size of 15MB: ${file.originalname}`);
      }
    }
  }

  private cleanupTempFiles(files: Express.Multer.File[]) {
    if (!files || files.length === 0) return;
    for (const file of files) {
      try {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch (e) {
        this.logger.warn(`Failed to clean up local file: ${file.path}`);
      }
    }
  }
}
