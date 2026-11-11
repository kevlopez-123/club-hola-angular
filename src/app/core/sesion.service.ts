import { Injectable, computed, inject, signal } from "@angular/core";
import { Router } from "@angular/router";
import { TokenService } from "./token.service";

/**
 * Sesión del participante en el sitio. Se considera iniciada si hay token (lo emite el servidor tras validar el código OTP).
 * Las rutas privadas usan `participanteGuard`; las páginas públicas (catálogo, textos legales) no exigen ingreso.
 */
@Injectable({ providedIn: "root" })
export class SesionService {
  private readonly tokens = inject(TokenService);
  private readonly router = inject(Router);
  private readonly _logged = signal(!!this.tokens.get("participante"));
  readonly logged = computed(() => this._logged());

  entrar(token: string) {
    this.tokens.set(token, "participante");
    this._logged.set(true);
  }
  /** Cierra la sesión y recarga en /login para limpiar el estado en memoria (puntos, perfil, avisos). */
  salir() {
    this.tokens.set(null, "participante");
    this._logged.set(false);
    location.assign("/login");
  }
  /** Lleva al ingreso recordando a dónde volver. */
  irAIngresar(volver?: string) {
    this._logged.set(!!this.tokens.get("participante"));
    void this.router.navigate(["/login"], { queryParams: volver && volver !== "/" ? { volver } : {} });
  }
  /** Solo se acepta volver a rutas internas del sitio (evita redirecciones a otros dominios). */
  static destinoSeguro(volver: string | null | undefined): string {
    return volver && volver.startsWith("/") && !volver.startsWith("//") && !volver.startsWith("/login") ? volver : "/";
  }
}