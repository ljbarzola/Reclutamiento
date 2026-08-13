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

    // 1. Get or create the job vacancy folder (e.g. "Guardia")
    const jobFolderId = await this.driveService.getOrCreateJobFolder(job.puesto);
    if (!jobFolderId) {
      throw new BadRequestException('Failed to resolve job folder in Google Drive');
    }

    // 2. Create the candidate folder inside the job vacancy folder (e.g. "Juan Perez - 0987654321")
    const candidateName = fixUtf8Encoding(dto.nombre);
    const candidateCedula = fixUtf8Encoding(dto.cedula);
    const candidateFolderId = await this.driveService.createCandidateFolder(
      candidateName,
      candidateCedula,
      jobFolderId,
    );

    if (!candidateFolderId) {
      throw new BadRequestException('Failed to create candidate folder in Google Drive');
    }

    // 3. Upload all candidate files to candidate folder with clean UTF-8 names
    const uploadedFiles: { nombre: string; tipo: string }[] = [];

    if (files && files.length > 0) {
      for (const file of files) {
        const cleanOriginalName = fixUtf8Encoding(file.originalname);
        const result = await this.driveService.uploadFile(
          file.path,
          cleanOriginalName,
          file.mimetype,
          candidateFolderId,
        );
        if (result) {
          uploadedFiles.push({
            nombre: cleanOriginalName,
            tipo: file.mimetype,
          });
        }
      }
    }

    // 4. Create and upload candidato.json
    const candidateData: CandidateData = {
      nombre: candidateName,
      cedula: candidateCedula,
      telefono: fixUtf8Encoding(dto.telefono || ''),
      email: fixUtf8Encoding(dto.email),
      puesto: fixUtf8Encoding(job.puesto),
      puestoId: job.id,
      fechaPostulacion: new Date().toISOString(),
      archivos: uploadedFiles,
    };

    await this.driveService.uploadCandidateJson(candidateFolderId, candidateData);

    // 5. Clean up local temp files
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

    const folderLink = `https://drive.google.com/drive/folders/${candidateFolderId}`;

    return {
      success: true,
      message: 'Application submitted successfully',
      application: {
        candidateName,
        candidateEmail: candidateData.email,
        jobTitle: candidateData.puesto,
        driveLink: folderLink,
        status: 'PENDING',
        createdAt: candidateData.fechaPostulacion,
      },
    };
  }
}
