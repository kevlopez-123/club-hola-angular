import { db } from "./db";
import { ApiError } from "./types";

export interface MetricasPeriodo {
  emitidos: number;
  canjeados: number;
  /** canjeados / emitidos, en %. */
  tasaCanje: number;
  comprasPuntos: number;
  comprasPuntosUSD: number;
  pedidos: number;
  puntosEnPedidos: number;
  cotizaciones: number;
}

const DIA = 864e5;
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const ms = (d: string) => new Date(d + "T00:00:00Z").getTime();
const dentro = (f: string | undefined, d: string, h: string) => !!f && f >= d && f <= h;

export function metricas(desde: string, hasta: string): MetricasPeriodo {
  const movs = (db.admin.movimientos as any[]).filter((m) => dentro(m.fechaISO, desde, hasta));
  const emitidos = movs.filter((m) => m.puntos > 0).reduce((s, m) => s + m.puntos, 0);
  const canjeados = movs.filter((m) => m.puntos < 0).reduce((s, m) => s - m.puntos, 0);
  const compras = (db.admin.comprasPuntos as any[]).filter((c) => c.estado === "Aprobada" && dentro(c.fechaISO, desde, hasta));
  const pedidos = (db.admin.pedidos as any[]).filter((p) => dentro(p.fechaISO, desde, hasta));
  const cotizaciones = ((db as any).cotizaciones as any[]).filter((c) => dentro(c.fecha, desde, hasta));
  return {
    emitidos, canjeados, tasaCanje: emitidos ? Math.round((canjeados / emitidos) * 1000) / 10 : 0,
    comprasPuntos: compras.length, comprasPuntosUSD: Math.round(compras.reduce((s, c) => s + (c.monto ?? 0), 0) * 100) / 100,
    pedidos: pedidos.length, puntosEnPedidos: pedidos.reduce((s, p) => s + (p.puntosUsados ?? 0), 0),
    cotizaciones: cotizaciones.length,
  };
}

/** Participantes con movimientos de puntos o pedidos en el rango, agrupados por el canal con el que usan el programa. */
function participantesPorCanal(desde: string, hasta: string) {
  const activos = new Set<string>();
  for (const m of db.admin.movimientos as any[]) if (dentro(m.fechaISO, desde, hasta) && m.cliente) activos.add(m.cliente);
  for (const p of db.admin.pedidos as any[]) if (dentro(p.fechaISO, desde, hasta) && p.cliente) activos.add(p.cliente);
  const cuenta = new Map<string, number>();
  for (const p of db.admin.participantes as any[]) if (activos.has(p.nombre)) cuenta.set(p.canal, (cuenta.get(p.canal) ?? 0) + 1);
  return ["Web", "App", "Web + App"].map((name) => ({ name, value: cuenta.get(name) ?? 0 })).filter((c) => c.value > 0);
}

/** Productos y beneficios más canjeados (unidades) en los pedidos del rango. */
function topCanjes(desde: string, hasta: string) {
  const unidades = new Map<string, number>();
  for (const p of db.admin.pedidos as any[]) {
    if (!dentro(p.fechaISO, desde, hasta)) continue;
    for (const i of p.items ?? []) unidades.set(i.nombre, (unidades.get(i.nombre) ?? 0) + (i.cantidad ?? 1));
  }
  return [...unidades.entries()].map(([name, unidades]) => ({ name, unidades })).sort((a, b) => b.unidades - a.unidades || a.name.localeCompare(b.name)).slice(0, 6);
}

/** Reporte calculado con los datos reales del programa para un rango y para el período inmediatamente anterior de la misma duración. */
export function reporteResumen(desde: string, hasta: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(desde) || !/^\d{4}-\d{2}-\d{2}$/.test(hasta)) throw new ApiError(422, "Indica un rango de fechas válido.");
  if (desde > hasta) throw new ApiError(422, "La fecha inicial debe ser anterior a la final.");
  const dias = Math.round((ms(hasta) - ms(desde)) / DIA) + 1;
  if (dias > 800) throw new ApiError(422, "El rango máximo es de 800 días.");
  const antHasta = iso(ms(desde) - DIA);
  const antDesde = iso(ms(desde) - dias * DIA);

  // Granularidad: día, semana o mes según lo largo del rango.
  const paso = dias <= 31 ? 1 : dias <= 120 ? 7 : 30;
  const n = Math.ceil(dias / paso);
  const etiqueta = (t: number) => {
    const d = new Date(t);
    const dd = `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    return paso === 1 ? dd : paso === 7 ? `Sem ${dd}` : `${dd}`;
  };
  const suma = (d: string, h: string, signo: 1 | -1) =>
    (db.admin.movimientos as any[]).filter((m) => dentro(m.fechaISO, d, h) && m.puntos * signo > 0).reduce((s, m) => s + Math.abs(m.puntos), 0);
  const serie = Array.from({ length: n }, (_, i) => {
    const ini = ms(desde) + i * paso * DIA;
    const fin = Math.min(ms(hasta), ini + (paso - 1) * DIA);
    return {
      x: etiqueta(ini),
      emitidos: suma(iso(ini), iso(fin), 1), canjeados: suma(iso(ini), iso(fin), -1),
      emitidosPrevio: suma(iso(ini - dias * DIA), iso(fin - dias * DIA), 1), canjeadosPrevio: suma(iso(ini - dias * DIA), iso(fin - dias * DIA), -1),
    };
  });
  return {
    hoy: (db.admin as any).hoy, desde, hasta, dias, anterior: { desde: antDesde, hasta: antHasta },
    actual: metricas(desde, hasta), previo: metricas(antDesde, antHasta), serie,
    canales: participantesPorCanal(desde, hasta), topCanjes: topCanjes(desde, hasta),
  };
}