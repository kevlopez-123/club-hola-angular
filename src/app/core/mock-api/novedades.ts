import { db } from "./db";
import { ApiError } from "./types";

/**
 * Token del enlace de baja de los correos de campaña: id del participante + firma.
 * Es una simulación: un backend real debe emitir un token firmado (HMAC/JWT) que no se pueda adivinar ni modificar.
 */
const firma = (id: string) => {
  let h = 2166136261;
  for (const c of `${id}|baja-novedades`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0).toString(36);
};
export const tokenBaja = (participanteId: string) => `${participanteId}.${firma(participanteId)}`;

const participanteDe = (token: unknown) => {
  const [id, f] = String(token ?? "").split(".");
  if (!id || !f || f !== firma(id)) throw new ApiError(422, "El enlace no es válido o está incompleto.");
  return (db.admin.participantes as any[]).find((p) => p.id === id) ?? (() => { throw new ApiError(404, "No encontramos tu cuenta."); })();
};

export const recibeNovedades = (p: any) => p.recibeNovedades !== false;

export function cambiarNovedades(p: any, recibe: boolean, origen: "participante" | "enlace" | "admin") {
  p.recibeNovedades = recibe;
  p.novedadesCambio = { fecha: new Date().toISOString().slice(0, 19).replace("T", " "), origen };
  return { recibe };
}

/** Ruta pública del enlace: no exige sesión (quien lee el correo puede no tenerla). */
export const estadoBaja = (token: unknown) => ({ recibe: recibeNovedades(participanteDe(token)) });
export const darDeBaja = (token: unknown) => cambiarNovedades(participanteDe(token), false, "enlace");
export const volverAlta = (token: unknown) => cambiarNovedades(participanteDe(token), true, "enlace");
