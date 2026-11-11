import { db } from "./db";
import { ApiError } from "./types";

export interface MetricasPeriodo {
  /** Compras pagadas en el período. */
  compras: number;
  /** Monto pagado (suma de las compras pagadas). */
  ventas: number;
  /** Ticket promedio de las compras pagadas. */
  ticket: number;
  anuladas: number;
}

const DIA = 864e5;
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const ms = (d: string) => new Date(d + "T00:00:00Z").getTime();
const dentro = (f: string | undefined, d: string, h: string) => !!f && f >= d && f <= h;

const pedidosEn = (d: string, h: string) => (db.admin.pedidos as any[]).filter((p) => dentro(p.fechaISO, d, h));

export function metricas(desde: string, hasta: string): MetricasPeriodo {
  const todos = pedidosEn(desde, hasta);
  const pagados = todos.filter((p) => p.estadoAdmin !== "Anulado");
  const ventas = Math.round(pagados.reduce((s, p) => s + (p.montoUSD ?? 0), 0) * 100) / 100;
  return {
    compras: pagados.length,
    ventas,
    ticket: pagados.length ? Math.round((ventas / pagados.length) * 100) / 100 : 0,
    anuladas: todos.length - pagados.length,
  };
}

/** Participantes con compras en el rango, agrupados por el canal con el que usan el programa. */
function participantesPorCanal(desde: string, hasta: string) {
  const activos = new Set<string>();
  for (const p of db.admin.pedidos as any[]) if (dentro(p.fechaISO, desde, hasta) && p.cliente) activos.add(p.cliente);
  const cuenta = new Map<string, number>();
  for (const p of db.admin.participantes as any[]) if (activos.has(p.nombre)) cuenta.set(p.canal, (cuenta.get(p.canal) ?? 0) + 1);
  return ["Web", "App", "Web + App"].map((name) => ({ name, value: cuenta.get(name) ?? 0 })).filter((c) => c.value > 0);
}

/** Beneficios más comprados (unidades) en las compras del rango. */
function topCompras(desde: string, hasta: string) {
  const unidades = new Map<string, number>();
  for (const p of db.admin.pedidos as any[]) {
    if (!dentro(p.fechaISO, desde, hasta) || p.estadoAdmin === "Anulado") continue;
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
  const ventasEn = (d: string, h: string) => metricas(d, h).ventas;
  const serie = Array.from({ length: n }, (_, i) => {
    const ini = ms(desde) + i * paso * DIA;
    const fin = Math.min(ms(hasta), ini + (paso - 1) * DIA);
    return {
      x: etiqueta(ini),
      ventas: ventasEn(iso(ini), iso(fin)),
      ventasPrevio: ventasEn(iso(ini - dias * DIA), iso(fin - dias * DIA)),
    };
  });
  return {
    hoy: (db.admin as any).hoy, desde, hasta, dias, anterior: { desde: antDesde, hasta: antHasta },
    actual: metricas(desde, hasta), previo: metricas(antDesde, antHasta), serie,
    canales: participantesPorCanal(desde, hasta), topCompras: topCompras(desde, hasta),
  };
}
