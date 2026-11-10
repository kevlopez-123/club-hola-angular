import { db } from "./db";
import { ApiError } from "./types";
import { POPUPS_INICIALES, popupsVisibles, publicoDe, type CanalPopup, type Popup, type PopupPublico } from "../popups";

/**
 * Pop-ups en la API simulada. Admin: colección `popups` (CRUD en `admin/c/popups`, con permiso de la sección Pop-ups).
 * Público (sitio y app): `GET popups?canal=web|app&pagina=inicio|otra` y `POST popups/:id/evento { canal, tipo }`.
 */

const hoyIso = () => new Date().toISOString().slice(0, 10);

/** Deja la colección creada (las bases guardadas antes de este módulo no la traen). */
export function asegurarPopups(): Popup[] {
  const a = db.admin as any;
  return (a.popups ??= structuredClone(POPUPS_INICIALES)) as Popup[];
}

/** Pop-ups vigentes para un canal y una página (solo el contenido de ese canal). */
export function popupsPublicos(canal: string, pagina: string): PopupPublico[] {
  if (canal !== "web" && canal !== "app") throw new ApiError(422, "El canal debe ser web o app.");
  return popupsVisibles(asegurarPopups(), canal as CanalPopup, hoyIso(), pagina === "inicio" ? "inicio" : "otra");
}

/** Cuenta una vista, un clic o un cierre (solo vistas y clics se muestran en el panel). */
export function registrarEventoPopup(id: string, canal: string, tipo: string) {
  const p = asegurarPopups().find((x) => x.id === id);
  if (!p || (canal !== "web" && canal !== "app")) throw new ApiError(404, "Pop-up no encontrado");
  if (!publicoDe(p, canal)) return { ok: true }; // el pop-up ya no se muestra en ese canal: no cuenta
  if (tipo === "vista") p.vistas = { web: 0, app: 0, ...(p.vistas ?? {}), [canal]: (p.vistas?.[canal] ?? 0) + 1 };
  if (tipo === "clic") p.clics = { web: 0, app: 0, ...(p.clics ?? {}), [canal]: (p.clics?.[canal] ?? 0) + 1 };
  return { ok: true };
}
