import { estadoVigencia, reglaDe } from "./cupones";
import type { HojaXlsx } from "./xlsx";

/**
 * Data completa de las promociones, pensada para que BanBif la explote (por ejemplo con una IA):
 * una ficha por beneficio con todo lo que se sabe de él (comercio, condiciones, vigencia, regla del cupón) y sus locales.
 * Es la misma información que se ve en el panel, sin texto de pantalla ni imágenes.
 */
export interface LocalPromocion {
  id: string;
  nombre: string;
  direccion: string;
  distrito: string;
  provincia: string;
  latitud: number;
  longitud: number;
  horario: string;
  telefono: string;
}

export interface PromocionCompleta {
  id: string;
  comercio: string;
  comercioWeb: string;
  comercioDescripcion: string;
  nombre: string;
  categoria: string;
  descuento: string;
  modalidad: "cupon" | "compra" | "informativo";
  precio: number | null;
  nivelMinimo: string;
  estado: "vigente" | "programado" | "vencido" | "inactivo";
  vigenciaDesde: string;
  vigenciaHasta: string;
  provincias: string[];
  descripcion: string;
  pasos: string[];
  especificaciones: string[];
  terminosYCondiciones: string;
  cupon: { duracionHoras: number; limiteCanjesPorPersona: number; esperaMeses: number; tipoCodigo: string };
  locales: LocalPromocion[];
}

type Registro = any;

export function promocionesCompletas(beneficios: Registro[], marcas: Registro[], locales: Registro[], hoyIso: string, reglaGeneral?: Registro): PromocionCompleta[] {
  const marcaDe = new Map(marcas.map((m) => [String(m.nombre), m]));
  const localesDe = new Map<string, LocalPromocion[]>();
  for (const l of locales) {
    if (l.activo === false) continue;
    const lista = localesDe.get(String(l.marca)) ?? [];
    lista.push({ id: l.id, nombre: l.nombre, direccion: l.direccion, distrito: l.distrito, provincia: l.provincia, latitud: l.lat, longitud: l.lng, horario: l.horario ?? "", telefono: l.telefono ?? "" });
    localesDe.set(String(l.marca), lista);
  }
  return beneficios.map((b) => {
    const m = marcaDe.get(String(b.marca));
    const r = reglaDe(b.cupon, reglaGeneral);
    return {
      id: String(b.id),
      comercio: b.marca ?? "",
      comercioWeb: m?.web ?? b.marcaUrl ?? "",
      comercioDescripcion: m?.descripcion ?? "",
      nombre: b.nombre ?? "",
      categoria: b.categoria ?? "",
      descuento: b.descuento ?? "",
      modalidad: b.tipo ?? "cupon",
      precio: typeof b.precio === "number" ? b.precio : null,
      nivelMinimo: b.nivelMinimo ?? "",
      estado: b.activo === false ? "inactivo" : estadoVigencia(b, hoyIso),
      vigenciaDesde: b.desde ?? "",
      vigenciaHasta: b.hasta ?? "",
      provincias: Array.isArray(b.provincias) ? b.provincias : [],
      descripcion: b.descripcion ?? "",
      pasos: Array.isArray(b.pasos) ? b.pasos : [],
      especificaciones: Array.isArray(b.especificaciones) ? b.especificaciones : [],
      terminosYCondiciones: b.terminos ?? "",
      cupon: { duracionHoras: r.horas, limiteCanjesPorPersona: r.limite, esperaMeses: r.meses, tipoCodigo: b.modoCodigo === "compartido" ? "compartido" : "unico" },
      locales: localesDe.get(String(b.marca)) ?? [],
    };
  });
}

/** Libro de Excel con una hoja de promociones (una fila por beneficio) y otra de locales (una fila por beneficio y local). */
export function hojasPromociones(p: PromocionCompleta[]): HojaXlsx[] {
  const lista = (xs: string[]) => xs.join("; ");
  const resumen = p.map((x) => [
    x.id, x.comercio, x.nombre, x.categoria, x.descuento, x.modalidad, x.nivelMinimo || "Todos", x.estado, x.vigenciaDesde, x.vigenciaHasta,
    x.provincias.length ? lista(x.provincias) : "Todo el país", x.descripcion, lista(x.pasos), lista(x.especificaciones), x.terminosYCondiciones,
    x.cupon.duracionHoras, x.cupon.limiteCanjesPorPersona, x.cupon.esperaMeses, x.locales.length, x.comercioWeb,
  ]);
  const locales = p.flatMap((x) => x.locales.map((l) => [x.id, x.comercio, x.nombre, l.nombre, l.direccion, l.distrito, l.provincia, l.latitud, l.longitud, l.horario, l.telefono]));
  return [
    {
      nombre: "Promociones",
      encabezado: 0,
      filas: [
        ["Código", "Comercio", "Beneficio", "Categoría", "Descuento", "Modalidad", "Nivel mínimo", "Estado", "Vigente desde", "Vigente hasta", "Disponible en", "Descripción", "Pasos", "Especificaciones", "Términos y condiciones", "Duración del cupón (h)", "Límite de canjes", "Espera (meses)", "Locales", "Sitio web"],
        ...resumen,
      ],
    },
    {
      nombre: "Locales",
      encabezado: 0,
      filas: [["Código del beneficio", "Comercio", "Beneficio", "Local", "Dirección", "Distrito", "Provincia", "Latitud", "Longitud", "Horario", "Teléfono"], ...locales],
    },
  ];
}
