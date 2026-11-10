/** Correos transaccionales: catálogo de plantillas, variables y render. Lo comparten el panel y el backend simulado. */

export interface PlantillaCorreo {
  id: string;
  nombre: string;
  grupo: "Seguridad y acceso" | "Compras y puntos" | "Beneficios y vuelos" | "Alertas internas";
  descripcion: string;
  /** Cuándo se dispara. */
  evento: string;
  asunto: string;
  cuerpo: string;
  activo: boolean;
  /** Variables que acepta ({nombre}, {codigo}…). */
  variables: string[];
  /** Plantillas de seguridad: siempre activas, el panel solo edita el texto de apoyo. */
  fija?: boolean;
  /** Las alertas internas van al equipo, no al participante. */
  interna?: boolean;
  /** Botón de llamada a la acción que trae de fábrica (texto y enlace con variables). */
  boton?: { texto: string; url: string };
  /** Aviso dentro del sitio (campanita) que se crea junto con el correo. Admite las mismas variables. */
  notificar?: NotificacionPlantilla;
  /** Diseño del cuerpo por bloques (tipo editor de mailing). Si falta se arma con el título y el mensaje. */
  bloques?: BloqueCorreo[];
  /** Copia oculta propia de esta plantilla: "global" (por defecto) sigue los Ajustes; "propio" usa solo estas direcciones; "ninguno" no lleva copia. */
  cco?: { modo: "global" | "propio" | "ninguno"; direcciones: string[] };
}

/** Plantilla del aviso dentro del sitio. */
export interface NotificacionPlantilla {
  activo: boolean;
  titulo: string;
  texto: string;
  /** Ruta del sitio a la que lleva el aviso (puede usar variables, p. ej. /mis-compras/{codigo}). */
  enlace?: string;
  tipo: "pedido" | "puntos" | "beneficio" | "vuelo" | "cuenta" | "info";
}

export type TipoBloque = "titulo" | "texto" | "imagen" | "boton" | "divisor";
export interface BloqueCorreo {
  id: string;
  tipo: TipoBloque;
  texto?: string;
  url?: string;
  imagen?: string;
  alt?: string;
  alinear?: "left" | "center";
}

/** Marca de los correos. Un campo vacío usa el de la marca del programa. */
export interface DisenoCorreo {
  logo: string;
  banner: string;
  colorEncabezado: string;
  colorBoton: string;
  colorTextoBoton: string;
  colorFondo: string;
  colorTexto: string;
  fuente: string;
  /** Tipografía web: nombre en Google Fonts, "__marca__" para la de la marca, o vacío para usar solo la fuente segura. */
  fuenteWeb: string;
  pie: string;
  mostrarRedes: boolean;
}

/** Valor de `fuenteWeb` que significa "la tipografía de la marca del programa". */
export const FUENTE_MARCA = "__marca__";

export const DISENO_BASE: DisenoCorreo = {
  logo: "", banner: "", colorEncabezado: "", colorBoton: "", colorTextoBoton: "", colorFondo: "#f2f1f1", colorTexto: "#2b2b2b",
  fuente: "Arial, Helvetica, sans-serif", fuenteWeb: "", pie: "", mostrarRedes: true,
};

export const FUENTES_CORREO = [
  { v: "Arial, Helvetica, sans-serif", l: "Arial (moderna)" },
  { v: "Verdana, Geneva, sans-serif", l: "Verdana (amplia)" },
  { v: "\x27Trebuchet MS\x27, Helvetica, sans-serif", l: "Trebuchet (amigable)" },
  { v: "Tahoma, Geneva, sans-serif", l: "Tahoma (compacta)" },
  { v: "Georgia, \x27Times New Roman\x27, serif", l: "Georgia (clásica)" },
];

export type EstadoCorreo = "En cola" | "Reintentando" | "Enviado" | "Rebotado" | "Fallido";
/** Intentos de envío antes de dar un correo por fallido. */
export const MAX_INTENTOS_CORREO = 3;

export interface CorreoEnviado {
  id: string;
  plantillaId: string;
  plantilla: string;
  para: string;
  destinatario: string;
  asunto: string;
  cuerpo: string;
  /** HTML tal como salió (con el diseño de ese momento). */
  html?: string;
  estado: EstadoCorreo;
  fechaISO: string;
  fecha: string;
  participanteId?: string;
  referencia?: string;
  reenvios?: number;
  /** Intentos de envío hechos y último error del proveedor (o del buzón). */
  intentos?: number;
  error?: string;
  /** ISO: cuándo se vuelve a intentar un envío en cola o reintentando. */
  proximoIntento?: string;
  /** Campaña masiva a la que pertenece, si es de una. */
  campanaId?: string;
  /** Copia oculta (CCO) con la que salió: los destinatarios no la ven. */
  cco?: string[];
}

/** Ajustes de envío de los correos. */
export interface AjustesCorreo {
  cco: {
    activo: boolean;
    direcciones: string[];
    /** Correos automáticos a participantes (códigos, pedidos, puntos…). Los avisos internos del equipo no llevan copia. */
    sistema: boolean;
    campanas: boolean;
  };
}
export const AJUSTES_BASE: AjustesCorreo = { cco: { activo: false, direcciones: [], sistema: true, campanas: true } };
export const MAX_CCO = 10;

export const correoValido = (s: string) => /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]{2,}$/.test(s.trim());

/** Direcciones de la copia oculta que le tocan a un envío: ninguna si está apagada, si no aplica a ese tipo o si coincide con el destinatario. */
export function ccoPara(a: AjustesCorreo | undefined, tipo: "sistema" | "campana", para: string, plantilla?: Pick<PlantillaCorreo, "cco">): string[] {
  const propia = tipo === "sistema" ? plantilla?.cco : undefined;
  const destino = para.trim().toLowerCase();
  // Una plantilla puede tener su propia copia (reemplaza a la general, aunque la general esté apagada) o no llevar ninguna.
  if (propia?.modo === "ninguno") return [];
  if (propia?.modo === "propio") return propia.direcciones.filter((d) => correoValido(d) && d.toLowerCase() !== destino).slice(0, MAX_CCO);
  const c = a?.cco;
  if (!c?.activo || !(tipo === "campana" ? c.campanas : c.sistema)) return [];
  return c.direcciones.filter((d) => d.toLowerCase() !== destino);
}

const COMUN = ["nombre", "programa", "banco"];

const p = (
  id: string, grupo: PlantillaCorreo["grupo"], nombre: string, evento: string, asunto: string, cuerpo: string,
  variables: string[] = [], extra: Partial<PlantillaCorreo> = {},
): PlantillaCorreo => ({ id, grupo, nombre, descripcion: evento, evento, asunto, cuerpo, variables: [...COMUN, "sitio", ...variables], activo: true, ...extra });

/** Plantillas de fábrica. El panel las puede editar; "Restaurar" vuelve a estas. */
export const PLANTILLAS_BASE: PlantillaCorreo[] = [
  p("otp", "Seguridad y acceso", "Código de acceso", "El participante pide ingresar al sitio",
    "Tu código de acceso a {programa}", "Hola {nombre},\n\nTu código de acceso es {codigo}. Vence en {minutos} minutos.\n\nSi no lo pediste, ignora este correo.", ["codigo", "minutos"], { fija: true }),
  p("bienvenida", "Seguridad y acceso", "Bienvenida", "Se da de alta a un participante (individual o carga masiva)",
    "Te damos la bienvenida a {programa}", "Hola {nombre},\n\nYa eres parte de {programa}. Ingresa con tu documento y canjea tus puntos por productos, beneficios y vuelos.", [], { boton: { texto: "Ingresar a {programa}", url: "{sitio}/login" } }),
  p("correo-cambiado", "Seguridad y acceso", "Cambio de correo de acceso", "Se cambia el correo con el que el participante ingresa",
    "Cambiamos tu correo de acceso", "Hola {nombre},\n\nTu correo de acceso a {programa} ahora es {correoNuevo}. Si no fuiste tú, comunícate con atención al cliente.", ["correoNuevo"], { fija: true }),
  p("cuenta-bloqueada", "Seguridad y acceso", "Cuenta bloqueada", "Un administrador bloquea la cuenta",
    "Tu cuenta de {programa} fue bloqueada", "Hola {nombre},\n\nBloqueamos temporalmente tu cuenta. Para reactivarla comunícate con atención al cliente."),
  p("cuenta-activada", "Seguridad y acceso", "Cuenta reactivada", "Un administrador reactiva la cuenta",
    "Tu cuenta de {programa} está activa", "Hola {nombre},\n\nTu cuenta volvió a estar activa. Ya puedes ingresar y canjear tus puntos."),
  p("admin-invitacion", "Seguridad y acceso", "Invitación al panel", "Se crea un usuario del panel",
    "Te invitaron al panel de {programa}", "Hola {nombre},\n\nTe dieron acceso al panel con el rol {rol}. Ingresa y crea tu contraseña.", ["rol"]),

  p("pedido-confirmado", "Compras y puntos", "Pedido confirmado", "El participante completa un canje",
    "Recibimos tu pedido {codigo}", "Hola {nombre},\n\nRecibimos tu pedido {codigo}. Usaste {puntos} puntos. Te avisaremos cuando salga a entrega.", ["codigo", "puntos"], { boton: { texto: "Ver mis pedidos", url: "{sitio}/historial" } }),
  p("legales-actualizados", "Seguridad y acceso", "Textos legales actualizados", "Se publica una versión de Términos o Privacidad que exige aceptación",
    "Actualizamos {documento}", "Hola {nombre},\n\nPublicamos la versión {version} de {documento}. {entrada}\n\nQué cambió: {notas}\n\nLa próxima vez que ingreses a {programa} te pediremos leerla y aceptarla para continuar.", ["documento", "version", "entrada", "notas", "ruta"], { boton: { texto: "Leer el documento", url: "{sitio}{ruta}" } }),
  p("pedido-estado", "Compras y puntos", "Pedido: cambio de estado", "El panel cambia el estado de un pedido",
    "Tu pedido {codigo} está {estado}", "Hola {nombre},\n\nTu pedido {codigo} cambió a: {estado}.", ["codigo", "estado"]),
  p("compra-puntos-fallida", "Compras y puntos", "Pago de puntos rechazado", "Un pago de la compra de puntos es rechazado o falla",
    "No pudimos procesar tu pago {codigo}", "Hola {nombre},\n\nTu pago de la operación {codigo} no se completó: {motivo}.\n\nPuedes volver a intentarlo desde Compra de puntos; no se hizo ningún cargo.", ["codigo", "motivo"], { boton: { texto: "Reintentar mi compra", url: "{sitio}/mis-puntos/compra" } }),
  p("compra-puntos", "Compras y puntos", "Recibo de compra de puntos", "Se aprueba una compra de puntos",
    "Recibo de tu compra de puntos {codigo}", "Hola {nombre},\n\nAcreditamos {puntos} puntos por US$ {monto}. Operación {codigo}.", ["codigo", "puntos", "monto"]),
  p("puntos-por-vencer", "Compras y puntos", "Puntos por vencer", "Faltan pocos días para que venzan puntos",
    "Tienes puntos por vencer", "Hola {nombre},\n\n{puntos} de tus puntos vencen el {fecha}. Canjéalos antes en {programa}.", ["puntos", "fecha"]),
  p("nivel-cambio", "Compras y puntos", "Cambio de nivel", "El participante sube o baja de nivel",
    "Ahora eres nivel {nivel}", "Hola {nombre},\n\nTu nivel en {programa} es {nivel}. Revisa tus nuevos beneficios.", ["nivel"]),

  p("cupon-generado", "Beneficios y vuelos", "Cupón generado", "El participante genera el cupón de un beneficio",
    "Tu cupón de {beneficio}", "Hola {nombre},\n\nTu código para {beneficio} es {codigo}. Es válido por {horas} horas.", ["beneficio", "codigo", "horas"], { boton: { texto: "Ver mis beneficios", url: "{sitio}/mis-beneficios" } }),
  p("cotizacion-recibida", "Beneficios y vuelos", "Cotización recibida", "El participante envía una cotización de vuelo",
    "Recibimos tu cotización {codigo}", "Hola {nombre},\n\nRecibimos tu solicitud {codigo} ({origen} → {destino}). Una ejecutiva la revisará y te escribirá pronto.", ["codigo", "origen", "destino"], { boton: { texto: "Ver mis cotizaciones", url: "{sitio}/vuelos/cotizaciones" } }),
  p("cotizacion-estado", "Beneficios y vuelos", "Cotización: cambio de estado", "El panel cambia el estado de una cotización",
    "Tu cotización {codigo} está {estado}", "Hola {nombre},\n\nTu cotización {codigo} ({origen} → {destino}) cambió a: {estado}.", ["codigo", "origen", "destino", "estado"]),
  p("contacto-acuse", "Beneficios y vuelos", "Acuse de consulta", "El participante envía el formulario Contáctanos",
    "Recibimos tu consulta", "Hola {nombre},\n\nRecibimos tu consulta y te responderemos a este correo. Gracias por escribirnos.\n\n\"{consulta}\""  , ["consulta"]),

  p("lote-alerta", "Alertas internas", "Lote de códigos con poco stock", "Quedan pocos códigos sin usar en un lote",
    "Quedan {restantes} códigos de {beneficio}", "El lote de {beneficio} tiene {restantes} códigos sin usar. Carga un nuevo lote para no quedarte sin cupones.", ["beneficio", "restantes"], { interna: true }),
  p("equipo-cotizacion", "Alertas internas", "Nueva cotización para el equipo", "Llega una cotización nueva",
    "Nueva cotización {codigo}", "Llegó la cotización {codigo} de {nombre} ({origen} → {destino}). Asígnala desde el panel.", ["codigo", "origen", "destino"], { interna: true }),
];

/** Reemplaza {variable} por su valor; las que no se conocen se dejan visibles para detectar el error. */
export function renderPlantilla(texto: string, vars: Record<string, unknown>): string {
  return texto.replace(/\{(\w+)\}/g, (m, k) => (vars[k] === undefined || vars[k] === null ? m : String(vars[k])));
}

/** Valores de ejemplo para la vista previa y el envío de prueba. */
export const EJEMPLO_VARS: Record<string, string> = {
  nombre: "María Fernanda", programa: "Banco Solidario Puntos", banco: "Banco Solidario", codigo: "ABC-12345", minutos: "10",
  correoNuevo: "nuevo@correo.com", rol: "Atención", puntos: "2.500", monto: "25,00", estado: "En camino", fecha: "31/12/2026",
  nivel: "Oro", beneficio: "2x1 en entradas 2D", horas: "3", origen: "UIO", destino: "MAD", restantes: "12", consulta: "¿Cómo canjeo mis puntos?",
};

/** Avisos dentro del sitio de fábrica, por plantilla (las de seguridad y las internas no llevan). */
const NOTIFICACIONES_BASE: Record<string, NotificacionPlantilla> = {
  "pedido-confirmado": { activo: true, tipo: "pedido", titulo: "Recibimos tu pedido {codigo}", texto: "Usaste {puntos} puntos. Te avisaremos cuando salga a entrega.", enlace: "/mis-compras/{codigo}" },
  "legales-actualizados": { activo: true, tipo: "cuenta", titulo: "Actualizamos {documento}", texto: "Versión {version}. {notas}", enlace: "{ruta}" },
  "pedido-estado": { activo: true, tipo: "pedido", titulo: "Tu pedido {codigo} está {estado}", texto: "Revisa el detalle y el seguimiento de tu pedido.", enlace: "/mis-compras/{codigo}" },
  "compra-puntos-fallida": { activo: true, tipo: "puntos", titulo: "No pudimos procesar tu pago", texto: "{motivo}. Puedes reintentar la compra {codigo}.", enlace: "/mis-puntos/compra" },
  "compra-puntos": { activo: true, tipo: "puntos", titulo: "Acreditamos {puntos} puntos", texto: "Tu compra de puntos {codigo} fue aprobada.", enlace: "/mis-puntos/historial" },
  "puntos-por-vencer": { activo: true, tipo: "puntos", titulo: "Tienes puntos por vencer", texto: "{puntos} de tus puntos vencen el {fecha}. Canjéalos a tiempo.", enlace: "/canjea" },
  "nivel-cambio": { activo: true, tipo: "puntos", titulo: "Ahora eres nivel {nivel}", texto: "Revisa los beneficios de tu nuevo nivel.", enlace: "/mi-nivel" },
  "cupon-generado": { activo: true, tipo: "beneficio", titulo: "Tu cupón de {beneficio}", texto: "Código {codigo}, válido por {horas} horas.", enlace: "/mis-beneficios" },
  "cotizacion-recibida": { activo: true, tipo: "vuelo", titulo: "Recibimos tu cotización {codigo}", texto: "{origen} → {destino}. Una ejecutiva la revisará pronto.", enlace: "/vuelos/cotizaciones" },
  "cotizacion-estado": { activo: true, tipo: "vuelo", titulo: "Tu cotización {codigo} está {estado}", texto: "{origen} → {destino}. Revisa los detalles.", enlace: "/vuelos/cotizaciones" },
  "contacto-acuse": { activo: true, tipo: "info", titulo: "Recibimos tu consulta", texto: "Te responderemos al correo de tu cuenta.", enlace: "/contacto" },
  bienvenida: { activo: true, tipo: "info", titulo: "Te damos la bienvenida a {programa}", texto: "Canjea tus puntos por productos, beneficios y vuelos.", enlace: "/canjea" },
};
for (const p of PLANTILLAS_BASE) if (NOTIFICACIONES_BASE[p.id]) p.notificar = NOTIFICACIONES_BASE[p.id]!;

const nuevoId = () => `b${Math.random().toString(36).slice(2, 9)}`;

/** Bloques de una plantilla: los guardados, o título + mensaje (+ botón) cuando todavía no se diseñó. */
export function bloquesDe(p: Pick<PlantillaCorreo, "asunto" | "cuerpo" | "boton" | "bloques">): BloqueCorreo[] {
  if (p.bloques?.length) return p.bloques;
  const b: BloqueCorreo[] = [
    { id: nuevoId(), tipo: "titulo", texto: p.asunto, alinear: "left" },
    { id: nuevoId(), tipo: "texto", texto: p.cuerpo, alinear: "left" },
  ];
  if (p.boton) b.push({ id: nuevoId(), tipo: "boton", texto: p.boton.texto, url: p.boton.url, alinear: "left" });
  return b;
}
export const bloqueNuevo = (tipo: TipoBloque): BloqueCorreo => ({
  id: nuevoId(), tipo, alinear: "left",
  ...(tipo === "titulo" ? { texto: "Título" } : tipo === "texto" ? { texto: "Escribe tu mensaje. Puedes usar {nombre}." } : tipo === "boton" ? { texto: "Ver más", url: "{sitio}" } : {}),
});
/** Versión en texto plano (lista de enviados y clientes de correo sin HTML). */
export const textoPlano = (bloques: BloqueCorreo[], vars: Record<string, unknown>) =>
  bloques.filter((b) => b.tipo === "titulo" || b.tipo === "texto").map((b) => renderPlantilla(b.texto ?? "", vars)).join("\n\n");

const esc = (t: unknown) => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const urlSegura = (u: string, permitir: RegExp) => (permitir.test(u.trim()) ? u.trim() : "");

export interface EntornoCorreo {
  logoClaro: string;
  logoOscuro: string;
  primario: string;
  textoPrimario: string;
  /** Tipografía de la marca del programa (nombre en Google Fonts). */
  fuente?: string;
  programa: string;
  banco: string;
  redes: Record<string, string | undefined>;
}

/** Nombre de fuente apto para Google Fonts (solo letras, números y espacios); vacío si no lo es. */
export const nombreFuenteSeguro = (n: string | undefined) => (/^[A-Za-z0-9 ]{2,40}$/.test((n ?? "").trim()) ? (n ?? "").trim() : "");

/** HTML del correo con tablas y estilos en línea (compatible con Gmail, Outlook y móviles). */
export function renderCorreoHtml(bloques: BloqueCorreo[], d: DisenoCorreo, env: EntornoCorreo, vars: Record<string, unknown>): string {
  const c = {
    enc: d.colorEncabezado || env.primario, botonBg: d.colorBoton || env.primario, botonTx: d.colorTextoBoton || env.textoPrimario || "#ffffff",
    fondo: d.colorFondo || "#f2f1f1", texto: d.colorTexto || "#2b2b2b",
  };
  const pila = d.fuente || DISENO_BASE.fuente;
  // Tipografía web: la de la marca o una de Google Fonts, con la fuente segura como alternativa (Gmail y Outlook no descargan fuentes web).
  const web = nombreFuenteSeguro(d.fuenteWeb === FUENTE_MARCA ? env.fuente : d.fuenteWeb);
  const fuente = web ? `'${web}', ${pila}` : pila;
  const familia = web ? encodeURIComponent(web).replace(/%20/g, "+") : "";
  const hojaFuente = web ? `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${familia}:wght@400;700&amp;display=swap"><style>@import url('https://fonts.googleapis.com/css2?family=${familia}:wght@400;700&display=swap');</style>` : "";
  const r =(t?: string) => esc(renderPlantilla(t ?? "", vars)).replace(/\n/g, "<br>");
  const logo = d.logo || env.logoOscuro;
  const imgOk = /^(https?:\/\/|blob:|data:image\/|\/)/i;
  const hrefOk = /^(https?:\/\/|mailto:|tel:)/i;
  const cuerpo = bloques.map((b) => {
    const al = b.alinear === "center" ? "center" : "left";
    switch (b.tipo) {
      case "titulo": return `<tr><td style="padding:24px 32px 4px;text-align:${al};font:700 24px/1.3 ${fuente};color:${c.texto}">${r(b.texto)}</td></tr>`;
      case "texto": return `<tr><td style="padding:8px 32px;text-align:${al};font:400 15px/1.65 ${fuente};color:${c.texto}">${r(b.texto)}</td></tr>`;
      case "imagen": {
        const src = b.imagen && imgOk.test(b.imagen) ? esc(b.imagen) : "";
        return src ? `<tr><td style="padding:12px 0;text-align:center"><img src="${src}" alt="${esc(b.alt ?? "")}" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0"></td></tr>` : "";
      }
      case "boton": {
        const href = urlSegura(renderPlantilla(b.url ?? "", vars), hrefOk) || "#";
        return `<tr><td style="padding:16px 32px;text-align:${al}"><a href="${esc(href)}" style="display:inline-block;padding:13px 28px;border-radius:8px;background:${c.botonBg};color:${c.botonTx};font:700 15px/1 ${fuente};text-decoration:none">${r(b.texto)}</a></td></tr>`;
      }
      case "divisor": return `<tr><td style="padding:12px 32px"><div style="border-top:1px solid #e5e7eb;line-height:0;font-size:0">&nbsp;</div></td></tr>`;
    }
  }).join("");
  const redes = d.mostrarRedes
    ? Object.entries(env.redes).filter(([, u]) => u && hrefOk.test(u)).map(([k, u]) => `<a href="${esc(u)}" style="color:${c.texto};text-decoration:underline;margin:0 6px">${esc(k.charAt(0).toUpperCase() + k.slice(1))}</a>`).join("")
    : "";
  const banner = d.banner && imgOk.test(d.banner) ? `<tr><td><img src="${esc(d.banner)}" alt="" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0"></td></tr>` : "";
  // Los correos de campaña traen `bajaUrl`: enlace obligatorio para dejar de recibir novedades.
  const baja = typeof vars["bajaUrl"] === "string" ? urlSegura(vars["bajaUrl"], hrefOk) : "";
  const pie = r(d.pie || `Enviado por ${env.banco}. Este es un correo automático: no respondas a este mensaje.`)
    + (baja ? `<div style="margin-top:8px"><a href="${esc(baja)}" style="color:#6b7280;text-decoration:underline">Dejar de recibir novedades</a></div>` : "");
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${hojaFuente}<style>body{margin:0}img{-ms-interpolation-mode:bicubic}</style></head>
<body style="margin:0;padding:0;background:${c.fondo}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.fondo}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td align="center" style="background:${c.enc};padding:22px 24px">${logo && imgOk.test(logo) ? `<img src="${esc(logo)}" alt="${esc(env.programa)}" height="36" style="display:block;height:36px;max-width:220px;border:0;margin:0 auto">` : `<span style="font:800 20px ${fuente};color:${env.textoPrimario || "#fff"}">${esc(env.programa)}</span>`}</td></tr>
${banner}${cuerpo}<tr><td style="height:16px;line-height:16px;font-size:0">&nbsp;</td></tr>
<tr><td style="background:#fafafa;border-top:1px solid #e5e7eb;padding:18px 24px;text-align:center;font:400 12px/1.6 ${fuente};color:#6b7280">${redes ? `<div style="margin-bottom:8px">${redes}</div>` : ""}${pie}</td></tr>
</table></td></tr></table></body></html>`;
}
