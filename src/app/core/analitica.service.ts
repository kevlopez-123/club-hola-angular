import { Injectable, effect, inject } from "@angular/core";
import { ApiService } from "./api.service";
import type { EventoAnalitica } from "./analitica";
import { ConsentimientoService } from "./consentimiento.service";

const CLAVE_VISITA = "bs_visita";

/**
 * Analítica del embudo (vista → carrito → pago → canje). Solo registra si la persona aceptó las cookies de analítica,
 * y deja de hacerlo en cuanto las retira. El identificador de visita vive en sessionStorage (se borra al cerrar la pestaña
 * o al retirar el permiso) y no se asocia a ningún dato personal. Un fallo al enviar nunca se muestra ni interrumpe nada.
 */
@Injectable({ providedIn: "root" })
export class AnaliticaService {
  private readonly api = inject(ApiService);
  private readonly consentimiento = inject(ConsentimientoService);

  constructor() {
    effect(() => {
      if (!this.consentimiento.analitica()) this.olvidarVisita();
    });
  }

  registrar(evento: EventoAnalitica): void {
    if (!this.consentimiento.analitica()) return;
    this.api.post("analitica/eventos", { ...evento, visita: this.visita() }).subscribe({ error: () => undefined });
  }

  private visita(): string {
    try {
      let v = sessionStorage.getItem(CLAVE_VISITA);
      if (!v) {
        v = `v${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
        sessionStorage.setItem(CLAVE_VISITA, v);
      }
      return v;
    } catch {
      return "v-sin-almacenamiento";
    }
  }
  private olvidarVisita() {
    try {
      sessionStorage.removeItem(CLAVE_VISITA);
    } catch {
      /* sin almacenamiento */
    }
  }
}
