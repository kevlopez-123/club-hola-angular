import type { PromoCorreo } from "./correos";

/** Cantidades que se pueden elegir en una campaña. */
export const OPCIONES_PROMOCIONES = [0, 3, 4, 6];

const absoluta = (ruta: string, base: string) => {
  if (!ruta) return "";
  try { return new URL(ruta, base).href; } catch { return ""; }
};

/**
 * Promociones destacadas para un correo de novedades: una por comercio (para dar variedad), sin las de compra,
 * en el orden del catálogo. `base` es la dirección del sitio, para que las imágenes y enlaces funcionen fuera de él.
 */
export function promocionesDestacadas(beneficios: any[], cantidad: number, base: string): PromoCorreo[] {
  const n = Math.max(0, Math.min(6, Math.floor(cantidad || 0)));
  const vistos = new Set<string>();
  const salida: PromoCorreo[] = [];
  for (const b of beneficios) {
    if (salida.length >= n) break;
    if (!b || b.tipo === "compra" || vistos.has(b.marca)) continue;
    vistos.add(b.marca);
    salida.push({ comercio: b.marca ?? "", nombre: b.nombre ?? "", descuento: b.descuento ?? "", imagen: absoluta(b.imagen ?? "", base), url: absoluta(`beneficios/${encodeURIComponent(b.id)}`, base) });
  }
  return salida;
}
