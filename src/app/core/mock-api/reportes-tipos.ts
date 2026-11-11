import { PASOS_EMBUDO } from "../analitica";
import type { ColumnaReporte, FiltroReporte, Formato, GraficoReporte, KpiReporte, ReporteTipo, TipoReporte } from "../reportes-tipos";
import { embudo, pasosDe } from "./analitica";
import { procesarCola } from "./correos";
import { db } from "./db";
import { estadoParticipante as estadoLegales } from "./legales";
import { metricas as metricasGenerales, reporteResumen } from "./reportes";
import { ApiError } from "./types";

const DIA = 864e5;
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const ms = (d: string) => new Date(d + "T00:00:00Z").getTime();
const enRango = (f: string | undefined, d: string, h: string) => !!f && f >= d && f <= h;
const suma = (xs: number[]) => xs.reduce((s, x) => s + x, 0);
const redondear = (n: number, dec = 2) => Math.round(n * 10 ** dec) / 10 ** dec;
const pct = (a: number, b: number) => (b ? redondear((a / b) * 100, 1) : 0);
const A = (x: unknown): any[] => (Array.isArray(x) ? x : []);

/** Cuenta por clave y devuelve las entradas de mayor a menor. */
function contar<T>(xs: T[], clave: (x: T) => string, peso: (x: T) => number = () => 1): [string, number][] {
  const m = new Map<string, number>();
  for (const x of xs) m.set(clave(x), (m.get(clave(x)) ?? 0) + peso(x));
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}
const opciones = (xs: string[]) => [...new Set(xs.filter(Boolean))].sort().map((v) => ({ v, l: v }));

interface Ctx { desde: string; hasta: string; dias: number }
/** Tramos del rango (día, semana o mes) para las series. */
function tramos({ desde, hasta, dias }: Ctx) {
  const paso = dias <= 31 ? 1 : dias <= 120 ? 7 : 30;
  return Array.from({ length: Math.ceil(dias / paso) }, (_, i) => {
    const ini = ms(desde) + i * paso * DIA;
    const d = new Date(ini);
    const dd = `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    return { x: paso === 1 ? dd : paso === 7 ? `Sem ${dd}` : dd, d: iso(ini), h: iso(Math.min(ms(hasta), ini + (paso - 1) * DIA)) };
  });
}
/** Serie: valor por tramo de las filas que caen en él (`fecha` ISO de cada fila). */
const serie = (c: Ctx, filas: any[], fecha: (f: any) => string | undefined, valor: (fs: any[]) => number) =>
  tramos(c).map((t) => valor(filas.filter((f) => enRango(fecha(f), t.d, t.h))));

interface Def extends TipoReporte {
  /** Reporte "foto del momento": los indicadores no se comparan con otro período. */
  instantanea?: boolean;
  kpis: { id: string; etiqueta: string; icono: string; formato: Formato; comparable?: boolean }[];
  metricas(desde: string, hasta: string): Record<string, number>;
  graficos(c: Ctx): GraficoReporte[];
  coleccion?: string;
  tablaTitulo?: string;
  tablaPorRango?: boolean;
  orden?: { k: string; dir: "asc" | "desc" };
  columnas?: ColumnaReporte[];
  filtros?(): FiltroReporte[];
  gestion?: { ruta: string; etiqueta: string; directo?: boolean };
  extra?(c: Ctx): ReporteTipo["extra"];
}

const pedidos = (d: string, h: string) => A(db.admin.pedidos).filter((m) => enRango(m.fechaISO, d, h));
const correos = (d: string, h: string) => A(db.admin.correosEnviados).filter((m) => enRango(m.fechaISO, d, h));
const unidadesDe = (p: any) => suma(A(p.items).map((i) => i.cantidad ?? 1));

/** "dd/mm/aaaa" (como guardan las altas) o ISO → "aaaa-mm-dd". */
export const altaISO = (alta: unknown): string => {
  const s = String(alta ?? "");
  const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : "";
};

const DEFS: Def[] = [
  {
    id: "resumen", titulo: "Resumen", icono: "LayoutDashboard", descripcion: "Visión general del programa: compras de beneficios y su monto.",
    kpis: [
      { id: "compras", etiqueta: "Compras pagadas", icono: "ShoppingBag", formato: "n" },
      { id: "ventas", etiqueta: "Monto pagado", icono: "DollarSign", formato: "usd" },
      { id: "ticket", etiqueta: "Ticket promedio", icono: "Receipt", formato: "usd" },
      { id: "anuladas", etiqueta: "Compras anuladas", icono: "AlertCircle", formato: "n" },
    ],
    metricas: (d, h) => ({ ...metricasGenerales(d, h) }),
    graficos: (c) => {
      const r = reporteResumen(c.desde, c.hasta);
      return [
        { id: "serie", titulo: "Monto pagado en el tiempo", tipo: "bar", etiquetas: r.serie.map((s) => s.x), series: [
          { label: "Período actual", data: r.serie.map((s) => s.ventas), color: "--primary" },
          { label: "Período anterior", data: r.serie.map((s) => s.ventasPrevio), color: "--muted-foreground" },
        ] },
        { id: "canal", titulo: "Participantes activos por canal", tipo: "doughnut", etiquetas: r.canales.map((x) => x.name), series: [{ label: "Participantes", data: r.canales.map((x) => x.value) }] },
        { id: "top", titulo: "Más comprados (unidades)", tipo: "bar", horizontal: true, etiquetas: r.topCompras.map((x) => x.name), series: [{ label: "Unidades", data: r.topCompras.map((x) => x.unidades), color: "--primary" }] },
      ];
    },
  },
  {
    id: "canjes", titulo: "Compras", icono: "ShoppingBag", descripcion: "Compras de beneficios con tarjeta: volumen, estado y lo más comprado.",
    kpis: [
      { id: "pedidos", etiqueta: "Compras", icono: "ShoppingBag", formato: "n" },
      { id: "unidades", etiqueta: "Unidades compradas", icono: "Package", formato: "n" },
      { id: "usd", etiqueta: "Monto pagado", icono: "DollarSign", formato: "usd" },
      { id: "ticket", etiqueta: "Ticket promedio", icono: "Receipt", formato: "usd" },
      { id: "pagadas", etiqueta: "Compras pagadas", icono: "CheckCircle2", formato: "pct" },
    ],
    metricas: (d, h) => {
      const p = pedidos(d, h);
      const pagadas = p.filter((x) => x.estadoAdmin !== "Anulado");
      const usd = redondear(suma(pagadas.map((x) => x.montoUSD ?? 0)));
      return {
        pedidos: p.length, unidades: suma(pagadas.map(unidadesDe)), usd,
        ticket: pagadas.length ? redondear(usd / pagadas.length) : 0, pagadas: pct(pagadas.length, p.length),
      };
    },
    graficos: (c) => {
      const p = pedidos(c.desde, c.hasta);
      const estados = contar(p, (x) => x.estadoAdmin);
      const top = contar(p.flatMap((x) => A(x.items)), (i) => i.nombre, (i) => i.cantidad ?? 1).slice(0, 8);
      return [
        { id: "serie", titulo: "Compras en el tiempo", tipo: "bar", etiquetas: tramos(c).map((t) => t.x), series: [{ label: "Compras", color: "--primary", data: serie(c, p, (f) => f.fechaISO, (fs) => fs.length) }] },
        { id: "estado", titulo: "Compras por estado", tipo: "doughnut", etiquetas: estados.map(([k]) => k), series: [{ label: "Compras", data: estados.map(([, v]) => v) }] },
        { id: "top", titulo: "Más comprados (unidades)", tipo: "bar", horizontal: true, etiquetas: top.map(([k]) => k), series: [{ label: "Unidades", color: "--primary", data: top.map(([, v]) => v) }] },
      ];
    },
    coleccion: "pedidos", tablaTitulo: "Compras", tablaPorRango: true, orden: { k: "fechaISO", dir: "desc" },
    columnas: [
      { k: "codigo", l: "Código" }, { k: "estadoAdmin", l: "Estado", tipo: "estado", ancho: "completo", sinEtiqueta: true },
      { k: "fecha", l: "Fecha", ancho: "mitad", ordenPor: "fechaISO" }, { k: "cliente", l: "Participante", ancho: "mitad" },
      { k: "items", l: "Ítems", tipo: "cant", ancho: "mitad" }, { k: "montoUSD", l: "Monto", tipo: "usd" },
    ],
    filtros: () => [{ k: "estadoAdmin", l: "Estado", opciones: opciones(A(db.admin.estadosPedido)) }],
    gestion: { ruta: "/admin/pedidos", etiqueta: "Gestionar en Compras" },
  },
  {
    id: "participantes", titulo: "Participantes", icono: "Users", instantanea: true, descripcion: "Base de participantes: altas, canal, estado y consentimiento de comunicaciones.",
    kpis: [
      { id: "total", etiqueta: "Participantes", icono: "Users", formato: "n" },
      { id: "activos", etiqueta: "Activos", icono: "CheckCircle2", formato: "n" },
      { id: "bloqueados", etiqueta: "Bloqueados", icono: "AlertCircle", formato: "n" },
      { id: "altas", etiqueta: "Altas en el período", icono: "UserPlus", formato: "n", comparable: true },
      { id: "novedades", etiqueta: "Aceptan novedades", icono: "Mail", formato: "pct" },
      { id: "legales", etiqueta: "Pendientes de aceptar textos", icono: "FileText", formato: "n" },
    ],
    metricas: (d, h) => {
      const p = A(db.admin.participantes);
      return {
        legales: p.filter((x) => x.estado === "Activo" && estadoLegales(x.id).pendientes.length > 0).length,
        total: p.length, activos: p.filter((x) => x.estado === "Activo").length, bloqueados: p.filter((x) => x.estado !== "Activo").length,
        altas: p.filter((x) => enRango(altaISO(x.alta), d, h)).length, novedades: pct(p.filter((x) => x.recibeNovedades !== false).length, p.length),
      };
    },
    graficos: (c) => {
      const p = A(db.admin.participantes);
      const canal = contar(p, (x) => x.canal);
      const estado = contar(p, (x) => x.estado);
      const nov = contar(p, (x) => (x.recibeNovedades === false ? "No aceptan" : "Aceptan"));
      return [
        { id: "altas", titulo: "Altas en el tiempo", tipo: "bar", etiquetas: tramos(c).map((t) => t.x), series: [{ label: "Altas", color: "--primary", data: serie(c, p, (f) => altaISO(f.alta), (fs) => fs.length) }] },
        { id: "canal", titulo: "Por canal", tipo: "doughnut", etiquetas: canal.map(([k]) => k), series: [{ label: "Participantes", data: canal.map(([, v]) => v) }] },
        { id: "estado", titulo: "Por estado de la cuenta", tipo: "doughnut", etiquetas: estado.map(([k]) => k), series: [{ label: "Participantes", data: estado.map(([, v]) => v) }] },
        { id: "novedades", titulo: "Comunicaciones por correo", tipo: "doughnut", etiquetas: nov.map(([k]) => k), series: [{ label: "Participantes", data: nov.map(([, v]) => v) }] },
      ];
    },
    coleccion: "participantes", tablaTitulo: "Participantes", tablaPorRango: false, orden: { k: "altaISO", dir: "desc" },
    // Tarjeta: nombre y estado arriba; alta junto al canal; documento junto a los puntos; y el correo.
    columnas: [
      { k: "nombre", l: "Participante" }, { k: "estado", l: "Estado", tipo: "estado", ancho: "completo", sinEtiqueta: true },
      { k: "alta", l: "Alta", ancho: "mitad", ordenPor: "altaISO" }, { k: "canal", l: "Canal", ancho: "mitad" },
      { k: "cedula", l: "Documento", ancho: "mitad" }, { k: "email", l: "Correo" },
    ],
    filtros: () => [
      { k: "estado", l: "Estado", opciones: [{ v: "Activo", l: "Activo" }, { v: "Bloqueado", l: "Bloqueado" }] },
      { k: "canal", l: "Canal", opciones: opciones(["Web", "App", "Web + App"]) },
      { k: "recibeNovedades", l: "Novedades", opciones: [{ v: "true", l: "Aceptan" }, { v: "false", l: "No aceptan" }] },
    ],
    gestion: { ruta: "/admin/participantes", etiqueta: "Abrir la ficha", directo: true },
  },
  {
    id: "catalogo", titulo: "Catálogo", icono: "Package", instantanea: true, descripcion: "Beneficios activos, por tipo y cómo se reparten por marca.",
    kpis: [
      { id: "activos", etiqueta: "Beneficios activos", icono: "Package", formato: "n" },
      { id: "inactivos", etiqueta: "Beneficios ocultos", icono: "EyeOff", formato: "n" },
      { id: "exclusivos", etiqueta: "De pago (exclusivos)", icono: "Award", formato: "n" },
      { id: "marcas", etiqueta: "Marcas con beneficios", icono: "Tag", formato: "n" },
    ],
    metricas: () => {
      const todos = A(db.admin.beneficios);
      const p = todos.filter((x) => x.activo);
      return { activos: p.length, inactivos: todos.length - p.length, exclusivos: p.filter((x) => x.tipo === "compra").length, marcas: new Set(p.map((x) => x.marca)).size };
    },
    graficos: () => {
      const p = A(db.admin.beneficios).filter((x) => x.activo);
      const tipo = contar(p, (x) => (x.tipo === "compra" ? "Con pago" : "Cupón gratuito"));
      const marca = contar(p, (x) => x.marca).slice(0, 8);
      const cat = contar(p, (x) => x.categoria).slice(0, 8);
      return [
        { id: "tipo", titulo: "Cupones y compras", tipo: "doughnut", etiquetas: tipo.map(([k]) => k), series: [{ label: "Beneficios", data: tipo.map(([, v]) => v) }] },
        { id: "marca", titulo: "Beneficios por marca", tipo: "bar", etiquetas: marca.map(([k]) => k), series: [{ label: "Beneficios", color: "--primary", data: marca.map(([, v]) => v) }] },
        { id: "categoria", titulo: "Beneficios por categoría", tipo: "bar", horizontal: true, etiquetas: cat.map(([k]) => k), series: [{ label: "Beneficios", color: "--primary", data: cat.map(([, v]) => v) }] },
      ];
    },
    coleccion: "beneficios", tablaTitulo: "Beneficios", tablaPorRango: false, orden: { k: "nombre", dir: "asc" },
    columnas: [
      { k: "nombre", l: "Beneficio" }, { k: "activo", l: "Estado", tipo: "estado", ancho: "completo", sinEtiqueta: true, etiquetas: { true: "Activo", false: "Oculto" } },
      { k: "marca", l: "Marca", ancho: "mitad" }, { k: "categoria", l: "Categoría", ancho: "mitad" },
    ],
    filtros: () => [
      { k: "marca", l: "Marca", opciones: opciones(A(db.admin.beneficios).map((x) => x.marca)) },
      { k: "activo", l: "Estado", opciones: [{ v: "true", l: "Activo" }, { v: "false", l: "Oculto" }] },
    ],
    gestion: { ruta: "/admin/beneficios", etiqueta: "Editar en Beneficios" },
  },
  {
    id: "correos", titulo: "Correos", icono: "Mail", descripcion: "Entregabilidad: enviados, rebotados y fallidos, por plantilla.",
    kpis: [
      { id: "total", etiqueta: "Correos", icono: "Mail", formato: "n" },
      { id: "entregados", etiqueta: "Entregados", icono: "CheckCircle2", formato: "n" },
      { id: "entrega", etiqueta: "Tasa de entrega", icono: "Percent", formato: "pct" },
      { id: "rebotados", etiqueta: "Rebotados", icono: "AlertCircle", formato: "n" },
      { id: "fallidos", etiqueta: "Fallidos", icono: "AlertCircle", formato: "n" },
    ],
    metricas: (d, h) => {
      const c = correos(d, h);
      const ok = c.filter((x) => x.estado === "Enviado").length;
      return { total: c.length, entregados: ok, entrega: pct(ok, c.length), rebotados: c.filter((x) => x.estado === "Rebotado").length, fallidos: c.filter((x) => x.estado === "Fallido").length };
    },
    graficos: (c) => {
      const cs = correos(c.desde, c.hasta);
      const estado = contar(cs, (x) => x.estado);
      const plantilla = contar(cs, (x) => x.plantilla).slice(0, 8);
      return [
        { id: "serie", titulo: "Correos en el tiempo", tipo: "bar", etiquetas: tramos(c).map((t) => t.x), series: [{ label: "Correos", color: "--primary", data: serie(c, cs, (f) => f.fechaISO, (fs) => fs.length) }] },
        { id: "estado", titulo: "Por estado de entrega", tipo: "doughnut", etiquetas: estado.map(([k]) => k), series: [{ label: "Correos", data: estado.map(([, v]) => v) }] },
        { id: "plantilla", titulo: "Más enviados (plantilla o campaña)", tipo: "bar", horizontal: true, etiquetas: plantilla.map(([k]) => k), series: [{ label: "Correos", color: "--primary", data: plantilla.map(([, v]) => v) }] },
      ];
    },
    coleccion: "correosEnviados", tablaTitulo: "Correos enviados", tablaPorRango: true, orden: { k: "fecha", dir: "desc" },
    columnas: [
      { k: "fecha", l: "Fecha" }, { k: "plantilla", l: "Plantilla" }, { k: "para", l: "Para" }, { k: "asunto", l: "Asunto" },
      { k: "estado", l: "Estado", tipo: "estado" }, { k: "intentos", l: "Intentos", tipo: "n" },
    ],
    filtros: () => [
      { k: "estado", l: "Estado", opciones: opciones(["En cola", "Enviado", "Reintentando", "Rebotado", "Fallido"]) },
      { k: "plantilla", l: "Plantilla", opciones: opciones(A(db.admin.correosEnviados).map((x) => x.plantilla)) },
    ],
    gestion: { ruta: "/admin/correos", etiqueta: "Ver en Correos" },
  },
  {
    id: "embudo", titulo: "Embudo de canje", icono: "Filter", descripcion: "Visitas anónimas que vieron, agregaron, iniciaron el pago y completaron el canje (solo con analítica aceptada).",
    kpis: [
      { id: "vieron", etiqueta: PASOS_EMBUDO[0]!.etiqueta, icono: "Eye", formato: "n" },
      { id: "carrito", etiqueta: PASOS_EMBUDO[1]!.etiqueta, icono: "ShoppingCart", formato: "n" },
      { id: "pago", etiqueta: PASOS_EMBUDO[2]!.etiqueta, icono: "CreditCard", formato: "n" },
      { id: "canje", etiqueta: PASOS_EMBUDO[3]!.etiqueta, icono: "CheckCircle2", formato: "n" },
      { id: "conversion", etiqueta: "Conversión (de la vista al canje)", icono: "Percent", formato: "pct" },
    ],
    metricas: (d, h) => {
      const [v, c, p, k] = pasosDe(d, h) as [number, number, number, number];
      return { vieron: v, carrito: c, pago: p, canje: k, conversion: pct(k, v) };
    },
    graficos: (c) => {
      const e = embudo(c.desde, c.hasta);
      return [{ id: "pasos", titulo: "Visitas únicas por paso", tipo: "bar", horizontal: true, etiquetas: e.pasos.map((p) => p.etiqueta), series: [{ label: "Visitas", color: "--primary", data: e.pasos.map((p) => p.visitas) }] }];
    },
    extra: (c) => {
      const e = embudo(c.desde, c.hasta);
      return {
        titulo: "Artículos con más interés",
        columnas: [{ k: "nombre", l: "Artículo" }, { k: "tipo", l: "Tipo" }, { k: "vistas", l: "Vistas", tipo: "n" }, { k: "carritos", l: "Al carrito", tipo: "n" }, { k: "canjes", l: "Canjes", tipo: "n" }],
        filas: e.top.map((t) => ({ nombre: t.nombre, tipo: t.tipo === "producto" ? "Producto" : "Beneficio", vistas: t.vistas, carritos: t.carritos, canjes: t.canjes })),
      };
    },
  },
];

export const tiposReporte = (): TipoReporte[] => DEFS.map(({ id, titulo, descripcion, icono }) => ({ id, titulo, descripcion, icono }));

export function reporteTipo(id: string, desde: string, hasta: string): ReporteTipo {
  const def = DEFS.find((d) => d.id === id);
  if (!def) throw new ApiError(404, "Ese reporte no existe.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(desde) || !/^\d{4}-\d{2}-\d{2}$/.test(hasta)) throw new ApiError(422, "Indica un rango de fechas válido.");
  if (desde > hasta) throw new ApiError(422, "La fecha inicial debe ser anterior a la final.");
  const dias = Math.round((ms(hasta) - ms(desde)) / DIA) + 1;
  if (dias > 800) throw new ApiError(422, "El rango máximo es de 800 días.");
  if (def.coleccion === "correosEnviados") procesarCola(); // el proveedor ya pudo entregar lo que estaba en cola
  const anterior = { desde: iso(ms(desde) - dias * DIA), hasta: iso(ms(desde) - DIA) };
  const actual = def.metricas(desde, hasta);
  const previo = def.metricas(anterior.desde, anterior.hasta);
  const kpis: KpiReporte[] = def.kpis.map((k) => ({
    id: k.id, etiqueta: k.etiqueta, icono: k.icono, formato: k.formato, valor: actual[k.id] ?? 0,
    previo: def.instantanea && !k.comparable ? null : (previo[k.id] ?? 0),
  }));
  const extra = def.extra?.({ desde, hasta, dias });
  return {
    id: def.id, titulo: def.titulo, descripcion: def.descripcion, icono: def.icono, desde, hasta,
    anterior: def.instantanea && !def.kpis.some((k) => k.comparable) ? null : anterior,
    kpis, graficos: def.graficos({ desde, hasta, dias }),
    coleccion: def.coleccion ?? "", tablaTitulo: def.tablaTitulo ?? "", tablaPorRango: def.tablaPorRango ?? false,
    ...(def.orden ? { orden: def.orden } : {}),
    columnas: def.columnas ?? [], filtros: def.filtros?.() ?? [],
    ...(def.gestion ? { gestion: def.gestion } : {}), ...(extra ? { extra } : {}),
  };
}
