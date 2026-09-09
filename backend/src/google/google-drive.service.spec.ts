import { GoogleDriveService, fixUtf8Encoding } from './google-drive.service';

describe('fixUtf8Encoding', () => {
  it('returns an empty string for undefined input', () => {
    expect(fixUtf8Encoding(undefined)).toBe('');
  });

  it('leaves normal UTF-8 text unchanged', () => {
    expect(fixUtf8Encoding('Juan Perez')).toBe('Juan Perez');
  });

  it('fixes latin1-mojibake accented characters', () => {
    const correct = 'Pérez';
    const mojibake = Buffer.from(correct, 'utf8').toString('latin1');
    expect(fixUtf8Encoding(mojibake)).toBe(correct);
  });
});

describe('GoogleDriveService', () => {
  beforeEach(() => {
    delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64;
    delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    delete process.env.GOOGLE_SERVICE_ACCOUNT_FILE;
  });

  it('is not configured before initialization', () => {
    const service = new GoogleDriveService();
    expect(service.isConfigured()).toBe(false);
  });

  it('stays unconfigured when no credentials are provided', async () => {
    const service = new GoogleDriveService();
    await service.onModuleInit();
    expect(service.isConfigured()).toBe(false);
    expect(await service.getJobsFromDrive()).toEqual([]);
  });
});
