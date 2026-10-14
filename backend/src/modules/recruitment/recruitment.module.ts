import { BadRequestException, Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { join } from 'path';
import { mkdirSync } from 'fs';
import { RecruitmentController } from './recruitment.controller';
import { RecruitmentService } from './recruitment.service';
import { GoogleModule } from '../../google/google.module';

const uploadsDir = join(__dirname, '..', '..', 'uploads');
mkdirSync(uploadsDir, { recursive: true });

const ALLOWED_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

@Module({
  imports: [
    GoogleModule,
    MulterModule.register({
      dest: uploadsDir,
      // Tope grueso de multer: el servicio aplica el límite exacto de 15 MB por archivo
      // (igual que el formulario web). Se deja 1 KB de margen porque multer corta con
      // "mayor o igual" y un archivo de exactamente 15 MB debe seguir aceptándose.
      limits: {
        fileSize: 15 * 1024 * 1024 + 1024,
        files: 20,
        fields: 30,
        fieldSize: 256 * 1024,
        parts: 60,
      },
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIMES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException(`Tipo de archivo no permitido: ${file.mimetype}`), false);
        }
      },
    }),
  ],
  controllers: [RecruitmentController],
  providers: [RecruitmentService],
  exports: [RecruitmentService],
})
export class RecruitmentModule {}
