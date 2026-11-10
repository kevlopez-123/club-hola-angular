import {
  beneficios,
  categoriasBeneficio,
  categoriasProducto,
  correosIniciales,
  direccionesIniciales,
  productos,
  productosPorTab,
  slides,
  slidesBeneficios,
  slidesProductos,
  user,
} from "./seed/mock";
import { niveles, nivelesTexto } from "./seed/niveles";
import { GUIAS_INICIALES } from "../ayuda";
import { POPUPS_INICIALES } from "../popups";
import { ciudades, cotizacionesIniciales, destinos, slidesVuelos } from "./seed/vuelos";
import {
  compras,
  condicionesCompra,
  misBeneficios,
  movimientos,
  perfil,
} from "./seed/historial";
import {
  contacto,
  tarjetasBanbif,
  tiposDocumento,
} from "./seed/juegos";
import { adminSeed, altaAISO, horaEjemplo } from "./admin-seed";
import { aceptacionesIniciales, legalesIniciales } from "./legales-seed";
import { AJUSTES_BASE } from "../correos";
import { analiticaSemilla, type EventoGuardado } from "./analitica-seed";
import { credencialesIniciales } from "./seed/admin";
import { faqs, privacidad, terminos } from "./seed/contenido";
import { seccionesAMarkdown } from "../markdown";
import { generarStress } from "./stress";
import { presetPorId, TENANT_POR_DEFECTO } from "../../tenants/presets";

const clone = <T>(v: T): T => structuredClone(v);

/** Clave de localStorage donde se guarda la base simulada. Subir la versión invalida datos viejos. */
export const DB_KEY = "bancosolidario_mockdb_v11";

/**
 * "Base de datos" del backend simulado. Cada petición a /api/* se resuelve contra este estado,
 * que se guarda en localStorage tras cada escritura (para reiniciarla: `resetMockDb()` o borrar la clave).
 */
/** Avisos de ejemplo de la participante demo: se ven al abrir la campanita en una demostración. */
function notificacionesIniciales() {
  const hace = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
  return [
    { id: "n-seed-3", participanteId: "p1", tipo: "pedido", titulo: "Tu pedido BNB-4F82KDL1 está en camino", texto: "Revisa el detalle y el seguimiento de tu pedido.", enlace: "/mis-compras/BNB-4F82KDL1", fecha: hace(45), leida: false },
    { id: "n-seed-2", participanteId: "p1", tipo: "vuelo", titulo: "Tu cotización COT-100501 fue cotizada", texto: "UIO → MIA. Ya puedes revisar la propuesta.", enlace: "/vuelos/cotizaciones", fecha: hace(60 * 5), leida: false },
    { id: "n-seed-1", participanteId: "p1", tipo: "puntos", titulo: "Acreditamos 2 500 puntos", texto: "Tu compra de puntos fue aprobada.", enlace: "/mis-puntos/historial", fecha: hace(60 * 30), leida: true },
  ];
}

const semilla = () => {
  const admin = adminSeed();
  return {
  usuario: clone(user) as typeof user & { puntos: number },
  perfil: clone(perfil),
  direcciones: clone(direccionesIniciales),
  correos: clone(correosIniciales),
  /** Avisos dentro del sitio (campanita), por participante. */
  notificaciones: notificacionesIniciales() as any[],
  /** Textos legales con versiones y qué aceptó cada participante. */
  legales: legalesIniciales(seccionesAMarkdown(terminos), seccionesAMarkdown(privacidad), {}),
  aceptaciones: aceptacionesIniciales((admin.participantes as any[]).map((p) => p.id)),
  /** Eventos anónimos del embudo (solo de quienes aceptaron cookies de analítica). */
  analitica: analiticaSemilla(admin.hoy, (admin.productos as any[]).map((p) => p.id), (admin.beneficios as any[]).map((b) => b.id)) as EventoGuardado[],
  favoritos: [] as string[],
  cupones: {} as Record<string, { codigo: string; expira: number }>,
  movimientos: clone(movimientos),
  compras: clone(compras),
  misBeneficios: clone(misBeneficios),
  cotizaciones: clone(cotizacionesIniciales),
  consultas: [] as { telefono: string; consulta: string; fecha: string }[],
  /** Contraseñas del panel (solo las usa la ruta de ingreso; nunca se devuelven al navegador). */
  credenciales: clone(credencialesIniciales),

  catalogo: {
    // El catálogo público parte de las filas del admin (así comparten sus datos).
    productos: clone(admin.productos) as typeof productos,
    beneficios: clone(beneficios),
    productosPorTab: Object.fromEntries(
      Object.entries(productosPorTab).map(([k, v]) => [k, v.map((p) => p.id)]),
    ) as Record<string, string[]>,
    categoriasProducto: clone(categoriasProducto),
    categoriasBeneficio: clone(categoriasBeneficio) as unknown as typeof categoriasBeneficio,
    banners: {
      home: clone(slides),
      beneficios: clone(slidesBeneficios),
      productos: clone(slidesProductos),
      vuelos: clone(slidesVuelos),
    } as Record<string, typeof slides>,
  },

  niveles: clone(niveles),
  nivelesTexto: clone(nivelesTexto),

  vuelos: { ciudades: clone(ciudades), destinos: clone(destinos) },

  config: {
    /** Marca, colores, logos, país y moneda (Admin → Configuración → Marca y localización). */
    tenant: presetPorId(TENANT_POR_DEFECTO),
    /** Datos de marca y contacto que se muestran en cabecera/pie/WhatsApp (editables en Admin → Configuración). */
    sitio: {
      nombre: "Banco Solidario Puntos",
      correoSoporte: "servicioalcliente@banco-solidario.com",
      telefonoPie: "1800 SOLIDARIO (285 2684)",
      whatsapp: "+593 99 123 4567",
      agenciasUrl: "https://www.banco-solidario.com",
      ciudadesPie: "Quito · Guayaquil · Cuenca",
      agenciasTexto: "Encuentra tu agencia Banco Solidario",
      redes: { facebook: "", x: "", linkedin: "", instagram: "", tiktok: "", youtube: "" } as Record<string, string>,
    },
    /** Menú principal. Los ítems con `activo: false` quedan ocultos hasta que el admin los habilite. */
    menu: [
      { id: "inicio", label: "Inicio", to: "/", activo: true },
      { id: "canjea", label: "Canjea tus puntos", to: "/canjea", activo: true },
      { id: "beneficios", label: "Beneficios", activo: true, children: [
        { label: "Catálogo de beneficios", to: "/beneficios", activo: true },
        { label: "Mis beneficios", to: "/mis-beneficios", activo: true },
      ] },
      { id: "puntos", label: "Mis puntos", activo: true, children: [
        { label: "Historial de puntos", to: "/mis-puntos/historial", activo: true },
        { label: "Compra de puntos", to: "/mis-puntos/compra", activo: true },
        { label: "Mi nivel", to: "/mi-nivel", activo: true },
      ] },
      { id: "compras", label: "Mis compras", to: "/mis-compras", activo: true },
      { id: "vuelos", label: "Vuelos", activo: true, children: [
        { label: "Cotizar vuelo", to: "/vuelos", activo: true },
        { label: "Mis cotizaciones", to: "/vuelos/cotizaciones", activo: true },
      ] },
      { id: "contacto", label: "Contáctanos", to: "/contacto", activo: true },
    ] as any[],
    contenido: { faq: clone(faqs), terminos: seccionesAMarkdown(terminos), privacidad: seccionesAMarkdown(privacidad) },
    cupon: { horas: 3, limite: 0, meses: 3 },
    contacto: clone(contacto),
    condicionesCompra: clone(condicionesCompra),
    tarjetas: clone(tarjetasBanbif),
    tiposDocumento: clone(tiposDocumento),
  },

  admin,
  };
};

export type Db = ReturnType<typeof semilla>;

const cargar = (): Db => {
  const base = semilla();
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const guardado = JSON.parse(raw) as Partial<Db>;
      const { ahora, plantillasCorreo, correosEnviados, disenoCorreo, campanas, importaciones } = base.admin;
      Object.assign(base, guardado);
      base.admin = { ...base.admin, ahora };
      // Datos guardados antes de existir el módulo de correos.
      base.admin.plantillasCorreo ??= plantillasCorreo;
      base.admin.correosEnviados ??= correosEnviados;
      base.admin.disenoCorreo ??= disenoCorreo;
      (base.admin as any).ajustesCorreo ??= structuredClone(AJUSTES_BASE);
      base.admin.campanas ??= campanas;
      base.admin.importaciones ??= importaciones;
      (base as any).notificaciones ??= notificacionesIniciales();
      // Pop-ups y guías de ayuda: las bases guardadas antes de existir estos módulos reciben los de ejemplo.
      (base.admin as any).popups ??= structuredClone(POPUPS_INICIALES);
      (base.admin as any).guias ??= structuredClone(GUIAS_INICIALES);
      base.analitica ??= semilla().analitica;
      if (!(base as any).legales) { const s = semilla(); (base as any).legales = s.legales; (base as any).aceptaciones = s.aceptaciones; }
      // Movimientos guardados antes de existir la hora.
      (base.admin.movimientos as any[]).forEach((m, i) => { m.hora ??= horaEjemplo(i); });
      (base.admin.pedidos as any[]).forEach((p, i) => { p.hora ??= horaEjemplo(i + 3); });
      (base.admin.participantes as any[]).forEach((p) => { p.altaISO ??= altaAISO(p.alta); });
      // Datos guardados antes de existir las compras de puntos de ejemplo: se agregan (y sus movimientos) si aún no hay ninguna.
      if (!(base.admin.comprasPuntos as any[]).length) {
        const demo = semilla().admin;
        base.admin.comprasPuntos = demo.comprasPuntos;
        const ids = new Set((base.admin.movimientos as any[]).map((m) => m.id));
        for (const m of demo.movimientos as any[]) if (String(m.id).startsWith("mv-pts-") && !ids.has(m.id)) (base.admin.movimientos as any[]).push(m);
      }
      (base.admin.comprasPuntos as any[]).forEach((c, i) => { c.hora ??= horaEjemplo(i + 5); });
      // Las categorías guardadas antes de poder elegir ícono toman el que ya tenían en el catálogo.
      for (const k of ["categoriasProducto", "categoriasBeneficio"] as const) {
        for (const c of base.admin[k] as any[]) c.icon ??= (base.catalogo[k] as any[]).find((x) => x.slug === c.slug)?.icon ?? "Tag";
      }
    }
  } catch {
    /* sin almacenamiento o datos corruptos: se usa la semilla */
  }
  (base.admin as any).popups ??= structuredClone(POPUPS_INICIALES);
  (base.admin as any).guias ??= structuredClone(GUIAS_INICIALES);
  // El formulario de datos ya no pide aceptar Términos: la aceptación se registra con versión al ingresar (Textos legales).
  base.admin.campos = (base.admin.campos as any[]).filter((c) => c.mapeo !== "acepta_terminos");
  // Género queda conectado al dato del participante (antes no tenía conexión).
  for (const c of base.admin.campos as any[]) if (!c.mapeo && /g[eé]nero/i.test(c.etiqueta ?? "")) c.mapeo = "genero";
  // Compras guardadas antes de registrar la hora.
  (base.compras as any[]).forEach((c, i) => { c.hora ??= horaEjemplo(i + 2); });
  return base;
};

export const db: Db = cargar();

/**
 * Varias pestañas comparten la misma "base de datos" (localStorage), como compartirían un servidor:
 * cuando otra pestaña guarda, esta recarga su copia en memoria. Así se puede probar la concurrencia entre dos usuarios.
 */
try {
  window.addEventListener("storage", (e) => {
    if (e.key !== DB_KEY || !e.newValue) return;
    try {
      const nuevo = JSON.parse(e.newValue) as Partial<Db>;
      const { ahora } = db.admin;
      Object.assign(db, nuevo);
      db.admin = { ...db.admin, ahora };
    } catch {
      /* copia ilegible: se conserva la actual */
    }
  });
} catch {
  /* sin window */
}

/** Con datos masivos de prueba no se persiste (superaría la cuota de localStorage). */
let modoStress = false;
export const enModoStress = () => modoStress;
// Activación para pruebas de carga: localStorage.setItem("bs_stress", "100000") y recargar (n = participantes).
try {
  const n = Number(localStorage.getItem("bs_stress"));
  if (n > 0) {
    modoStress = true;
    generarStress(db, n);
  }
} catch {
  /* sin almacenamiento */
}

/** Guarda el estado actual (se llama tras cada petición que modifica datos). */
export const persistDb = () => {
  if (modoStress) return;
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    /* cuota excedida o almacenamiento no disponible */
  }
};

/** Restaura los datos de ejemplo originales y recarga la app. */
export const resetMockDb = () => {
  try {
    localStorage.removeItem(DB_KEY);
  } catch {
    /* nada */
  }
  location.reload();
};
