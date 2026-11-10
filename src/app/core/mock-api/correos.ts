import { db, persistDb } from "./db";
import { nivelPorPuntos } from "../format";
import { tokenBaja } from "./novedades";
import { ccoPara, bloquesDe, DISENO_BASE, MAX_INTENTOS_CORREO, PLANTILLAS_BASE, renderCorreoHtml, renderPlantilla, textoPlano, type CorreoEnviado, type EntornoCorreo } from "../correos";

/**
 * Registra (y "envía") un correo transaccional a partir de una plantilla del panel.
 * Si la plantilla está desactivada no se envía nada. Con un backend real aquí se llamaría al proveedor de correo.
 */
export function enviarCorreo(
  plantillaId: string,
  para: string | undefined,
  vars: Record<string, unknown>,
  extra: { destinatario?: string; participanteId?: string; referencia?: string } = {},
): CorreoEnviado | null {
  const pl = (db.admin.plantillasCorreo as any[]).find((x) => x.id === plantillaId);
  if (!pl) return null;
  // El aviso dentro del sitio es independiente del correo: se crea aunque el correo esté desactivado.
  crearNotificacion(pl, vars, extra);
  if ((!pl.activo && !pl.fija) || !para) return null;
  const marca: any = (db.config as any).tenant?.marca;
  const base = {
    programa: marca?.programa ?? "Banco Solidario Puntos",
    banco: marca?.nombre ?? "Banco Solidario",
    nombre: extra.destinatario ?? "",
    sitio: typeof location !== "undefined" ? location.origin : "",
    ...vars,
  };
  const bloques = bloquesDe(pl);
  const html = renderCorreoHtml(bloques, { ...DISENO_BASE, ...(db.admin.disenoCorreo as any) }, entornoCorreo(), base);
  const d = new Date();
  const mail: CorreoEnviado = {
    id: `ce${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
    plantillaId: pl.id,
    plantilla: pl.nombre,
    para,
    destinatario: extra.destinatario ?? "",
    asunto: renderPlantilla(pl.asunto, base),
    cuerpo: textoPlano(bloques, base),
    html,
    estado: "En cola",
    intentos: 0,
    proximoIntento: d.toISOString(),
    fechaISO: d.toISOString().slice(0, 10),
    fecha: d.toISOString().slice(0, 19).replace("T", " "),
    ...(extra.participanteId ? { participanteId: extra.participanteId } : {}),
    ...(extra.referencia ? { referencia: extra.referencia } : {}),
    // Los avisos internos del equipo no llevan copia oculta.
    ...(pl.interna ? {} : (() => { const cco = ccoPara((db.admin as any).ajustesCorreo, "sistema", para, pl); return cco.length ? { cco } : {}; })()),
  };
  (db.admin.correosEnviados as any[]).unshift(mail);
  if ((db.admin.correosEnviados as any[]).length > 5000) (db.admin.correosEnviados as any[]).length = 5000;
  programarCola();
  return mail;
}

/**
 * Correo con contenido propio (campañas): no sale de una plantilla del sistema sino de un asunto y un mensaje escritos en el panel.
 * Lleva el mismo diseño de marca y pasa por la misma cola de envío.
 */
export function enviarCorreoLibre(d: { plantilla: string; plantillaId: string; para: string; destinatario: string; participanteId?: string; asunto: string; mensaje: string; botonTexto?: string | undefined; botonUrl?: string | undefined; campanaId?: string; referencia?: string }): CorreoEnviado {
  const marca: any = (db.config as any).tenant?.marca;
  const sitio = typeof location !== "undefined" ? location.origin : "";
  // Todo correo de campaña lleva el enlace para darse de baja de las novedades.
  const bajaUrl = d.participanteId ? `${sitio}/baja?t=${tokenBaja(d.participanteId)}` : "";
  const base = { programa: marca?.programa ?? "", banco: marca?.nombre ?? "", nombre: d.destinatario, sitio, ...(bajaUrl ? { bajaUrl } : {}) };
  const bloques = bloquesDe({ asunto: d.asunto, cuerpo: d.mensaje, ...(d.botonTexto && d.botonUrl ? { boton: { texto: d.botonTexto, url: d.botonUrl } } : {}) });
  const ahora = new Date();
  const mail: CorreoEnviado = {
    id: `ce${Date.now()}${Math.random().toString(36).slice(2, 7)}`,
    plantillaId: d.plantillaId, plantilla: d.plantilla, para: d.para, destinatario: d.destinatario,
    asunto: renderPlantilla(d.asunto, base),
    cuerpo: textoPlano(bloques, base) + (bajaUrl ? `\n\nPara dejar de recibir novedades: ${bajaUrl}` : ""),
    html: renderCorreoHtml(bloques, { ...DISENO_BASE, ...(db.admin.disenoCorreo as any) }, entornoCorreo(), base),
    estado: "En cola", intentos: 0, proximoIntento: ahora.toISOString(),
    fechaISO: ahora.toISOString().slice(0, 10), fecha: ahora.toISOString().slice(0, 19).replace("T", " "),
    ...(d.participanteId ? { participanteId: d.participanteId } : {}), ...(d.referencia ? { referencia: d.referencia } : {}), ...(d.campanaId ? { campanaId: d.campanaId } : {}),
    ...(() => { const cco = ccoPara((db.admin as any).ajustesCorreo, "campana", d.para); return cco.length ? { cco } : {}; })(),
  };
  (db.admin.correosEnviados as any[]).unshift(mail);
  // Una campaña grande no debe truncar el historial reciente: el tope de la lista es mayor que el de los correos del sistema.
  if ((db.admin.correosEnviados as any[]).length > 5000) (db.admin.correosEnviados as any[]).length = 5000;
  programarCola();
  return mail;
}

/* ------------------------------------------------------------------ */
/* Cola de envío (simula al proveedor de correo)                       */
/* ------------------------------------------------------------------ */
/**
 * Un correo nace "En cola" y el proveedor lo entrega después. Para poder probar todos los estados, el resultado depende de la dirección:
 *  - contiene "rebote" o termina en ".invalid"  → Rebotado (el buzón no existe; no se reintenta);
 *  - contiene "falla"                            → falla siempre: se reintenta y, agotados los intentos, queda Fallido;
 *  - contiene "reintento"                        → falla la primera vez y se entrega en el segundo intento;
 *  - cualquier otra                              → Enviado.
 */
function intentarEnvio(m: any, ahora: Date) {
  const para = String(m.para).toLowerCase();
  m.intentos = (m.intentos ?? 0) + 1;
  if (/rebote|\.invalid$/.test(para)) {
    m.estado = "Rebotado";
    m.error = "El buzón no existe (rebote permanente)";
    delete m.proximoIntento;
    return;
  }
  const falla = para.includes("falla") || (para.includes("reintento") && m.intentos < 2);
  if (!falla) {
    m.estado = "Enviado";
    m.error = "";
    delete m.proximoIntento;
    return;
  }
  m.error = "Error temporal del proveedor de correo";
  if (m.intentos >= MAX_INTENTOS_CORREO) {
    m.estado = "Fallido";
    m.error = `El proveedor no respondió tras ${MAX_INTENTOS_CORREO} intentos`;
    delete m.proximoIntento;
  } else {
    m.estado = "Reintentando";
    m.proximoIntento = new Date(ahora.getTime() + m.intentos * 1500).toISOString(); // espera creciente
  }
}

/** Procesa los envíos pendientes cuyo momento ya llegó. Devuelve cuántos cambió. */
export function procesarCola(): number {
  const ahora = new Date();
  let n = 0;
  for (const m of db.admin.correosEnviados as any[]) {
    if ((m.estado === "En cola" || m.estado === "Reintentando") && new Date(m.proximoIntento ?? 0).getTime() <= ahora.getTime()) {
      intentarEnvio(m, ahora);
      n++;
    }
  }
  return n;
}

let temporizador: ReturnType<typeof setTimeout> | undefined;
/** Si quedan envíos pendientes, los procesa más tarde (el proveedor real los entrega por su cuenta). */
function programarCola() {
  if (typeof window === "undefined" || temporizador) return;
  const pendientes = (db.admin.correosEnviados as any[]).filter((m) => m.estado === "En cola" || m.estado === "Reintentando");
  if (!pendientes.length) return;
  const siguiente = Math.min(...pendientes.map((m) => new Date(m.proximoIntento ?? 0).getTime()));
  temporizador = setTimeout(() => {
    temporizador = undefined;
    if (procesarCola()) persistDb();
    programarCola();
  }, Math.max(400, siguiente - Date.now() + 100));
}

/** Vuelve a poner en cola un envío fallido (reintento manual desde el panel). */
export function reintentarCorreo(m: any) {
  m.estado = "En cola";
  m.intentos = 0;
  m.error = "";
  m.proximoIntento = new Date().toISOString();
  programarCola();
}

/**
 * Aviso dentro del sitio (campanita) del participante. Solo hay sitio para la participante demo (p1);
 * en un backend real cada participante tendría el suyo. Las alertas internas no generan aviso.
 */
function crearNotificacion(pl: any, vars: Record<string, unknown>, extra: { destinatario?: string; participanteId?: string; referencia?: string }) {
  const cfg = pl.notificar ?? PLANTILLAS_BASE.find((x) => x.id === pl.id)?.notificar;
  if (!cfg?.activo || pl.interna || !extra.participanteId) return;
  const marca: any = (db.config as any).tenant?.marca;
  const base = { programa: marca?.programa ?? "", banco: marca?.nombre ?? "", nombre: extra.destinatario ?? "", ...vars };
  const enlace = renderPlantilla(cfg.enlace ?? "", base).trim();
  const lista = ((db as any).notificaciones ??= []) as any[];
  lista.unshift({
    id: `n${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
    participanteId: extra.participanteId,
    tipo: cfg.tipo,
    titulo: renderPlantilla(cfg.titulo, base),
    texto: renderPlantilla(cfg.texto, base),
    ...(enlace.startsWith("/") ? { enlace } : {}),
    fecha: new Date().toISOString(), // con zona horaria (Z): el sitio calcula "hace X" correctamente
    leida: false,
  });
  if (lista.length > 300) lista.length = 300;
}

/** Datos de la marca que usa el diseño de los correos. */
export function entornoCorreo(): EntornoCorreo {
  const t: any = (db.config as any).tenant;
  return {
    logoClaro: t?.marca?.logoClaro ?? "",
    logoOscuro: t?.marca?.logoOscuro ?? "",
    primario: t?.tema?.primario ?? "#00bdd2",
    textoPrimario: t?.tema?.textoPrimario ?? "#ffffff",
    fuente: t?.tema?.fuente ?? "",
    programa: t?.marca?.programa ?? "Banco Solidario Puntos",
    banco: t?.marca?.nombre ?? "Banco Solidario",
    redes: ((db.config.sitio as any)?.redes ?? {}) as Record<string, string | undefined>,
  };
}

/** Alta de un participante (bienvenida) o de un usuario del panel (invitación). */
export function avisarAlta(coleccion: string, item: any) {
  if (coleccion === "participantes" && item?.email) {
    enviarCorreo("bienvenida", item.email, {}, { destinatario: item.nombre, participanteId: item.id });
  } else if (coleccion === "usuarios" && item?.email) {
    enviarCorreo("admin-invitacion", item.email, { rol: item.rol ?? "" }, { destinatario: item.nombre, referencia: item.rol });
  }
}

/** Cambio de nivel de la participante demo cuando su saldo cruza un umbral. */
export function avisarNivel(antes: number, despues: number) {
  const niveles = (db as any).niveles;
  if (!niveles?.length) return;
  const a = nivelPorPuntos(niveles, antes);
  const n = nivelPorPuntos(niveles, despues);
  if (a.id !== n.id) {
    const p: any = db.admin.participantes.find((x: any) => x.id === "p1");
    enviarCorreo("nivel-cambio", p?.email ?? db.perfil.correo, { nivel: n.nombre ?? n.id }, { destinatario: p?.nombre ?? db.usuario.nombre, participanteId: "p1", referencia: n.nombre ?? n.id });
  }
}

/** Avisa al equipo (una sola vez por lote) cuando quedan pocos códigos sin usar. */
export const UMBRAL_LOTE = 10;
export function alertaLote(lote: any) {
  const restantes = lote.total - lote.usados;
  if (restantes > UMBRAL_LOTE || lote.alertado) return;
  lote.alertado = true;
  enviarCorreo("lote-alerta", (db.config.sitio as any).correoSoporte, { beneficio: lote.beneficio, restantes }, { destinatario: "Equipo", referencia: lote.beneficio });
}

/**
 * Puntos que se vencen en los próximos `dias` días. Cada acumulación vence a los `reglas.vigenciaMeses` meses (24 por defecto).
 * En un backend real lo ejecuta un proceso diario; aquí se lanza a mano desde Correos.
 */
export function avisarPuntosPorVencer(dias?: number) {
  const reglas = db.admin.reglas as any;
  dias = dias || Number(reglas?.avisoVencimientoDias) || 30;
  const meses = Number(reglas?.vigenciaMeses) || 24;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const limite = new Date(hoy.getTime() + dias * 864e5);
  const porPersona = new Map<string, { puntos: number; vence: Date }>();
  for (const m of db.admin.movimientos as any[]) {
    if (!(m.puntos > 0) || !m.cliente) continue;
    const v = new Date(m.fechaISO + "T00:00:00");
    v.setMonth(v.getMonth() + meses);
    if (v < hoy || v > limite) continue;
    const p = porPersona.get(m.cliente);
    porPersona.set(m.cliente, { puntos: (p?.puntos ?? 0) + m.puntos, vence: p && p.vence < v ? p.vence : v });
  }
  let enviados = 0;
  for (const [cliente, x] of porPersona) {
    const part: any = db.admin.participantes.find((p: any) => p.nombre === cliente);
    if (!part || part.estado === "Bloqueado") continue;
    if (enviarCorreo("puntos-por-vencer", part.email, { puntos: x.puntos.toLocaleString("es"), fecha: x.vence.toLocaleDateString("es-EC") }, { destinatario: part.nombre, participanteId: part.id })) enviados++;
  }
  return { enviados };
}
