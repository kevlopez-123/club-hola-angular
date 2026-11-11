export const GIROS_MAXIMOS = 3;

/** Formato regional vigente; lo establece `BrandService` según el país del tenant. */
let formato = { locale: "es-EC", simbolo: "$" };
export const configurarFormato = (f: { locale: string; simbolo: string }) => (formato = f);
export const localeActual = () => formato.locale;

/** Monto en la moneda del tenant (el nombre se conserva por compatibilidad; ya no es solo USD). */
export const formatUSD = (n: number) =>
  `${formato.simbolo}${n.toLocaleString(formato.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const formatMoneda = formatUSD;

export const formatFecha = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString(formato.locale, { day: "2-digit", month: "short", year: "numeric" });

export const fechaLarga = (d = new Date()) =>
  d.toLocaleDateString(formato.locale, { day: "2-digit", month: "long", year: "numeric" });

export const codigoAleatorio = (prefix = "MOT") =>
  `${prefix}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
