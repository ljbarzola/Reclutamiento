// Prueba de extremo a extremo del endpoint público de postulación con Drive y Gmail
// FALSOS: levanta Nest de verdad (multer + ValidationPipe como en main.ts) y manda
// multipart por HTTP local. Ninguna llamada llega a Google ni a RRHH.
delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64;
delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
delete process.env.GOOGLE_SERVICE_ACCOUNT_FILE;
delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
delete process.env.GMAIL_SEND_EMAIL;
delete process.env.RRHH_EMAIL;
process.env.GOOGLE_DRIVE_RECRUITMENT_FOLDER_ID = 'carpeta-de-prueba-falsa';

import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { existsSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { RecruitmentModule } from './recruitment.module';
import { GoogleDriveService } from '../../google/google-drive.service';
import { GoogleEmailService } from '../../google/google-email.service';

const uploadsDir = join(__dirname, '..', '..', 'uploads');

const job1 = {
  id: 1,
  puesto: 'Guardia',
  descripcion: 'Vacante',
  camposRequeridos: [],
  archivosRequeridos: [{ nombre: 'Cédula', extensiones: ['pdf'], obligatorio: true }],
  createdAt: '2026-01-01T00:00:00.000Z',
  abierta: true,
};
const job2 = {
  ...job1,
  id: 2,
  archivosRequeridos: [
    { nombre: 'Cédula/Pasaporte (copia)', extensiones: ['pdf'], obligatorio: true },
  ],
};

// Payload tal como lo arma el formulario desplegado (origin/main): TODOS los campos
// de la vacante viajan en extraFields con su etiqueta; nombre = "apellidos nombres".
const legitFields = {
  nombre: 'PEREZ LOPEZ JUAN',
  cedula: '0912345678',
  email: 'juan@x.com',
  telefono: '0991234567',
  jobId: '1',
  modoSubida: 'individual',
  aceptaTratamientoDatos: 'true',
  extraFields: JSON.stringify({
    Nombres: 'JUAN',
    Apellidos: 'PEREZ LOPEZ',
    'Cédula': '0912345678',
    Correo: 'juan@x.com',
    Celular: '0991234567',
    'Dirección': 'Av. 9 de Octubre 123',
  }),
};

function makeFakes() {
  const state: any = { existing: null, readThrows: false, uploads: [], stored: null, email: null };
  const drive = {
    getJobsFromDrive: jest.fn(async () => [job1, job2]),
    getJobByIdFromDrive: jest.fn(async (id: number) => [job1, job2].find((j) => j.id === id) || null),
    getOrCreateJobFolder: jest.fn(async () => 'job-folder'),
    findOrCreateCandidateFolder: jest.fn(async () => 'cand-folder'),
    readCandidateJson: jest.fn(async () => state.existing),
    readCandidateJsonStrict: jest.fn(async () => {
      if (state.readThrows) throw new Error('drive caído');
      return state.existing;
    }),
    uploadFile: jest.fn(async (path: string, name: string, mime: string) => {
      state.uploads.push({ name, mime, existiaEnDisco: existsSync(path) });
      return { fileId: 'f1', link: 'https://drive.test/f1' };
    }),
    uploadCandidateJson: jest.fn(async (_id: string, data: any) => {
      state.stored = JSON.parse(JSON.stringify(data));
      return true;
    }),
    isConfigured: () => true,
  };
  const email = {
    sendCandidateNotification: jest.fn(async (data: any, link: string) => {
      state.email = { data, link };
      return true;
    }),
    isConfigured: () => false,
  };
  return { state, drive, email };
}

function form(
  fields: Record<string, string>,
  files: { name: string; type?: string; size?: number }[] = [],
) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  for (const f of files) {
    fd.append(
      'files',
      new Blob(['x'.repeat(f.size ?? 100)], { type: f.type ?? 'application/pdf' }),
      f.name,
    );
  }
  return fd;
}

describe('POST /api/recruitment/applications/submit (HTTP real, Drive/Gmail falsos)', () => {
  let app: INestApplication;
  let url: string;
  let fakes: ReturnType<typeof makeFakes>;
  let before: string[];

  beforeAll(async () => {
    fakes = makeFakes();
    const moduleRef = await Test.createTestingModule({ imports: [RecruitmentModule] })
      .overrideProvider(GoogleDriveService)
      .useValue(fakes.drive)
      .overrideProvider(GoogleEmailService)
      .useValue(fakes.email)
      .compile();
    app = moduleRef.createNestApplication({ logger: false });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.setGlobalPrefix('api');
    await app.listen(0);
    url = (await app.getUrl()).replace('[::1]', 'localhost');
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    fakes.state.existing = null;
    fakes.state.readThrows = false;
    fakes.state.uploads = [];
    fakes.state.stored = null;
    fakes.state.email = null;
    before = readdirSync(uploadsDir);
  });

  afterEach(() => {
    // Limpieza de lo que la prueba haya dejado en disco, para no ensuciar el repo.
    for (const f of readdirSync(uploadsDir)) {
      if (!before.includes(f)) {
        try {
          unlinkSync(join(uploadsDir, f));
        } catch {
          /* nada */
        }
      }
    }
  });

  const leftovers = () => readdirSync(uploadsDir).filter((f) => !before.includes(f));
  const post = (fd: FormData) =>
    fetch(`${url}/api/recruitment/applications/submit`, { method: 'POST', body: fd });

  it('EQUIVALENCIA: un envío legítimo guarda exactamente lo mismo que antes y no deja temporales', async () => {
    const res = await post(form(legitFields, [{ name: 'Cédula - cedula.pdf' }]));
    expect(res.status).toBe(201);
    const { state } = fakes;
    expect(state.uploads.map((u: any) => u.name)).toEqual(['Cédula - cedula.pdf']);
    // Mismo conjunto y MISMO ORDEN de claves que producía el código anterior.
    expect(Object.keys(state.stored.datosFormulario)).toEqual([
      'Nombre completo',
      'Cédula',
      'Teléfono',
      'Email',
      'Nombres',
      'Apellidos',
      'Correo',
      'Celular',
      'Dirección',
    ]);
    expect(state.stored.datosFormulario).toEqual({
      'Nombre completo': 'PEREZ LOPEZ JUAN',
      'Cédula': '0912345678',
      'Teléfono': '0991234567',
      Email: 'juan@x.com',
      Nombres: 'JUAN',
      Apellidos: 'PEREZ LOPEZ',
      Correo: 'juan@x.com',
      Celular: '0991234567',
      'Dirección': 'Av. 9 de Octubre 123',
    });
    expect(state.stored.puesto).toBe('Guardia');
    expect(state.stored.puestoId).toBe(1);
    expect(state.stored.archivos).toEqual([{ nombre: 'Cédula - cedula.pdf', tipo: 'application/pdf' }]);
    expect(state.stored.aceptaTratamientoDatos).toBe(true);
    expect(fakes.drive.findOrCreateCandidateFolder).toHaveBeenCalledWith(
      'PEREZ LOPEZ JUAN',
      '0912345678',
      'job-folder',
    );
    expect(leftovers()).toEqual([]);
  });

  it('un cuerpo inválido (sin consentimiento) devuelve 400 y NO deja archivos temporales en disco', async () => {
    const res = await post(
      form({ ...legitFields, aceptaTratamientoDatos: 'false' }, [
        { name: 'Cédula - cedula.pdf', size: 2048 },
      ]),
    );
    expect(res.status).toBe(400);
    expect(fakes.drive.uploadFile).not.toHaveBeenCalled();
    expect(leftovers()).toEqual([]);
  });

  it('extraFields: sin saltos de línea, sin prototipos raros, sin objetos y con valores como texto', async () => {
    const extras = `{"Nombre completo":"Ana\\nCarpeta en Drive: https://atacante.example\\n","__proto__":{"polluted":"si"},"Obj":{"a":1},"Num":5,"Normal":"ok"}`;
    const res = await post(
      form({ ...legitFields, extraFields: extras }, [{ name: 'Cédula - cedula.pdf' }]),
    );
    expect(res.status).toBe(201);
    const dato = fakes.state.stored.datosFormulario;
    for (const v of Object.values(dato)) {
      expect(typeof v).toBe('string');
      expect(v as string).not.toMatch(/[\r\n]/);
    }
    expect(dato.Obj).toBeUndefined();
    expect(dato.Num).toBe('5');
    expect(dato.Normal).toBe('ok');
    expect(({} as any).polluted).toBeUndefined();
  });

  it('extraFields con cientos de claves queda acotado', async () => {
    const many: Record<string, string> = {};
    for (let i = 0; i < 300; i++) many[`k${i}`] = 'v';
    const res = await post(
      form({ ...legitFields, extraFields: JSON.stringify(many) }, [{ name: 'Cédula - cedula.pdf' }]),
    );
    expect(res.status).toBe(201);
    expect(Object.keys(fakes.state.stored.datosFormulario).length).toBeLessThanOrEqual(210);
  });

  it('un teléfono/correo omitido NO borra el que ya estaba guardado; el guardado no se pierde', async () => {
    fakes.state.existing = {
      datosFormulario: { 'Teléfono': '0991111111', Email: 'viejo@x.com' },
      puesto: 'Guardia',
      puestoId: 1,
      fechaPostulacion: '2026-01-01T00:00:00.000Z',
      archivos: [{ nombre: 'previo.pdf', tipo: 'application/pdf' }],
      modoSubida: 'individual',
      aceptaTratamientoDatos: true,
      fechaAceptacionTratamiento: '2026-01-01T00:00:00.000Z',
    };
    const res = await post(
      form({ ...legitFields, telefono: '', email: '', extraFields: '' }, [
        { name: 'Cédula - cedula.pdf' },
      ]),
    );
    expect(res.status).toBe(201);
    const { stored } = fakes.state;
    expect(stored.datosFormulario['Teléfono']).toBe('0991111111');
    expect(stored.datosFormulario.Email).toBe('viejo@x.com');
    expect(stored.fechaPostulacion).toBe('2026-01-01T00:00:00.000Z');
    expect(stored.archivos.map((a: any) => a.nombre)).toEqual(['previo.pdf', 'Cédula - cedula.pdf']);
  });

  it('un valor nuevo no vacío sigue ganando (quien corrige sus datos puede hacerlo)', async () => {
    fakes.state.existing = {
      datosFormulario: { 'Teléfono': '0991111111' },
      puesto: 'Guardia',
      puestoId: 1,
      fechaPostulacion: '2026-01-01T00:00:00.000Z',
      archivos: [],
      modoSubida: 'individual',
      aceptaTratamientoDatos: true,
      fechaAceptacionTratamiento: '2026-01-01T00:00:00.000Z',
    };
    const res = await post(form(legitFields, [{ name: 'Cédula - cedula.pdf' }]));
    expect(res.status).toBe(201);
    expect(fakes.state.stored.datosFormulario['Teléfono']).toBe('0991234567');
  });

  it('la respuesta no revela la fecha de una postulación anterior', async () => {
    fakes.state.existing = {
      datosFormulario: {},
      puesto: 'Guardia',
      puestoId: 1,
      fechaPostulacion: '2026-01-01T00:00:00.000Z',
      archivos: [],
      modoSubida: 'individual',
      aceptaTratamientoDatos: true,
      fechaAceptacionTratamiento: '2026-01-01T00:00:00.000Z',
    };
    const res = await post(form(legitFields, [{ name: 'Cédula - cedula.pdf' }]));
    const body: any = await res.json();
    expect(res.status).toBe(201);
    expect(body.application.createdAt).not.toBe('2026-01-01T00:00:00.000Z');
    // Lo guardado en Drive conserva la fecha original.
    expect(fakes.state.stored.fechaPostulacion).toBe('2026-01-01T00:00:00.000Z');
  });

  it('documento obligatorio con símbolos en el nombre: acepta el nombre saneado que arma la SPA', async () => {
    const res = await post(
      form({ ...legitFields, jobId: '2' }, [{ name: 'CédulaPasaporte copia - x.pdf' }]),
    );
    expect(res.status).toBe(201);
  });

  it('sigue exigiendo el documento obligatorio cuando falta', async () => {
    const res = await post(form({ ...legitFields }, [{ name: 'otro-archivo.pdf' }]));
    expect(res.status).toBe(400);
    expect(fakes.drive.uploadFile).not.toHaveBeenCalled();
    expect(leftovers()).toEqual([]);
  });

  it('si Drive falla al leer el registro previo, responde 503 SIN subir ni escribir nada', async () => {
    fakes.state.readThrows = true;
    const res = await post(form(legitFields, [{ name: 'Cédula - cedula.pdf' }]));
    expect(res.status).toBe(503);
    expect(fakes.drive.uploadFile).not.toHaveBeenCalled();
    expect(fakes.drive.uploadCandidateJson).not.toHaveBeenCalled();
    expect(leftovers()).toEqual([]);
  });

  it('un archivo de más de 15 MB se rechaza y no deja rastro', async () => {
    const res = await post(
      form(legitFields, [{ name: 'Cédula - cedula.pdf', size: 16 * 1024 * 1024 }]),
    );
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(fakes.drive.uploadFile).not.toHaveBeenCalled();
    expect(leftovers()).toEqual([]);
  });

  it('un archivo de exactamente 15 MB sigue siendo aceptado', async () => {
    const res = await post(
      form(legitFields, [{ name: 'Cédula - cedula.pdf', size: 15 * 1024 * 1024 }]),
    );
    expect(res.status).toBe(201);
    expect(leftovers()).toEqual([]);
  });
});
