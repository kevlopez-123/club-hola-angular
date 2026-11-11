import { db } from "./db";
import { coincideAudiencia, type AudienciaCampana, type Campana } from "../campanas";
import { enviarCorreoLibre } from "./correos";

/** Participantes a los que llegaría la campaña y cuántos quedan fuera (bloqueados o que no aceptan novedades). */
export function audienciaDe(a: AudienciaCampana) {
  const dentro = (db.admin.participantes as any[]).filter((p) => coincideAudiencia(a, p, String(p.nivel ?? "")));
  const destinatarios = dentro.filter((p) => p.estado === "Activo" && p.recibeNovedades !== false);
  return { destinatarios, total: destinatarios.length, excluidos: dentro.length - destinatarios.length };
}

/** Pone en cola un correo por cada destinatario y deja la campaña como enviada. */
export function enviarCampana(c: Campana, usuario: string): Campana {
  const { destinatarios, excluidos } = audienciaDe(c.audiencia);
  const d = new Date();
  const guardada: Campana = {
    ...c,
    estado: "Enviada",
    total: destinatarios.length,
    excluidos,
    creadaPor: usuario,
    fechaISO: d.toISOString().slice(0, 10),
    fecha: d.toISOString().slice(0, 19).replace("T", " "),
  };
  const lista = ((db.admin as any).campanas ??= []) as Campana[];
  const i = lista.findIndex((x) => x.id === c.id);
  if (i >= 0) lista[i] = guardada;
  else lista.unshift(guardada);
  for (const p of destinatarios) {
    enviarCorreoLibre({
      plantilla: `Campaña: ${c.nombre}`, plantillaId: "campana", para: p.email, destinatario: p.nombre, participanteId: p.id,
      asunto: c.asunto, mensaje: c.mensaje, botonTexto: c.botonTexto, botonUrl: c.botonUrl, campanaId: c.id, referencia: c.nombre,
    });
  }
  return guardada;
}