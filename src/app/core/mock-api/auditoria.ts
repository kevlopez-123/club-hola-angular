import { NOMBRE_LEGAL, type TipoLegal } from "../legales";
import { db } from "./db";
import { SECCIONES, requisitoApi, type Seccion } from "../permisos";

/** Registro del panel (se guarda en `db.admin.auditoria`). `antes` / `despues` permiten ver qué cambió. */
export interface RegistroAuditoria {
  id: string;
  /** ISO con zona horaria (para ordenar y filtrar por fecha). */
  ts: string;
  /** dd/mm/aaaa hh:mm (como se muestra). */
  fecha: string;
  fechaISO: string;
  usuario: string;
  usuarioId?: string;
  rol?: string;
  seccion: string;
  accion: string;
  entidad?: string;
  antes?: unknown;
  despues?: unknown;
  /** Descrita por una pantalla (texto propio) en vez del automático. */
  descrita?: boolean;
}

const etiquetaSeccion = (s: Seccion) => SECCIONES.find((x) => x.id === s)?.etiqueta ?? s;
const MAX_TEXTO = 200;

/** Copia sin textos enormes (imágenes en base64, HTML largo) para no inflar el registro. */
function acotar(v: unknown, prof = 0): unknown {
  if (typeof v === "string") return v.length > MAX_TEXTO ? `(texto o imagen de ${v.length} caracteres)` : v;
  if (prof > 6 || v === null || typeof v !== "object") return v;
  if (Array.isArray(v)) return v.slice(0, 30).map((x) => acotar(x, prof + 1));
  // `version` es control interno de concurrencia: no es un dato que alguien edite.
  return Object.fromEntries(Object.entries(v as Record<string, unknown>).filter(([k]) => k !== "version").map(([k, x]) => [k, acotar(x, prof + 1)]));
}

const CLAVES: Record<string, string> = { participantes: "id", pedidos: "codigo", productos: "id", beneficios: "id", destinos: "slug", mensajes: "id", usuarios: "id", ciudades: "codigo", marcas: "id", comprasPuntos: "codigo", plantillasCorreo: "id", correosEnviados: "id" };
const claveDe = (c: string) => CLAVES[c] ?? "id";
const nombreDe = (it: any, col: string) => String(it?.nombre ?? it?.titulo ?? it?.label ?? it?.asunto ?? it?.codigo ?? it?.[claveDe(col)] ?? "");

const COLECCION_A_SECCION_NOMBRE = (col: string): string => {
  const r = requisitoApi("PUT", `admin/c/${col}/x`);
  return r ? etiquetaSeccion(r.secciones[0]!) : col;
};

export interface Captura {
  seccion: string;
  accion: string;
  entidad?: string;
  antes?: unknown;
  /** Qué leer del estado después de aplicar el cambio. */
  despues: () => unknown;
}

/** Foto del estado ANTES de ejecutar una petición del panel que modifica datos. Devuelve null si no se audita. */
export function capturar(metodo: string, ruta: string, body: any): Captura | null {
  const m = metodo.toUpperCase();
  if (m === "GET") return null;
  const p = ruta.replace(/^\/?(api\/)?/, "").split("?")[0]!.split("/");
  if (p[0] !== "admin" || p[1] === "auditoria") return null;
  const admin = db.admin as any;
  const q = p[1];

  if (q === "c") {
    const col = p[2]!;
    const lista = (admin[col] ?? []) as any[];
    const seccion = COLECCION_A_SECCION_NOMBRE(col);
    const k = claveDe(col);
    if (p[3] === "upsert") {
      const n = Array.isArray(body?.items) ? body.items.length : 0;
      return { seccion, accion: `Cargó ${n} registros en ${seccion} (crea los nuevos y actualiza los existentes)`, antes: { registros: lista.length }, despues: () => ({ registros: (admin[col] as any[]).length }) };
    }
    if (p[3] === "bulk") {
      const n = Array.isArray(body?.items) ? body.items.length : 0;
      return { seccion, accion: `Cargó ${n} registros en ${seccion}`, antes: { registros: lista.length }, despues: () => ({ registros: (admin[col] as any[]).length }) };
    }
    if (p[3]) {
      const clave = p[3];
      const previo = lista.find((x) => String(x[k]) === clave);
      const antes = previo ? structuredClone(previo) : undefined;
      if (m === "DELETE") return { seccion, accion: `Eliminó de ${seccion}: ${nombreDe(previo, col) || clave}`, entidad: clave, antes: acotar(antes), despues: () => undefined };
      return {
        seccion, entidad: clave, antes: acotar(antes),
        accion: `${previo ? "Editó" : "Creó"} en ${seccion}: ${nombreDe(body, col) || clave}`,
        despues: () => acotar((admin[col] as any[]).find((x) => String(x[k]) === clave)),
      };
    }
    // Lista completa (p. ej. usuarios o lotes): se guardan solo los elementos que cambian.
    const antesLista = structuredClone(lista);
    return {
      seccion, accion: `Actualizó la lista de ${seccion}`, antes: undefined,
      despues: () => {
        const ahora = (admin[col] ?? []) as any[];
        const clave = (x: any) => String(x?.[k] ?? JSON.stringify(x).slice(0, 40));
        const a = new Map(antesLista.map((x) => [clave(x), x]));
        const d = new Map(ahora.map((x) => [clave(x), x]));
        const antes: Record<string, unknown> = {};
        const despues: Record<string, unknown> = {};
        for (const [key, x] of d) if (!a.has(key) || JSON.stringify(a.get(key)) !== JSON.stringify(x)) { despues[key] = acotar(x); if (a.has(key)) antes[key] = acotar(a.get(key)); }
        for (const [key, x] of a) if (!d.has(key)) antes[key] = acotar(x);
        const cambios = Object.keys({ ...antes, ...despues }).length;
        return cambios ? { __antes: antes, __despues: despues } : undefined;
      },
    };
  }

  const simple = (seccion: Seccion, accion: string, leer: () => unknown): Captura => {
    const antes = acotar(structuredClone(leer()));
    return { seccion: etiquetaSeccion(seccion), accion, antes, despues: () => acotar(structuredClone(leer())) };
  };
  switch (q) {
    case "reglas": return simple("reglas", "Editó las reglas de puntos", () => ({ ...admin.reglas, condiciones: (db.config as any).condicionesCompra }));
    case "niveles": return simple("niveles", "Editó los niveles", () => ({ niveles: (db as any).niveles, texto: (db as any).nivelesTexto }));
    case "sitio": return simple("configuracion", "Editó los datos del programa", () => (db.config as any).sitio);
    case "config": {
      const claves = Object.keys(body ?? {});
      const seccion: Seccion = claves.includes("tenant") || claves.includes("sitio") ? "configuracion" : "contenido";
      return simple(seccion, `Editó ${claves.includes("tenant") ? "la marca" : claves.includes("sitio") ? "la configuración del sitio" : "el contenido del sitio"}`, () => Object.fromEntries(claves.map((c) => [c, (db.config as any)[c]])));
    }
    case "roles": {
      const nombre = decodeURIComponent(p[2] ?? "") || String(body?.rol ?? "");
      const accion = m === "DELETE" ? `Eliminó el rol «${nombre}»` : m === "POST" ? `Creó el rol «${nombre}»` : `Editó los permisos del rol «${nombre}»`;
      return simple("roles", accion, () => (admin.roles as any[]).filter((r) => r.rol === nombre).map((r) => ({ rol: r.rol, descripcion: r.descripcion, matriz: r.matriz })));
    }
    case "lotes": {
      const n = Array.isArray(body?.codigos) ? body.codigos.length : 0;
      const ben = (admin.beneficios as any[]).find((x: any) => x.id === body?.beneficioId);
      return { seccion: etiquetaSeccion("beneficios"), accion: `Cargó ${n} códigos al beneficio ${ben?.nombre ?? body?.beneficioId}`, entidad: String(body?.beneficioId ?? ""), despues: () => undefined };
    }
    case "legales": {
      const t = p[2] === "terminos" || p[2] === "privacidad" ? NOMBRE_LEGAL[p[2] as TipoLegal] : "";
      const texto = !t ? null : p[3] === "publicar" ? `Publicó una nueva versión de ${t}` : p[3] === "borrador" ? (m === "DELETE" ? `Descartó el borrador de ${t}` : `Guardó el borrador de ${t}`) : p[3] === "restaurar" ? `Cargó la versión ${p[4]} de ${t} como borrador` : null;
      if (!texto) return null;
      const estado = () => { const d = (admin as any).legales?.[p[2]!] ?? (db as any).legales?.[p[2]!]; return { versiones: d?.versiones?.length ?? 0, ultima: d?.versiones?.at(-1)?.version, vigenteDesde: d?.versiones?.at(-1)?.vigenteDesde, exigeAceptacion: d?.versiones?.at(-1)?.exigeAceptacion, borrador: !!d?.borrador }; };
      return simple("legales", texto, estado);
    }
    case "correos": {
      if (p[2] === "diseno") return simple("correos", "Editó el diseño de los correos", () => admin.disenoCorreo);
      if (p[2] === "ajustes") return simple("correos", "Editó los ajustes de los correos (copia oculta)", () => (admin as any).ajustesCorreo);
      if (p[2] === "restaurar") return simple("correos", "Restauró plantillas de correo a su texto original", () => admin.plantillasCorreo);
      return null; // envíos, pruebas y reenvíos: ya quedan en Correos → Enviados
    }
    case "compras-puntos": {
      const compra = (admin.comprasPuntos as any[]).find((x) => x.codigo === p[2]);
      const leer = () => { const c = (admin.comprasPuntos as any[]).find((x) => x.codigo === p[2]); return c ? { estado: c.estado, motivo: c.motivo } : undefined; };
      return { seccion: etiquetaSeccion("compras-puntos"), entidad: p[2], antes: acotar(structuredClone(compra ? { estado: compra.estado, motivo: compra.motivo } : undefined)), accion: `${body?.resultado === "aprobado" ? "Confirmó" : "Rechazó"} el pago de la compra de puntos ${p[2]}`, despues: () => acotar(leer()) };
    }
    case "cotizaciones": {
      const cot = ((db as any).cotizaciones as any[]).find((x) => x.codigo === p[2]);
      return {
        seccion: etiquetaSeccion("cotizaciones"), entidad: p[2], antes: acotar(structuredClone(cot ? { estado: cot.estado, monto: cot.monto, ejecutiva: cot.ejecutiva, nota: cot.nota } : undefined)),
        accion: body?.estado ? `Cambió la cotización ${p[2]} a ${body.estado}` : `Actualizó la cotización ${p[2]}`,
        despues: () => { const c2 = ((db as any).cotizaciones as any[]).find((x) => x.codigo === p[2]); return acotar(structuredClone(c2 ? { estado: c2.estado, monto: c2.monto, ejecutiva: c2.ejecutiva, nota: c2.nota } : undefined)); },
      };
    }
    case "participantes": {
      if (p[2] === "ajustes-masivos") {
        if (!body?.aplicar) return null; // la simulación no cambia nada
        const n = Array.isArray(body?.items) ? body.items.length : 0;
        return { seccion: etiquetaSeccion("participantes"), accion: `Aplicó un ajuste masivo de puntos (${n} filas)`, despues: () => undefined };
      }
      const part = admin.participantes.find((x: any) => x.id === p[2]);
      const quien = part?.nombre ?? p[2];
      if (p[3] === "codigo") return { seccion: etiquetaSeccion("participantes"), accion: `Reenvió el código de acceso a ${quien}`, entidad: p[2], despues: () => undefined };
      if (p[3] === "correo") {
        const c = simple("participantes", "", () => ({ email: admin.participantes.find((x: any) => x.id === p[2])?.email }));
        c.accion = `Cambió el correo de acceso de ${quien}: ${part?.email} → ${String(body?.email ?? "").trim().toLowerCase()}`;
        c.entidad = p[2];
        return c;
      }
      return null;
    }
    default: return null;
  }
}

const fmt = (d: Date) => d.toLocaleString("es-EC", { dateStyle: "short", timeStyle: "short" });

/** Escribe el registro con quién lo hizo. Une el aviso automático con el texto que haya enviado la pantalla en los últimos segundos. */
export function registrar(cap: Captura, usuarioId: string | null, rol: string | null) {
  const lista = ((db.admin as any).auditoria ??= []) as RegistroAuditoria[];
  const u = (db.admin.usuarios as any[]).find((x) => x.id === usuarioId);
  const despuesCrudo = cap.despues();
  let antes = cap.antes;
  let despues = despuesCrudo;
  if (despuesCrudo && typeof despuesCrudo === "object" && "__antes" in (despuesCrudo as object)) {
    antes = (despuesCrudo as any).__antes;
    despues = (despuesCrudo as any).__despues;
  }
  const ahora = new Date();
  const reciente = lista.find((r) => r.usuario === (u?.nombre ?? "Panel") && !r.antes && !r.despues && r.descrita && ahora.getTime() - new Date(r.ts ?? 0).getTime() < 15_000);
  if (reciente) {
    // La pantalla ya registró una descripción propia de este cambio: se le agrega el antes y después.
    Object.assign(reciente, { antes, despues, entidad: cap.entidad ?? reciente.entidad });
    return;
  }
  lista.unshift({
    id: `au${ahora.getTime()}${Math.random().toString(36).slice(2, 5)}`,
    ts: ahora.toISOString(), fecha: fmt(ahora), fechaISO: ahora.toISOString().slice(0, 10),
    usuario: u?.nombre ?? "Panel", ...(u ? { usuarioId: u.id } : {}), ...(rol ? { rol } : {}),
    seccion: cap.seccion, accion: cap.accion, ...(cap.entidad ? { entidad: cap.entidad } : {}),
    ...(antes !== undefined ? { antes } : {}), ...(despues !== undefined ? { despues } : {}),
  });
  if (lista.length > 2000) lista.length = 2000;
}

/** Entradas que describe una pantalla con su propio texto (POST admin/auditoria). Si el cambio automático ya está, solo le cambia el texto. */
export function describir(body: any) {
  const lista = ((db.admin as any).auditoria ??= []) as RegistroAuditoria[];
  const ahora = new Date();
  const usuario = String(body?.usuario ?? "Panel");
  const auto = lista.find((r) => r.usuario === usuario && !r.descrita && (r.antes !== undefined || r.despues !== undefined) && ahora.getTime() - new Date(r.ts ?? 0).getTime() < 15_000);
  if (auto) {
    auto.accion = String(body.accion);
    auto.descrita = true;
    if (body.seccion) auto.seccion = String(body.seccion);
    return;
  }
  lista.unshift({
    id: `au${ahora.getTime()}${Math.random().toString(36).slice(2, 5)}`,
    ts: ahora.toISOString(), fecha: fmt(ahora), fechaISO: ahora.toISOString().slice(0, 10),
    usuario, seccion: String(body?.seccion ?? "Usuarios"), accion: String(body?.accion ?? ""), descrita: true,
  });
}

/** Cambios que una persona hace en su propia cuenta del panel (nombre, contraseña). Nunca se guarda la contraseña. */
export function registrarCuenta(usuarioId: string, accion: string) {
  const lista = ((db.admin as any).auditoria ??= []) as RegistroAuditoria[];
  const u = (db.admin.usuarios as any[]).find((x) => x.id === usuarioId);
  const ahora = new Date();
  lista.unshift({
    id: `au${ahora.getTime()}${Math.random().toString(36).slice(2, 5)}`,
    ts: ahora.toISOString(), fecha: fmt(ahora), fechaISO: ahora.toISOString().slice(0, 10),
    usuario: u?.nombre ?? "Panel", usuarioId, ...(u?.rol ? { rol: u.rol } : {}), seccion: "Acceso", accion,
  });
}

/** Accesos al panel (correctos y fallidos). Nunca se guarda la contraseña. */
export function registrarAcceso(ok: boolean, email: string, nombre?: string, rol?: string, id?: string) {
  const lista = ((db.admin as any).auditoria ??= []) as RegistroAuditoria[];
  const ahora = new Date();
  lista.unshift({
    id: `au${ahora.getTime()}${Math.random().toString(36).slice(2, 5)}`,
    ts: ahora.toISOString(), fecha: fmt(ahora), fechaISO: ahora.toISOString().slice(0, 10),
    usuario: nombre ?? email, ...(id ? { usuarioId: id } : {}), ...(rol ? { rol } : {}),
    seccion: "Acceso", accion: ok ? "Ingresó al panel" : `Intento fallido de ingreso (${email})`,
  });
}