// Errores de tipeo que la validación por formato no atrapaba (revisado el
// 2026-11-13 con la vacante «Custodio»): un correo con el dominio mal escrito
// («gmial.com») deja al postulante sin respuesta, una cédula con un dígito
// cambiado o una fecha imposible llegan a RRHH como datos malos.

// ── Cédula ecuatoriana ─────────────────────────────────────────────────────
// Provincia 01–24 (o 30, ecuatorianos registrados en el exterior), tercer
// dígito menor a 6 (persona natural) y dígito verificador por módulo 10.
export function cedulaEcuatorianaValida(cedula: string): boolean {
  if (!/^\d{10}$/.test(cedula)) return false;
  const provincia = parseInt(cedula.slice(0, 2), 10);
  if (!((provincia >= 1 && provincia <= 24) || provincia === 30)) return false;
  if (parseInt(cedula[2], 10) >= 6) return false;
  let suma = 0;
  for (let i = 0; i < 9; i++) {
    let d = parseInt(cedula[i], 10) * (i % 2 === 0 ? 2 : 1);
    if (d > 9) d -= 9;
    suma += d;
  }
  const verificador = (10 - (suma % 10)) % 10;
  return verificador === parseInt(cedula[9], 10);
}

// ── Correo ─────────────────────────────────────────────────────────────────
// Dominios reales que se aceptan tal cual, y a cuáles se sugiere corregir.
const DOMINIOS_CONOCIDOS = [
  'gmail.com', 'hotmail.com', 'hotmail.es', 'outlook.com', 'outlook.es', 'live.com',
  'yahoo.com', 'yahoo.es', 'icloud.com', 'me.com', 'msn.com', 'mail.com', 'ymail.com',
  'live.com.mx', 'hotmail.com.ar',
];
const DOMINIOS_A_SUGERIR = ['gmail.com', 'hotmail.com', 'hotmail.es', 'outlook.com', 'outlook.es', 'yahoo.com', 'yahoo.es', 'icloud.com'];
// Terminaciones que siempre son «.com» mal escrito.
const TERMINACIONES_MAL = /\.(con|cmo|comm|coom|cpm|xom|vom|ocm|cim|co,)$/;

function distancia(a: string, b: string): number {
  const fila = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let anterior = fila[0];
    fila[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const guardado = fila[j];
      fila[j] = Math.min(fila[j] + 1, fila[j - 1] + 1, anterior + (a[i - 1] === b[j - 1] ? 0 : 1));
      anterior = guardado;
    }
  }
  return fila[b.length];
}

/** Si el dominio parece mal escrito, devuelve el correo corregido; si no, null. */
export function sugerenciaCorreo(correo: string): string | null {
  const limpio = correo.trim().toLowerCase();
  const at = limpio.lastIndexOf('@');
  if (at <= 0) return null;
  const usuario = limpio.slice(0, at);
  let dominio = limpio.slice(at + 1);
  if (DOMINIOS_CONOCIDOS.includes(dominio)) return null;
  if (TERMINACIONES_MAL.test(dominio)) dominio = dominio.replace(TERMINACIONES_MAL, '.com');
  if (DOMINIOS_CONOCIDOS.includes(dominio)) return `${usuario}@${dominio}`;
  let mejor: string | null = null;
  let mejorDist = 3;
  for (const conocido of DOMINIOS_A_SUGERIR) {
    const d = distancia(dominio, conocido);
    if (d < mejorDist) {
      mejor = conocido;
      mejorDist = d;
    }
  }
  if (mejor) return `${usuario}@${mejor}`;
  // Dominio desconocido (p. ej. el de una empresa) con terminación corregida.
  return dominio !== limpio.slice(at + 1) ? `${usuario}@${dominio}` : null;
}

// ── Fechas ─────────────────────────────────────────────────────────────────
export function esCampoNacimiento(nombre: string): boolean {
  return /nacimiento/i.test(nombre);
}

export function edadCumplida(dia: number, mes: number, anio: number, hoy = new Date()): number {
  let edad = hoy.getFullYear() - anio;
  if (hoy.getMonth() + 1 < mes || (hoy.getMonth() + 1 === mes && hoy.getDate() < dia)) edad--;
  return edad;
}

/** Rango razonable según el campo; null si la fecha está bien. */
export function revisarRangoFecha(nombre: string, dia: number, mes: number, anio: number, hoy = new Date()): string | null {
  if (esCampoNacimiento(nombre)) {
    const edad = edadCumplida(dia, mes, anio, hoy);
    if (edad < 16 || edad > 80) return `Revisa el año de ${nombre.toLowerCase()}: daría ${edad < 0 ? 'una fecha futura' : `${edad} años`}.`;
    return null;
  }
  // Otras fechas (reentrenamiento, cursos, etc.): ni siglos atrás ni muy adelante.
  const actual = hoy.getFullYear();
  if (anio < 1950 || anio > actual + 10) return `Revisa el año de ${nombre.toLowerCase()}.`;
  return null;
}

// ── Edad y teléfono ────────────────────────────────────────────────────────
export function esCampoEdad(nombre: string): boolean {
  return /^edad\b/i.test(nombre.trim());
}

export function revisarEdad(edad: number): string | null {
  return edad < 16 || edad > 80 ? 'Revisa la edad: debe estar entre 16 y 80 años.' : null;
}

export function revisarTelefono(valor: string): string | null {
  const digitos = valor.replace(/\D/g, '').length;
  if (digitos < 7) return 'Revisa el teléfono: tiene muy pocos dígitos.';
  if (digitos > 15) return 'Revisa el teléfono: tiene demasiados dígitos.';
  return null;
}

/** Lee «dd/mm/aaaa»; null si no tiene ese formato. */
export function leerFecha(valor: string): { dia: number; mes: number; anio: number } | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(valor.trim());
  if (!m) return null;
  return { dia: parseInt(m[1], 10), mes: parseInt(m[2], 10), anio: parseInt(m[3], 10) };
}
