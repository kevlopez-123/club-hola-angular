import type { AlertaDashboard, Dashboard, KpiReporte } from "../reportes-tipos";
import { embudo } from "./analitica";
import { db } from "./db";
import { reporteTipo } from "./reportes-tipos";
import { reporteResumen } from "./reportes";

const A = (x: unknown): any[] => (Array.isArray(x) ? x : []);

/** A qué reporte lleva cada indicador del Dashboard. */
const ENLACES: Record<string, string> = {
  emitidos: "puntos", canjeados: "puntos", pedidos: "canjes", comprasPuntosUSD: "ventas", activos: "participantes", altas: "participantes",
  tasaCanje: "resumen", conversion: "embudo", cotizaciones: "vuelos",
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
    de(resumen, "emitidos"), de(resumen, "canjeados"), de(resumen, "pedidos"), de(resumen, "comprasPuntosUSD"),
    de(participantes, "activos"), de(participantes, "altas"), de(resumen, "tasaCanje"), de(emb, "conversion"), de(resumen, "cotizaciones"),
  ];
  const r = reporteResumen(desde, hasta);
  const e = embudo(desde, hasta);

  const productosActivos = A(db.admin.productos).filter((p) => p.activo);
  const pedidosPorAtender = A(db.admin.pedidos).filter((p) => p.estadoAdmin === "Confirmado" || p.estadoAdmin === "Preparando").length;
  const correosConProblema = A(db.admin.correosEnviados).filter((c) => c.estado === "Fallido" || c.estado === "Rebotado").length;
  const lotesCasiAgotados = A(db.admin.lotes).filter((l) => l.total > 0 && l.usados / l.total >= 0.8).length;
  const alertas: AlertaDashboard[] = [
    { id: "compras", nivel: "media", titulo: "Compras de puntos pendientes", detalle: "Pagos que el banco aún no confirma.", cantidad: A(db.admin.comprasPuntos).filter((c) => c.estado === "Pendiente").length, enlace: "/admin/compras-puntos" },
    { id: "pedidos", nivel: "alta", titulo: "Pedidos por atender", detalle: "Confirmados o en preparación.", cantidad: pedidosPorAtender, enlace: "/admin/pedidos" },
    { id: "mensajes", nivel: "alta", titulo: "Mensajes sin atender", detalle: "Consultas nuevas de participantes.", cantidad: A(db.admin.mensajes).filter((m) => m.estado === "Nuevo").length, enlace: "/admin/atencion" },
    { id: "cotizaciones", nivel: "media", titulo: "Cotizaciones de vuelos sin atender", detalle: "Enviadas y aún sin ejecutiva en revisión.", cantidad: [...A(db.cotizaciones), ...A((db as any).cotizacionesExtra)].filter((c) => c.estado === "Enviada").length, enlace: "/admin/cotizaciones" },
    { id: "correos", nivel: "media", titulo: "Correos con problemas", detalle: "Rebotados o fallidos tras los reintentos.", cantidad: correosConProblema, enlace: "/admin/correos" },
    { id: "lotes", nivel: "info", titulo: "Lotes de códigos casi agotados", detalle: "Con el 80 % o más de los códigos usados.", cantidad: lotesCasiAgotados, enlace: "/admin/beneficios" },
  ].filter((a) => a.cantidad > 0) as AlertaDashboard[];

  return {
    hoy: (db.admin as any).hoy, desde, hasta, anterior: r.anterior,
    kpis, enlaces: ENLACES, alertas,
    serie: r.serie, canales: r.canales, topCanjes: r.topCanjes,
    embudo: e.pasos.map((p) => ({ etiqueta: p.etiqueta, visitas: p.visitas })),
    pedidos: [...A(db.admin.pedidos)].sort((a, b) => String(b.fechaISO).localeCompare(String(a.fechaISO))).slice(0, 6)
      .map((p) => ({ codigo: p.codigo, fecha: p.fecha, cliente: p.cliente, estadoAdmin: p.estadoAdmin, puntosUsados: p.puntosUsados ?? 0, montoUSD: p.montoUSD ?? 0, entrega: p.entrega ?? "", items: A(p.items).map((i) => ({ nombre: i.nombre, marca: i.marca ?? "", cantidad: i.cantidad ?? 1 })) })),
    mensajes: A(db.admin.mensajes).filter((m) => m.estado !== "Respondido").slice(0, 5).map((m) => ({ id: m.id, asunto: m.asunto, nombre: m.nombre, email: m.email, mensaje: m.mensaje, fecha: m.fecha, estado: m.estado })),
    vistos: [...productosActivos].sort((a, b) => (b.vistas ?? 0) - (a.vistas ?? 0)).slice(0, 5).map((p) => ({ id: p.id, nombre: p.nombre, marca: p.marca, imagen: p.imagen, vistas: p.vistas ?? 0 })),
  };
}
