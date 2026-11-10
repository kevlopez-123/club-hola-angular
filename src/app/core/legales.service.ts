import { Injectable, computed, inject, signal } from "@angular/core";
import { ApiService } from "./api.service";
import { SesionService } from "./sesion.service";
import type { EstadoLegalesParticipante, PendienteLegal } from "./legales";

/**
 * Textos legales que la persona con sesión todavía debe aceptar (Términos y/o Privacidad, versión en vigor).
 * Mientras haya pendientes el sitio muestra un aviso que bloquea el uso hasta que acepte.
 */
@Injectable({ providedIn: "root" })
export class LegalesService {
  private readonly api = inject(ApiService);
  private readonly sesion = inject(SesionService);
  private readonly _pendientes = signal<PendienteLegal[]>([]);
  readonly pendientes = this._pendientes.asReadonly();
  readonly hayPendientes = computed(() => this.sesion.logged() && this._pendientes().length > 0);
  readonly enviando = signal(false);
  readonly error = signal("");

  /** Vuelve a preguntar qué falta aceptar (al entrar, al navegar o cuando una acción es rechazada por falta de aceptación). */
  refrescar() {
    if (!this.sesion.logged()) return void this._pendientes.set([]);
    this.api.get<EstadoLegalesParticipante>("me/legales").subscribe({ next: (e) => this._pendientes.set(e.pendientes), error: () => undefined });
  }

  aceptar() {
    const lista = this._pendientes().map((p) => ({ tipo: p.tipo, version: p.version }));
    if (!lista.length || this.enviando()) return;
    this.enviando.set(true);
    this.error.set("");
    this.api.post<EstadoLegalesParticipante>("me/legales/aceptar", { aceptaciones: lista }).subscribe({
      next: (e) => { this._pendientes.set(e.pendientes); this.enviando.set(false); },
      error: (er) => {
        this.enviando.set(false);
        this.error.set(er?.error?.message ?? "No pudimos registrar tu aceptación. Inténtalo otra vez.");
        this.refrescar();
      },
    });
  }
}
