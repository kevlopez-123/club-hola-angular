import {
  debeAceptar, NOMBRE_LEGAL, TIPOS_LEGALES, versionEnVigor, versionProgramada,
  type AceptacionLegal, type DocLegal, type EstadoLegalesParticipante, type PendienteLegal, type ResumenLegal, type TipoLegal, type VersionLegal,
} from "../legales";
import { contexto } from "./contexto";
import { db } from "./db";
import { ApiError } from "./types";

/** Fecha de hoy (aaaa-mm-dd): con ella se decide qué versión rige y cuándo entra una programada. */
export const hoyISO = () => new Date().toISOString().slice(0, 10);

const legales = () => (db as any).legales as Record<TipoLegal, DocLegal>;
const aceptaciones = () => ((db as any).aceptaciones ??= {}) as Record<string, Partial<Record<TipoLegal, AceptacionLegal>>>;
/** Nombre del usuario del panel que hace la petición (para firmar publicaciones y borradores). */
export const usuarioPanel = () => ((db.admin.usuarios as any[]).find((u) => u.id === contexto.usuarioPanelId)?.nombre as string | undefined) ?? "Panel";
export const tipoDe = (t: unknown): TipoLegal => {
  if (t === "terminos" || t === "privacidad") return t;
  throw new ApiError(404, "Ese texto legal no existe.");
};

/** El sitio lee el texto vigente de `config.contenido`: se mantiene al día con la versión que rige hoy (también cuando llega la fecha de una programada). */
export function sincronizarContenido() {
  const c = (db.config as any).contenido;
  for (const t of TIPOS_LEGALES) {
    const v = versionEnVigor(legales()[t], hoyISO());
    if (!v) continue;
    if (c[t] !== v.texto) c[t] = v.texto;
    const clave = `${t}Intro`;
    if ((c[clave] ?? "") !== v.intro) c[clave] = v.intro;
  }
}

/** Datos públicos de versión (para mostrar "versión N · vigente desde…" en las páginas legales). */
export function metaLegales() {
  return Object.fromEntries(TIPOS_LEGALES.map((t) => {
    const v = versionEnVigor(legales()[t], hoyISO());
    return [t, { version: v?.version ?? 0, vigenteDesde: v?.vigenteDesde ?? "" }];
  }));
}

/* ---------------- Participante ---------------- */
export function estadoParticipante(id: string): EstadoLegalesParticipante {
  const hoy = hoyISO();
  const acs = aceptaciones()[id] ?? {};
  const pendientes: PendienteLegal[] = [];
  const vigentes = {} as EstadoLegalesParticipante["vigentes"];
  for (const t of TIPOS_LEGALES) {
    const v = versionEnVigor(legales()[t], hoy);
    if (!v) continue;
    vigentes[t] = { version: v.version, vigenteDesde: v.vigenteDesde };
    const ac = acs[t];
    if (debeAceptar(v, ac)) pendientes.push({ tipo: t, nombre: NOMBRE_LEGAL[t], version: v.version, vigenteDesde: v.vigenteDesde, notas: v.notas, texto: v.texto, intro: v.intro, primera: !ac });
  }
  return { pendientes, aceptadas: acs, vigentes };
}

export function aceptar(id: string, body: any, canal = "Web"): EstadoLegalesParticipante {
  const lista: { tipo: unknown; version: unknown }[] = Array.isArray(body?.aceptaciones) ? body.aceptaciones : [{ tipo: body?.tipo, version: body?.version }];
  if (!lista.length) throw new ApiError(422, "Indica qué texto aceptas.");
  const hoy = hoyISO();
  for (const a of lista) {
    const t = tipoDe(a.tipo);
    const v = versionEnVigor(legales()[t], hoy);
    if (!v || v.version !== Number(a.version)) throw new ApiError(409, `La versión de ${NOMBRE_LEGAL[t]} cambió: recarga para leer la vigente.`);
    (aceptaciones()[id] ??= {})[t] = { version: v.version, fecha: new Date().toISOString(), canal };
  }
  return estadoParticipante(id);
}

/** Acciones que exigen tener al día los textos legales (canje y compra de puntos). */
export function exigirLegalesAlDia(id: string) {
  const p = estadoParticipante(id).pendientes;
  if (p.length) throw new ApiError(403, `Antes de continuar debes aceptar ${p.map((x) => `${x.nombre} (versión ${x.version})`).join(" y ")}.`);
}

/* ---------------- Panel ---------------- */
export function resumen(tipo: TipoLegal): ResumenLegal {
  const doc = legales()[tipo];
  const hoy = hoyISO();
  const vigente = versionEnVigor(doc, hoy) ?? null;
  const activos = (db.admin.participantes as any[]).filter((p) => p.estado === "Activo");
  const acs = aceptaciones();
  const pendientes = vigente ? activos.filter((p) => debeAceptar(vigente, acs[p.id]?.[tipo])).length : 0;
  return {
    tipo, nombre: NOMBRE_LEGAL[tipo], vigente, programada: versionProgramada(doc, hoy) ?? null,
    versiones: [...doc.versiones].sort((a, b) => b.version - a.version), borrador: doc.borrador,
    aceptaron: activos.length - pendientes, pendientes, total: activos.length,
  };
}
export const resumenes = () => Object.fromEntries(TIPOS_LEGALES.map((t) => [t, resumen(t)]));

export function guardarBorrador(tipo: TipoLegal, body: any, usuario: string) {
  const texto = String(body?.texto ?? "");
  if (texto.length > 200_000) throw new ApiError(422, "El texto es demasiado largo.");
  legales()[tipo].borrador = {
    texto, intro: String(body?.intro ?? "").slice(0, 300), notas: String(body?.notas ?? "").slice(0, 1000),
    exigeAceptacion: false, vigenteDesde: /^\d{4}-\d{2}-\d{2}$/.test(String(body?.vigenteDesde)) ? String(body.vigenteDesde) : hoyISO(),
    actualizadoEl: new Date().toISOString(), por: usuario,
  };
  return resumen(tipo);
}
export function descartarBorrador(tipo: TipoLegal) {
  legales()[tipo].borrador = null;
  return resumen(tipo);
}
export function restaurar(tipo: TipoLegal, version: number, usuario: string) {
  const v = legales()[tipo].versiones.find((x) => x.version === version);
  if (!v) throw new ApiError(404, "Esa versión no existe.");
  return guardarBorrador(tipo, { texto: v.texto, intro: v.intro, notas: `Basada en la versión ${v.version}. `, vigenteDesde: hoyISO() }, usuario);
}

/** Cuántas personas recibirían el aviso de una publicación que exige aceptación (participantes activos con correo). */
export const aAvisar = () => (db.admin.participantes as any[]).filter((p) => p.estado === "Activo" && p.email).length;

export function publicar(tipo: TipoLegal, body: any, usuario: string) {
  const doc = legales()[tipo];
  const texto = String(body?.texto ?? "").trim();
  const notas = String(body?.notas ?? "").trim();
  const hoy = hoyISO();
  const vigenteDesde = String(body?.vigenteDesde ?? hoy);
  if (!texto) throw new ApiError(422, "El texto no puede estar vacío.");
  if (notas.length < 10) throw new ApiError(422, "Explica en pocas palabras qué cambió (mínimo 10 caracteres): queda en el historial.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(vigenteDesde) || vigenteDesde < hoy) throw new ApiError(422, "La fecha de vigencia no puede ser anterior a hoy.");
  const actual = [...doc.versiones].sort((a, b) => b.version - a.version)[0];
  if (actual && actual.texto.trim() === texto && actual.intro === String(body?.intro ?? "")) throw new ApiError(422, "No hay cambios respecto a la última versión publicada.");
  if (doc.versiones.some((v) => v.vigenteDesde > hoy) && vigenteDesde > hoy) throw new ApiError(409, "Ya hay una versión programada: espera a que entre en vigor o publica con fecha de hoy.");
  const v: VersionLegal = {
    version: (actual?.version ?? 0) + 1, texto, intro: String(body?.intro ?? "").slice(0, 300), notas, exigeAceptacion: false,
    vigenteDesde, publicadaEl: new Date().toISOString(), publicadaPor: usuario,
  };
  doc.versiones.push(v);
  doc.borrador = null;
  sincronizarContenido();
  // Los participantes ya registraron su aceptación en el primer ingreso: una versión nueva no se vuelve a pedir ni se les avisa por correo.
  return { ...resumen(tipo), avisados: 0 };
}
