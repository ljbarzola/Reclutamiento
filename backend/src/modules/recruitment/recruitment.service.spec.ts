import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import { RecruitmentService } from './recruitment.service';
import { GoogleDriveService } from '../../google/google-drive.service';
import { GoogleEmailService } from '../../google/google-email.service';

jest.mock('fs');

describe('RecruitmentService', () => {
  let service: RecruitmentService;
  let driveService: jest.Mocked<GoogleDriveService>;
  let emailService: jest.Mocked<GoogleEmailService>;

  const job = {
    id: 1,
    puesto: 'Guardia',
    descripcion: 'Vacante de guardia',
    camposRequeridos: [],
    archivosRequeridos: ['Cédula'],
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        RecruitmentService,
        {
          provide: GoogleDriveService,
          useValue: {
            getJobsFromDrive: jest.fn(),
            getJobByIdFromDrive: jest.fn(),
            getOrCreateJobFolder: jest.fn(),
            createCandidateFolder: jest.fn(),
            uploadFile: jest.fn(),
            uploadCandidateJson: jest.fn(),
          },
        },
        {
          provide: GoogleEmailService,
          useValue: {
            sendCandidateNotification: jest.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(RecruitmentService);
    driveService = moduleRef.get(GoogleDriveService);
    emailService = moduleRef.get(GoogleEmailService);

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.unlinkSync as jest.Mock).mockImplementation(() => undefined);
  });

  describe('getJobById', () => {
    it('throws when the job does not exist', async () => {
      driveService.getJobByIdFromDrive.mockResolvedValue(null);
      await expect(service.getJobById(999)).rejects.toThrow(BadRequestException);
    });
  });

  describe('submitApplication', () => {
    const dto = {
      nombre: 'Juan Perez',
      cedula: '0987654321',
      telefono: '+593 99 123 4567',
      email: 'juan@email.com',
      jobId: '1',
    };
    const file = {
      path: '/tmp/upload1',
      originalname: 'cedula.pdf',
      mimetype: 'application/pdf',
      size: 1024,
    } as Express.Multer.File;

    it('throws when jobId is not numeric', async () => {
      await expect(service.submitApplication({ ...dto, jobId: 'abc' }, [])).rejects.toThrow(BadRequestException);
    });

    it('cleans up temp files even when the submission fails early', async () => {
      await expect(service.submitApplication({ ...dto, jobId: 'abc' }, [file])).rejects.toThrow(BadRequestException);
      expect(fs.unlinkSync).toHaveBeenCalledWith(file.path);
    });

    it('rejects files with a disallowed extension', async () => {
      driveService.getJobByIdFromDrive.mockResolvedValue(job);
      const badFile = { ...file, originalname: 'malware.exe' } as Express.Multer.File;
      await expect(service.submitApplication(dto, [badFile])).rejects.toThrow(BadRequestException);
      expect(driveService.getOrCreateJobFolder).not.toHaveBeenCalled();
    });

    it('rejects files larger than 15MB', async () => {
      driveService.getJobByIdFromDrive.mockResolvedValue(job);
      const bigFile = { ...file, size: 16 * 1024 * 1024 } as Express.Multer.File;
      await expect(service.submitApplication(dto, [bigFile])).rejects.toThrow(BadRequestException);
      expect(driveService.getOrCreateJobFolder).not.toHaveBeenCalled();
    });

    it('throws when required documents are missing', async () => {
      driveService.getJobByIdFromDrive.mockResolvedValue(job);
      await expect(service.submitApplication(dto, [])).rejects.toThrow(BadRequestException);
    });

    it('throws when the job folder cannot be resolved', async () => {
      driveService.getJobByIdFromDrive.mockResolvedValue(job);
      driveService.getOrCreateJobFolder.mockResolvedValue(null);
      await expect(service.submitApplication(dto, [file])).rejects.toThrow(BadRequestException);
    });

    it('runs the full happy path in order and notifies by email', async () => {
      driveService.getJobByIdFromDrive.mockResolvedValue(job);
      driveService.getOrCreateJobFolder.mockResolvedValue('job-folder-id');
      driveService.createCandidateFolder.mockResolvedValue('candidate-folder-id');
      driveService.uploadFile.mockResolvedValue({ fileId: 'file-1', link: 'https://drive/file-1' });
      driveService.uploadCandidateJson.mockResolvedValue(true);
      emailService.sendCandidateNotification.mockResolvedValue(true);

      const result = await service.submitApplication(dto, [file]);

      expect(driveService.getOrCreateJobFolder).toHaveBeenCalledWith(job.puesto);
      expect(driveService.createCandidateFolder).toHaveBeenCalledWith(
        dto.nombre,
        dto.cedula,
        'job-folder-id',
      );
      expect(driveService.uploadFile).toHaveBeenCalledWith(
        file.path,
        file.originalname,
        file.mimetype,
        'candidate-folder-id',
      );
      expect(driveService.uploadCandidateJson).toHaveBeenCalledWith(
        'candidate-folder-id',
        expect.objectContaining({ nombre: dto.nombre, cedula: dto.cedula }),
      );
      expect(emailService.sendCandidateNotification).toHaveBeenCalledWith(
        expect.objectContaining({ nombre: dto.nombre }),
        'https://drive.google.com/drive/folders/candidate-folder-id',
      );

      expect(result).toEqual({
        success: true,
        message: 'Application submitted successfully',
        application: expect.objectContaining({
          candidateName: dto.nombre,
          candidateEmail: dto.email,
          jobTitle: job.puesto,
          driveLink: 'https://drive.google.com/drive/folders/candidate-folder-id',
          status: 'PENDING',
        }),
      });
    });

    it('does not fail the submission when the notification email fails', async () => {
      driveService.getJobByIdFromDrive.mockResolvedValue(job);
      driveService.getOrCreateJobFolder.mockResolvedValue('job-folder-id');
      driveService.createCandidateFolder.mockResolvedValue('candidate-folder-id');
      driveService.uploadFile.mockResolvedValue({ fileId: 'file-1', link: 'https://drive/file-1' });
      driveService.uploadCandidateJson.mockResolvedValue(true);
      emailService.sendCandidateNotification.mockResolvedValue(false);

      const result = await service.submitApplication(dto, [file]);

      expect(result.success).toBe(true);
    });
  });
});
