import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, signal, effect } from "@angular/core";
import { IconComponent } from "../shared/icon.component";

type Vista = "tarjetas" | "tabla";
const clave = (m: string) => `bs-vista-${m}`;

/**
 * Elige cómo se ve la lista de un módulo: tarjetas (por defecto) o tabla clásica con columnas.
 * La elección se recuerda por módulo en este navegador. Marca `data-vista` en el <body> mientras el módulo está abierto;
 * styles.css redibuja entonces las tablas `.adm-table` como tabla.
 */
@Component({
  selector: "a-vista-toggle",
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div role="group" aria-label="Vista de la lista" class="inline-flex rounded-xl border border-border p-0.5">
      @for (o of opciones; track o.k) {
        <button type="button" [attr.aria-pressed]="vista() === o.k" [title]="'Ver como ' + o.l.toLowerCase()"
          [class]="'inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold ' + (vista() === o.k ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')"
          (click)="vista.set(o.k)">
          <app-icon [name]="o.icono" class="h-4 w-4" /> {{ o.l }}
        </button>
      }
    </div>
  `,
})
export class VistaToggleComponent {
  readonly modulo = input.required<string>();
  protected readonly opciones: { k: Vista; l: string; icono: string }[] = [
    { k: "tarjetas", l: "Tarjetas", icono: "LayoutGrid" },
    { k: "tabla", l: "Tabla", icono: "List" },
  ];
  protected readonly vista = signal<Vista>("tarjetas");

  constructor() {
    let inicial = true;
    effect(() => {
      const m = this.modulo();
      if (inicial) {
        inicial = false;
        try { if (localStorage.getItem(clave(m)) === "tabla") this.vista.set("tabla"); } catch { /* sin almacenamiento */ }
      }
    });
    effect(() => {
      const v = this.vista();
      if (v === "tabla") document.body.dataset["vista"] = "tabla"; else delete document.body.dataset["vista"];
      try { localStorage.setItem(clave(this.modulo()), v); } catch { /* sin almacenamiento */ }
    });
    inject(DestroyRef).onDestroy(() => delete document.body.dataset["vista"]);
  }
}
