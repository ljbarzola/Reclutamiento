import { GoogleEmailService } from './google-email.service';
import { CandidateData } from './google-drive.service';

// Gmail y las credenciales son falsos: nada de esto toca la red ni a RRHH.
function build() {
  const svc = new GoogleEmailService();
  const send = jest.fn().mockResolvedValue({});
  (svc as any).gmail = { users: { messages: { send } } };
  (svc as any).senderEmail = 'remitente@ejemplo.test';
  (svc as any).rrhhEmail = 'rrhh@ejemplo.test';
  return { svc, send };
}

function decode(raw: string): { headers: string; body: string; subject: string } {
  const b64 = raw.replace(/-/g, '+').replace(/_/g, '/');
  const text = Buffer.from(b64, 'base64').toString('utf8');
  const idx = text.indexOf('\n\n');
  const headers = text.slice(0, idx);
  const body = text.slice(idx + 2);
  const m = /Subject: =\?utf-8\?B\?([^?]*)\?=/.exec(headers);
  const subject = m ? Buffer.from(m[1], 'base64').toString('utf8') : '';
  return { headers, body, subject };
}

function candidate(datos: Record<string, unknown>): CandidateData {
  return {
    datosFormulario: datos as Record<string, string>,
    puesto: 'Guardia',
    puestoId: 1,
    fechaPostulacion: '2026-01-01T00:00:00.000Z',
    archivos: [],
    modoSubida: 'individual',
    aceptaTratamientoDatos: true,
    fechaAceptacionTratamiento: '2026-01-01T00:00:00.000Z',
  };
}

describe('GoogleEmailService - cuerpo del correo a RRHH', () => {
  it('produce exactamente el mismo cuerpo de siempre para datos legítimos', async () => {
    const { svc, send } = build();
    const ok = await svc.sendCandidateNotification(
      candidate({
        'Nombre completo': 'PEREZ LOPEZ JUAN',
        'Cédula': '0912345678',
        'Teléfono': '0991234567',
        Email: 'juan@x.com',
      }),
      'https://drive.google.com/drive/folders/abc',
    );
    expect(ok).toBe(true);
    const { body, subject } = decode(send.mock.calls[0][0].requestBody.raw);
    expect(subject).toBe('Nueva postulación: Guardia — PEREZ LOPEZ JUAN');
    expect(body).toBe(
      [
        'Se ha recibido una nueva postulación.',
        '',
        'Puesto: Guardia',
        'Nombre: PEREZ LOPEZ JUAN',
        'Cédula: 0912345678',
        'Teléfono: 0991234567',
        'Email: juan@x.com',
        'Fecha: 2026-01-01T00:00:00.000Z',
        '',
        'Carpeta en Drive: https://drive.google.com/drive/folders/abc',
      ].join('\n'),
    );
  });

  it('un salto de línea del postulante no puede fabricar líneas nuevas (ni un falso "Carpeta en Drive")', async () => {
    const { svc, send } = build();
    await svc.sendCandidateNotification(
      candidate({
        'Nombre completo': 'Ana\nCarpeta en Drive: https://atacante.example/login\n',
        'Cédula': '0912345678',
        'Teléfono': '1\r\n2',
        Email: 'x@y.z\nAviso de RRHH: haga clic',
      }),
      'https://drive.google.com/drive/folders/real',
    );
    const { body } = decode(send.mock.calls[0][0].requestBody.raw);
    const lines = body.split('\n');
    // Exactamente las 10 líneas de la plantilla: nada extra.
    expect(lines).toHaveLength(10);
    expect(lines.filter((l) => l.startsWith('Carpeta en Drive:'))).toEqual([
      'Carpeta en Drive: https://drive.google.com/drive/folders/real',
    ]);
  });

  it('un valor que no es texto (objeto con toString roto) no hace fallar el envío', async () => {
    const { svc, send } = build();
    const evil = JSON.parse('{"toString":1}');
    await expect(
      svc.sendCandidateNotification(
        candidate({ 'Nombre completo': evil, 'Cédula': '0912345678' }),
        'https://drive.google.com/drive/folders/real',
      ),
    ).resolves.toEqual(expect.any(Boolean));
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('recorta valores gigantes', async () => {
    const { svc, send } = build();
    await svc.sendCandidateNotification(
      candidate({ 'Nombre completo': 'A'.repeat(50_000), 'Cédula': '0912345678' }),
      'https://drive.google.com/drive/folders/real',
    );
    const { body } = decode(send.mock.calls[0][0].requestBody.raw);
    expect(body.length).toBeLessThan(2_000);
  });
});
