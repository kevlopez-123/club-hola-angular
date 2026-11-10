import { ciudadesDe, hayCiudadesFijas } from "./ubicaciones";
import {
  EDAD_MAXIMA, EDAD_MINIMA, fechaReal, validarEmail, validarFechaNacimiento, validarNombrePersona, validarNumero, validarOpcion, validarTelefono, validarTexto,
} from "./validaciones";

export type CampoValidable = { id: string; tipo: string; etiqueta: string; obligatorio: boolean; mapeo?: string | undefined; opciones?: string[] | undefined };
export type PaisValidable = { codigo: string; telefonoPrefijo: string; telefonoDigitos: number };
export type ValorExtra = string | boolean | undefined;

/** Clave del error de un campo configurable. */
export const claveExtra = (id: string) => `extra:${id}`;

/**
 * Valida "Mis datos": nombres, apellidos, teléfono y los campos que el administrador configura (fecha de nacimiento, provincia y
 * ciudad en cascada, correo, celular…). Devuelve un mapa clave → mensaje solo con lo que está mal.
 */
export function erroresPerfil(
  datos: { nombres: string; apellidos: string; telefono: string },
  extra: Record<string, ValorExtra>,
  campos: CampoValidable[],
  pais: PaisValidable,
  provinciasConEnvio: string[],
  hoy?: string,
): Record<string, string> {
  const e: Record<string, string> = {};
  const poner = (k: string, m: string) => { if (m) e[k] = m; };
  poner("nombres", validarNombrePersona(datos.nombres, "Tus nombres"));
  // Con apellido paterno/materno configurados, los apellidos se arman con ellos y se validan en esos campos.
  if (!campos.some((c) => c.mapeo === "apellido_paterno")) poner("apellidos", validarNombrePersona(datos.apellidos, "Tus apellidos"));
  // Con "N.º de celular" configurado, ese campo es el teléfono y se valida abajo.
  if (!campos.some((c) => c.mapeo === "celular")) poner("telefono", validarTelefono(datos.telefono, pais.telefonoDigitos, pais.telefonoPrefijo, true));

  const porMapeo = (m: string) => campos.find((c) => c.mapeo === m);
  const provinciaElegida = String(extra[porMapeo("provincia")?.id ?? ""] ?? "");

  for (const c of campos) {
    const raw = extra[c.id];
    const v = typeof raw === "string" ? raw : "";
    const k = claveExtra(c.id);
    const etiqueta = c.etiqueta;
    if (c.tipo === "checkbox") { if (c.obligatorio && raw !== true) e[k] = `Debes marcar «${etiqueta}».`; continue; }
    if (c.mapeo === "fecha_nacimiento") { poner(k, validarFechaNacimiento(v, c.obligatorio, hoy)); continue; }
    if (c.mapeo === "provincia") { poner(k, validarOpcion(v, etiqueta, provinciasConEnvio, c.obligatorio)); continue; }
    if (c.mapeo === "ciudad") {
      if (hayCiudadesFijas(pais.codigo)) {
        if (v && !provinciaElegida) e[k] = "Elige primero la provincia.";
        else if (!v && c.obligatorio) e[k] = provinciaElegida ? "Elige tu ciudad." : "Elige primero la provincia.";
        else poner(k, validarOpcion(v, etiqueta, ciudadesDe(pais.codigo, provinciaElegida), false));
      } else poner(k, validarTexto(v, etiqueta, 80, c.obligatorio, 2));
      continue;
    }
    if (c.mapeo === "apellido_paterno" || c.mapeo === "apellido_materno") { poner(k, validarNombrePersona(v, etiqueta, c.obligatorio)); continue; }
    switch (c.tipo) {
      case "email": poner(k, validarEmail(v, c.obligatorio)); break;
      case "telefono": poner(k, validarTelefono(v, pais.telefonoDigitos, pais.telefonoPrefijo, c.obligatorio)); break;
      case "numero": poner(k, validarNumero(v, etiqueta, c.obligatorio)); break;
      case "fecha":
        if (!v) { if (c.obligatorio) e[k] = `Completa ${etiqueta.toLowerCase()}.`; }
        else if (!fechaReal(v)) e[k] = "Escribe una fecha válida.";
        break;
      case "select": poner(k, validarOpcion(v, etiqueta, c.opciones ?? [], c.obligatorio)); break;
      case "textarea": poner(k, validarTexto(v, etiqueta, 500, c.obligatorio)); break;
      default: poner(k, validarTexto(v, etiqueta, 100, c.obligatorio));
    }
  }
  return e;
}

/* ---------- Orden lógico y descripción de reglas (los usan el sitio y el panel) ---------- */
export type CampoOrdenable = { mapeo?: string | undefined; etiqueta: string; tipo: string };

/** Dato al que corresponde un campo: su conexión, o lo que se deduce de su nombre y tipo. */
export const claveCampo = (c: CampoOrdenable): string =>
  c.mapeo ?? (/g[eé]nero/i.test(c.etiqueta) ? "genero" : c.tipo === "email" ? "email" : c.tipo === "telefono" ? "celular" : "");

const ORDEN_CAMPOS = ["apellido_paterno", "apellido_materno", "fecha_nacimiento", "genero", "email", "celular", "provincia", "ciudad"];
const PERSONAL = ["apellido_paterno", "apellido_materno", "fecha_nacimiento", "genero"];
const CONTACTO = ["email", "celular"];
const UBICACION = ["provincia", "ciudad"];

/** Orden lógico de "Mis datos": datos personales, contacto, ubicación y el resto (en el orden en que se configuraron). */
export function agruparCampos<T extends CampoOrdenable>(campos: T[]): { personal: T[]; contacto: T[]; ubicacion: T[]; otros: T[] } {
  const rango = (c: T) => { const i = ORDEN_CAMPOS.indexOf(claveCampo(c)); return i < 0 ? 99 : i; };
  const ordenados = [...campos].sort((a, b) => rango(a) - rango(b));
  const en = (k: string[]) => ordenados.filter((c) => k.includes(claveCampo(c)));
  return { personal: en(PERSONAL), contacto: en(CONTACTO), ubicacion: en(UBICACION), otros: ordenados.filter((c) => !ORDEN_CAMPOS.includes(claveCampo(c))) };
}

/** Texto para el administrador: qué se valida en cada campo. */
export function reglaDe(c: CampoOrdenable, pais: { telefonoDigitos: number; telefonoPrefijo: string }): string {
  switch (claveCampo(c)) {
    case "fecha_nacimiento": return `Fecha real, no futura, de ${EDAD_MIN_TXT} a ${EDAD_MAX_TXT} años.`;
    case "apellido_paterno": case "apellido_materno": return "Letras, espacios, punto, apóstrofo y guion; de 2 a 60 caracteres.";
    case "email": return "Correo con formato válido (hasta 120 caracteres).";
    case "celular": return `Teléfono de ${pais.telefonoDigitos} dígitos con bandera y prefijo ${pais.telefonoPrefijo}; acepta 0 inicial.`;
    case "provincia": return "Lista fija: solo provincias con envío.";
    case "ciudad": return "Lista fija que depende de la provincia elegida; se borra si cambia la provincia.";
    case "genero": return "Debe ser una de las opciones de la lista.";
  }
  switch (c.tipo) {
    case "telefono": return `Teléfono de ${pais.telefonoDigitos} dígitos con bandera y prefijo ${pais.telefonoPrefijo}.`;
    case "numero": return "Solo números.";
    case "fecha": return "Fecha real (aaaa-mm-dd).";
    case "select": return "Debe ser una de las opciones de la lista.";
    case "textarea": return "Hasta 500 caracteres.";
    case "checkbox": return "Si es obligatorio, debe estar marcado.";
    default: return "Hasta 100 caracteres.";
  }
}
const EDAD_MIN_TXT = String(EDAD_MINIMA);
const EDAD_MAX_TXT = String(EDAD_MAXIMA);