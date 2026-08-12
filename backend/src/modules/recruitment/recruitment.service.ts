import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { GoogleDriveService, CandidateData } from '../../google/google-drive.service';
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

    const folderId = await this.driveService.createCandidateFolder(
      dto.nombre,
      dto.cedula,
    );

    if (!folderId) {
      throw new BadRequestException('Failed to create candidate folder in Drive');
    }

    const uploadedFiles: { nombre: string; tipo: string }[] = [];

    if (files && files.length > 0) {
      for (const file of files) {
        const result = await this.driveService.uploadFile(
          file.path,
          file.originalname,
          file.mimetype,
          folderId,
        );
        if (result) {
          uploadedFiles.push({
            nombre: file.originalname,
            tipo: file.mimetype,
          });
        }
      }
    }

    const candidateData: CandidateData = {
      nombre: dto.nombre,
      cedula: dto.cedula,
      telefono: dto.telefono || '',
      email: dto.email,
      puesto: job.puesto,
      puestoId: job.id,
      fechaPostulacion: new Date().toISOString(),
      archivos: uploadedFiles,
    };

    await this.driveService.uploadCandidateJson(folderId, candidateData);

    if (files && files.length > 0) {
      for (const file of files) {
        try {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        } catch (e) {
          this.logger.warn(`Failed to clean up file: ${file.path}`);
        }
      }
    }

    const folderLink = `https://drive.google.com/drive/folders/${folderId}`;

    return {
      success: true,
      message: 'Application submitted successfully',
      application: {
        candidateName: dto.nombre,
        candidateEmail: dto.email,
        jobTitle: job.puesto,
        driveLink: folderLink,
        status: 'PENDING',
        createdAt: candidateData.fechaPostulacion,
      },
    };
  }
}
