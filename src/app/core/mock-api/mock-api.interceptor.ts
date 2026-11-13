import { HttpErrorResponse, HttpInterceptorFn, HttpRequest, HttpResponse } from "@angular/common/http";
import { Observable, of, throwError, timer } from "rxjs";
import { mergeMap } from "rxjs/operators";
import { db, persistDb } from "./db";
import { adminRoutes } from "./admin-routes";
import { ApiError, type Route } from "./types";
import { codigoAleatorio } from "../format";
import { provinciasDe } from "../../tenants/presets";
import { erroresPerfil } from "../validar-perfil";
import { erroresDireccion } from "../validar-direccion";
import { legalAMarkdown } from "../markdown";
import { aplicarPromo } from "../promo";
import { popupsPublicos, registrarEventoPopup } from "./popups";
import { ofuscarDocumento } from "../documento";
import { bannersPara } from "./banners";
import { disponibleEn, estadoVigencia, evaluarCanje, fechaLarga, listaTexto, reglaDe, type ReglaCupon } from "../cupones";
import { alertaLote, avisarNivel, enviarCorreo } from "./correos";
import { nombreAccion, puedeApi, requisitoApi, rolExiste } from "../permisos";
import { registrarDesdeDb as registrarRolesDesdeDb } from "./roles";
import { capturar, registrar, registrarAcceso } from "./auditoria";
import { registrarEvento } from "./analitica";
import { contexto } from "./contexto";
import { aceptar, estadoParticipante, exigirLegalesAlDia, metaLegales, sincronizarContenido } from "./legales";
import { cambiarNovedades, darDeBaja, estadoBaja, recibeNovedades, volverAlta } from "./novedades";
import { asegurarVersiones, comprobarVersion, subirVersion } from "./versiones";
import type { RolAdmin } from "../models";
import { lunesDe } from "../juegos";
import { esPasado, ocupaCupo } from "../eventos";
import { ajustarCupos, codigoEvento } from "./eventos-api";
import { tieneAcceso } from "./seed/niveles";

/** Aplica la promoción vigente de un beneficio. */
function conPromo<T extends { precio?: number | undefined }>(p: T): T {
  return aplicarPromo(p as any);
}
import type { Compra, CompraItem, Direccion } from "../models";

const notFound = (what: string) => new ApiError(404, `${what} no encontrado`);

const hoy = () => {
  const d = new Date();
  return {
    iso: d.toISOString().slice(0, 10),
    txt: d.toLocaleDateString("es-EC", { day: "2-digit", month: "2-digit", year: "numeric" }),
  };
};

/** Nombre del participante que ingresó al sitio (su ficha comparte saldo con la sesión). */
const nombreParticipante = () => (db.admin.participantes.find((p: any) => p.id === "p1") as any)?.nombre ?? db.usuario.nombre;


/** Ficha del panel de la participante demo (comparte datos con su sesión). */
/** El servidor valida las direcciones igual que el formulario. */
const validarDireccion = (d: any) => {
  const pais = (db.config.tenant as any).pais;
  const conEnvio = provinciasDe(pais.codigo, pais.provincias).filter((p) => p.envio).map((p) => p.nombre);
  const primero = Object.values(erroresDireccion(d ?? {}, pais, conEnvio))[0];
  if (primero) throw new ApiError(422, primero);
};
const fichaDemo = () => (db.admin.participantes as any[]).find((p) => p.id === "p1") ?? (() => { throw notFound("Participante"); })();

/** Una cuenta bloqueada desde el admin no puede ingresar ni canjear. */
const exigirCuentaActiva = () => {
  if (db.admin.participantes.find((p: any) => p.id === "p1")?.estado === "Bloqueado") {
    throw new ApiError(403, "Tu cuenta está bloqueada. Comunícate con atención al cliente.");
  }
};

/** Provincia que el participante indicó en Mis datos (el campo del formulario con el mapeo "provincia"). */
const provinciaParticipante = (): string | undefined => {
  const campo = (db.admin.campos as any[]).find((c) => c.mapeo === "provincia");
  if (!campo) return undefined;
  const v = ((db.perfil as any).extra ?? {})[campo.id] ?? ((fichaDemo() as any).extra ?? {})[campo.id];
  return v ? String(v) : undefined;
};

/** Momento de un canje (cupón generado): `ts` si lo trae; los antiguos solo traen la fecha "dd/mm/aaaa". */
const tsDeCanje = (m: any): number => {
  if (typeof m.ts === "number") return m.ts;
  const [d = "1", mo = "1", a = "1970"] = String(m.fecha).split("/");
  return new Date(+a, +mo - 1, +d, 12).getTime();
};

export type EstadoCanjeApi = {
  estado: "disponible" | "nivel" | "no_vigente" | "otra_provincia" | "falta_provincia" | "bloqueado" | "agotado";
  mensaje: string;
  regla: ReglaCupon;
  desde?: string;
  hasta?: string;
  /** Con espera: desde cuándo se puede volver a canjear (ms). */
  disponibleDesde?: number;
  /** Canjes que quedan antes de la espera (solo si el beneficio tiene límite). */
  restantes?: number;
};

/**
 * Qué reglas aplican a este participante y este beneficio ahora: vigencia, provincia, límite de canjes con espera desde el
 * último canje y tope del código compartido. Es lo que decide `POST me/cupones` y lo que lee la ficha para avisar antes de pulsar.
 */
/** ¿El nivel del participante demo alcanza el mínimo que pide el beneficio? */
const accesoPorNivel = (minimo?: string) => tieneAcceso(db.niveles as any[], db.usuario.nivel, minimo);

const estadoCanje = (beneficioId: string): EstadoCanjeApi => {
  const b = (db.admin.beneficios as any[]).find((x) => x.id === beneficioId);
  const regla = reglaDe(b?.cupon, db.config.cupon as any);
  if (!b) return { estado: "disponible", mensaje: "", regla };
  if (!accesoPorNivel(b.nivelMinimo)) return { regla, estado: "nivel", mensaje: `Este beneficio está disponible desde el nivel ${b.nivelMinimo}. Tu nivel actual es ${db.usuario.nivel}.` };
  const base = { regla, ...(b.desde ? { desde: b.desde } : {}), ...(b.hasta ? { hasta: b.hasta } : {}) };
  const vig = estadoVigencia(b, hoy().iso);
  if (vig === "programado") return { ...base, estado: "no_vigente", mensaje: `Este beneficio estará disponible desde el ${fechaLarga(b.desde)}.` };
  if (vig === "vencido") return { ...base, estado: "no_vigente", mensaje: `Este beneficio venció el ${fechaLarga(b.hasta)}.` };
  const prov = provinciaParticipante();
  const disp = disponibleEn(b.provincias, prov);
  if (disp === "no") return { ...base, estado: "otra_provincia", mensaje: `Este beneficio solo está disponible en ${listaTexto(b.provincias)}. Tu provincia (${prov}) no está incluida.` };
  if (disp === "desconocida") return { ...base, estado: "falta_provincia", mensaje: `Este beneficio solo está disponible en ${listaTexto(b.provincias)}. Indica tu provincia en Mis datos para canjearlo.` };
  const canjes = (db.misBeneficios as any[]).filter((m) => m.beneficioId === beneficioId).map(tsDeCanje);
  const ev = evaluarCanje(canjes, regla, Date.now());
  if (!ev.permitido) return { ...base, estado: "bloqueado", mensaje: `Ya canjeaste este beneficio${regla.limite > 1 ? ` ${regla.limite} veces` : ""}. Podrás volver a canjearlo el ${new Date(ev.hasta!).toLocaleDateString("es-EC", { day: "2-digit", month: "2-digit", year: "numeric" })}.`, disponibleDesde: ev.hasta! };
  if (b.modoCodigo === "compartido" && b.usosMaximos > 0 && (b.usos ?? 0) >= b.usosMaximos) return { ...base, estado: "agotado", mensaje: "Los cupones de este beneficio se agotaron." };
  return { ...base, estado: "disponible", mensaje: "", ...(ev.restantes !== undefined ? { restantes: ev.restantes } : {}) };
};

/** Beneficio como lo ve el participante: sin el código compartido ni los contadores internos, con la regla efectiva del cupón y su vigencia. */
const beneficioPublico = (b: any) => {
  const { codigoCompartido: _c, usos: _u, usosMaximos: _m, cupon: _r, modoCodigo: _mc, ...resto } = conPromo(b) as any;
  return { ...resto, vigencia: estadoVigencia(b, hoy().iso), reglaCupon: reglaDe(b.cupon, db.config.cupon as any) };
};

/** Giros de la ruleta de la participante demo en la semana actual. */
const estadoRuleta = () => {
  const max = Number((db.config as any).juegos?.girosMax ?? 3);
  const lunes = lunesDe(hoy().iso);
  const usados = (db.admin.giros as any[]).filter((g) => g.origen === "ruleta" && g.participanteId === "p1" && g.fechaISO >= lunes).length;
  const prox = new Date(`${lunes}T12:00:00Z`);
  prox.setUTCDate(prox.getUTCDate() + 7);
  const txt = `${String(prox.getUTCDate()).padStart(2, "0")}/${String(prox.getUTCMonth() + 1).padStart(2, "0")}/${prox.getUTCFullYear()}`;
  return {
    girosMax: max, usados, restantes: Math.max(0, max - usados), proximaFecha: txt,
    premios: (db.admin.premios as any[]).filter((p) => p.activo && p.enRuleta).map((p) => ({ id: p.id, label: p.label, tipo: p.tipo })),
  };
};
/** Deja constancia de lo jugado y, si hubo premio, lo envía al correo de entrega. */
const registrarJuego = (premio: any, origen: "ruleta" | "codigo") => {
  const h = hoy();
  (db.admin.giros as any[]).unshift({
    id: `g${Date.now()}${Math.random().toString(36).slice(2, 5)}`, participanteId: "p1", participante: nombreParticipante(),
    premio: premio.label, tipo: premio.tipo, origen, fecha: h.txt, fechaISO: h.iso, hora: new Date().toTimeString().slice(0, 5),
  });
  if (premio.tipo !== "nada") enviarCorreo("premio-ganado", db.perfil.correo, { premio: premio.label, detalle: premio.detalle }, { destinatario: nombreParticipante(), participanteId: "p1", referencia: premio.label });
};

const customerRoutes: Route[] = [
  /* ---------- Auth ---------- */
  ["POST", "auth/otp", ({ body }) => {
    if (!body?.documento || String(body.documento).trim().length < 6) {
      throw new ApiError(422, "Ingresa un número de documento válido.");
    }
    exigirCuentaActiva();
    enviarCorreo("otp", db.perfil.correo, { codigo: String(Math.floor(100000 + Math.random() * 900000)), minutos: 10 }, { destinatario: nombreParticipante(), participanteId: "p1" });
    return { enviado: true, correo: db.perfil.correo };
  }],
  /** Ingreso al panel: correo + contraseña de un usuario activo; devuelve su nombre y rol. */
  ["POST", "auth/admin/login", ({ body }) => {
    const email = String(body?.email ?? "").trim().toLowerCase();
    const cred = db.credenciales.find((c) => c.email.toLowerCase() === email);
    const usuario = db.admin.usuarios.find((u: any) => u.email.toLowerCase() === email);
    if (!cred || cred.clave !== body?.clave || !usuario || usuario.estado === "Inactivo") {
      registrarAcceso(false, email);
      throw new ApiError(401, "Correo o contraseña incorrectos.");
    }
    registrarAcceso(true, email, usuario.nombre, usuario.rol, usuario.id);
    usuario.ultimo = new Date().toLocaleString("es-EC", { dateStyle: "short", timeStyle: "short" });
    // Token simulado: lleva el rol (un backend real emite un JWT firmado y comprueba el rol del lado servidor).
    return { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol, token: `mock.${encodeURIComponent(usuario.rol)}.${usuario.id}` };
  }],
  /** Recuperación de contraseña: siempre responde igual, exista o no el correo. */
  ["POST", "auth/admin/recuperar", () => ({ enviado: true })],
  ["POST", "auth/verificar", ({ body }) => {
    if (!Array.isArray(body?.codigo) || body.codigo.some((c: string) => !c)) {
      throw new ApiError(422, "Ingresa los 6 dígitos del código.");
    }
    // Token simulado de la participante (un backend real emite un JWT con su id).
    return { token: "mock.participante.p1", usuario: db.usuario };
  }],

  /* ---------- Catálogo ---------- */
  /** Solo los beneficios vigentes (los programados y los vencidos no se listan). */
  ["GET", "catalogo/beneficios", () => db.catalogo.beneficios.filter((b: any) => estadoVigencia(b, hoy().iso) === "vigente").map(beneficioPublico)],
  /** La ficha sigue abierta aunque haya vencido (con su `vigencia`) para poder avisar por qué no se puede canjear. */
  ["GET", "catalogo/beneficios/:id", ({ params }) =>
    beneficioPublico(db.catalogo.beneficios.find((b) => b.id === params["id"]) ?? (() => { throw notFound("Beneficio"); })())],
  /** Pop-ups vigentes para un canal (web o app) y una página; la frecuencia la aplica quien los muestra. */
  ["GET", "popups", ({ query }) => popupsPublicos(query.get("canal") ?? "web", query.get("pagina") ?? "inicio")],
  ["POST", "popups/:id/evento", ({ params, body }) => registrarEventoPopup(params["id"]!, String(body?.canal ?? ""), String(body?.tipo ?? ""))],
  ["GET", "catalogo/categorias-beneficio", () => db.catalogo.categoriasBeneficio],
  /** Marcas aliadas publicadas (nombre, logo y sitio web). */
  ["GET", "catalogo/locales", () => (db.admin.locales as any[]).filter((l) => l.activo)],
  ["GET", "catalogo/marcas", () => db.admin.marcas.filter((m: any) => m.activo).map(({ nombre, logo, web, descripcion }: any) => ({ nombre, logo, web, descripcion }))],
  ["GET", "catalogo/banners/:seccion", ({ params }) => bannersPara(params["seccion"]!)],
  ["GET", "niveles", () => ({ niveles: db.niveles, ...db.nivelesTexto })],

  /* ---------- Configuración ---------- */
  ["GET", "tenant", () => db.config.tenant],
  ["GET", "config", () => ({
    ...db.config,
    // El campo de provincia ofrece solo las provincias con envío (editables en Marca y localización).
    formulario: db.admin.campos.map((c: any) =>
      c.mapeo === "provincia" ? { ...c, opciones: provinciasDe((db.config.tenant as any).pais.codigo, (db.config.tenant as any).pais.provincias).filter((p) => p.envio).map((p) => p.nombre) } : c,
    ),
    seccionesHome: db.admin.seccionesHome,
    // Los textos legales son un solo bloque markdown; las copias guardadas con secciones (formato antiguo) se convierten.
    contenido: { ...(sincronizarContenido(), db.config.contenido), terminos: legalAMarkdown(db.config.contenido.terminos), privacidad: legalAMarkdown(db.config.contenido.privacidad), legales: metaLegales() },
  })],
  /* ---------- Cuenta del participante ---------- */
  ["GET", "me", () => db.usuario],
  ["GET", "me/perfil", () => db.perfil],
  ["PUT", "me/perfil", ({ body }) => {
    // El servidor valida igual que el formulario (nunca se confía solo en el navegador).
    const pais = (db.config.tenant as any).pais;
    const conEnvio = provinciasDe(pais.codigo, pais.provincias).filter((p) => p.envio).map((p) => p.nombre);
    const errores = erroresPerfil(
      { nombres: String(body?.nombres ?? db.perfil.nombres ?? ""), apellidos: String(body?.apellidos ?? db.perfil.apellidos ?? ""), telefono: String(body?.telefono ?? db.perfil.telefono ?? "") },
      { ...((db.perfil as any).extra ?? {}), ...(body?.extra ?? {}) }, db.admin.campos as any[], pais, conEnvio,
    );
    const primero = Object.values(errores)[0];
    if (primero) throw new ApiError(422, primero);
    // Las respuestas del formulario de datos también se ven en la ficha del panel.
    if (body?.extra) fichaDemo().extra = { ...(fichaDemo().extra ?? {}), ...body.extra };
    const guardado = Object.assign(db.perfil, body);
    // Lo que el participante cambia en Mis datos también se ve en su ficha del panel.
    const ficha = fichaDemo();
    ficha.nombre = `${guardado.nombres} ${guardado.apellidos}`.trim() || ficha.nombre;
    if (guardado.telefono) ficha.celular = guardado.telefono;
    return guardado;
  }],
  ["GET", "me/direcciones", () => db.direcciones],
  ["POST", "me/direcciones", ({ body }) => {
    validarDireccion(body);
    const d: Direccion = { ...body, id: body.id ?? `d${Date.now()}` };
    db.direcciones.push(d);
    return d;
  }],
  ["PUT", "me/direcciones/:id", ({ params, body }) => {
    validarDireccion(body);
    const i = db.direcciones.findIndex((d) => d.id === params["id"]);
    if (i < 0) throw notFound("Dirección");
    return (db.direcciones[i] = { ...body, id: params["id"]! });
  }],
  ["DELETE", "me/direcciones/:id", ({ params }) => {
    db.direcciones = db.direcciones.filter((d) => d.id !== params["id"]);
    return { ok: true };
  }],
  ["GET", "me/correos", () => db.correos],
  ["POST", "me/correos", ({ body }) => {
    if (!db.correos.includes(body.correo)) db.correos.push(body.correo);
    return db.correos;
  }],
  ["GET", "me/favoritos", () => db.favoritos],
  ["POST", "me/favoritos/:id", ({ params }) => {
    const id = params["id"]!;
    db.favoritos = db.favoritos.includes(id) ? db.favoritos.filter((f) => f !== id) : [...db.favoritos, id];
    return db.favoritos;
  }],
  ["GET", "me/cupones", () => db.cupones],
  /** Si este participante puede generar el cupón ahora y, si no, por qué (vigencia, provincia, límite y espera). */
  ["GET", "me/cupones/estado/:id", ({ params }) => estadoCanje(params["id"]!)],
  ["POST", "me/cupones", ({ body }) => {
    exigirCuentaActiva();
    const est = estadoCanje(body.beneficioId);
    if (est.estado !== "disponible") throw new ApiError(est.estado === "falta_provincia" ? 422 : 409, est.mensaje);
    const benef = (db.admin.beneficios as any[]).find((b) => b.id === body.beneficioId);
    // Si el beneficio tiene un lote de códigos cargado, el cupón usa el siguiente código disponible.
    // Un beneficio puede tener varios lotes (uno por entrega del comercio) y se usan en orden de carga, FIFO:
    // el más antiguo con códigos disponibles y sin vencer; al agotarse pasa al siguiente.
    const hoyIso = hoy().iso;
    const lotes = (db.admin.lotes as any[])
      .filter((l) => l.beneficioId === body.beneficioId)
      .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)) || (a.creadoEn ?? 0) - (b.creadoEn ?? 0));
    const vigentes = lotes.filter((l) => l.vence >= hoyIso);
    const lote = vigentes.find((l) => l.usados < l.total);
    let codigo = codigoAleatorio();
    if (benef?.modoCodigo === "compartido") {
      // Un mismo código para todos los participantes (hasta el máximo de usos, si lo hay).
      codigo = benef.codigoCompartido;
      benef.usos = (benef.usos ?? 0) + 1;
    } else if (lote) {
      codigo = lote.codigos?.[lote.usados] ?? `${String(lote.comercio).slice(0, 3).toUpperCase()}-${String(lote.usados + 1).padStart(5, "0")}`;
      lote.usados += 1;
      alertaLote(lote);
    } else if (vigentes.length) {
      throw new ApiError(409, "Los cupones de este beneficio se agotaron. Intenta más tarde.");
    } else if (lotes.length) {
      throw new ApiError(409, "Los códigos de este beneficio vencieron. Intenta más tarde.");
    }
    const cupon = { codigo, expira: Date.now() + est.regla.horas * 60 * 60 * 1000, documento: ofuscarDocumento(db.perfil.codigoParticipante) };
    db.cupones[body.beneficioId] = cupon;
    const h = hoy();
    const vence = new Date(cupon.expira);
    db.misBeneficios.unshift({
      id: `mb${Date.now()}`,
      beneficioId: body.beneficioId,
      codigo: cupon.codigo,
      estado: "activo",
      fecha: h.txt,
      vence: `${h.txt} ${vence.toTimeString().slice(0, 5)}`,
      ts: Date.now(),
    } as any);
    const ben = (db.admin.beneficios as any[]).find((b) => b.id === body.beneficioId);
    enviarCorreo("cupon-generado", db.perfil.correo, { beneficio: ben?.nombre ?? "tu beneficio", codigo: cupon.codigo, horas: est.regla.horas }, { destinatario: nombreParticipante(), participanteId: "p1", referencia: cupon.codigo });
    return cupon;
  }],
  ["GET", "me/compras", () => db.compras],
  ["GET", "me/compras/:codigo", ({ params }) =>
    db.compras.find((c) => c.codigo === params["codigo"]) ?? (() => { throw notFound("Compra"); })()],
  ["GET", "me/beneficios", () => db.misBeneficios],
  /* ---------- Avisos dentro del sitio (campanita) ---------- */
  ["GET", "me/notificaciones", () => ((db as any).notificaciones as any[]).filter((n) => n.participanteId === "p1").sort((a, b) => b.fecha.localeCompare(a.fecha))],
  /** Marca como leídas las indicadas (`ids`) o, sin `ids`, todas. */
  ["POST", "me/notificaciones/leer", ({ body }) => {
    const ids: string[] | undefined = Array.isArray(body?.ids) ? body.ids : undefined;
    for (const n of (db as any).notificaciones as any[]) if (n.participanteId === "p1" && (!ids || ids.includes(n.id))) n.leida = true;
    return { ok: true };
  }],
  /** La consulta de Contáctanos llega a Atención (Admin) con los datos del participante y su teléfono. */
  ["POST", "contacto", ({ body }) => {
    db.consultas.push({ ...body, fecha: hoy().iso });
    const consulta = String(body?.consulta ?? "").trim();
    (db.admin.mensajes as any[]).unshift({
      id: `c${Date.now()}`,
      nombre: nombreParticipante(),
      email: db.perfil.correo,
      telefono: body?.telefono ?? "",
      asunto: consulta.length > 60 ? consulta.slice(0, 57) + "…" : consulta || "Consulta desde Contáctanos",
      mensaje: consulta,
      fecha: hoy().txt,
      estado: "Nuevo",
      origen: "Contáctanos",
    });
    enviarCorreo("contacto-acuse", db.perfil.correo, { consulta }, { destinatario: nombreParticipante(), participanteId: "p1" });
    return { ok: true };
  }],

  /* ---------- Novedades por correo (consentimiento de comunicaciones) ---------- */
  /* ---------- Textos legales: qué debe aceptar la persona y su aceptación ---------- */
  ["GET", "me/legales", () => estadoParticipante("p1")],
  ["POST", "me/legales/aceptar", ({ body }) => aceptar("p1", body)],
  ["GET", "me/novedades", () => ({ recibe: recibeNovedades(fichaDemo()) })],
  ["PUT", "me/novedades", ({ body }) => cambiarNovedades(fichaDemo(), body?.recibe === true, "participante")],
  /** Enlace de baja de los correos: públicas, se identifican con el token del enlace. */
  ["GET", "novedades/baja", ({ query }) => estadoBaja(query.get("t"))],
  ["POST", "novedades/baja", ({ body }) => darDeBaja(body?.t)],
  ["POST", "novedades/alta", ({ body }) => volverAlta(body?.t)],
  /** Eventos anónimos de analítica (el cliente solo los manda si se aceptaron las cookies de analítica). Públicos: no exigen sesión. */
  ["POST", "analitica/eventos", ({ body }) => registrarEvento(body)],
  /* ---------- Eventos ---------- */
  /** Solo los eventos publicados. */
  ["GET", "eventos", () => (db.admin.eventos as any[]).filter((e) => e.activo)],
  ["GET", "eventos/:id", ({ params }) =>
    (db.admin.eventos as any[]).find((e) => e.id === params["id"] && e.activo) ?? (() => { throw notFound("Evento"); })()],
  ["GET", "me/preinscripciones", () => (db.admin.preinscripciones as any[]).filter((p) => p.participanteId === "p1")],
  /** Pre-inscribe a la participante demo: confirma si hay cupo para ella y sus acompañantes; si no, queda en lista de espera. */
  ["POST", "eventos/:id/preinscribir", ({ params, body }) => {
    exigirCuentaActiva();
    exigirLegalesAlDia("p1");
    const ev = (db.admin.eventos as any[]).find((e) => e.id === params["id"] && e.activo) ?? (() => { throw notFound("Evento"); })();
    if (esPasado(ev)) throw new ApiError(409, "Este evento ya se realizó.");
    if (!accesoPorNivel(ev.nivelMinimo)) throw new ApiError(403, `Este evento está disponible desde el nivel ${ev.nivelMinimo}. Tu nivel actual es ${db.usuario.nivel}.`);
    const lista = db.admin.preinscripciones as any[];
    if (lista.some((p) => p.participanteId === "p1" && p.eventoId === ev.id && p.estado !== "cancelado")) throw new ApiError(409, "Ya estás pre-inscrito en este evento.");
    const acompanantes = Math.min(2, Math.max(0, Math.floor(Number(body?.acompanantes) || 0)));
    const telefono = String(body?.telefono ?? "").trim();
    if (!/^[0-9+\s]{9,15}$/.test(telefono)) throw new ApiError(422, "Ingresa un teléfono de contacto válido.");
    const h = hoy();
    const confirmado = ev.cuposRestantes >= 1 + acompanantes;
    const pre = {
      id: `pr${Date.now()}`, eventoId: ev.id, evento: ev.nombre, codigo: codigoEvento(), participanteId: "p1", participante: nombreParticipante(),
      email: db.perfil.correo, telefono, documento: db.perfil.codigoParticipante, fecha: h.txt, fechaISO: h.iso, acompanantes,
      restricciones: String(body?.restricciones ?? "").slice(0, 200), comentario: String(body?.comentario ?? "").slice(0, 500),
      estado: confirmado ? "confirmado" : "en-lista",
    };
    lista.unshift(pre);
    if (confirmado) ajustarCupos(ev.id, -(1 + acompanantes));
    enviarCorreo("evento-preinscripcion", db.perfil.correo, { evento: ev.nombre, codigo: pre.codigo, estado: confirmado ? "confirmada" : "en lista de espera" }, { destinatario: nombreParticipante(), participanteId: "p1", referencia: pre.codigo });
    return pre;
  }],
  ["POST", "me/preinscripciones/:codigo/cancelar", ({ params }) => {
    exigirCuentaActiva();
    const pre = (db.admin.preinscripciones as any[]).find((p) => p.codigo === params["codigo"] && p.participanteId === "p1") ?? (() => { throw notFound("Pre-inscripción"); })();
    if (pre.estado === "cancelado" || pre.estado === "asistido") throw new ApiError(409, "Esta pre-inscripción ya no se puede cancelar.");
    if (ocupaCupo(pre.estado)) ajustarCupos(pre.eventoId, 1 + pre.acompanantes);
    pre.estado = "cancelado";
    return pre;
  }],

  /* ---------- Spin & Win y Lucky Code ---------- */
  ["GET", "juegos/ruleta", () => estadoRuleta()],
  /** El servidor elige el premio (el navegador solo anima la ruleta hasta ese sector). */
  ["POST", "juegos/ruleta/girar", () => {
    exigirCuentaActiva();
    exigirLegalesAlDia("p1");
    const est = estadoRuleta();
    if (est.restantes <= 0) throw new ApiError(409, `Usaste tus ${est.girosMax} giros. Vuelve el ${est.proximaFecha}.`);
    const sectores = (db.admin.premios as any[]).filter((p) => p.activo && p.enRuleta);
    if (sectores.length < 2) throw new ApiError(503, "La ruleta no está disponible por ahora.");
    const premio = sectores[Math.floor(Math.random() * sectores.length)]!;
    registrarJuego(premio, "ruleta");
    return { premio: { id: premio.id, label: premio.label, tipo: premio.tipo, detalle: premio.detalle }, estado: estadoRuleta() };
  }],
  ["POST", "juegos/codigo", ({ body }) => {
    exigirCuentaActiva();
    exigirLegalesAlDia("p1");
    const codigo = String(body?.codigo ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (codigo.length < 8) throw new ApiError(422, "Ingresa tu código promocional.");
    const fila = (db.admin.codigosPromo as any[]).find((c) => String(c.codigo).replace(/[^A-Z0-9]/g, "") === codigo);
    if (!fila || fila.usado) throw new ApiError(422, "El código ingresado no es válido o ya fue utilizado.");
    const premio = (db.admin.premios as any[]).find((p) => p.id === fila.premioId);
    if (!premio || !premio.activo) throw new ApiError(422, "El premio de este código ya no está disponible.");
    fila.usado = true;
    fila.usadoPor = nombreParticipante();
    fila.fechaUso = hoy().txt;
    registrarJuego(premio, "codigo");
    return { premio: { id: premio.id, label: premio.label, tipo: premio.tipo, detalle: premio.detalle } };
  }],
  /* ---------- Órdenes (checkout) ---------- */
  ["POST", "ordenes", ({ body }) => {
    exigirCuentaActiva();
    exigirLegalesAlDia("p1");
    // Todo pago se valida con una tarjeta del banco.
    const tarjetas = db.config.tarjetas as { id: string }[];
    if (!tarjetas.some((t) => t.id === body.tarjeta)) throw new ApiError(422, "Elige una tarjeta del banco para pagar.");
    if (!Array.isArray(body.items) || !body.items.length) throw new ApiError(422, "Tu carrito está vacío.");
    for (const i of body.items as any[]) {
      const ben = (db.admin.beneficios as any[]).find((x) => x.id === i.id);
      if (ben && !accesoPorNivel(ben.nivelMinimo)) throw new ApiError(403, `«${ben.nombre}» está disponible desde el nivel ${ben.nivelMinimo}.`);
    }
    const codigo = codigoAleatorio("BNB");
    const h = hoy();
    const hora = new Date().toTimeString().slice(0, 5);
    const items: CompraItem[] = body.items.map((i: any) => ({
      nombre: i.nombre,
      marca: i.marca,
      imagen: i.imagen,
      cantidad: i.cantidad,
      precio: i.precio,
    }));
    const monto = Math.round(items.reduce((a, i) => a + i.precio * i.cantidad, 0) * 100) / 100;
    const compra: Compra = {
      codigo,
      fecha: h.txt,
      fechaISO: h.iso,
      hora,
      estado: "Pagado",
      entrega: body.entrega,
      montoUSD: monto,
      items,
    };
    db.compras.unshift(compra);
    enviarCorreo("pedido-confirmado", db.perfil.correo, { codigo, monto: monto.toFixed(2) }, { destinatario: nombreParticipante(), participanteId: "p1", referencia: codigo });
    db.admin.pedidos.unshift({
      ...compra,
      cliente: `${db.perfil.nombres} ${db.perfil.apellidos}`,
      email: db.perfil.correo,
      hora,
      digital: true,
      estadoAdmin: "Pagado",
      historial: [{ estado: "Pagado", fecha: `${h.txt} ${hora}` }],
    });
    return { codigo, fecha: h.txt, hora };
  }],
];

/* ---------------------------------------------------------------- */

const compile = ([method, path, handler]: Route) => {
  const keys: string[] = [];
  const re = new RegExp(
    "^" + path.replace(/:(\w+)/g, (_, k) => (keys.push(k), "([^/]+)")) + "/?$",
  );
  return { method, re, keys, handler };
};

const table = [...customerRoutes, ...adminRoutes].map(compile);

/** Rol del token simulado ("mock.<rol>.<id>"), o null si no hay sesión del panel. */
const rolDelToken = (req: HttpRequest<unknown>): RolAdmin | null => {
  const m = /^Bearer mock\.([^.]+)\./.exec(req.headers.get("Authorization") ?? "");
  const rol = m ? (decodeURIComponent(m[1]!) as RolAdmin) : null;
  if (!rol) return null;
  registrarRolesDesdeDb(); // otra pestaña pudo crear o cambiar roles
  return rolExiste(rol) ? rol : null;
};
/** Id del usuario del panel que firma el token ("mock.<rol>.<id>"). */
const usuarioDelToken = (req: HttpRequest<unknown>): string | null => /^Bearer mock\.[^.]+\.([^.]+)$/.exec(req.headers.get("Authorization") ?? "")?.[1] ?? null;

const respond = (req: HttpRequest<unknown>): Observable<HttpResponse<unknown>> => {
  const url = new URL(req.url, "http://mock.local");
  const path = url.pathname.replace(/^\/api\//, "");
  // Las rutas de cuenta del participante (me/*, canje y consulta) exigen su sesión; el catálogo y los textos son públicos.
  if (path.startsWith("me/") || path === "me" || path === "ordenes" || path === "contacto" || path === "eventos") {
    if (!/^Bearer mock\.participante\./.test(req.headers.get("Authorization") ?? "")) {
      return throwError(() => new HttpErrorResponse({ status: 401, statusText: "Inicia sesión", error: { message: "Inicia sesión para continuar." }, url: req.url }));
    }
  }
  // Las rutas del panel exigen sesión y permiso por sección y acción (lo mismo que hará el backend real).
  if (path.startsWith("admin/")) {
    const rol = rolDelToken(req);
    const negar = (status: number, mensaje: string) =>
      throwError(() => new HttpErrorResponse({ status, statusText: mensaje, error: { message: mensaje }, url: req.url }));
    if (!rol) return negar(401, "Inicia sesión para continuar.");
    if (!puedeApi(rol, req.method, path, req.body)) {
      const r = requisitoApi(req.method, path, req.body)!;
      return negar(403, `Tu rol (${rol}) no puede ${nombreAccion[r.accion]} en esta sección.`);
    }
  }
  for (const r of table) {
    if (r.method !== req.method) continue;
    const m = r.re.exec(path);
    if (!m) continue;
    const params: Record<string, string> = {};
    r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1]!)));
    try {
      contexto.usuarioPanelId = usuarioDelToken(req);
      contexto.participante = /^Bearer mock\.participante\./.test(req.headers.get("Authorization") ?? "");
      const query = new URLSearchParams(url.search);
      for (const k of req.params.keys()) query.set(k, req.params.get(k) ?? "");
      // Registro de cambios automático: foto del estado antes y después de cada cambio hecho desde el panel.
      const cap = path.startsWith("admin/") ? capturar(req.method, path, req.body) : null;
      // Concurrencia: si otro usuario guardó antes este registro, la versión que trae el cliente ya no coincide (412).
      const versionPrevia = path.startsWith("admin/") ? comprobarVersion(req.method, path, req.headers.get("If-Match")) : 0;
      const out = r.handler({ body: req.body, params, query });
      if (path.startsWith("admin/")) {
        subirVersion(req.method, path, versionPrevia);
        if (req.method === "GET") asegurarVersiones(path, out);
      }
      if (cap) registrar(cap, usuarioDelToken(req), rolDelToken(req));
      if (req.method !== "GET") persistDb();
      return of(new HttpResponse({ status: 200, body: structuredClone(out) }));
    } catch (e) {
      // Un intento fallido también deja rastro (p. ej. el ingreso rechazado al panel).
      if (req.method !== "GET") persistDb();
      const err = e instanceof ApiError ? e : new ApiError(500, String(e));
      return throwError(
        () => new HttpErrorResponse({ status: err.status, statusText: err.message, error: { message: err.message }, url: req.url }),
      );
    }
  }
  return throwError(
    () => new HttpErrorResponse({ status: 404, statusText: "Not Found", error: { message: "Ruta no encontrada" }, url: req.url }),
  );
};

/**
 * Backend simulado: intercepta todo lo que va a `/api/*` y lo resuelve en memoria con una latencia artificial.
 * Para conectar un backend real basta con quitar este interceptor de `app.config.ts`.
 */
// Versión anterior de la herramienta guardaba la bandera en localStorage: se limpia para no dejar el sitio "caído".
try { localStorage.removeItem("bs_fallo"); } catch { /* sin almacenamiento */ }

export const mockApiInterceptor: HttpInterceptorFn = (req, next) => {
  if (!/^\/?api\//.test(req.url)) return next(req);
  // Herramienta de desarrollo: sessionStorage.bs_fallo = "0" (sin red), "401", "503"… hace fallar toda petición al API (para probar pantallas de error).
  // Solo dura la pestaña (sessionStorage): no puede quedarse activa por error entre sesiones.
  const fallo = (() => { try { return sessionStorage.getItem("bs_fallo"); } catch { return null; } })();
  if (fallo !== null && fallo !== "") {
    return timer(60).pipe(mergeMap(() => throwError(() => new HttpErrorResponse({ status: Number(fallo), url: req.url, error: { message: "Fallo simulado" } }))));
  }
  // La escritura se aplica en el momento de la petición (como en un servidor real); solo la respuesta se retrasa.
  const respuesta$ = respond(req);
  return timer(120).pipe(mergeMap(() => respuesta$));
};
