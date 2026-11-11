import { ocupaCupo } from "../eventos";
import { ajustarCupos } from "./eventos-api";
import { db } from "./db";
import { ApiError, type Route } from "./types";
import { avisarAlta, avisarNivel, enviarCorreo, enviarCorreoLibre, procesarCola, reintentarCorreo } from "./correos";
import { AJUSTES_BASE, correoValido, DISENO_BASE, EJEMPLO_VARS, MAX_CCO, PLANTILLAS_BASE } from "../correos";
import { describir, registrarCuenta } from "./auditoria";
import { reporteResumen } from "./reportes";
import { embudo } from "./analitica";
import { reporteTipo, tiposReporte } from "./reportes-tipos";
import { contexto } from "./contexto";
import { requisitosClave, validarNombrePersona } from "../validaciones";
import { errorLargosFila } from "../limites";
import { errorReglasBeneficio, estadoVigencia } from "../cupones";
import { provinciasDe } from "../../tenants/presets";
import { errorPopup } from "../popups";
import { exigirGuiaValida, guiasDeQuienPregunta } from "./ayuda";
import { crearRol, editarRol, eliminarRol, exigirUsuariosValidos, listarRoles } from "./roles";
import { aAvisar as aAvisarLegales, descartarBorrador as descartarBorradorLegal, estadoParticipante as estadoLegalesParticipante, guardarBorrador as guardarBorradorLegal, publicar as publicarLegal, restaurar as restaurarLegal, resumenes as resumenesLegales, sincronizarContenido as sincronizarContenidoLegal, tipoDe as tipoLegalDe, usuarioPanel } from "./legales";
import { dashboard } from "./dashboard";
import { audienciaDe, enviarCampana } from "./campanas";
import { conservarVersiones } from "./versiones";

const LISTAS = [
  "participantes", "pedidos", "mensajes", "usuarios", "auditoria", "beneficios",
  "categoriasBeneficio", "banners", "onboarding", "campos", "lotes", "seccionesHome", "marcas",
  "plantillasCorreo", "correosEnviados", "campanas", "importaciones", "popups", "guias", "premios", "codigosPromo", "giros", "eventos", "preinscripciones",
] as const;
type Lista = (typeof LISTAS)[number];

/** Usuario del panel que hace la petición (por su token). */
const usuarioActual = () => (db.admin.usuarios as any[]).find((u) => u.id === contexto.usuarioPanelId) ?? (() => { throw new ApiError(401, "Inicia sesión para continuar."); })();
const hoy = () => new Date().toISOString().slice(0, 10);
const vigente = (b: any) => b.activo && b.inicio <= hoy() && b.fin >= hoy();

/** Al guardar una colección del admin se refleja lo publicado en el sitio del participante. */
const sincronizar: Partial<Record<Lista, (anterior: any[]) => void>> = {
  pedidos: (anterior) => {
    // Un pedido que cambia de estado avisa al participante.
    for (const a of anterior) {
      const ahora = db.admin.pedidos.find((x: any) => x.codigo === a.codigo);
      if (ahora && ahora.estado !== a.estado) {
        const p = db.admin.participantes.find((x: any) => x.id === ahora.participanteId) ?? db.admin.participantes.find((x: any) => x.nombre === ahora.cliente);
        enviarCorreo("pedido-estado", ahora.email ?? p?.email, { codigo: ahora.codigo, estado: ahora.estado }, { destinatario: ahora.cliente, participanteId: p?.id, referencia: ahora.codigo });
      }
    }
  },
  participantes: (anterior) => {
    // Bloquear o reactivar una cuenta avisa a la persona.
    for (const a of anterior) {
      const ahora = db.admin.participantes.find((x: any) => x.id === a.id);
      if (ahora && ahora.estado !== a.estado && (ahora.estado === "Bloqueado" || a.estado === "Bloqueado")) {
        enviarCorreo(ahora.estado === "Bloqueado" ? "cuenta-bloqueada" : "cuenta-activada", ahora.email, {}, { destinatario: ahora.nombre, participanteId: ahora.id });
      }
    }
    const antes = anterior.find((p) => p.id === "p1");
    const ahora = db.admin.participantes.find((p) => p.id === "p1");
    // El nivel de la participante demo es el que asigna el panel en su ficha.
    if (antes && ahora && ahora.nivel && ahora.nivel !== antes.nivel) {
      db.usuario.nivel = ahora.nivel;
      avisarNivel(antes.nivel, ahora.nivel);
    }
  },
  preinscripciones: (anterior) => {
    // Cambiar el estado de una pre-inscripción (o su número de acompañantes) mueve los cupos del evento.
    const antes = new Map(anterior.map((p: any) => [p.id, p]));
    for (const p of db.admin.preinscripciones as any[]) {
      const a: any = antes.get(p.id);
      if (!a) continue;
      const delta = (ocupaCupo(p.estado) ? 1 + p.acompanantes : 0) - (ocupaCupo(a.estado) ? 1 + a.acompanantes : 0);
      if (delta) ajustarCupos(p.eventoId, -delta);
    }
  },
  beneficios: () => {
    db.catalogo.beneficios = db.admin.beneficios.filter((b) => b.activo).map((b) => ({ ...b, galeria: b.imagenes?.length ? b.imagenes : b.galeria }));
  },
  categoriasBeneficio: () => {
    db.catalogo.categoriasBeneficio = db.admin.categoriasBeneficio.filter((c) => c.activo).map((c) => ({
      icon: c.icon ?? (db.catalogo.categoriasBeneficio.find((x: any) => x.slug === c.slug) as any)?.icon ?? "Tag",
      imagen: c.imagen,
      slug: c.slug,
      label: c.label,
    })) as any;
  },
  banners: () => {
    const web = db.admin.banners.filter((b) => b.canal === "Web" && vigente(b));
    const por = (u: string) => web.filter((b) => b.ubicacion === u).map(({ id, imagen, imagenMovil, alt, to, marca, titulo, descuento, cta }: any) => ({ id: id ?? crypto.randomUUID(), imagen, imagenMovil, alt, to, marca, titulo, descuento, cta }));
    db.catalogo.banners["home"] = por("Home");
    db.catalogo.banners["beneficios"] = por("Beneficios");
  },
};

const col = (name: string): Lista => {
  if (!(LISTAS as readonly string[]).includes(name)) throw new ApiError(404, "Colección no encontrada");
  return name as Lista;
};

/* ---------------- Consultas paginadas (para colecciones grandes) ---------------- */
const CLAVES: Record<string, string> = { participantes: "id", pedidos: "codigo", productos: "id", beneficios: "id", mensajes: "id", usuarios: "id", marcas: "id", premios: "id", codigosPromo: "codigo", giros: "id", eventos: "id", preinscripciones: "id", plantillasCorreo: "id", correosEnviados: "id", campanas: "id", importaciones: "id" };
const BUSCABLES: Record<string, string[]> = {
  participantes: ["nombre", "cedula", "email"],
  pedidos: ["codigo", "cliente"],
  productos: ["nombre", "marca", "categoriaLabel"],
  beneficios: ["nombre", "marca", "categoria"],
  movimientos: ["detalle", "cliente"],
  mensajes: ["asunto", "nombre", "email"],
  marcas: ["nombre", "web"],
  premios: ["label", "tipo"],
  codigosPromo: ["codigo", "premio", "usadoPor"],
  giros: ["participante", "premio"],
  eventos: ["nombre", "marca", "lugar", "distrito"],
  preinscripciones: ["codigo", "participante", "evento", "email"],
  auditoria: ["accion", "usuario"],
  comprasPuntos: ["codigo", "cliente", "email"],
  correosEnviados: ["para", "destinatario", "asunto", "plantilla", "referencia"],
  importaciones: ["archivo", "usuario", "tipo"],
};

const hoyIso = () => new Date().toISOString().slice(0, 10);
/** Los beneficios se listan con su `vigencia` calculada hoy (programado, vigente o vencido): no se guarda, cambia con el día. */
const conVigencia = (b: any) => ({ ...b, vigencia: estadoVigencia(b, hoyIso()) });
const fuenteDe = (nombre: string): any[] =>
  nombre === "beneficios" ? (db.admin.beneficios as any[]).map(conVigencia) : ((db.admin as any)[col(nombre)] as any[]);

/** Un pop-up se valida igual que en el formulario del panel. */
function exigirPopupValido(p: any) {
  const e = errorPopup(p);
  if (e) throw new ApiError(422, e);
}

/** Reglas de un beneficio (vigencia, cupón, código compartido, provincias): el servidor las valida igual que el panel. */
function exigirReglasBeneficio(b: any) {
  const pais = (db.config.tenant as any).pais;
  const e = errorReglasBeneficio(b, provinciasDe(pais.codigo, pais.provincias).map((p) => p.nombre));
  if (e) throw new ApiError(422, e);
  delete b.vigencia; // calculada, no se guarda
}
/** Texto de búsqueda en minúsculas por elemento (se calcula una vez; evita recorrer campos en cada consulta). */
const indice = new WeakMap<object, string>();
const textoDe = (col: string, it: any) => {
  let s = indice.get(it);
  if (s === undefined) {
    s = (BUSCABLES[col] ?? []).map((k) => it[k] ?? "").join(" ").toLowerCase();
    indice.set(it, s);
  }
  return s;
};
const claveDe = (c: string) => CLAVES[c] ?? "id";
/** Rechaza (400) los registros nuevos o modificados con textos más largos que los límites de `core/limites`; los que no cambiaron no se revisan. */
function exigirLargos(c: string, filas: any[], anteriores: any[] = []) {
  const k = claveDe(c);
  const previo = new Map(anteriores.map((x) => [String(x?.[k]), JSON.stringify(x)]));
  for (const f of filas) {
    if (previo.get(String(f?.[k])) === JSON.stringify(f)) continue;
    const e = errorLargosFila(f, `«${f?.nombre ?? f?.titulo ?? f?.[k] ?? c}»`);
    if (e) throw new ApiError(400, e);
  }
}

export const adminRoutes: Route[] = [
  /** Lista paginada: ?page=1&size=25&q=texto&sort=campo&dir=asc|desc&f_campo=valor&desde=YYYY-MM-DD&hasta=YYYY-MM-DD */
  ["GET", "admin/q/:col", ({ params, query }) => {
    const nombre = params["col"]!;
    if (nombre === "correosEnviados") procesarCola(); // el proveedor ya pudo entregar o reintentar lo que estaba en cola
    let lista = fuenteDe(nombre);
    // Conteos por campo (para tarjetas de resumen): ?facetas=estado → { estado: { Nuevo: n, … } }
    const facetas: Record<string, Record<string, number>> = {};
    for (const campo of (query.get("facetas") ?? "").split(",").filter(Boolean)) {
      const cuentas: Record<string, number> = {};
      for (const it of lista) cuentas[it[campo]] = (cuentas[it[campo]] ?? 0) + 1;
      facetas[campo] = cuentas;
    }
    const q = (query.get("q") ?? "").trim().toLowerCase();
    const filtros = [...query.entries()].filter(([k, v]) => k.startsWith("f_") && v !== "");
    const desde = query.get("desde");
    const hasta = query.get("hasta");
    if (q || filtros.length || desde || hasta) {
      lista = lista.filter((it) => {
        if (q && !textoDe(nombre, it).includes(q)) return false;
        // Quien nunca eligió acepta novedades (valor por defecto).
        for (const [k, v] of filtros) if (String(it[k.slice(2)] ?? (k === "f_recibeNovedades" ? true : "")) !== v) return false;
        const f = it.fechaISO ?? it.fecha;
        if (desde && f < desde) return false;
        if (hasta && f > hasta) return false;
        return true;
      });
    }
    const sort = query.get("sort");
    if (sort) {
      const dir = query.get("dir") === "desc" ? -1 : 1;
      lista = [...lista].sort((a, b) => (a[sort] > b[sort] ? dir : a[sort] < b[sort] ? -dir : 0));
    }
    const size = Math.min(200, Math.max(1, Number(query.get("size")) || 25));
    const total = lista.length;
    const page = Math.min(Math.max(1, Number(query.get("page")) || 1), Math.max(1, Math.ceil(total / size)));
    return { items: lista.slice((page - 1) * size, page * size), total, page, size, facetas };
  }],
  /** Un elemento por clave (id, codigo o slug). */
  ["GET", "admin/c/:col/:key", ({ params }) => {
    const c = col(params["col"]!);
    const k = claveDe(c);
    return ((db.admin as any)[c] as any[]).find((x) => String(x[k]) === params["key"]) ?? (() => { throw new ApiError(404, "Elemento no encontrado"); })();
  }],
  /** Crea o reemplaza un elemento sin enviar la colección completa. */
  ["PUT", "admin/c/:col/:key", ({ params, body }) => {
    const c = col(params["col"]!);
    const lista = (db.admin as any)[c] as any[];
    const k = claveDe(c);
    const i = lista.findIndex((x) => String(x[k]) === params["key"]);
    const anterior = i >= 0 ? [structuredClone(lista[i])] : [];
    exigirLargos(c, [body], anterior);
    if (c === "beneficios") exigirReglasBeneficio(body);
    if (c === "popups") exigirPopupValido(body);
    if (c === "guias") exigirGuiaValida(body);
    if (c === "usuarios") exigirUsuariosValidos(lista.map((x, j) => (j === i ? body : x)).concat(i < 0 ? [body] : []));
    if (i >= 0) lista[i] = body;
    else { lista.unshift(body); avisarAlta(c, body); }
    sincronizar[c]?.(anterior);
    return body;
  }],
  ["DELETE", "admin/c/:col/:key", ({ params }) => {
    const c = col(params["col"]!);
    const k = claveDe(c);
    (db.admin as any)[c] = ((db.admin as any)[c] as any[]).filter((x) => String(x[k]) !== params["key"]);
    sincronizar[c]?.([]);
    return { ok: true };
  }],
  /** Carga de códigos de Lucky Code: los que ya existen se omiten. */
  ["POST", "admin/codigos-promo/cargar", ({ body }) => {
    const premio = (db.admin.premios as any[]).find((p) => p.id === body?.premioId);
    if (!premio) throw new ApiError(404, "Premio no encontrado");
    const lista = db.admin.codigosPromo as any[];
    const ya = new Set(lista.map((c) => c.codigo));
    const omitidos: string[] = [];
    const nuevos: any[] = [];
    for (const c of Array.isArray(body?.codigos) ? (body.codigos as string[]) : []) {
      const cod = String(c).toUpperCase();
      if (ya.has(cod)) { omitidos.push(cod); continue; }
      ya.add(cod);
      nuevos.push({ codigo: cod, premioId: premio.id, premio: premio.label, usado: false });
    }
    if (!nuevos.length) throw new ApiError(422, "Todos esos códigos ya estaban cargados.");
    db.admin.codigosPromo = [...nuevos, ...lista];
    return { creados: nuevos.length, omitidos };
  }],
  /** Alta masiva (carga de archivos). */
  ["POST", "admin/c/:col/bulk", ({ params, body }) => {
    const c = col(params["col"]!);
    exigirLargos(c, body.items as any[]);
    if (c === "beneficios") for (const it of body.items as any[]) exigirReglasBeneficio(it);
    let items = body.items as any[];
    // Participantes: quien ya existe (mismo documento o correo) no se vuelve a crear.
    const omitidos: string[] = [];
    if (c === "participantes") {
      const docs = new Set((db.admin.participantes as any[]).map((p) => String(p.cedula)));
      const correos = new Set((db.admin.participantes as any[]).map((p) => String(p.email).toLowerCase()));
      items = items.filter((it) => {
        const repetido = docs.has(String(it.cedula)) || correos.has(String(it.email).toLowerCase());
        if (repetido) omitidos.push(String(it.cedula));
        else { docs.add(String(it.cedula)); correos.add(String(it.email).toLowerCase()); }
        return !repetido;
      });
    }
    (db.admin as any)[c] = [...items, ...((db.admin as any)[c] as any[])];
    for (const it of items) avisarAlta(c, it);
    sincronizar[c]?.([]);
    return { creados: items.length, omitidos };
  }],

  /**
   * Carga de códigos de un beneficio: crea un lote nuevo (se usan en orden de carga) con los códigos que no estén ya en otro lote
   * del mismo beneficio. Devuelve cuántos se cargaron y cuántos se omitieron por repetidos.
   */
  ["POST", "admin/lotes/cargar", ({ body }) => {
    const b = (db.admin.beneficios as any[]).find((x) => x.id === body?.beneficioId);
    if (!b) throw new ApiError(404, "Beneficio no encontrado");
    const hoy = new Date().toISOString().slice(0, 10);
    if (!body.vence || body.vence < hoy) throw new ApiError(422, "La fecha de vencimiento debe ser hoy o posterior.");
    const codigos = Array.isArray(body.codigos) ? (body.codigos as unknown[]).map((c) => String(c).trim()).filter(Boolean) : [];
    if (!codigos.length) throw new ApiError(422, "No hay códigos para cargar.");
    if (codigos.length > 20000) throw new ApiError(422, "Una carga puede tener como máximo 20.000 códigos.");
    const lotes = db.admin.lotes as any[];
    const ya = new Set(lotes.filter((l) => l.beneficioId === b.id).flatMap((l) => l.codigos ?? []));
    const nuevos = [...new Set(codigos)].filter((c) => !ya.has(c));
    if (!nuevos.length) throw new ApiError(422, "Todos esos códigos ya están cargados en otro lote de este beneficio.");
    lotes.unshift({ id: crypto.randomUUID(), beneficioId: b.id, codigos: nuevos, comercio: b.marca, beneficio: b.nombre, archivo: String(body.archivo ?? "códigos"), total: nuevos.length, usados: 0, vence: body.vence, fecha: hoy, creadoEn: Date.now() });
    return { cargados: nuevos.length, repetidos: codigos.length - nuevos.length };
  }],
  /**
   * Carga masiva con creación o actualización (beneficios, marcas): cada registro se crea si su clave no existe y, si existe,
   * se reemplaza. Es todo o nada: si una fila no cumple las reglas del servidor no se guarda ninguna.
   */
  ["POST", "admin/c/:col/upsert", ({ params, body }) => {
    const c = col(params["col"]!);
    if (!["beneficios", "marcas"].includes(c)) throw new ApiError(400, "Esta colección no admite carga masiva.");
    const items = body?.items as any[];
    if (!Array.isArray(items) || !items.length) throw new ApiError(422, "No hay filas para cargar.");
    if (items.length > 2000) throw new ApiError(422, "Una carga puede tener como máximo 2.000 filas: divide el archivo.");
    const k = claveDe(c);
    for (const it of items) if (!it?.[k] || !String(it.nombre ?? "").trim()) throw new ApiError(422, "Hay un registro sin código o sin nombre.");
    exigirLargos(c, items);
    if (c === "beneficios") for (const it of items) exigirReglasBeneficio(it);
    const lista = (db.admin as any)[c] as any[];
    let creados = 0;
    let actualizados = 0;
    for (const it of items) {
      const i = lista.findIndex((x) => String(x[k]) === String(it[k]));
      if (i >= 0) { lista[i] = it; actualizados++; } else { lista.unshift(it); creados++; }
    }
    sincronizar[c]?.([]);
    return { creados, actualizados };
  }],

  ["GET", "admin/c/:col", ({ params }) => (db.admin as any)[col(params["col"]!)]],
  ["PUT", "admin/c/:col", ({ params, body }) => {
    const c = col(params["col"]!);
    const anterior = (db.admin as any)[c] as any[];
    exigirLargos(c, body as any[], anterior);
    if (c === "beneficios") for (const it of body as any[]) exigirReglasBeneficio(it);
    if (c === "usuarios") exigirUsuariosValidos(body as any[]);
    (db.admin as any)[c] = body;
    conservarVersiones(c, anterior, body as any[]);
    sincronizar[c]?.(anterior);
    // Altas hechas guardando la colección completa (p. ej. usuarios del panel).
    const ids = new Set(anterior.map((x) => x.id));
    if (c === "usuarios") for (const it of body as any[]) if (!ids.has(it.id)) avisarAlta(c, it);
    return body;
  }],
  /** Mezcla claves de configuración pública (sitio, contenido, menú, cupón, promociones…). */
  ["PUT", "admin/config", ({ body }) => {
    if (body?.cupon) {
      const e = errorReglasBeneficio({ cupon: body.cupon });
      if (e) throw new ApiError(422, e);
    }
    Object.assign(db.config, body);
    // Los textos legales solo cambian publicando una versión: lo que llegue aquí no los pisa.
    sincronizarContenidoLegal();
    return db.config;
  }],
  /**
   * Todo lo que pertenece a UN participante (ficha en página): sus movimientos, pedidos, compras de puntos, cupones y los
   * registros de auditoría que lo mencionan. La participante demo (p1) usa sus datos reales de sesión; los demás, lo que el panel guarda a su nombre.
   */
  /* ---------- Textos legales: versiones, borrador, publicación y aceptaciones ---------- */
  ["GET", "admin/legales", () => resumenesLegales()],
  ["GET", "admin/legales/avisos", () => ({ aAvisar: aAvisarLegales() })],
  ["PUT", "admin/legales/:tipo/borrador", ({ params, body }) => guardarBorradorLegal(tipoLegalDe(params["tipo"]), body, usuarioPanel())],
  ["DELETE", "admin/legales/:tipo/borrador", ({ params }) => descartarBorradorLegal(tipoLegalDe(params["tipo"]))],
  ["POST", "admin/legales/:tipo/publicar", ({ params, body }) => publicarLegal(tipoLegalDe(params["tipo"]), body, usuarioPanel())],
  ["POST", "admin/legales/:tipo/restaurar/:version", ({ params }) => restaurarLegal(tipoLegalDe(params["tipo"]), Number(params["version"]), usuarioPanel())],
  /**
   * Todo lo que pertenece a UNA marca aliada (su ficha): sus productos y beneficios, los canjes que incluyen artículos suyos
   * y los registros de auditoría que la mencionan. Las marcas se enlazan por nombre.
   */
  ["GET", "admin/marcas/:id/actividad", ({ params }) => {
    const m = (db.admin.marcas as any[]).find((x) => x.id === params["id"]);
    if (!m) throw new ApiError(404, "Marca no encontrada");
    const mia = (x: any) => String(x.marca ?? "") === m.nombre;
    const beneficios = (db.admin.beneficios as any[]).filter(mia).map((b) => ({ id: b.id, nombre: b.nombre, descuento: b.descuento ?? "", tipo: b.tipo ?? "", activo: b.activo !== false, imagen: b.imagen ?? "" }));
    const canjes = (db.admin.pedidos as any[]).flatMap((p) =>
      (p.items ?? []).filter(mia).map((i: any) => ({ participanteId: p.participanteId ?? ((db.admin.participantes as any[]).find((x) => x.email === p.email)?.id ?? ""), codigo: p.codigo, fecha: p.fecha, fechaISO: p.fechaISO ?? "", hora: p.hora ?? "", cliente: p.cliente, estado: p.estadoAdmin, articulo: i.nombre, cantidad: i.cantidad, monto: (i.precio ?? 0) * i.cantidad })),
    );
    return {
      beneficios, canjes,
      auditoria: (db.admin.auditoria as any[]).filter((a) => String(a.accion ?? "").includes(m.nombre) || a.entidad === m.id),
    };
  }],
  ["GET", "admin/participantes/:id/actividad", ({ params }) => {
    const p = db.admin.participantes.find((x: any) => x.id === params["id"]);
    if (!p) throw new ApiError(404, "Participante no encontrado");
    const demo = p.id === "p1";
    const mismo = (x: any) => String(x.email ?? "").toLowerCase() === String(p.email).toLowerCase() || x.cliente === p.nombre;
    return {
      pedidos: (db.admin.pedidos as any[]).filter(mismo),
      beneficios: demo ? db.misBeneficios : [],
      auditoria: (db.admin.auditoria as any[]).filter((a) => String(a.accion ?? "").includes(p.nombre)),
      legales: estadoLegalesParticipante(p.id),
    };
  }],
  /** El participante ingresa con un código enviado a su correo: soporte puede pedir uno nuevo (queda en auditoría). */
  ["POST", "admin/participantes/:id/codigo", ({ params, body }) => {
    const p = db.admin.participantes.find((x: any) => x.id === params["id"]);
    if (!p) throw new ApiError(404, "Participante no encontrado");
    if (p.estado === "Bloqueado") throw new ApiError(409, "La cuenta está bloqueada: actívala para poder enviar el código.");
    enviarCorreo("otp", p.email, { codigo: String(Math.floor(100000 + Math.random() * 900000)), minutos: 10 }, { destinatario: p.nombre, participanteId: p.id });
    return { correo: p.email };
  }],
  /** Cambia el correo al que llegan los códigos de acceso: valida el formato y que no lo use otra persona; queda en auditoría. */
  ["POST", "admin/participantes/:id/correo", ({ params, body }) => {
    const p = db.admin.participantes.find((x: any) => x.id === params["id"]);
    if (!p) throw new ApiError(404, "Participante no encontrado");
    const nuevo = String(body?.email ?? "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nuevo)) throw new ApiError(422, "Escribe un correo válido (ej. nombre@correo.com).");
    if (nuevo === String(p.email).toLowerCase()) throw new ApiError(422, "Ese ya es el correo de acceso actual.");
    if (db.admin.participantes.some((x: any) => x.id !== p.id && String(x.email).toLowerCase() === nuevo)) throw new ApiError(409, "Ese correo ya lo usa otro participante.");
    const anterior = p.email;
    p.email = nuevo;
    if (p.id === "p1") db.perfil.correo = nuevo; // la participante demo comparte su perfil con la sesión del sitio
    enviarCorreo("correo-cambiado", nuevo, { correoNuevo: nuevo }, { destinatario: p.nombre, participanteId: p.id });
    enviarCorreo("correo-cambiado", anterior, { correoNuevo: nuevo }, { destinatario: p.nombre, participanteId: p.id });
    return p;
  }],
  /** Envío de prueba de una campaña a una dirección del equipo (con datos de ejemplo). */
  ["POST", "admin/correos/campanas/prueba", ({ body }) => {
    const para = String(body?.para ?? "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(para)) throw new ApiError(422, "Escribe un correo válido para la prueba.");
    const c = body?.campana ?? {};
    return enviarCorreoLibre({ plantilla: `Campaña: ${c.nombre ?? "prueba"}`, plantillaId: "campana", para, destinatario: "Prueba", asunto: c.asunto ?? "", mensaje: c.mensaje ?? "", botonTexto: c.botonTexto, botonUrl: c.botonUrl, referencia: "Envío de prueba" });
  }],
  /** Envío de prueba de una plantilla (con datos de ejemplo) a un correo del equipo. */
  ["POST", "admin/correos/prueba", ({ body }) => {
    const para = String(body?.para ?? "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(para)) throw new ApiError(422, "Escribe un correo válido para la prueba.");
    const pl = (db.admin.plantillasCorreo as any[]).find((x) => x.id === body?.plantillaId);
    if (!pl) throw new ApiError(404, "Plantilla no encontrada");
    const antes = pl.activo;
    pl.activo = true; // la prueba se envía aunque la plantilla esté desactivada
    const mail = enviarCorreo(pl.id, para, { ...EJEMPLO_VARS }, { destinatario: "Prueba", referencia: "Envío de prueba" });
    pl.activo = antes;
    return mail;
  }],
  /** Vuelve a enviar un correo ya enviado (queda como un envío nuevo y suma un reenvío al original). */
  ["POST", "admin/correos/:id/reenviar", ({ params }) => {
    const o = (db.admin.correosEnviados as any[]).find((x) => x.id === params["id"]);
    if (!o) throw new ApiError(404, "Correo no encontrado");
    o.reenvios = (o.reenvios ?? 0) + 1;
    const d = new Date();
    const copia = { ...o, id: `ce${Date.now()}${Math.random().toString(36).slice(2, 6)}`, estado: "En cola", intentos: 0, error: "", proximoIntento: d.toISOString(), fechaISO: d.toISOString().slice(0, 10), fecha: d.toISOString().slice(0, 19).replace("T", " "), reenvios: 0, referencia: o.referencia ? `${o.referencia} (reenvío)` : "Reenvío" };
    (db.admin.correosEnviados as any[]).unshift(copia);
    reintentarCorreo(copia);
    return copia;
  }],
  /** Deja constancia de una carga masiva (qué se subió, cuántas entraron y qué filas se rechazaron y por qué). */
  ["POST", "admin/importaciones", ({ body }) => {
    const d = new Date();
    const errores = Array.isArray(body?.errores) ? body.errores.slice(0, 1000) : [];
    const reg = {
      id: `im${d.getTime()}${Math.random().toString(36).slice(2, 5)}`,
      tipo: String(body?.tipo ?? "Otro"), archivo: String(body?.archivo ?? ""), usuario: String(body?.usuario ?? "Panel"),
      ts: d.toISOString(), fecha: d.toLocaleString("es-EC", { dateStyle: "short", timeStyle: "short" }), fechaISO: d.toISOString().slice(0, 10),
      total: Number(body?.total) || 0, importadas: Number(body?.importadas) || 0, conErrores: Number(body?.conErrores) || errores.length,
      errores, columnas: Array.isArray(body?.columnas) ? body.columnas : [],
    };
    ((db.admin as any).importaciones ??= []).unshift(reg);
    return reg;
  }],
  /** Cuántos correos saldría una campaña con esa audiencia y cuántos participantes quedan fuera. */
  ["POST", "admin/correos/campanas/audiencia", ({ body }) => {
    const a = audienciaDe(body?.audiencia ?? { tipo: "todos" });
    return { total: a.total, excluidos: a.excluidos, muestra: a.destinatarios.slice(0, 5).map((p: any) => ({ nombre: p.nombre, email: p.email })) };
  }],
  /** Envía la campaña: un correo en cola por destinatario, con el diseño de marca. */
  ["POST", "admin/correos/campanas/enviar", ({ body }) => {
    const c = body?.campana;
    if (!c?.nombre?.trim() || !c?.asunto?.trim() || !c?.mensaje?.trim()) throw new ApiError(422, "La campaña necesita nombre, asunto y mensaje.");
    if (audienciaDe(c.audiencia).total === 0) throw new ApiError(422, "La audiencia elegida no tiene destinatarios.");
    return enviarCampana({ ...c, id: c.id || `cm${Date.now()}` }, String(body?.por ?? "Panel"));
  }],
  /** Reintenta un envío que falló por un error temporal del proveedor. Un rebote (buzón inexistente) no se reintenta: hay que corregir la dirección. */
  ["POST", "admin/correos/:id/reintentar", ({ params }) => {
    const m = (db.admin.correosEnviados as any[]).find((x) => x.id === params["id"]);
    if (!m) throw new ApiError(404, "Correo no encontrado");
    if (m.estado !== "Fallido") throw new ApiError(409, m.estado === "Rebotado" ? "El buzón no existe: corrige la dirección del participante antes de volver a enviar." : "Solo se reintentan los envíos fallidos.");
    reintentarCorreo(m);
    return m;
  }],
  /** Restaura una plantilla (o todas) a su texto de fábrica. */
  ["POST", "admin/correos/restaurar", ({ body }) => {
    const base = PLANTILLAS_BASE.map((x) => structuredClone(x));
    if (body?.plantillaId) {
      const i = (db.admin.plantillasCorreo as any[]).findIndex((x) => x.id === body.plantillaId);
      const b = base.find((x) => x.id === body.plantillaId);
      if (i < 0 || !b) throw new ApiError(404, "Plantilla no encontrada");
      db.admin.plantillasCorreo[i] = b;
    } else db.admin.plantillasCorreo = base;
    return db.admin.plantillasCorreo;
  }],
  /** Ajustes de envío: copia oculta (CCO). */
  ["GET", "admin/correos/ajustes", () => ({ ...AJUSTES_BASE, ...((db.admin as any).ajustesCorreo ?? {}) })],
  ["PUT", "admin/correos/ajustes", ({ body }) => {
    const c = body?.cco ?? {};
    const lista: string[] = Array.isArray(c.direcciones) ? c.direcciones.map((d: unknown) => String(d).trim().toLowerCase()).filter(Boolean) : [];
    const malas = lista.filter((d) => !correoValido(d));
    if (malas.length) throw new ApiError(422, `Dirección no válida: ${malas[0]}`);
    const direcciones = [...new Set(lista)];
    if (direcciones.length > MAX_CCO) throw new ApiError(422, `Puedes agregar hasta ${MAX_CCO} direcciones.`);
    if (c.activo && !direcciones.length) throw new ApiError(422, "Agrega al menos una dirección o desactiva la copia oculta.");
    (db.admin as any).ajustesCorreo = { cco: { activo: !!c.activo, direcciones, sistema: c.sistema !== false, campanas: c.campanas !== false } };
    return (db.admin as any).ajustesCorreo;
  }],
  ["GET", "admin/correos/diseno", () => ({ ...DISENO_BASE, ...(db.admin.disenoCorreo as any) })],
  ["PUT", "admin/correos/diseno", ({ body }) => {
    db.admin.disenoCorreo = { ...DISENO_BASE, ...body };
    return db.admin.disenoCorreo;
  }],
  /** Una pantalla describe su cambio con su propio texto; si el registro automático ya existe, solo se le cambia la descripción. */
  ["POST", "admin/auditoria", ({ body }) => {
    describir(body);
    return { ok: true };
  }],

  ["GET", "admin/resumen", () => ({
    kpis: db.admin.kpis,
    tendencia: db.admin.tendencia,
    hoy: db.admin.hoy,
    pedidos: db.compras.slice(0, 5),
    mensajes: db.admin.mensajes.filter((m) => m.estado !== "Respondido"),
  })],
  /** Reporte con datos reales para un rango (`desde`, `hasta`) y su comparación con el período anterior de igual duración. */
  /** Reportes por tipo: la lista de tipos y, para cada uno, indicadores, gráficos y definición de su tabla (la tabla se pide a admin/q/:coleccion). */
  ["GET", "admin/reportes/tipos", () => tiposReporte()],
  ["GET", "admin/reportes/t/:id", ({ params, query }) => reporteTipo(params["id"]!, query.get("desde") ?? "", query.get("hasta") ?? "")],
  ["GET", "admin/dashboard", ({ query }) => dashboard(query.get("desde") ?? "", query.get("hasta") ?? "")],
  ["GET", "admin/reportes/embudo", ({ query }) => embudo(query.get("desde") ?? "", query.get("hasta") ?? "")],
  ["GET", "admin/reportes/resumen", ({ query }) => reporteResumen(query.get("desde") ?? "", query.get("hasta") ?? "")],
  ["GET", "admin/reportes", () => ({
    tendencia: db.admin.tendencia,
    canal: [{ name: "Web", value: 46 }, { name: "App", value: 54 }],
    topBeneficios: db.catalogo.beneficios.slice(0, 6).map((b, i) => ({ name: b.marca, usos: [820, 640, 510, 430, 380, 290][i] ?? 100 })),
  })],
  /* ---------- Mi perfil (la persona que tiene la sesión del panel) ---------- */
  ["GET", "admin/perfil", () => {
    const u = usuarioActual();
    const rol = listarRoles().find((x) => x.rol === u.rol);
    return { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol, estado: u.estado ?? "Activo", ultimo: u.ultimo ?? "—", descripcionRol: rol?.descripcion ?? "", secciones: rol?.permisos ?? [] };
  }],
  ["PUT", "admin/perfil", ({ body }) => {
    const u = usuarioActual();
    const nombre = String(body?.nombre ?? "").trim().replace(/\s+/g, " ");
    const error = validarNombrePersona(nombre, "Tu nombre");
    if (error) throw new ApiError(422, error);
    if (nombre !== u.nombre) { u.nombre = nombre; registrarCuenta(u.id, "Cambió su nombre en Mi perfil"); }
    return { id: u.id, nombre: u.nombre };
  }],
  ["POST", "admin/perfil/clave", ({ body }) => {
    const u = usuarioActual();
    const cred = db.credenciales.find((c) => c.email.toLowerCase() === String(u.email).toLowerCase());
    if (!cred || cred.clave !== body?.actual) throw new ApiError(422, "La contraseña actual no es correcta.");
    const nueva = String(body?.nueva ?? "");
    const falta = requisitosClave(nueva, cred.clave).find((r) => !r.ok);
    if (falta) throw new ApiError(422, `La contraseña nueva no cumple: ${falta.texto.toLowerCase()}.`);
    cred.clave = nueva;
    registrarCuenta(u.id, "Cambió su contraseña");
    return { ok: true };
  }],
  /* ---------- Roles personalizados ---------- */
  ["POST", "admin/roles", ({ body }) => crearRol(body, usuarioPanel())],
  ["PUT", "admin/roles/:rol", ({ params, body }) => editarRol(params["rol"]!, body)],
  ["DELETE", "admin/roles/:rol", ({ params }) => eliminarRol(params["rol"]!)],
  /** Guías de ayuda publicadas que le tocan al rol de quien pregunta. */
  ["GET", "admin/ayuda", () => guiasDeQuienPregunta()],
  ["GET", "admin/meta", () => ({ roles: listarRoles(), provincias: db.admin.provincias, estadosPedido: db.admin.estadosPedido, hoy: db.admin.hoy })],
  ["PUT", "admin/sitio", ({ body }) => {
    db.config.sitio = body;
    return db.config.sitio;
  }],
  ["PUT", "admin/niveles", ({ body }) => {
    // Niveles y textos de "Mi nivel" se guardan juntos; los espacios sobrantes se limpian.
    db.niveles = body.niveles.map((n: any) => ({ ...n, beneficios: n.beneficios.map((b: string) => b.trim()).filter(Boolean) }));
    db.nivelesTexto = {
      subtitulo: String(body.subtitulo ?? "").trim(),
      intro: String(body.intro ?? "").trim(),
      reglas: (body.reglas as string[]).map((r) => r.trim()).filter(Boolean),
    };
    return { niveles: db.niveles, ...db.nivelesTexto };
  }],
];

/* Las tablas de los reportes usan la misma consulta paginada, pero bajo el permiso de Reportes (quien ve reportes no necesita acceso a cada módulo). */
adminRoutes.push(["GET", "admin/reportes/q/:col", adminRoutes.find((r) => r[1] === "admin/q/:col")![2]]);
