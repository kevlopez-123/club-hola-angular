import { user, beneficios, categoriasBeneficio, direccionesIniciales, slides, slidesBeneficios } from "./seed/mock";
import { compras } from "./seed/historial";
import { codigosIniciales, premiosIniciales } from "./seed/juegos";
import { eventosIniciales, preinscripcionesIniciales } from "./seed/eventos";
import {
  auditoria,
  camposIniciales,
  estadosPedido,
  kpis,
  mensajes,
  onboarding,
  participantes,
  provincias,
  rolesAdmin,
  tendencia,
  usuariosAdmin,
} from "./seed/admin";
import { AJUSTES_BASE, DISENO_BASE, PLANTILLAS_BASE } from "../correos";

const clone = <T>(v: T): T => structuredClone(v);
const ahora = () => new Date().toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" });


/** "dd/mm/aaaa" (como se guarda el alta) → "aaaa-mm-dd", para poder ordenar por fecha de alta. */
export const altaAISO = (alta: unknown): string => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(String(alta ?? ""));
  return m ? `${m[3]}-${m[2]}-${m[1]}` : /^\d{4}-\d{2}-\d{2}/.test(String(alta ?? "")) ? String(alta).slice(0, 10) : "";
};

/** Hora de ejemplo (hh:mm) repartida a lo largo del día para los movimientos de la demo. */
export const horaEjemplo = (i: number) => `${String(8 + ((i * 7) % 11)).padStart(2, "0")}:${String((i * 17) % 60).padStart(2, "0")}`;

/** Colecciones del panel de administración (la API las expone como /api/admin/c/:coleccion). */
export const adminSeed = () => {
  const pedidos = [...compras, ...compras].map((c, i) => {
    const p = participantes[i % participantes.length]!;
    return {
      ...clone(c),
      codigo: i < compras.length ? c.codigo : c.codigo + "-B",
      cliente: p.nombre,
      email: p.email,
      hora: horaEjemplo(i + 3),
      digital: true,
      estadoAdmin: c.estado,
      historial: [{ estado: c.estado, fecha: `${c.fecha} ${String(9 + (i % 5)).padStart(2, "0")}:00` }],
    };
  });

  const HOY = "2026-10-28";
  const banners = [...slides, ...slidesBeneficios].map((s, i) => ({
    ...s,
    key: s.id + i,
    canal: i % 2 ? "App" : "Web",
    ubicacion: i < slides.length ? "Home" : "Beneficios",
    activo: true,
    inicio: i % 5 === 3 ? "2026-11-20" : "2026-10-01",
    fin: i % 7 === 6 ? "2026-10-15" : "2026-12-31",
  }));

  return {
    /** Pedidos creados por la API pública (checkout) se agregan aquí con `unshift`. */
    pedidos: pedidos as any[],
    participantes: participantes.map((p, i) => ({
      ...clone(p),
      // Algunos participantes no aceptan novedades por correo: quedan fuera de las campañas.
      recibeNovedades: i % 4 !== 3,
      altaISO: altaAISO(p.alta),
      // La participante demo (la que ingresa al sitio) comparte nivel con la ficha.
      ...(i === 0 ? { nivel: user.nivel } : {}),
      direcciones: i % 2 ? clone(direccionesIniciales.slice(0, 1)) : clone(direccionesIniciales),
    })) as any[],
    mensajes: clone(mensajes) as any[],
    usuarios: usuariosAdmin.map((u) => ({ ...clone(u), estado: "Activo" })) as any[],
    auditoria: auditoria.map((a, i) => {
      // "dd/mm/aaaa hh:mm" → fecha ISO para poder ordenar y filtrar por fecha.
      const m = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/.exec(a.fecha);
      const ts = m ? new Date(`${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:00`).toISOString() : new Date().toISOString();
      return { id: `au-seed-${i}`, ...clone(a), ts, fechaISO: m ? `${m[3]}-${m[2]}-${m[1]}` : ts.slice(0, 10), seccion: ["Niveles", "Contenido", "Participantes"][i] ?? "Usuarios", descrita: true };
    }) as any[],
    beneficios: beneficios.map((b) => ({ ...clone(b), activo: true, exclusivo: b.tipo === "compra", imagenes: [b.imagen] })) as any[],
    // Marcas aliadas: se administran con logo y sitio web; productos y beneficios eligen una por nombre.
    marcas: [...new Set([...beneficios.map((b) => b.marca)])].sort().map((nombre) => ({
      id: nombre.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      nombre,
      logo: "",
      web: "",
      descripcion: "",
      activo: true,
    })) as any[],
    categoriasBeneficio: categoriasBeneficio.map((c) => ({ slug: c.slug, label: c.label, icon: c.icon, activo: true, subcategorias: [] })) as any[],
    banners: banners as any[],
    onboarding: clone(onboarding) as any[],
    campos: clone(camposIniciales) as any[],
    /** Spin & Win y Lucky Code: premios, códigos promocionales y lo que ya se jugó. */
    premios: clone(premiosIniciales) as any[],
    codigosPromo: clone(codigosIniciales) as any[],
    giros: [] as any[],
    /** Eventos exclusivos y las pre-inscripciones de los participantes. */
    eventos: clone(eventosIniciales) as any[],
    preinscripciones: clone(preinscripcionesIniciales) as any[],
    lotes: [
      { id: "l1", beneficioId: "b7", comercio: "Cineplanet", beneficio: "2x1 en entradas 2D", archivo: "cineplanet_oct.csv", total: 500, usados: 180, vence: "2026-12-31", fecha: "2026-10-02" },
      { id: "l2", beneficioId: "", comercio: "Starbucks", beneficio: "2x1 en bebidas grandes", archivo: "jv_q4.xlsx", total: 200, usados: 52, vence: "2026-11-30", fecha: "2026-10-10" },
      { id: "l3", beneficioId: "b8", comercio: "Plaza Vea", beneficio: "15% dscto. en frutas y verduras", archivo: "plazavea.csv", total: 100, usados: 88, vence: "2026-11-15", fecha: "2026-09-20" },
    ] as any[],
    /** Plantillas de correo editables desde el panel y registro de lo enviado. */
    plantillasCorreo: clone(PLANTILLAS_BASE) as any[],
    correosEnviados: [] as any[],
    /** Campañas de correo masivo (borradores y enviadas). */
    campanas: [] as any[],
    /** Historial de cargas masivas (se agrega al importar participantes o códigos). */
    importaciones: [
      { id: "im-seed-2", tipo: "Participantes", archivo: "participantes_octubre.csv", usuario: "Karla Núñez", ts: "2026-10-27T10:12:00.000Z", fecha: "27/10/2026 10:12", fechaISO: "2026-10-27", total: 4, importadas: 2, conErrores: 2, columnas: ["documento", "nombre", "correo", "puntos"],
        errores: [{ fila: 3, motivo: "Documento inválido (10 dígitos)", datos: ["17182", "Mónica Vélez", "monica.velez@correo.com", "1200"] }, { fila: 4, motivo: "Correo inválido", datos: ["1104567893", "Iván Cárdenas", "ivan.cardenas", "300"] }] },
      { id: "im-seed-1", tipo: "Códigos de beneficio", archivo: "cinemark_oct.csv", usuario: "Roberto Peña", ts: "2026-10-02T09:00:00.000Z", fecha: "02/10/2026 09:00", fechaISO: "2026-10-02", total: 500, importadas: 500, conErrores: 0, columnas: ["codigo"], errores: [] },
    ] as any[],
    /** Marca de los correos; un campo vacío usa lo de la marca del programa. */
    disenoCorreo: { ...DISENO_BASE } as any,
    /** Ajustes de envío de los correos (copia oculta). */
    ajustesCorreo: structuredClone(AJUSTES_BASE) as any,
    /** Secciones de la portada. `id` lo usa el sitio; `s` es la etiqueta del admin. */
    seccionesHome: [
      { id: "banners", s: "Banners", on: true },
      { id: "beneficios", s: "Beneficios", on: true },
      { id: "cta-duo", s: "Accesos de la portada", on: true },
    ] as any[],

    // Solo lectura
    kpis: clone(kpis),
    tendencia: clone(tendencia),
    roles: clone(rolesAdmin),
    provincias: clone(provincias),
    estadosPedido: clone(estadosPedido),
    hoy: HOY,
    ahora,
  };
};
