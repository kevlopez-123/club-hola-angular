/**
 * Lo que lleva un cupón guardado como imagen o PDF: el código, el QR y el documento del titular ofuscado (solo los 4 últimos caracteres),
 * que el comercio cruza con el documento físico de quien lo presenta.
 */
export interface DatosCupon {
  programa: string;
  banco: string;
  logo?: string | undefined;
  /** Logo del banco (fondo oscuro). Si falta, se escribe el nombre. */
  logoBanco?: string | undefined;
  beneficio: string;
  comercio: string;
  descuento: string;
  codigo: string;
  /** Imagen del QR (data URL). Si falta, el cupón sale solo con el código. */
  qr?: string | undefined;
  /** Etiqueta y valor del documento: «DNI» y «****4567». */
  documentoEtiqueta: string;
  documento: string;
  /** Fecha y hora hasta la que se puede usar el cupón. */
  venceEl: string;
  /** Hasta cuándo es válida la promoción (opcional). */
  vigenciaHasta?: string | undefined;
  locales: { nombre: string; direccion: string; distrito: string; horario?: string | undefined }[];
  terminos?: string | undefined;
}
