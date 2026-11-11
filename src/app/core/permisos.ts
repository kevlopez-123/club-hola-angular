import { signal } from "@angular/core";
import type { RolAdmin } from "./models";

/** Permisos del panel por sección y acción. Es la única fuente: el menú, el aviso de solo lectura, la página Roles y la MockAPI la usan. */
export type Accion = "ver" | "editar" | "eliminar" | "exportar";
export const ACCIONES: { id: Accion; etiqueta: string }[] = [
  { id: "ver", etiqueta: "Ver" },
  { id: "editar", etiqueta: "Crear y editar" },
  { id: "eliminar", etiqueta: "Eliminar" },
  { id: "exportar", etiqueta: "Exportar" },
];

export type Seccion =
  | "dashboard" | "reportes" | "participantes" | "formulario" | "niveles"
  | "beneficios" | "marcas" | "ruleta" | "codigos" | "eventos" | "preinscripciones" | "pedidos" | "atencion"
  | "importaciones" | "contenido" | "popups" | "legales" | "configuracion" | "correos" | "usuarios" | "roles" | "auditoria" | "ayuda";

export const SECCIONES: { id: Seccion; etiqueta: string; ruta: string; grupo: string }[] = [
  { id: "dashboard", etiqueta: "Dashboard", ruta: "/admin", grupo: "General" },
  { id: "reportes", etiqueta: "Reportes", ruta: "/admin/reportes", grupo: "General" },
  { id: "participantes", etiqueta: "Participantes", ruta: "/admin/participantes", grupo: "Participantes" },
  { id: "formulario", etiqueta: "Formulario de datos", ruta: "/admin/formulario", grupo: "Participantes" },
  { id: "importaciones", etiqueta: "Importaciones", ruta: "/admin/importaciones", grupo: "Participantes" },
  { id: "niveles", etiqueta: "Niveles", ruta: "/admin/niveles", grupo: "Programa" },
  { id: "beneficios", etiqueta: "Beneficios", ruta: "/admin/beneficios", grupo: "Catálogos" },
  { id: "marcas", etiqueta: "Marcas", ruta: "/admin/marcas", grupo: "Catálogos" },
  { id: "ruleta", etiqueta: "Ruleta", ruta: "/admin/ruleta", grupo: "Juegos" },
  { id: "codigos", etiqueta: "Lucky Code", ruta: "/admin/codigos", grupo: "Juegos" },
  { id: "eventos", etiqueta: "Eventos", ruta: "/admin/eventos", grupo: "Eventos" },
  { id: "preinscripciones", etiqueta: "Pre-inscripciones", ruta: "/admin/pre-inscripciones", grupo: "Eventos" },
  { id: "pedidos", etiqueta: "Compras", ruta: "/admin/pedidos", grupo: "Operación" },
  { id: "atencion", etiqueta: "Atención", ruta: "/admin/atencion", grupo: "Operación" },
  { id: "contenido", etiqueta: "Contenido", ruta: "/admin/contenido", grupo: "Sitio y app" },
  { id: "popups", etiqueta: "Pop-ups", ruta: "/admin/popups", grupo: "Sitio y app" },
  { id: "legales", etiqueta: "Textos legales", ruta: "/admin/legales", grupo: "Sitio y app" },
  { id: "configuracion", etiqueta: "Configuración", ruta: "/admin/configuracion", grupo: "Sitio y app" },
  { id: "correos", etiqueta: "Correos", ruta: "/admin/correos", grupo: "Sitio y app" },
  { id: "usuarios", etiqueta: "Usuarios", ruta: "/admin/usuarios", grupo: "Sitio y app" },
  { id: "roles", etiqueta: "Roles", ruta: "/admin/roles", grupo: "Sitio y app" },
  { id: "auditoria", etiqueta: "Registro de cambios", ruta: "/admin/auditoria", grupo: "Sitio y app" },
  { id: "ayuda", etiqueta: "Ayuda", ruta: "/admin/ayuda", grupo: "Sitio y app" },
];

const TODAS: Accion[] = ["ver", "editar", "eliminar", "exportar"];
const LEER: Accion[] = ["ver", "exportar"];
const GESTIONAR: Accion[] = ["ver", "editar", "exportar"];

export type MatrizPermisos = Partial<Record<Seccion, Accion[]>>;

/** Roles del sistema: vienen con el panel, no se pueden editar ni eliminar (sí duplicar para partir de ellos). */
export const PERMISOS: Record<string, MatrizPermisos> = {
  Administrador: Object.fromEntries(SECCIONES.map((s) => [s.id, TODAS])),
  Catálogo: {
    dashboard: ["ver"],
    beneficios: TODAS, marcas: TODAS, ruleta: TODAS, codigos: TODAS, eventos: TODAS, preinscripciones: TODAS, contenido: TODAS, popups: TODAS, importaciones: GESTIONAR,
  },
  Operaciones: {
    dashboard: ["ver"],
    participantes: GESTIONAR, importaciones: GESTIONAR, pedidos: GESTIONAR, formulario: ["ver", "editar"],
  },
  Atención: {
    dashboard: ["ver"],
    atencion: GESTIONAR, participantes: ["ver", "editar"],
  },
  "Solo lectura": {
    dashboard: ["ver"], reportes: LEER,
  },
};

/**
 * Roles personalizados (los crea el administrador desde la página Roles). El servidor es quien los guarda; el panel los recibe con
 * `admin/meta` y los registra aquí para decidir qué mostrar. El servidor vuelve a comprobar cada petición.
 */
const personalizados = new Map<string, MatrizPermisos>();
export const esRolSistema = (rol: string) => Object.prototype.hasOwnProperty.call(PERMISOS, rol);
export const rolExiste = (rol: string) => esRolSistema(rol) || personalizados.has(rol);
/** Sustituye el registro por la lista que manda el servidor (solo cuenta lo que no es rol del sistema). */
export function registrarRoles(roles: { rol: string; matriz?: MatrizPermisos }[]) {
  const antes = JSON.stringify([...personalizados]);
  personalizados.clear();
  for (const r of roles) if (!esRolSistema(r.rol) && r.matriz) personalizados.set(r.rol, r.matriz);
  if (JSON.stringify([...personalizados]) !== antes) version.update((v) => v + 1);
}
/** Cambia cuando cambian los roles registrados: lo que dependa de `puede` (menú, avisos) se recalcula. */
const version = signal(0);
export const matrizDe = (rol: string): MatrizPermisos => {
  version(); // dependencia reactiva
  return (esRolSistema(rol) ? PERMISOS[rol] : personalizados.get(rol)) ?? {};
};

/** Deja solo secciones y acciones válidas; quien puede editar, eliminar o exportar necesariamente puede ver. */
export function normalizarMatriz(m: unknown): MatrizPermisos {
  const salida: MatrizPermisos = {};
  if (!m || typeof m !== "object") return salida;
  for (const s of SECCIONES) {
    const pedidas = (m as any)[s.id];
    if (!Array.isArray(pedidas)) continue;
    const ok = ACCIONES.map((a) => a.id).filter((a) => pedidas.includes(a));
    if (!ok.length) continue;
    salida[s.id] = ok.includes("ver") ? ok : ["ver", ...ok];
  }
  return salida;
}
/** Nombres de las secciones en las que el rol puede hacer algo (resumen para listas). */
export const resumenMatriz = (m: MatrizPermisos) => SECCIONES.filter((s) => (m[s.id]?.length ?? 0) > 0).map((s) => s.etiqueta);

/** La ayuda se puede ver siempre (cualquier rol, también los personalizados creados antes de existir); administrarla sí es un permiso. */
export const permisosDe = (rol: RolAdmin, seccion: Seccion): Accion[] => {
  const p = matrizDe(rol)[seccion] ?? [];
  return seccion === "ayuda" && !p.includes("ver") ? ["ver", ...p] : p;
};
export const puede = (rol: RolAdmin, seccion: Seccion, accion: Accion) => permisosDe(rol, seccion).includes(accion);

/** Sección a la que pertenece una ruta del panel ("/admin/pedidos?x=1" → "pedidos"). */
export function seccionDeRuta(url: string): Seccion | null {
  const p = url.split(/[?#]/)[0]!.replace(/\/$/, "") || "/admin";
  if (p === "/admin") return "dashboard";
  const s = SECCIONES.find((x) => x.ruta !== "/admin" && (p === x.ruta || p.startsWith(x.ruta + "/")));
  return s?.id ?? null;
}

/** Colección del API → sección (para exigir el permiso en admin/q|c/:colección). */
const COLECCION_A_SECCION: Record<string, Seccion> = {
  participantes: "participantes", pedidos: "pedidos", mensajes: "atencion", usuarios: "usuarios", auditoria: "auditoria",
  beneficios: "beneficios", categoriasBeneficio: "beneficios", lotes: "beneficios",
  banners: "contenido", onboarding: "contenido", seccionesHome: "contenido",
  campos: "formulario", marcas: "marcas", premios: "ruleta", giros: "ruleta", codigosPromo: "codigos", eventos: "eventos", preinscripciones: "preinscripciones", plantillasCorreo: "correos", correosEnviados: "correos", campanas: "correos", importaciones: "importaciones",
  popups: "popups", guias: "ayuda",
};

/**
 * Qué se exige para una petición `admin/...`: sección(es) aceptadas y acción. `null` = basta con haber ingresado
 * (consultas de apoyo que usan todas las pantallas, como el resumen, el catálogo de roles o las ejecutivas).
 */
export function requisitoApi(metodo: string, ruta: string, body?: any): { secciones: Seccion[]; accion: Accion } | null {
  const m = metodo.toUpperCase();
  const accion: Accion = m === "GET" ? "ver" : m === "DELETE" ? "eliminar" : "editar";
  const p = ruta.replace(/^\/?(api\/)?/, "").split("?")[0]!.split("/");
  if (p[0] !== "admin") return null;
  const q = p[1];
  if (q === "q" || q === "c") {
    const s = COLECCION_A_SECCION[p[2] ?? ""];
    // Escritura masiva = crear (alta masiva); lectura de colecciones de apoyo (marcas, ciudades, usuarios…) la usan varias pantallas.
    if (!s) return null;
    // Las guías completas (con borradores y las de otros roles) solo las ve quien puede administrarlas; cada rol lee las suyas en admin/ayuda.
    if (p[2] === "guias" && m === "GET") return { secciones: ["ayuda"], accion: "editar" };
    if (m === "GET" && ["marcas", "categoriasProducto", "categoriasBeneficio", "participantes", "usuarios", "lotes", "plantillasCorreo", "campos", "banners", "seccionesHome", "onboarding"].includes(p[2]!)) return null;
    return { secciones: [s], accion };
  }
  switch (q) {
    case "resumen": case "meta": case "auditoria": return null;
    case "reportes": return { secciones: ["reportes"], accion: "ver" };
    case "niveles": return { secciones: ["niveles"], accion };
    case "sitio": return { secciones: ["configuracion"], accion };
    case "config": return body && ("tenant" in body || "sitio" in body) ? { secciones: ["configuracion"], accion } : { secciones: ["contenido", "configuracion"], accion };
    case "participantes": return { secciones: ["participantes"], accion };
    case "importaciones": return { secciones: ["importaciones"], accion };
    case "lotes": return { secciones: ["beneficios"], accion };
    case "legales": return { secciones: ["legales"], accion };
    case "marcas": return { secciones: ["marcas"], accion };
    case "codigos-promo": return { secciones: ["codigos"], accion };
    case "roles": return { secciones: ["roles"], accion };
    case "correos": return { secciones: ["correos"], accion };
    default: return null;
  }
}

/** ¿Puede el rol hacer esta petición? (cualquiera de las secciones aceptadas sirve). */
export function puedeApi(rol: RolAdmin, metodo: string, ruta: string, body?: any): boolean {
  const r = requisitoApi(metodo, ruta, body);
  return !r || r.secciones.some((s) => puede(rol, s, r.accion));
}

export const nombreAccion: Record<Accion, string> = { ver: "ver", editar: "crear o editar", eliminar: "eliminar", exportar: "exportar" };