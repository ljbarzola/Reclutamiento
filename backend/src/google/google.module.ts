import { Global, Module } from '@nestjs/common';
import { GoogleDriveService } from './google-drive.service';
import { GoogleEmailService } from './google-email.service';

@Global()
@Module({
  providers: [GoogleDriveService, GoogleEmailService],
  exports: [GoogleDriveService, GoogleEmailService],
})
export class GoogleModule {}
