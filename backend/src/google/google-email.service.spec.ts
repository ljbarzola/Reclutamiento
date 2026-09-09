import { GoogleEmailService } from './google-email.service';
import { CandidateData } from './google-drive.service';

const sendMock = jest.fn();

jest.mock('googleapis', () => ({
  google: {
    auth: {
      GoogleAuth: jest.fn().mockImplementation(() => ({})),
    },
    gmail: jest.fn().mockImplementation(() => ({
      users: { messages: { send: sendMock } },
    })),
  },
}));

const candidate: CandidateData = {
  datosFormulario: {
    'Nombre completo': 'Juan Perez',
    'Cédula': '0987654321',
    'Teléfono': '+593 99 123 4567',
    'Email': 'juan@email.com',
  },
  puesto: 'Guardia',
  puestoId: 1,
  fechaPostulacion: '2026-01-01T00:00:00.000Z',
  archivos: [],
};

describe('GoogleEmailService', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('is not configured and skips sending when env vars are missing', async () => {
    delete process.env.GMAIL_SEND_EMAIL;
    delete process.env.RRHH_EMAIL;

    const service = new GoogleEmailService();
    await service.onModuleInit();

    expect(service.isConfigured()).toBe(false);
    expect(await service.sendCandidateNotification(candidate, 'https://drive.google.com/x')).toBe(false);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('sends a notification email when configured', async () => {
    process.env.GMAIL_SEND_EMAIL = 'reclutamiento@gemeseg.com';
    process.env.RRHH_EMAIL = 'sistemas@gemeseg.com';
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify({ client_email: 'sa@example.com' });
    sendMock.mockResolvedValueOnce({ data: { id: '123' } });

    const service = new GoogleEmailService();
    await service.onModuleInit();

    expect(service.isConfigured()).toBe(true);

    const result = await service.sendCandidateNotification(candidate, 'https://drive.google.com/x');

    expect(result).toBe(true);
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'me',
        requestBody: expect.objectContaining({ raw: expect.any(String) }),
      }),
    );
  });

  it('returns false without throwing when the Gmail API call fails', async () => {
    process.env.GMAIL_SEND_EMAIL = 'reclutamiento@gemeseg.com';
    process.env.RRHH_EMAIL = 'sistemas@gemeseg.com';
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify({ client_email: 'sa@example.com' });
    sendMock.mockRejectedValueOnce(new Error('boom'));

    const service = new GoogleEmailService();
    await service.onModuleInit();

    await expect(service.sendCandidateNotification(candidate, 'https://drive.google.com/x')).resolves.toBe(false);
  });
});
