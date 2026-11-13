import { ArgumentsHost, Catch, HttpException, Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';

// Deja en el log de Cloud Run POR QUÉ se rechazó una postulación. Antes los 400
// del portal no dejaban rastro: entre el 15/10 y el 3/11/2026 hubo varios envíos
// reales rechazados y no se pudo saber el motivo.
//
// Nunca se registran datos personales: ni nombre, ni cédula, ni correo, ni los
// valores del formulario. Solo el código, la vacante, cuántos archivos y cuánto
// pesaba el envío, y el mensaje de error con los nombres de archivo ocultos
// (un nombre de archivo puede llevar el nombre de la persona).

export function ocultarNombresDeArchivo(mensaje: string): string {
  // «Tipo de archivo no permitido: image/heic» → el tipo MIME sí se conserva.
  return mensaje.replace(/((?:archivo|file)[^:]*):\s*(.+)$/i, (_m, antes: string, despues: string) =>
    /^[\w.+-]+\/[\w.+-]+\.?$/.test(despues.trim()) ? `${antes}: ${despues}` : `${antes}: [nombre de archivo oculto]`,
  );
}

function mensajeDe(exception: unknown): string {
  if (exception instanceof HttpException) {
    const resp = exception.getResponse();
    const raw = typeof resp === 'string' ? resp : (resp as { message?: unknown })?.message;
    if (Array.isArray(raw)) return raw.map(String).join(' | ');
    if (raw !== undefined) return String(raw);
  }
  return exception instanceof Error ? exception.message : String(exception);
}

function megas(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

@Catch()
export class SubmitErrorsLogFilter extends BaseExceptionFilter {
  private readonly logger = new Logger('Postulaciones');

  catch(exception: unknown, host: ArgumentsHost) {
    try {
      const req = host.switchToHttp().getRequest<{
        headers?: Record<string, string | string[] | undefined>;
        body?: Record<string, unknown>;
        files?: unknown;
      }>();
      const status = exception instanceof HttpException ? exception.getStatus() : 500;
      const vacante = String(req?.body?.jobId ?? '').replace(/\D/g, '').slice(0, 10) || '?';
      const archivos = Array.isArray(req?.files) ? req.files.length : 0;
      const largo = Number(req?.headers?.['content-length']);
      const tamano = Number.isFinite(largo) ? megas(largo) : '?';
      const linea = `Postulación rechazada (${status}) vacante=${vacante} archivos=${archivos} tamaño=${tamano}: ${ocultarNombresDeArchivo(mensajeDe(exception))}`;
      if (status >= 500) this.logger.error(linea);
      else this.logger.warn(linea);
    } catch {
      // El registro nunca debe impedir que el postulante reciba su respuesta.
    }
    super.catch(exception, host);
  }
}
