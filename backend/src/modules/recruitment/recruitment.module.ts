import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { join } from 'path';
import { mkdirSync } from 'fs';
import { RecruitmentController } from './recruitment.controller';
import { RecruitmentService } from './recruitment.service';
import { GoogleModule } from '../../google/google.module';

const uploadsDir = join(__dirname, '..', '..', 'uploads');
mkdirSync(uploadsDir, { recursive: true });

@Module({
  imports: [
    GoogleModule,
    MulterModule.register({
      dest: uploadsDir,
      limits: {
        fileSize: 50 * 1024 * 1024,
      },
    }),
  ],
  controllers: [RecruitmentController],
  providers: [RecruitmentService],
  exports: [RecruitmentService],
})
export class RecruitmentModule {}
