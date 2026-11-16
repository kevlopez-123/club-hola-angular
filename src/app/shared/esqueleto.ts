import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";

/** Tarjetas de relleno mientras carga una lista (evita mostrar «no hay resultados» antes de que lleguen los datos). */
@Component({
  selector: "app-esqueleto-lista",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mt-6 grid gap-4" role="status" aria-live="polite">
      <span class="sr-only">{{ etiqueta() }}…</span>
      @for (i of filas(); track i) {
        <div aria-hidden="true" class="flex animate-pulse gap-4 rounded-2xl bg-card p-4 shadow-[var(--shadow-card)] motion-reduce:animate-none">
          <div class="h-20 w-20 shrink-0 rounded-xl bg-muted sm:h-24 sm:w-24"></div>
          <div class="min-w-0 flex-1 space-y-3 py-1">
            <div class="h-3 w-1/4 rounded bg-muted"></div>
            <div class="h-4 w-3/5 rounded bg-muted"></div>
            <div class="h-3 w-2/5 rounded bg-muted"></div>
          </div>
        </div>
      }
    </div>
  `,
})
export class EsqueletoListaComponent {
  readonly cantidad = input(3);
  readonly etiqueta = input("Cargando");
  protected readonly filas = computed(() => Array.from({ length: this.cantidad() }, (_, i) => i));
}
