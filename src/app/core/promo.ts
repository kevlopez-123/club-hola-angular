/** Campos de promoción que el panel guarda en cada beneficio. */
export type PromoCampos = {
  /** "porcentaje": baja el precio ese %. "monto": baja ese monto. */
  promoTipo?: "" | "porcentaje" | "monto" | undefined;
  promoValor?: number | undefined;
  /** Vigencia opcional (ISO yyyy-mm-dd, ambas incluidas). */
  promoDesde?: string | undefined;
  promoHasta?: string | undefined;
};

/** Lo que el sitio recibe cuando hay promoción vigente: precio ya rebajado y el original para tacharlo. */
export type PromoAplicada = {
  precioOriginal?: number | undefined;
  /** Texto de la insignia: "-20%" o "-$10". */
  promoEtiqueta?: string | undefined;
};

const hoyISO = () => new Date().toISOString().slice(0, 10);
const redondea = (n: number) => Math.round(n * 100) / 100;

export const promoVigente = (p: PromoCampos, hoy = hoyISO()) =>
  !!p.promoTipo && (p.promoValor ?? 0) > 0 && (!p.promoDesde || p.promoDesde <= hoy) && (!p.promoHasta || p.promoHasta >= hoy);

/** Devuelve el artículo con el precio rebajado si su promoción está vigente; si no, tal cual. */
export function aplicarPromo<T extends { precio?: number | undefined } & PromoCampos>(item: T, hoy = hoyISO()): T & PromoAplicada {
  if (!promoVigente(item, hoy)) return item;
  const v = item.promoValor!;
  const precio = item.precio;
  if (item.promoTipo === "porcentaje") {
    const pct = Math.min(100, v);
    return {
      ...item,
      precio: precio == null ? precio : redondea(precio * (1 - pct / 100)),
      precioOriginal: precio,
      promoEtiqueta: `-${Number.isInteger(pct) ? pct : pct.toFixed(1)}%`,
    };
  }
  return {
    ...item,
    precio: precio == null ? precio : Math.max(0, redondea(precio - v)),
    precioOriginal: precio,
    promoEtiqueta: `-$${Number.isInteger(v) ? v : v.toFixed(2)}`,
  };
}

/** Colores de la etiqueta propia (clases listas para usar con texto blanco; "marca" sigue la marca). */
export const ETIQUETA_COLORES: { v: string; l: string; clase: string }[] = [
  { v: "marca", l: "Principal (el de siempre)", clase: "bg-primary text-primary-foreground" },
  { v: "verde", l: "Verde", clase: "bg-[#15803d] text-white" },
  { v: "naranja", l: "Naranja", clase: "bg-[#c2410c] text-white" },
  { v: "rojo", l: "Rojo", clase: "bg-destructive text-destructive-foreground" },
  { v: "oscuro", l: "Oscuro", clase: "bg-ink text-white" },
];
export const claseEtiqueta = (color?: string) => (ETIQUETA_COLORES.find((c) => c.v === color) ?? ETIQUETA_COLORES[0]!).clase;
