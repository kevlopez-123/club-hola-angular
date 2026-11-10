import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { ConexionService } from "../core/conexion.service";

/** Aviso global (arriba de la pantalla) cuando no hay conexión o el servidor falla. */
@Component({
  selector: "app-aviso-red",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (c.sinConexion() || c.errorServidor()) {
      <div role="alert" class="fixed inset-x-0 top-0 z-[100] flex flex-wrap items-center justify-center gap-3 bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground">
        <span>{{ c.sinConexion() ? 'Sin conexión. Revisa tu internet; seguimos intentando.' : 'Tuvimos un problema con el servidor. Intenta de nuevo en unos minutos.' }}</span>
        <button type="button" data-compact class="rounded-md bg-white/20 px-3 py-1 hover:bg-white/30" (click)="recargar()">Reintentar</button>
      </div>
    }
  `,
})
export class AvisoRedComponent {
  protected readonly c = inject(ConexionService);
  protected recargar() {
    location.reload();
  }
}