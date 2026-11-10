/**
 * Validaciones de datos personales. Son funciones puras: devuelven "" si el dato es válido o el mensaje para mostrar.
 * Las usan el formulario del sitio y la API simulada (un backend real debe repetirlas: nunca confiar solo en el navegador).
 */
export const EDAD_MINIMA = 18;
export const EDAD_MAXIMA = 110;

const hoyISO = () => new Date().toISOString().slice(0, 10);

/** Años cumplidos a una fecha de referencia. */
export function edadA(nacimiento: string, ref: string = hoyISO()): number {
  const [y, m, d] = nacimiento.split("-").map(Number);
  const [ry, rm, rd] = ref.split("-").map(Number);
  if (!y || !m || !d || !ry || !rm || !rd) return NaN;
  return ry - y - (rm < m || (rm === m && rd < d) ? 1 : 0);
}

/** ¿Es una fecha real aaaa-mm-dd (no 31 de febrero)? */
export function fechaReal(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  const f = new Date(Date.UTC(y, m - 1, d));
  return f.getUTCFullYear() === y && f.getUTCMonth() === m - 1 && f.getUTCDate() === d;
}

/** Fecha más reciente y más antigua que se aceptan como nacimiento (para los límites del selector de fecha). */
export function limitesNacimiento(ref: string = hoyISO()): { min: string; max: string } {
  const [y, m, d] = ref.split("-").map(Number) as [number, number, number];
  const f = (anios: number) => `${y - anios}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return { min: f(EDAD_MAXIMA), max: f(EDAD_MINIMA) };
}

export function validarFechaNacimiento(v: string, obligatorio = false, ref: string = hoyISO()): string {
  if (!v) return obligatorio ? "Indica tu fecha de nacimiento." : "";
  if (!fechaReal(v)) return "Escribe una fecha válida.";
  if (v > ref) return "La fecha de nacimiento no puede ser futura.";
  const edad = edadA(v, ref);
  if (edad < EDAD_MINIMA) return `Debes tener al menos ${EDAD_MINIMA} años.`;
  if (edad > EDAD_MAXIMA) return "Revisa el año: la edad no puede pasar de " + EDAD_MAXIMA + " años.";
  return "";
}

/** Nombres y apellidos: letras (con tildes y ñ), espacios, punto, apóstrofo y guion; 2 a 60 caracteres. */
export function validarNombrePersona(v: string, etiqueta: string, obligatorio = true): string {
  const t = v.trim();
  if (!t) return obligatorio ? `Escribe ${etiqueta.toLowerCase()}.` : "";
  if (t.length < 2) return `${etiqueta} debe tener al menos 2 letras.`;
  if (t.length > 60) return `${etiqueta} no puede pasar de 60 caracteres.`;
  if (!/^[\p{L}][\p{L} .'’-]*$/u.test(t)) return `${etiqueta} solo puede llevar letras, espacios, punto, apóstrofo y guion.`;
  return "";
}

/** Teléfono: se aceptan espacios, guiones y paréntesis, el prefijo del país (+593) y el 0 inicial local; deben quedar `digitos` dígitos. */
export function digitosTelefono(v: string, prefijo = "", digitos = 9): string {
  let d = v.replace(/\D/g, "");
  const pre = prefijo.replace(/\D/g, "");
  // Con "+" al inicio el prefijo es seguro; sin él, solo se quita si sobran dígitos.
  if (pre && d.startsWith(pre) && (v.trim().startsWith("+") || d.length > digitos)) d = d.slice(pre.length);
  if (d.startsWith("0") && d.length === digitos + 1) d = d.slice(1);
  return d;
}
export function validarTelefono(v: string, digitos: number, prefijo = "", obligatorio = true): string {
  if (!v.trim()) return obligatorio ? "Escribe tu teléfono." : "";
  if (/[^\d\s()+.-]/.test(v)) return "El teléfono solo puede llevar números.";
  const d = digitosTelefono(v, prefijo, digitos);
  if (d.length < digitos) return `El teléfono debe tener ${digitos} dígitos (faltan ${digitos - d.length}).`;
  if (d.length > digitos) return `El teléfono debe tener ${digitos} dígitos (sobran ${d.length - digitos}).`;
  if (/^(\d)\1+$/.test(d)) return "Revisa el teléfono: no puede repetir el mismo dígito.";
  return "";
}

export function validarEmail(v: string, obligatorio = true): string {
  const t = v.trim();
  if (!t) return obligatorio ? "Escribe tu correo electrónico." : "";
  if (t.length > 120) return "El correo no puede pasar de 120 caracteres.";
  if (!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]{2,}$/.test(t)) return "Escribe un correo válido, por ejemplo nombre@correo.com.";
  return "";
}

/** Texto libre con largo máximo (y mínimo opcional). */
export function validarTexto(v: string, etiqueta: string, max: number, obligatorio = false, min = 0): string {
  const t = v.trim();
  if (!t) return obligatorio ? `Completa ${etiqueta.toLowerCase()}.` : "";
  if (min && t.length < min) return `${etiqueta} debe tener al menos ${min} caracteres.`;
  if (t.length > max) return `${etiqueta} no puede pasar de ${max} caracteres.`;
  return "";
}

export function validarNumero(v: string, etiqueta: string, obligatorio = false): string {
  const t = v.trim();
  if (!t) return obligatorio ? `Completa ${etiqueta.toLowerCase()}.` : "";
  if (!/^-?\d+([.,]\d+)?$/.test(t)) return `${etiqueta} debe ser un número.`;
  return "";
}

/** Elección de una lista fija: debe ser una de las opciones. */
export function validarOpcion(v: string, etiqueta: string, opciones: string[], obligatorio = false): string {
  if (!v) return obligatorio ? `Elige ${etiqueta.toLowerCase()}.` : "";
  return opciones.includes(v) ? "" : `Elige ${etiqueta.toLowerCase()} de la lista.`;
}

/** Requisitos de una contraseña nueva del panel (el servidor los repite). */
export function requisitosClave(clave: string, actual = ""): { ok: boolean; texto: string }[] {
  return [
    { ok: clave.length >= 10, texto: "Al menos 10 caracteres" },
    { ok: /[a-záéíóúñ]/.test(clave) && /[A-ZÁÉÍÓÚÑ]/.test(clave), texto: "Mayúsculas y minúsculas" },
    { ok: /\d/.test(clave), texto: "Al menos un número" },
    { ok: /[^A-Za-z0-9áéíóúñÁÉÍÓÚÑ\s]/.test(clave), texto: "Al menos un símbolo (por ejemplo # o !)" },
    { ok: !!clave && clave !== actual, texto: "Distinta de la contraseña actual" },
  ];
}
export const claveValida = (clave: string, actual = "") => requisitosClave(clave, actual).every((r) => r.ok);