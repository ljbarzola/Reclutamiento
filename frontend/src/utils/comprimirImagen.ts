// Fotos tomadas con el teléfono: pesan 3–8 MB cada una y una vacante como
// «Custodio» pide más de 20 documentos. Enviadas tal cual, el envío supera el
// límite de 32 MB de Cloud Run o tarda demasiado con datos móviles y la
// postulación se pierde. Aquí se reducen en el propio teléfono, antes de
// adjuntarlas, a un tamaño que sigue siendo legible (lado mayor 2000 px).
// Los PDF y documentos de Office no se tocan.

const UMBRAL_BYTES = 400 * 1024; // por debajo de esto no vale la pena
const LADO_MAXIMO = 2000;
const CALIDAD_JPEG = 0.75;

function extensionDe(nombre: string): string {
  return ('.' + (nombre.split('.').pop() || '')).toLowerCase();
}

/**
 * Devuelve la foto reducida, o el mismo archivo si no es una imagen, ya es
 * liviana, el navegador no puede procesarla o el resultado no pesa menos.
 * `permitidas` son las extensiones que acepta el casillero (con punto): solo se
 * convierte un PNG a JPG si el casillero acepta JPG.
 */
export async function comprimirImagen(file: File, permitidas: string[]): Promise<File> {
  const ext = extensionDe(file.name);
  if (!['.jpg', '.jpeg', '.png'].includes(ext) || file.size <= UMBRAL_BYTES) return file;
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return file;

  const aceptaJpg = permitidas.includes('.jpg');
  const aceptaJpeg = permitidas.includes('.jpeg');
  const esJpeg = ext === '.jpg' || ext === '.jpeg';
  // Un PNG pasa a JPG (mucho más liviano) solo si el casillero lo acepta.
  const salidaJpeg = esJpeg || aceptaJpg || aceptaJpeg;
  const tipoSalida = salidaJpeg ? 'image/jpeg' : 'image/png';

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
    const ancho = Math.max(1, Math.round(bitmap.width * escala));
    const alto = Math.max(1, Math.round(bitmap.height * escala));

    const canvas = document.createElement('canvas');
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return file;
    }
    if (salidaJpeg) {
      // JPG no tiene transparencia: fondo blanco para que no quede negro.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, ancho, alto);
    }
    ctx.drawImage(bitmap, 0, 0, ancho, alto);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, tipoSalida, salidaJpeg ? CALIDAD_JPEG : undefined),
    );
    if (!blob || blob.size >= file.size) return file;

    let nombre = file.name;
    if (salidaJpeg && !esJpeg) {
      nombre = file.name.replace(/\.[^.]+$/, aceptaJpg ? '.jpg' : '.jpeg');
    }
    return new File([blob], nombre, { type: tipoSalida, lastModified: file.lastModified });
  } catch {
    // Formato raro o memoria insuficiente: se envía la foto original.
    return file;
  }
}
