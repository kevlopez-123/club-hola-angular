import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";

/** Estado de error con "Reintentar" para listas del sitio que no pudieron cargar (en vez de "sin resultados"). */
@Component({
  selector: "app-estado-error",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div role="alert" class="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
      <p class="text-lg font-bold text-ink">{{ titulo() }}</p>
      <p class="text-sm text-muted-foreground">{{ detalle() }}</p>
      <button type="button" class="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground hover:bg-primary/90" (click)="reintentar.emit()">Reintentar</button>
    </div>
  `,
})
export class EstadoErrorComponent {
  readonly titulo = input("No pudimos cargar la información");
  readonly detalle = input("Revisa tu conexión e inténtalo de nuevo.");
  readonly reintentar = output<void>();
}