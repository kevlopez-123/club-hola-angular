import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { DescargaService } from "../core/descargas";
import { IconComponent } from "../shared/icon.component";
import { AdminModalComponent } from "./kit";

/**
 * Diálogo "Descargar": pregunta el formato (Excel o PDF) de cualquier listado del panel. Vive una sola vez en el shell del panel;
 * los listados lo abren con `descargarTabla(...)` (core/descargas).
 */
@Component({
  selector: "a-descarga-dialog",
  imports: [AdminModalComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a-modal [open]="!!d.pendiente()" [title]="'Descargar ' + (d.pendiente()?.titulo ?? '')" (closed)="d.pendiente.set(null)">
      @if (d.pendiente(); as t) {
        <p class="text-sm text-muted-foreground">{{ t.filas.length }} {{ t.filas.length === 1 ? 'registro' : 'registros' }}. Elige el formato del archivo.</p>
        <div class="mt-4 grid gap-3 sm:grid-cols-2">
          <button type="button" (click)="d.elegir('xlsx')" class="flex items-center gap-3 rounded-2xl border border-border p-4 text-left hover:border-primary hover:bg-muted">
            <span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><app-icon name="FileSpreadsheet" class="h-6 w-6" /></span>
            <span><b class="block">Excel</b><span class="text-xs text-muted-foreground">.xlsx · para filtrar y seguir trabajando</span></span>
          </button>
          <button type="button" (click)="d.elegir('pdf')" class="flex items-center gap-3 rounded-2xl border border-border p-4 text-left hover:border-primary hover:bg-muted">
            <span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><app-icon name="FileText" class="h-6 w-6" /></span>
            <span><b class="block">PDF</b><span class="text-xs text-muted-foreground">.pdf · para imprimir o compartir</span></span>
          </button>
        </div>
      }
    </a-modal>
  `,
})
export class DescargaDialogComponent {
  protected readonly d = inject(DescargaService);
}
