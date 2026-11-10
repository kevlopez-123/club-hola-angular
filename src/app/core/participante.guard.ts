import { inject } from "@angular/core";
import { CanActivateChildFn, CanActivateFn, Router } from "@angular/router";
import { SesionService } from "./sesion.service";

/** Rutas privadas del sitio: sin sesión se manda al ingreso y, al entrar, se vuelve a la página pedida. */
export const participanteGuard: CanActivateFn = (_ruta, estado) => {
  if (inject(SesionService).logged()) return true;
  const volver = estado.url === "/" ? undefined : estado.url;
  return inject(Router).createUrlTree(["/login"], { queryParams: volver ? { volver } : {} });
};
/**
 * Páginas del sitio que se pueden ver sin haber iniciado sesión: solo los textos legales (el ingreso los enlaza y la ley exige que
 * se puedan leer antes de aceptar) y la baja de correos (debe funcionar desde el enlace del mensaje, sin sesión).
 */
export const RUTAS_ABIERTAS = ["/terminos", "/privacidad", "/baja"];

export const esRutaAbierta = (url: string) => {
  const p = url.split(/[?#]/)[0]!.replace(/\/$/, "") || "/";
  return RUTAS_ABIERTAS.some((r) => p === r || p.startsWith(r + "/"));
};

/** Sitio cerrado: sin sesión solo se ve el ingreso y las páginas abiertas; lo demás manda al ingreso y, al entrar, vuelve a lo pedido. */
export const sitioCerradoGuard: CanActivateChildFn = (_ruta, estado) => {
  if (esRutaAbierta(estado.url) || inject(SesionService).logged()) return true;
  const volver = estado.url === "/" ? undefined : estado.url;
  return inject(Router).createUrlTree(["/login"], { queryParams: volver ? { volver } : {} });
};