import { Controller, Get } from '@nestjs/common';
import { GoogleDriveService } from './google/google-drive.service';

@Controller()
export class HealthController {
  constructor(private readonly driveService: GoogleDriveService) {}

  @Get('health')
  check() {
    return {
      status: 'ok',
      saEmail: this.driveService.getServiceAccountEmail(),
      isConfigured: this.driveService.isConfigured(),
    };
  }
}
