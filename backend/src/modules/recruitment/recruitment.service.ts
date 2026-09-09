import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { GoogleDriveService, CandidateData, fixUtf8Encoding } from '../../google/google-drive.service';
import { SubmitApplicationDto } from './dto/submit-application.dto';
import * as fs from 'fs';

@Injectable()
export class RecruitmentService {
  private readonly logger = new Logger(RecruitmentService.name);

  constructor(private driveService: GoogleDriveService) {}

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
    const jobId = parseInt(dto.jobId, 10);
    if (isNaN(jobId)) {
      throw new BadRequestException('Invalid job ID');
    }

    const job = await this.getJobById(jobId);

    const requiredFiles = job.archivosRequeridos || [];
    if (requiredFiles.length > 0 && (!files || files.length === 0)) {
      throw new BadRequestException('Required documents must be uploaded');
    }

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

    this.cleanTempFiles(files);

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
  }

  private cleanTempFiles(files: Express.Multer.File[]) {
    if (files && files.length > 0) {
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
}
