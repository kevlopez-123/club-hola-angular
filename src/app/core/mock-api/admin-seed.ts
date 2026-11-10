import { user, beneficios, categoriasBeneficio, categoriasProducto, direccionesIniciales, productos, slides, slidesBeneficios, slidesProductos } from "./seed/mock";
import { compras, movimientos } from "./seed/historial";
import { ciudades, destinos, slidesVuelos } from "./seed/vuelos";
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
import { PRECIO_POR_PUNTO, PUNTOS_POR_DOLAR } from "../format";
import { AJUSTES_BASE, DISENO_BASE, PLANTILLAS_BASE } from "../correos";

const clone = <T>(v: T): T => structuredClone(v);
const ahora = () => new Date().toLocaleString("es-EC", { dateStyle: "short", timeStyle: "short" });

const flujoFisico = ["Confirmado", "Preparando", "Enviado", "Entregado"];
const flujoDigital = ["Confirmado", "Digital enviado"];
const mapEstado = (e: string) => (e === "Entregado" ? "Entregado" : e === "En camino" ? "Enviado" : "Preparando");

/** "dd/mm/aaaa" (como se guarda el alta) → "aaaa-mm-dd", para poder ordenar por fecha de alta. */
export const altaAISO = (alta: unknown): string => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(String(alta ?? ""));
  return m ? `${m[3]}-${m[2]}-${m[1]}` : /^\d{4}-\d{2}-\d{2}/.test(String(alta ?? "")) ? String(alta).slice(0, 10) : "";
};

/** Hora de ejemplo (hh:mm) repartida a lo largo del día para los movimientos de la demo. */
export const horaEjemplo = (i: number) => `${String(8 + ((i * 7) % 11)).padStart(2, "0")}:${String((i * 17) % 60).padStart(2, "0")}`;

/**
 * Compras de puntos de ejemplo (aprobadas, pendientes y fallidas) repartidas en los últimos 6 meses. Las aprobadas dejan su
 * movimiento de puntos, como pasa en la operación real. No usan a la participante demo (p1): su saldo y su historial son aparte.
 */
function comprasPuntosDemo(hoy: string) {
  const dia = (d: number) => new Date(Date.parse(hoy + "T00:00:00Z") - d * 864e5).toISOString().slice(0, 10);
  const txt = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
  // [días atrás, índice de participante, puntos, estado, motivo, intentos]
  const filas: [number, number, number, string, string, number][] = [
    [3, 4, 5000, "Aprobada", "", 1], [9, 6, 2500, "Aprobada", "", 1], [16, 2, 10000, "Aprobada", "", 1],
    [24, 8, 5000, "Pendiente", "Esperando la confirmación del banco", 1], [33, 10, 25000, "Aprobada", "", 1],
    [47, 5, 2500, "Fallida", "El banco rechazó la tarjeta", 1], [61, 12, 10000, "Aprobada", "", 1], [75, 3, 5000, "Aprobada", "", 1],
    [92, 7, 2500, "Fallida", "Fondos insuficientes", 2], [110, 9, 10000, "Aprobada", "", 1],
    [126, 11, 5000, "Pendiente", "", 0], [140, 13, 25000, "Aprobada", "", 1], [158, 14, 2500, "Aprobada", "", 1],
  ];
  const compras: any[] = [];
  const movs: any[] = [];
  const armar = (codigo: string, iso: string, idx: number, cantidad: number, estado: string, motivo: string, intentos: number, i: number, conMovimiento: boolean) => {
    const p = participantes[idx]!;
    compras.push({
      codigo, fechaISO: iso, fecha: txt(iso), hora: horaEjemplo(i + 5), participanteId: p.id, cliente: p.nombre, email: p.email,
      cantidad, monto: Math.round(cantidad * PRECIO_POR_PUNTO * 100) / 100, estado, intentos, motivo, ...(intentos ? { referencia: `AUT-${codigo.slice(4)}` } : {}),
    });
    if (estado === "Aprobada" && conMovimiento) movs.push({ id: `mv-pts-${i}`, fechaISO: iso, fecha: txt(iso), hora: horaEjemplo(i + 5), detalle: `Compra de puntos operación ${codigo}`, tipo: "compra", puntos: cantidad, cliente: p.nombre });
  };
  // La compra que ya trae el historial de ejemplo (PTS-91MZ) no duplica su movimiento.
  armar("PTS-91MZ", "2026-07-20", 2, 25000, "Aprobada", "", 1, 0, false);
  filas.forEach(([d, idx, cant, estado, motivo, intentos], k) => armar(`PTS-${(k * 7919 + 2310).toString(36).toUpperCase().padStart(4, "0").slice(-4)}`, dia(d), idx, cant, estado, motivo, intentos, k + 1, true));
  // Lo más reciente primero (las compras nuevas se agregan arriba).
  compras.sort((a, b) => b.fechaISO.localeCompare(a.fechaISO));
  return { compras, movs };
}
/** Colecciones del panel de administración (la API las expone como /api/admin/c/:coleccion). */
export const adminSeed = () => {
  const pedidos = [...compras, ...compras].map((c, i) => {
    const p = participantes[i % participantes.length]!;
    const digital = i === 1 || i === 5;
    const estadoAdmin = digital ? "Digital enviado" : i === 0 ? "Confirmado" : mapEstado(c.estado);
    const flujo = digital ? flujoDigital : flujoFisico;
    const hasta = flujo.indexOf(estadoAdmin);
    return {
      ...clone(c),
      codigo: i < compras.length ? c.codigo : c.codigo + "-B",
      cliente: p.nombre,
      email: p.email,
      hora: horaEjemplo(i + 3),
      digital,
      estadoAdmin,
      guia: estadoAdmin === "Enviado" || estadoAdmin === "Entregado" ? `SERV-${48210 + i}` : "",
      historial: flujo.slice(0, hasta + 1).map((e, k) => ({ estado: e, fecha: `${c.fecha} ${String(9 + k * 2).padStart(2, "0")}:00` })),
    };
  });

  const HOY = "2026-10-28";
  const demoCompras = comprasPuntosDemo(HOY);
  const banners = [...slides, ...slidesProductos, ...slidesBeneficios].map((s, i) => ({
    ...s,
    key: s.id + i,
    canal: i % 2 ? "App" : "Web",
    ubicacion: i < slides.length ? "Home" : i < slides.length + slidesProductos.length ? "Canjea" : "Beneficios",
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
      // La participante demo (la que ingresa al sitio) comparte saldo y nivel con la ficha.
      ...(i === 0 ? { puntos: user.puntos, acumulados12m: user.puntosNivel } : {}),
      direcciones: i % 2 ? clone(direccionesIniciales.slice(0, 1)) : clone(direccionesIniciales),
      ajustes:
        i === 0
          ? [
              { fecha: "12/10/2026", puntos: 5000, motivo: "Compensación por pedido demorado", usuario: "Karla Núñez" },
              { fecha: "03/09/2026", puntos: -1200, motivo: "Corrección de acumulación duplicada", usuario: "Mariela Castro" },
            ]
          : [],
    })) as any[],
    mensajes: clone(mensajes) as any[],
    usuarios: usuariosAdmin.map((u) => ({ ...clone(u), estado: "Activo" })) as any[],
    auditoria: auditoria.map((a, i) => {
      // "dd/mm/aaaa hh:mm" → fecha ISO para poder ordenar y filtrar por fecha.
      const m = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/.exec(a.fecha);
      const ts = m ? new Date(`${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:00`).toISOString() : new Date().toISOString();
      return { id: `au-seed-${i}`, ...clone(a), ts, fechaISO: m ? `${m[3]}-${m[2]}-${m[1]}` : ts.slice(0, 10), seccion: ["Niveles", "Contenido", "Participantes", "Destinos"][i] ?? "Usuarios", descrita: true };
    }) as any[],
    productos: productos.map((p, i) => ({
      ...clone(p),
      activo: true,
      destacado: i < 10,
      // Pestañas "Más vistos" y "Novedades" del Home: se calculan solas (vistas y fecha de alta); `fijar…` las fuerza.
      creadoEn: new Date(Date.UTC(2026, 5, 1 + i)).toISOString().slice(0, 10),
      vistas: [3, 0, 9, 5, 1, 7, 4, 8, 2, 6].indexOf(i) >= 0 ? 900 - [3, 0, 9, 5, 1, 7, 4, 8, 2, 6].indexOf(i) * 60 : (i * 13) % 200,
      fijarMasVistos: false,
      fijarNovedad: false,
      imagenes: [p.imagen],
      vigencia: "2026-12-31",
    })) as any[],
    beneficios: beneficios.map((b) => ({ ...clone(b), activo: true, exclusivo: b.tipo === "compra", imagenes: [b.imagen] })) as any[],
    destinos: destinos.map((d, i) => ({ ...clone(d), destacado: i < 3, activo: true, galeria: [d.imagen] })) as any[],
    ciudades: ciudades.map((c) => ({ ...c, activo: true })) as any[],
    // Marcas aliadas: se administran con logo y sitio web; productos y beneficios eligen una por nombre.
    comprasPuntos: demoCompras.compras as any[],
    marcas: [...new Set([...productos.map((p) => p.marca), ...beneficios.map((b) => b.marca)])].sort().map((nombre) => ({
      id: nombre.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      nombre,
      logo: "",
      web: "",
      descripcion: "",
      activo: true,
    })) as any[],
    categoriasProducto: categoriasProducto.map((c) => ({
      slug: c.slug,
      label: c.label,
      icon: c.icon,
      activo: true,
      subcategorias: c.subcategorias.map((x) => ({ ...x })),
    })) as any[],
    categoriasBeneficio: categoriasBeneficio.map((c) => ({ slug: c.slug, label: c.label, icon: c.icon, activo: true, subcategorias: [] })) as any[],
    banners: banners as any[],
    bannersVuelos: slidesVuelos.map((s) => ({ ...s, activo: true })) as any[],
    onboarding: clone(onboarding) as any[],
    campos: clone(camposIniciales) as any[],
    lotes: [
      { id: "l1", beneficioId: "b7", comercio: "Cinemark", beneficio: "2x1 en entradas 2D", archivo: "cinemark_oct.csv", total: 500, usados: 180, vence: "2026-12-31", fecha: "2026-10-02" },
      { id: "l2", beneficioId: "", comercio: "Juan Valdez", beneficio: "Café gratis", archivo: "jv_q4.xlsx", total: 200, usados: 52, vence: "2026-11-30", fecha: "2026-10-10" },
      { id: "l3", beneficioId: "b8", comercio: "Supermaxi", beneficio: "US$ 10 de descuento", archivo: "supermaxi.csv", total: 100, usados: 88, vence: "2026-11-15", fecha: "2026-09-20" },
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
      { id: "productos", s: "Productos destacados", on: true },
      { id: "categorias", s: "Categorías de productos", on: false },
      { id: "beneficios", s: "Beneficios", on: true },
      { id: "destinos", s: "Destinos recomendados", on: false },
      { id: "cta-puntos", s: "CTA Compra de puntos", on: false },
      { id: "cta-duo", s: "Canjea y contáctanos", on: true },
    ] as any[],

    // Objetos (no listas)
    reglas: {
      porDolar: PUNTOS_POR_DOLAR,
      precio: PRECIO_POR_PUNTO,
      min: 500,
      max: 50000,
      mensual: 100000,
      /** Los puntos vencen a los N meses de acumulados; se avisa N días antes. */
      vigenciaMeses: 24,
      avisoVencimientoDias: 30,
      paquetes: [2500, 5000, 10000, 25000],
      compraActiva: true,
      soloDinero: true,
    },

    // Solo lectura
    kpis: clone(kpis),
    tendencia: clone(tendencia),
    roles: clone(rolesAdmin),
    provincias: clone(provincias),
    estadosPedido: clone(estadosPedido),
    hoy: HOY,
    movimientos: [...movimientos.filter((m) => m.tipo !== "vencimiento").map((m, i) => ({
      ...clone(m), cliente: participantes[i % participantes.length]!.nombre,
      // Hora del movimiento (hh:mm): de ejemplo, repartida a lo largo del día.
      hora: horaEjemplo(i),
    })), ...demoCompras.movs] as any[],
    ahora,
  };
};
