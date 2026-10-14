import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  GoogleDriveService,
  CandidateData,
  ArchivoRequerido,
  fixUtf8Encoding,
} from '../../google/google-drive.service';
import { GoogleEmailService } from '../../google/google-email.service';
import { SubmitApplicationDto } from './dto/submit-application.dto';
import {
  sanitizeLine,
  parseExtraFields,
  toClientDocPrefix,
  describeError,
  MAX_TOTAL_FORM_KEYS,
} from '../../common/sanitize.util';
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
      const modoSubida = dto.modoSubida || 'individual';

      this.validateFiles(files);
      if (modoSubida === 'archivo_unico') {
        this.validateSingleFileMode(files || []);
      } else {
        this.validateRequiredFiles(job.archivosRequeridos || [], files || []);
      }

      const jobFolderId = await this.driveService.getOrCreateJobFolder(job.puesto);
      if (!jobFolderId) {
        throw new BadRequestException('Failed to resolve job folder in Google Drive');
      }

      // Texto del postulante tratado como DATO de una sola línea: sin saltos de línea
      // ni caracteres de control (se usa en nombres de carpeta, JSON, correo y logs).
      const candidateName = sanitizeLine(fixUtf8Encoding(dto.nombre), 200);
      const candidateCedula = sanitizeLine(fixUtf8Encoding(dto.cedula), 50);
      const candidateTelefono = sanitizeLine(fixUtf8Encoding(dto.telefono || ''), 50);
      const candidateEmail = sanitizeLine(fixUtf8Encoding(dto.email), 254);
      const candidateFolderId = await this.driveService.findOrCreateCandidateFolder(
        candidateName,
        candidateCedula,
        jobFolderId,
      );

      if (!candidateFolderId) {
        throw new BadRequestException('Failed to resolve candidate folder in Google Drive');
      }

      // Se lee el registro previo ANTES de subir nada: si Drive falla de forma
      // transitoria no se sobrescribe en silencio lo que ya estaba guardado ni se
      // dejan archivos huérfanos. Un candidato.json ilegible se sigue tratando como
      // ausente (igual que antes).
      let existingData: CandidateData | null;
      try {
        existingData = await this.driveService.readCandidateJsonStrict(candidateFolderId);
      } catch (error) {
        this.logger.error(`No se pudo leer candidato.json de la carpeta ${candidateFolderId}: ${describeError(error)}`);
        throw new ServiceUnavailableException(
          'No pudimos verificar su postulación en este momento. Por favor intente nuevamente en unos minutos.',
        );
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
          } else {
            throw new InternalServerErrorException(
              'No se pudo subir uno de los documentos adjuntos. Por favor intente su postulación nuevamente.',
            );
          }
        }
      }

      const datosFormulario: Record<string, string> = {
        'Nombre completo': candidateName,
        'Cédula': candidateCedula,
        'Teléfono': candidateTelefono,
        'Email': candidateEmail,
      };

      const { fields: extras, valid: extrasValid } = parseExtraFields(dto.extraFields);
      if (!extrasValid) {
        this.logger.warn('extraFields no es un objeto JSON válido; se ignora');
      }

      const existingForm: Record<string, unknown> =
        existingData?.datosFormulario && typeof existingData.datosFormulario === 'object'
          ? (existingData.datosFormulario as Record<string, unknown>)
          : {};
      const existingKeyCount = Object.keys(existingForm).length;
      let newKeysAllowed = Math.max(0, MAX_TOTAL_FORM_KEYS - existingKeyCount);

      for (const [key, value] of Object.entries(extras)) {
        const isKnown = Object.prototype.hasOwnProperty.call(datosFormulario, key);
        const existedBefore = Object.prototype.hasOwnProperty.call(existingForm, key);
        if (!isKnown && !existedBefore) {
          // Tope de tamaño del registro: las claves nuevas se aceptan hasta el límite.
          if (newKeysAllowed <= 0) continue;
          newKeysAllowed--;
        }
        datosFormulario[key] = value;
      }

      // Lo ya guardado se conserva. Un valor nuevo no vacío gana (quien corrige sus
      // datos puede hacerlo), pero uno VACÍO ya no borra el dato guardado.
      for (const [key, value] of Object.entries(existingForm)) {
        if (!Object.prototype.hasOwnProperty.call(datosFormulario, key)) {
          datosFormulario[key] = value as string;
        } else if (datosFormulario[key] === '' && typeof value === 'string' && value !== '') {
          datosFormulario[key] = value;
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
        modoSubida,
        aceptaTratamientoDatos: true,
        fechaAceptacionTratamiento: existingData?.fechaAceptacionTratamiento || new Date().toISOString(),
      };

      const jsonSaved = await this.driveService.uploadCandidateJson(candidateFolderId, candidateData);
      if (!jsonSaved) {
        throw new InternalServerErrorException(
          'No se pudo guardar la información de la postulación. Por favor intente nuevamente.',
        );
      }

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
          // Hora de ESTE envío: no se devuelve la fecha de una postulación anterior
          // (revelaría que la persona ya había postulado). En Drive se conserva la original.
          createdAt: new Date().toISOString(),
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
    const missing = requiredFiles.filter((req) => {
      if (!req.obligatorio) return false;
      // El formulario web antepone el nombre del documento SIN símbolos; se acepta
      // ese prefijo además del nombre exacto (solo amplía lo aceptado).
      const exact = String(req.nombre ?? '').toLowerCase();
      const clean = toClientDocPrefix(String(req.nombre ?? '')).toLowerCase();
      return !files.some((f) => {
        const fileName = fixUtf8Encoding(f.originalname).toLowerCase();
        return fileName.startsWith(exact) || (clean !== '' && fileName.startsWith(clean));
      });
    });
    if (missing.length > 0) {
      throw new BadRequestException(
        `Faltan documentos requeridos: ${missing.map((m) => m.nombre).join(', ')}`,
      );
    }
  }

  private validateSingleFileMode(files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Debe adjuntar el archivo con su información para continuar.');
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
