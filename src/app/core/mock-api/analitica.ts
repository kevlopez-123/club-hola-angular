import { PASOS_EMBUDO, porcentaje, visitasPorPaso, type Embudo, type TipoEvento } from "../analitica";
import { esTipoEvento, MAX_EVENTOS, type EventoGuardado } from "./analitica-seed";
import { db } from "./db";
import { ApiError } from "./types";

const DIA = 864e5;
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const ms = (d: string) => new Date(d + "T00:00:00Z").getTime();

/** Guarda un evento anónimo. Se valida el tipo y se recorta lo que llega: nunca se guardan datos personales. */
export function registrarEvento(body: any) {
  if (!esTipoEvento(body?.tipo)) throw new ApiError(422, "Tipo de evento no válido.");
  const visita = String(body?.visita ?? "").slice(0, 40);
  if (!visita) throw new ApiError(422, "Falta el identificador de visita.");
  const e: EventoGuardado = { f: (db.admin as any).hoy, v: visita, t: body.tipo };
  if (body.itemId) {
    e.i = String(body.itemId).slice(0, 60);
    e.k = body.itemTipo === "beneficio" ? "b" : "p";
  }
  const lista = db.analitica;
  lista.push(e);
  if (lista.length > MAX_EVENTOS) lista.splice(0, lista.length - MAX_EVENTOS);
  return { ok: true };
}

export function pasosDe(desde: string, hasta: string) {
  const porVisita = new Map<string, Set<TipoEvento>>();
  for (const e of db.analitica) {
    if (e.f < desde || e.f > hasta) continue;
    (porVisita.get(e.v) ?? porVisita.set(e.v, new Set()).get(e.v)!).add(e.t);
  }
  return visitasPorPaso(porVisita.values());
}

const nombreDe = (id: string, k: "p" | "b") => {
  const lista = (k === "p" ? [] : db.admin.beneficios) as any[];
  const x = lista.find((y) => y.id === id);
  return x ? `${x.nombre}${x.marca ? ` · ${x.marca}` : ""}` : id;
};

/** Embudo de visitas únicas en el rango y comparación con el período anterior de la misma duración. */
export function embudo(desde: string, hasta: string): Embudo {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(desde) || !/^\d{4}-\d{2}-\d{2}$/.test(hasta)) throw new ApiError(422, "Indica un rango de fechas válido.");
  if (desde > hasta) throw new ApiError(422, "La fecha inicial debe ser anterior a la final.");
  const dias = Math.round((ms(hasta) - ms(desde)) / DIA) + 1;
  if (dias > 800) throw new ApiError(422, "El rango máximo es de 800 días.");
  const actual = pasosDe(desde, hasta);
  const previo = pasosDe(iso(ms(desde) - dias * DIA), iso(ms(desde) - DIA));

  const porItem = new Map<string, { k: "p" | "b"; vistas: number; carritos: number; canjes: number }>();
  let eventos = 0;
  for (const e of db.analitica) {
    if (e.f < desde || e.f > hasta) continue;
    eventos++;
    if (!e.i) continue;
    const clave = `${e.k}:${e.i}`;
    const fila = porItem.get(clave) ?? porItem.set(clave, { k: e.k ?? "p", vistas: 0, carritos: 0, canjes: 0 }).get(clave)!;
    if (e.t === "ver_item") fila.vistas++;
    else if (e.t === "agregar_carrito") fila.carritos++;
    else if (e.t === "canje") fila.canjes++;
  }
  return {
    desde, hasta, eventos,
    pasos: PASOS_EMBUDO.map((p, i) => ({
      tipo: p.tipo, etiqueta: p.etiqueta, visitas: actual[i]!, previo: previo[i]!,
      pasoAnterior: i === 0 ? 100 : porcentaje(actual[i]!, actual[i - 1]!),
      global: porcentaje(actual[i]!, actual[0]!),
    })),
    top: [...porItem.entries()]
      .map(([clave, f]) => ({ itemId: clave.slice(2), nombre: nombreDe(clave.slice(2), f.k), tipo: (f.k === "p" ? "producto" : "beneficio") as "producto" | "beneficio", vistas: f.vistas, carritos: f.carritos, canjes: f.canjes }))
      .sort((a, b) => b.vistas - a.vistas || b.canjes - a.canjes)
      .slice(0, 8),
  };
}
