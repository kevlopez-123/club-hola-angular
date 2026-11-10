import type { Nivel } from "./models";

/** Equivalencia usada en todo el prototipo: 70 puntos = $1.00 */
export const PUNTOS_POR_DOLAR = 70;
/** Precio de compra de puntos: $0.02 por punto */
export const PRECIO_POR_PUNTO = 0.02;
/** Equivalencia de canje hacia tarjeta: 320.5 puntos = $1.00 */
export const PUNTOS_POR_DOLAR_CASHBACK = 320.5;
export const GIROS_MAXIMOS = 3;

/** Formato regional vigente; lo establece `BrandService` según el país del tenant. */
let formato = { locale: "es-EC", simbolo: "$" };
export const configurarFormato = (f: { locale: string; simbolo: string }) => (formato = f);
export const localeActual = () => formato.locale;

export const formatPuntos = (n: number) => Math.round(n).toLocaleString(formato.locale).replace(/,/g, " ");

/** Monto en la moneda del tenant (el nombre se conserva por compatibilidad; ya no es solo USD). */
export const formatUSD = (n: number) =>
  `${formato.simbolo}${n.toLocaleString(formato.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const formatMoneda = formatUSD;

export const puntosADolares = (puntos: number) => puntos / PUNTOS_POR_DOLAR;

export const formatFecha = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString(formato.locale, { day: "2-digit", month: "short", year: "numeric" });

export const fechaLarga = (d = new Date()) =>
  d.toLocaleDateString(formato.locale, { day: "2-digit", month: "long", year: "numeric" });

export const codigoAleatorio = (prefix = "MOT") =>
  `${prefix}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;

/* ---- Niveles (reciben la lista que entrega la API) ---- */
export const nivelPorPuntos = (niveles: Nivel[], puntos: number): Nivel =>
  [...niveles].reverse().find((n) => puntos >= n.desde) ?? niveles[0]!;

export const siguienteNivel = (niveles: Nivel[], puntos: number): Nivel | null => {
  const actual = nivelPorPuntos(niveles, puntos);
  const idx = niveles.findIndex((n) => n.id === actual.id);
  return niveles[idx + 1] ?? null;
};

/** Avance porcentual dentro del nivel actual (0-100). */
export const progresoNivel = (niveles: Nivel[], puntos: number): number => {
  const actual = nivelPorPuntos(niveles, puntos);
  const siguiente = siguienteNivel(niveles, puntos);
  if (!siguiente) return 100;
  return Math.min(100, Math.round(((puntos - actual.desde) / (siguiente.desde - actual.desde)) * 100));
};

export const faltanParaSiguiente = (niveles: Nivel[], puntos: number): number => {
  const siguiente = siguienteNivel(niveles, puntos);
  return siguiente ? Math.max(0, siguiente.desde - puntos) : 0;
};
