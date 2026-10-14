import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import * as fs from 'fs';

/**
 * Borra del disco los archivos que multer dejó en la carpeta temporal cuando la
 * petición termina, sea cual sea el resultado.
 *
 * multer guarda los archivos ANTES de que corra el ValidationPipe; si el cuerpo es
 * inválido, el servicio ni siquiera se ejecuta y su limpieza nunca ocurría. Este
 * interceptor va declarado DESPUÉS de FilesInterceptor: así rodea al pipe y a la
 * ejecución del servicio, y limpia en éxito, en error y al cerrarse la petición.
 * Es idempotente con la limpieza que ya hace el servicio.
 */
@Injectable()
export class CleanupUploadsInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CleanupUploadsInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    return next.handle().pipe(finalize(() => this.cleanup(request)));
  }

  private cleanup(request: any) {
    for (const file of this.collect(request)) {
      try {
        if (file?.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch {
        this.logger.warn(`No se pudo borrar un archivo temporal: ${file?.path}`);
      }
    }
  }

  private collect(request: any): Array<{ path?: string }> {
    const found: Array<{ path?: string }> = [];
    if (Array.isArray(request?.files)) {
      found.push(...request.files);
    } else if (request?.files && typeof request.files === 'object') {
      for (const group of Object.values(request.files)) {
        if (Array.isArray(group)) found.push(...(group as Array<{ path?: string }>));
      }
    }
    if (request?.file) found.push(request.file);
    return found;
  }
}
