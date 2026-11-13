// Mensajes para el postulante cuando el envío falla. Antes casi todo terminaba
// en «Error del servidor», que no dice qué hacer: un corte de conexión en el
// teléfono, archivos demasiado pesados o demasiados intentos se veían igual.

// Cloud Run rechaza cualquier petición de más de 32 MiB antes de que llegue al
// servidor. Se deja margen para los datos del formulario.
export const MAX_TOTAL_BYTES = 30 * 1024 * 1024;

export class ErrorPortal extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string,
    public readonly mensajeServidor?: string,
  ) {
    super(message);
    this.name = 'ErrorPortal';
  }
}

export function formatoMB(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

// Mensajes en inglés que vienen de librerías del servidor (multer,
// class-validator) y que el postulante no debe ver tal cual.
const TRADUCCIONES: [RegExp, string][] = [
  [/too many files/i, 'Adjuntaste demasiados archivos. Quita los que no sean necesarios e inténtalo de nuevo.'],
  [/file too large/i, 'Uno de los archivos pesa más de 15 MB. Reemplázalo por una versión más liviana.'],
  [/must be an email/i, 'El correo electrónico no es válido. Revísalo e inténtalo de nuevo.'],
  [/job not found|invalid job id/i, 'Esta vacante ya no está disponible. Vuelve al listado de vacantes.'],
  [/too many (requests|parts|fields)|throttl/i, 'Hiciste varios intentos seguidos. Espera unos 10 minutos e inténtalo de nuevo.'],
];

const SIN_CONEXION =
  'No se pudo completar el envío porque se cortó la conexión. Revisa tu internet (si puedes, conéctate a wifi) e inténtalo de nuevo: tus datos y documentos siguen en el formulario.';

export function mensajeErrorEnvio(error: unknown): string {
  if (!(error instanceof ErrorPortal)) {
    return 'Ocurrió un error al registrar la postulación. Inténtalo de nuevo.';
  }
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return 'El envío tardó demasiado y se cortó. Conéctate a wifi o a una señal más estable e inténtalo de nuevo: tus datos y documentos siguen en el formulario.';
  }
  if (!error.status) return SIN_CONEXION;
  if (error.status === 413) {
    return 'Los archivos pesan demasiado para enviarlos juntos. Reemplaza los más pesados por versiones más livianas (por ejemplo, una foto en vez de un escaneo en alta calidad) e inténtalo de nuevo.';
  }
  if (error.status === 429) {
    return 'Hiciste varios intentos seguidos. Espera unos 10 minutos e inténtalo de nuevo.';
  }
  const servidor = error.mensajeServidor?.trim();
  if (error.status >= 500) {
    if (servidor && !/internal server error/i.test(servidor)) return servidor;
    return 'Tuvimos un problema al guardar tu postulación. Inténtalo de nuevo en unos minutos.';
  }
  if (servidor) {
    const traducido = TRADUCCIONES.find(([patron]) => patron.test(servidor));
    return traducido ? traducido[1] : servidor;
  }
  return 'No pudimos registrar tu postulación. Revisa tus datos e inténtalo de nuevo.';
}
