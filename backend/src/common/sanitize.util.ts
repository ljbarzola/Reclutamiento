// Utilidades para tratar como DATO (nunca como estructura) el texto que escribe
// un postulante anónimo antes de guardarlo en Drive o ponerlo en un correo.
//
// Regla de compatibilidad: un valor legítimo (letras con tildes, números, espacios,
// puntuación normal) sale IDÉNTICO. Solo se tocan caracteres de control, saltos de
// línea y marcas bidireccionales, y se recortan valores absurdamente largos.

// Rangos que se consideran "no imprimibles" y se reemplazan por un espacio:
// control C0 (incluye salto de línea, retorno y tabulador), control C1, separadores
// de línea y de párrafo Unicode, y marcas bidireccionales (que permiten falsear texto).
// El patrón se arma desde códigos numéricos para no depender de secuencias de escape.
const NON_PRINTABLE_RANGES: Array<[number, number]> = [
  [0x0000, 0x001f],
  [0x007f, 0x009f],
  [0x2028, 0x2029],
  [0x202a, 0x202e],
  [0x2066, 0x2069],
];
const CONTROL_CHARS = new RegExp(
  '[' +
    NON_PRINTABLE_RANGES.map(([a, b]) => String.fromCharCode(a) + '-' + String.fromCharCode(b)).join('') +
    ']',
  'g',
);

export const EXTRA_FIELDS_MAX_KEYS = 200;
export const EXTRA_FIELD_MAX_KEY_LENGTH = 200;
export const EXTRA_FIELD_MAX_VALUE_LENGTH = 2000;
export const MAX_TOTAL_FORM_KEYS = 500;

// Nombres que nunca se aceptan como clave de un campo extra.
const FORBIDDEN_KEYS = new Set([
  '__proto__',
  'constructor',
  'prototype',
  'toString',
  'valueOf',
  'hasOwnProperty',
]);

/**
 * Convierte un valor en una sola línea de texto. Solo acepta texto, números y
 * booleanos; cualquier otra cosa (objeto, arreglo, null) devuelve ''.
 * Los caracteres de control se reemplazan por un espacio. Si no había nada que
 * reemplazar, el valor sale tal cual (sin recortar ni colapsar espacios).
 */
export function sanitizeLine(value: unknown, max = EXTRA_FIELD_MAX_VALUE_LENGTH): string {
  let text: string;
  if (typeof value === 'string') {
    text = value;
  } else if (typeof value === 'number' || typeof value === 'boolean') {
    text = String(value);
  } else {
    return '';
  }
  const cleaned = text.replace(CONTROL_CHARS, ' ');
  const result = cleaned !== text ? cleaned.trim() : cleaned;
  return result.length > max ? result.slice(0, max) : result;
}

/**
 * Interpreta el campo `extraFields` (un JSON en texto) como un mapa plano
 * clave -> texto. Descarta lo que no sea un objeto, las claves peligrosas, los
 * valores que no sean texto/número/booleano, y limita cantidad y tamaño.
 * No filtra por las claves de la vacante: el formulario puede mandar cualquier
 * etiqueta que RRHH haya definido.
 */
export function parseExtraFields(raw: string | undefined | null): {
  fields: Record<string, string>;
  valid: boolean;
} {
  const fields: Record<string, string> = {};
  if (!raw) return { fields, valid: true };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { fields, valid: false };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { fields, valid: false };
  }

  let count = 0;
  for (const [rawKey, rawValue] of Object.entries(parsed as Record<string, unknown>)) {
    if (count >= EXTRA_FIELDS_MAX_KEYS) break;
    if (FORBIDDEN_KEYS.has(rawKey)) continue;
    if (
      typeof rawValue !== 'string' &&
      typeof rawValue !== 'number' &&
      typeof rawValue !== 'boolean'
    ) {
      continue;
    }
    const key = sanitizeLine(rawKey, EXTRA_FIELD_MAX_KEY_LENGTH);
    if (!key || FORBIDDEN_KEYS.has(key)) continue;
    fields[key] = sanitizeLine(rawValue, EXTRA_FIELD_MAX_VALUE_LENGTH);
    count++;
  }
  return { fields, valid: true };
}

/**
 * Nombre de un documento requerido tal como lo escribe el formulario web al
 * armar el nombre del archivo (misma regla que DocumentUploader.tsx).
 */
export function toClientDocPrefix(docName: string): string {
  return docName.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_ -]/g, '').trim();
}

/** Texto de un error de Google para el log, sin volcar el objeto completo. */
export function describeError(error: unknown): string {
  const e = error as { message?: string; code?: string | number; response?: { status?: number } };
  const status = e?.code ?? e?.response?.status;
  const message = e?.message ?? String(error);
  return status ? `${message} (código ${status})` : message;
}
