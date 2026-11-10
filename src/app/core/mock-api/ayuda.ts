import { db } from "./db";
import { contexto } from "./contexto";
import { GUIAS_INICIALES, errorGuia, guiasPara, type Guia } from "../ayuda";
import { ApiError } from "./types";

/**
 * Centro de ayuda en la API simulada. `GET admin/ayuda` entrega las guías publicadas que le tocan al rol de quien pregunta; la
 * administración (crear, editar, despublicar) es la colección `guias` en `admin/c/guias`, con permiso de la sección Ayuda.
 */
export function asegurarGuias(): Guia[] {
  const a = db.admin as any;
  return (a.guias ??= structuredClone(GUIAS_INICIALES)) as Guia[];
}

/** Rol de la persona que hace la petición (el panel ya comprobó que ingresó). */
const rolDeQuienPregunta = (): string => (db.admin.usuarios as any[]).find((u) => u.id === contexto.usuarioPanelId)?.rol ?? "Solo lectura";

/** Guías publicadas dirigidas a este rol (o a todos), ordenadas por categoría. */
export function guiasDeQuienPregunta(): Guia[] {
  return guiasPara(asegurarGuias(), rolDeQuienPregunta());
}

/** El servidor valida las guías igual que el formulario del panel. */
export function exigirGuiaValida(g: Guia) {
  const e = errorGuia(g);
  if (e) throw new ApiError(422, e);
}
