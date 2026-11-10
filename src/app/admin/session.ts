import { Injectable, computed, inject, signal } from "@angular/core";
import { TokenService } from "../core/token.service";
import type { RolAdmin } from "../core/models";

export type UsuarioSesion = { id: string; nombre: string; email: string; rol: RolAdmin; token?: string };

/** Sesión del panel: usuario autenticado y su rol (se guarda en sessionStorage). */
@Injectable({ providedIn: "root" })
export class AdminSession {
  private readonly tokens = inject(TokenService);
  private readonly guardado = (() => {
    try {
      return JSON.parse(sessionStorage.getItem("admin-usuario") ?? "null") as UsuarioSesion | null;
    } catch {
      return null;
    }
  })();
  readonly usuario = signal<UsuarioSesion | null>(this.guardado);
  readonly logged = computed(() => this.usuario() !== null);
  readonly rol = computed<RolAdmin>(() => this.usuario()?.rol ?? "Solo lectura");

  entrar(u: UsuarioSesion) {
    // El token (lo emite el servidor) va aparte: `authInterceptor` lo envía en cada petición y el servidor decide qué puede hacer.
    const { token, ...usuario } = u;
    this.tokens.set(token ?? null);
    u = usuario;
    try {
      sessionStorage.setItem("admin-usuario", JSON.stringify(u));
    } catch {
      /* sin almacenamiento */
    }
    this.usuario.set(u);
  }
  /** Refleja en la sesión el nombre que la persona cambió en Mi perfil. */
  actualizarNombre(nombre: string) {
    const u = this.usuario();
    if (!u) return;
    const nuevo = { ...u, nombre };
    try {
      sessionStorage.setItem("admin-usuario", JSON.stringify(nuevo));
    } catch {
      /* sin almacenamiento */
    }
    this.usuario.set(nuevo);
  }
  salir() {
    this.tokens.set(null);
    try {
      sessionStorage.removeItem("admin-usuario");
    } catch {
      /* sin almacenamiento */
    }
    this.usuario.set(null);
  }
}

