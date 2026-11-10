import { Injectable } from "@angular/core";

export type AmbitoToken = "admin" | "participante";

/**
 * Tokens de acceso del API (JWT u otro), uno por ámbito: el panel y el sitio del participante tienen sesiones distintas.
 *  - admin: sessionStorage (dura lo que la pestaña).
 *  - participante: localStorage (se recuerda al volver al sitio; cerrar sesión lo borra).
 * Con la MockAPI el token es simulado; con el backend real lo guarda el login y lo envía `authInterceptor`.
 */
@Injectable({ providedIn: "root" })
export class TokenService {
  private static readonly CLAVE: Record<AmbitoToken, string> = { admin: "bs-token", participante: "bs-token-participante" };
  private almacen(a: AmbitoToken): Storage {
    return a === "admin" ? sessionStorage : localStorage;
  }
  get(ambito: AmbitoToken = "admin"): string | null {
    try {
      return this.almacen(ambito).getItem(TokenService.CLAVE[ambito]);
    } catch {
      return null;
    }
  }
  set(token: string | null, ambito: AmbitoToken = "admin") {
    try {
      if (token) this.almacen(ambito).setItem(TokenService.CLAVE[ambito], token);
      else this.almacen(ambito).removeItem(TokenService.CLAVE[ambito]);
    } catch {
      /* sin almacenamiento */
    }
  }
}