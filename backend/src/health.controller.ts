import { Controller, Get } from '@nestjs/common';
import { GoogleDriveService } from './google/google-drive.service';
import { GoogleEmailService } from './google/google-email.service';

@Controller()
export class HealthController {
  constructor(
    private readonly driveService: GoogleDriveService,
    private readonly emailService: GoogleEmailService,
  ) {}

  @Get('health')
  check() {
    return {
      status: 'ok',
      isConfigured: this.driveService.isConfigured(),
      emailConfigured: this.emailService.isConfigured(),
    };
  }
}
