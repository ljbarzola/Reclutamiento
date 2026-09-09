import { Test } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { GoogleDriveService } from './google/google-drive.service';
import { GoogleEmailService } from './google/google-email.service';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: GoogleDriveService, useValue: { isConfigured: () => true } },
        { provide: GoogleEmailService, useValue: { isConfigured: () => false } },
      ],
    }).compile();

    controller = moduleRef.get(HealthController);
  });

  it('reports status without leaking the service account email', () => {
    const result = controller.check();
    expect(result).toEqual({
      status: 'ok',
      isConfigured: true,
      emailConfigured: false,
    });
    expect(result).not.toHaveProperty('saEmail');
  });
});
