import { Injectable, signal } from "@angular/core";

export type Consentimiento = { v: 1; analitica: boolean; marketing: boolean; fecha: string };
const CLAVE = "bs_consentimiento";

/**
 * Consentimiento de cookies. Las esenciales (sesión, carrito, preferencias) no necesitan permiso;
 * analítica y marketing solo se activan si la persona los acepta. `AnaliticaService` (embudo de canje) registra eventos solo si
 * `analitica()` es true. Cualquier otra herramienta que se agregue debe respetar la misma señal y reaccionar a sus cambios.
 */
@Injectable({ providedIn: "root" })
export class ConsentimientoService {
  private readonly guardado = (() => {
    try {
      const c = JSON.parse(localStorage.getItem(CLAVE) ?? "null") as Consentimiento | null;
      return c?.v === 1 ? c : null;
    } catch {
      return null;
    }
  })();
  /** Lo que eligió la persona; null = todavía no decidió (se muestra el aviso). */
  readonly estado = signal<Consentimiento | null>(this.guardado);
  /** El panel de preferencias está abierto (desde el aviso o desde el pie de página). */
  readonly abierto = signal(this.guardado === null);
  readonly analitica = () => this.estado()?.analitica === true;
  readonly marketing = () => this.estado()?.marketing === true;

  guardar(analitica: boolean, marketing: boolean) {
    const c: Consentimiento = { v: 1, analitica, marketing, fecha: new Date().toISOString() };
    try {
      localStorage.setItem(CLAVE, JSON.stringify(c));
    } catch {
      /* sin almacenamiento: vale solo en esta visita */
    }
    this.estado.set(c);
    this.abierto.set(false);
  }
  aceptarTodo() {
    this.guardar(true, true);
  }
  soloEsenciales() {
    this.guardar(false, false);
  }
  abrir() {
    this.abierto.set(true);
  }
}