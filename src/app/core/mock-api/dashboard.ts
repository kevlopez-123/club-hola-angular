import type { AlertaDashboard, Dashboard, KpiReporte } from "../reportes-tipos";
import { embudo } from "./analitica";
import { db } from "./db";
import { reporteTipo } from "./reportes-tipos";
import { reporteResumen } from "./reportes";

const A = (x: unknown): any[] => (Array.isArray(x) ? x : []);

/** A qué reporte lleva cada indicador del Dashboard. */
const ENLACES: Record<string, string> = {
  compras: "canjes", ventas: "canjes", ticket: "resumen", anuladas: "canjes", activos: "participantes", altas: "participantes", conversion: "embudo",
};

/**
 * Todo lo que necesita el Dashboard para un rango, calculado con los datos del programa (no con factores de escala).
 * Los indicadores salen de los mismos reportes por tipo: así un número del Dashboard siempre coincide con el del reporte.
 */
export function dashboard(desde: string, hasta: string): Dashboard {
  const resumen = reporteTipo("resumen", desde, hasta); // valida el rango
  const de = (r: { kpis: KpiReporte[] }, id: string) => r.kpis.find((k) => k.id === id)!;
  const participantes = reporteTipo("participantes", desde, hasta);
  const emb = reporteTipo("embudo", desde, hasta);
  const kpis: KpiReporte[] = [
    de(resumen, "compras"), de(resumen, "ventas"), de(resumen, "ticket"), de(resumen, "anuladas"),
    de(participantes, "activos"), de(participantes, "altas"), de(emb, "conversion"),
  ];
  const r = reporteResumen(desde, hasta);
  const e = embudo(desde, hasta);

  const pedidosPorAtender = A(db.admin.pedidos).filter((p) => p.estadoAdmin === "Pendiente").length;
  const correosConProblema = A(db.admin.correosEnviados).filter((c) => c.estado === "Fallido" || c.estado === "Rebotado").length;
  const lotesCasiAgotados = A(db.admin.lotes).filter((l) => l.total > 0 && l.usados / l.total >= 0.8).length;
  const alertas: AlertaDashboard[] = [
    { id: "pedidos", nivel: "alta", titulo: "Pedidos por atender", detalle: "Confirmados o en preparación.", cantidad: pedidosPorAtender, enlace: "/admin/pedidos" },
    { id: "mensajes", nivel: "alta", titulo: "Mensajes sin atender", detalle: "Consultas nuevas de participantes.", cantidad: A(db.admin.mensajes).filter((m) => m.estado === "Nuevo").length, enlace: "/admin/atencion" },
    { id: "correos", nivel: "media", titulo: "Correos con problemas", detalle: "Rebotados o fallidos tras los reintentos.", cantidad: correosConProblema, enlace: "/admin/correos" },
    { id: "lotes", nivel: "info", titulo: "Lotes de códigos casi agotados", detalle: "Con el 80 % o más de los códigos usados.", cantidad: lotesCasiAgotados, enlace: "/admin/beneficios" },
  ].filter((a) => a.cantidad > 0) as AlertaDashboard[];

  return {
    hoy: (db.admin as any).hoy, desde, hasta, anterior: r.anterior,
    kpis, enlaces: ENLACES, alertas,
    serie: r.serie, canales: r.canales, topCompras: r.topCompras,
    embudo: e.pasos.map((p) => ({ etiqueta: p.etiqueta, visitas: p.visitas })),
    pedidos: [...A(db.admin.pedidos)].sort((a, b) => String(b.fechaISO).localeCompare(String(a.fechaISO))).slice(0, 6)
      .map((p) => ({ codigo: p.codigo, fecha: p.fecha, cliente: p.cliente, estadoAdmin: p.estadoAdmin, montoUSD: p.montoUSD ?? 0, entrega: p.entrega ?? "", items: A(p.items).map((i) => ({ nombre: i.nombre, marca: i.marca ?? "", cantidad: i.cantidad ?? 1 })) })),
    mensajes: A(db.admin.mensajes).filter((m) => m.estado !== "Respondido").slice(0, 5).map((m) => ({ id: m.id, asunto: m.asunto, nombre: m.nombre, email: m.email, mensaje: m.mensaje, fecha: m.fecha, estado: m.estado })),
  };
}
