/**
 * Límites de caracteres de los campos de texto: una sola tabla para el panel, el sitio y el servidor simulado, para que lo que
 * el formulario permite sea lo mismo que el servidor acepta. Al subir cargas masivas (Excel) se aplican los mismos límites.
 */
export const LIMITES = {
  /** Nombre de un producto, beneficio, marca, categoría, rol, campaña… */
  nombre: 80,
  /** Nombre y apellidos de una persona. */
  persona: 60,
  /** Etiquetas, insignias, chips y nombres cortos. */
  etiqueta: 30,
  /** Título de un banner, pop-up, guía, asunto de correo… */
  titulo: 100,
  /** Subtítulo, lema o texto breve de apoyo. */
  subtitulo: 160,
  /** Descripción corta (tarjetas, textos alternativos). */
  breve: 200,
  /** Descripción larga, condiciones, pasos. */
  descripcion: 1000,
  /** Mensajes y contenidos largos (pop-ups, respuestas de la ayuda, notas). */
  mensaje: 2000,
  /** Cuerpos de documentos (legales, guías, plantillas de correo). */
  documento: 20000,
  /** Correo electrónico. */
  correo: 100,
  /** Teléfono (incluye el prefijo). */
  telefono: 20,
  /** Documento de identidad, SKU, código de cupón u operación. */
  codigo: 40,
  /** Enlaces y direcciones web. */
  url: 300,
  /** Dirección de entrega y su referencia. */
  direccion: 150,
  referencia: 200,
  /** Motivo de un ajuste de puntos, nota de un pedido. */
  motivo: 200,
  /** Cajas de búsqueda. */
  busqueda: 80,
  /** Cualquier otro texto de una línea. */
  texto: 120,
} as const;

export type ClaveLimite = keyof typeof LIMITES;

/** Límite que se aplica a un campo según su nombre en los datos (nombre, titulo, alt, descripcion…). Sin entrada = sin control. */
export const LIMITE_POR_CAMPO: Record<string, ClaveLimite> = {
  nombre: "nombre",
  marca: "nombre",
  comercio: "nombre",
  categoria: "nombre",
  nombres: "persona",
  apellidos: "persona",
  etiqueta: "etiqueta",
  etiquetaPromo: "etiqueta",
  promoEtiqueta: "etiqueta",
  descuento: "etiqueta",
  titulo: "titulo",
  asunto: "titulo",
  alt: "breve",
  subtitulo: "subtitulo",
  descripcion: "descripcion",
  terminos: "descripcion",
  condiciones: "descripcion",
  mensaje: "mensaje",
  contenido: "documento",
  cuerpo: "documento",
  email: "correo",
  correo: "correo",
  telefono: "telefono",
  codigo: "codigo",
  sku: "codigo",
  to: "url",
  url: "url",
  web: "url",
  sitioWeb: "url",
  motivo: "motivo",
  nota: "motivo",
};

/** Mensaje de error si `valor` supera el límite de `clave`; cadena vacía si cabe. */
export function errorLargo(valor: unknown, clave: ClaveLimite, etiqueta: string): string {
  if (typeof valor !== "string") return "";
  const max = LIMITES[clave];
  return valor.length > max ? `${etiqueta} no puede tener más de ${max} caracteres (tiene ${valor.length}).` : "";
}

/**
 * Revisa los campos de texto conocidos de una fila de datos del panel. Devuelve el primer error o cadena vacía.
 * (Solo mira el primer nivel: los campos anidados tienen su propia validación.)
 */
export function errorLargosFila(fila: unknown, nombreFila = "El registro"): string {
  if (!fila || typeof fila !== "object") return "";
  for (const [campo, valor] of Object.entries(fila as Record<string, unknown>)) {
    const clave = LIMITE_POR_CAMPO[campo];
    if (!clave) continue;
    const e = errorLargo(valor, clave, `El campo «${campo}» de ${nombreFila}`);
    if (e) return e;
  }
  return "";
}
