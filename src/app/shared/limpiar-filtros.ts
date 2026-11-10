import { ChangeDetectionStrategy, Component, ElementRef, inject, input, output } from "@angular/core";
import { IconComponent } from "./icon.component";

/**
 * Botón "Limpiar filtros" único para todas las pantallas con filtros (panel y sitio).
 * Aparece solo cuando hay algún filtro aplicado. Se coloca dentro de la barra de filtros:
 * vacía los campos de esa barra y avisa a la pantalla (`limpiar`) para que restablezca su estado y recargue.
 */
@Component({
  selector: "app-limpiar-filtros",
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "contents" },
  template: `
    @if (activo()) {
      <button type="button" (click)="limpiarTodo()" data-compact
        class="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-primary hover:bg-primary/10 focus-visible:outline-2">
        <app-icon name="X" class="h-4 w-4" /> Limpiar filtros
      </button>
    }
  `,
})
export class LimpiarFiltrosComponent {
  /** Hay algún filtro aplicado. */
  readonly activo = input(false);
  readonly limpiar = output<void>();
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected limpiarTodo() {
    // Los campos de la barra (buscador, listas, fechas) se vacían a la vez que el estado de la pantalla.
    const barra = this.host.nativeElement.parentElement;
    barra?.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input:not([type=checkbox]):not([type=radio]):not([type=file]), select").forEach((c) => {
      if (c instanceof HTMLSelectElement) c.selectedIndex = 0;
      else c.value = "";
    });
    this.limpiar.emit();
  }
}
