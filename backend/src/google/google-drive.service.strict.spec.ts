import { GoogleDriveService } from './google-drive.service';

// Drive falso: nada de esto toca la red ni credenciales reales.
function build(files: { list: jest.Mock; get: jest.Mock }) {
  const svc = new GoogleDriveService();
  (svc as any).drive = { files };
  return svc;
}

describe('GoogleDriveService.readCandidateJsonStrict', () => {
  const ok = { data: { files: [{ id: 'json-1' }] } };

  it('devuelve el registro cuando existe y es legible', async () => {
    const svc = build({
      list: jest.fn().mockResolvedValue(ok),
      get: jest.fn().mockResolvedValue({ data: '{"datosFormulario":{"A":"1"},"archivos":[]}' }),
    });
    await expect(svc.readCandidateJsonStrict('f')).resolves.toMatchObject({ datosFormulario: { A: '1' } });
  });

  it('acepta que Drive ya entregue el JSON como objeto', async () => {
    const svc = build({
      list: jest.fn().mockResolvedValue(ok),
      get: jest.fn().mockResolvedValue({ data: { datosFormulario: { B: '2' } } }),
    });
    await expect(svc.readCandidateJsonStrict('f')).resolves.toMatchObject({ datosFormulario: { B: '2' } });
  });

  it('devuelve null si no existe candidato.json', async () => {
    const svc = build({
      list: jest.fn().mockResolvedValue({ data: { files: [] } }),
      get: jest.fn(),
    });
    await expect(svc.readCandidateJsonStrict('f')).resolves.toBeNull();
  });

  it('un JSON ilegible se trata como ausente (igual que antes), sin lanzar', async () => {
    const svc = build({
      list: jest.fn().mockResolvedValue(ok),
      get: jest.fn().mockResolvedValue({ data: '{esto no es json' }),
    });
    await expect(svc.readCandidateJsonStrict('f')).resolves.toBeNull();
  });

  it('un fallo de Drive al listar o al leer SÍ lanza, para no sobrescribir lo guardado', async () => {
    const listFails = build({ list: jest.fn().mockRejectedValue(new Error('429')), get: jest.fn() });
    await expect(listFails.readCandidateJsonStrict('f')).rejects.toThrow('429');
    const getFails = build({
      list: jest.fn().mockResolvedValue(ok),
      get: jest.fn().mockRejectedValue(new Error('503')),
    });
    await expect(getFails.readCandidateJsonStrict('f')).rejects.toThrow('503');
  });

  it('sin Drive configurado devuelve null (no lanza)', async () => {
    const svc = new GoogleDriveService();
    await expect(svc.readCandidateJsonStrict('f')).resolves.toBeNull();
  });
});
