import { estadoVigencia } from "./cupones";
import { errorLargo } from "./limites";

/**
 * Pop-ups del sitio y de la app: mensajes que se muestran por encima del contenido, con vigencia, frecuencia y contenido distinto
 * para web y app. Funciones puras que comparten el panel, el sitio y el servidor simulado.
 */
export type CanalPopup = "web" | "app";
export type FrecuenciaPopup = "sesion" | "una_vez" | "siempre" | "dias";

/** Contenido de un pop-up en un canal. Un canal sin variante activa no muestra el pop-up. */
export interface VariantePopup {
  activo: boolean;
  /** "mixto" (por defecto): imagen opcional, título, mensaje y botón. "imagen": la imagen es todo el pop-up (clicable si tiene enlace) y el título es su texto alternativo. */
  formato?: "mixto" | "imagen" | undefined;
  titulo: string;
  mensaje: string;
  imagen?: string | undefined;
  /** Texto del botón y a dónde lleva (ruta interna "/beneficios" o https://…). Van juntos o ninguno. */
  boton?: string | undefined;
  enlace?: string | undefined;
}

export interface Popup {
  id: string;
  /** Nombre interno (solo lo ve el panel). */
  nombre: string;
  activo: boolean;
  /** Vigencia AAAA-MM-DD, inclusiva; vacío = sin límite por ese lado. */
  desde?: string | undefined;
  hasta?: string | undefined;
  web?: VariantePopup | undefined;
  app?: VariantePopup | undefined;
  frecuencia: FrecuenciaPopup;
  /** Cada cuántos días vuelve a salir (frecuencia "dias"). */
  dias?: number | undefined;
  /** Dónde sale: solo en el inicio o en cualquier página. */
  paginas: "inicio" | "todas";
  /** Si hay varios vigentes, sale primero el de mayor prioridad (0–99). */
  prioridad: number;
  vistas?: { web: number; app: number } | undefined;
  clics?: { web: number; app: number } | undefined;
}

/** Lo que recibe el sitio o la app: solo el contenido del canal y lo que hace falta para decidir cuándo mostrarlo. */
export interface PopupPublico {
  id: string;
  formato: "mixto" | "imagen";
  titulo: string;
  mensaje: string;
  imagen?: string | undefined;
  boton?: string | undefined;
  enlace?: string | undefined;
  frecuencia: FrecuenciaPopup;
  dias?: number | undefined;
  paginas: "inicio" | "todas";
}

export const variantePopupVacia = (): VariantePopup => ({ activo: true, titulo: "", mensaje: "" });
export const popupVacio = (): Popup => ({ id: "", nombre: "", activo: true, web: variantePopupVacia(), frecuencia: "sesion", paginas: "inicio", prioridad: 50 });

const enlaceValido = (e: string) => /^\/[A-Za-z0-9\-._~/?#=&%]*$/.test(e) || /^https:\/\/[^\s.]+\.[^\s]+$/i.test(e);
const fecha = /^\d{4}-\d{2}-\d{2}$/;

function errorVariante(v: VariantePopup | undefined, canal: string): string {
  if (!v?.activo) return "";
  const c = canal === "web" ? "En la web" : "En la app";
  const soloImagen = v.formato === "imagen";
  if (!v.titulo.trim()) return soloImagen ? `${c}: escribe el título (se usa como texto alternativo de la imagen).` : `${c}: escribe el título.`;
  const l = errorLargo(v.titulo, "titulo", `${c}: el título`) || errorLargo(v.mensaje, "mensaje", `${c}: el mensaje`) || errorLargo(v.boton ?? "", "etiqueta", `${c}: el texto del botón`) || errorLargo(v.enlace ?? "", "url", `${c}: el enlace`);
  if (l) return l;
  if (soloImagen && !v.imagen) return `${c}: sube la imagen (en el formato «solo imagen» es todo el pop-up).`;
  if (!v.mensaje.trim() && !v.imagen) return `${c}: escribe un mensaje o agrega una imagen.`;
  const b = soloImagen ? "" : (v.boton ?? "").trim();
  const e = (v.enlace ?? "").trim();
  if (b && !e) return `${c}: el botón necesita un enlace.`;
  if (e && !b && !soloImagen) return `${c}: el enlace necesita el texto del botón.`;
  if (e && !enlaceValido(e)) return `${c}: el enlace debe ser una ruta como /beneficios o una dirección https://…`;
  return "";
}

/** Valida un pop-up. Devuelve el primer error o cadena vacía. */
export function errorPopup(p: Popup): string {
  if (!p.nombre.trim()) return "Escribe el nombre del pop-up.";
  const n = errorLargo(p.nombre, "nombre", "El nombre");
  if (n) return n;
  if (p.desde && !fecha.test(p.desde)) return "La fecha de inicio no es válida.";
  if (p.hasta && !fecha.test(p.hasta)) return "La fecha de fin no es válida.";
  if (p.desde && p.hasta && p.hasta < p.desde) return "La fecha de fin no puede ser anterior a la de inicio.";
  if (!p.web?.activo && !p.app?.activo) return "Activa el contenido de la web, de la app o de ambas.";
  const v = errorVariante(p.web, "web") || errorVariante(p.app, "app");
  if (v) return v;
  if (p.frecuencia === "dias" && (!Number.isInteger(p.dias) || (p.dias ?? 0) < 1 || (p.dias ?? 0) > 365)) return "Indica cada cuántos días vuelve a salir (1 a 365).";
  if (!Number.isInteger(p.prioridad) || p.prioridad < 0 || p.prioridad > 99) return "La prioridad debe ser un número de 0 a 99.";
  return "";
}

/** Estado según la vigencia (los pausados se muestran aparte). */
export const estadoPopup = (p: Pick<Popup, "desde" | "hasta">, hoyIso: string) => estadoVigencia(p, hoyIso);

/** Contenido de un pop-up para un canal (o `undefined` si ese canal no lo muestra). */
export function publicoDe(p: Popup, canal: CanalPopup): PopupPublico | undefined {
  const v = p[canal];
  if (!p.activo || !v?.activo) return undefined;
  return { id: p.id, formato: v.formato ?? "mixto", titulo: v.titulo, mensaje: v.mensaje, imagen: v.imagen, boton: v.boton, enlace: v.enlace, frecuencia: p.frecuencia, dias: p.dias, paginas: p.paginas };
}

/**
 * Pop-ups que están vigentes hoy para un canal y una página, el de mayor prioridad primero (a igual prioridad, el más reciente
 * en la lista). `pagina` "inicio" incluye los que salen solo en el inicio y los de todas las páginas.
 */
export function popupsVisibles(lista: Popup[], canal: CanalPopup, hoyIso: string, pagina: "inicio" | "otra"): PopupPublico[] {
  return lista
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => estadoPopup(p, hoyIso) === "vigente" && (p.paginas === "todas" || pagina === "inicio"))
    .sort((a, b) => b.p.prioridad - a.p.prioridad || a.i - b.i)
    .map(({ p }) => publicoDe(p, canal))
    .filter((x): x is PopupPublico => !!x);
}

/** Lo que el navegador (o la app) recuerda de cada pop-up para respetar la frecuencia. */
export type HistorialPopups = Record<string, { ultima?: number; vistas?: number }>;

/**
 * ¿Toca mostrarlo ahora? `sesion`: una vez por sesión (`vistosEnSesion`); `una_vez`: una sola vez; `dias`: de nuevo pasados N días
 * desde la última vez; `siempre`: cada vez que se abre una página donde sale.
 */
export function debeMostrar(p: Pick<PopupPublico, "id" | "frecuencia" | "dias">, historial: HistorialPopups, ahora: number, vistosEnSesion: ReadonlySet<string>): boolean {
  const h = historial[p.id];
  switch (p.frecuencia) {
    case "siempre": return true;
    case "sesion": return !vistosEnSesion.has(p.id);
    case "una_vez": return !h?.ultima;
    case "dias": return !h?.ultima || ahora - h.ultima >= (p.dias ?? 1) * 86_400_000;
  }
}

export const ETIQUETA_FRECUENCIA: Record<FrecuenciaPopup, string> = {
  sesion: "Una vez por sesión",
  una_vez: "Una sola vez por persona",
  siempre: "Cada vez que se abre la página",
  dias: "Cada cierto número de días",
};

/** Ejemplo con el que arranca el panel: está pausado para no mostrarse a los participantes hasta que alguien lo active. */
export const POPUPS_INICIALES: Popup[] = [
  {
    id: "popup-bienvenida", nombre: "Bienvenida a la nueva experiencia (ejemplo)", activo: false, frecuencia: "sesion", paginas: "inicio", prioridad: 50,
    web: { activo: true, titulo: "¡Bienvenido!", mensaje: "Descubre los nuevos beneficios y productos que tenemos para ti.", boton: "Ver beneficios", enlace: "/beneficios" },
    app: { activo: true, titulo: "¡Bienvenido a la app!", mensaje: "Canjea tus puntos y genera tus cupones desde el celular.", boton: "Ver beneficios", enlace: "/beneficios" },
    vistas: { web: 0, app: 0 }, clics: { web: 0, app: 0 },
  },
];
