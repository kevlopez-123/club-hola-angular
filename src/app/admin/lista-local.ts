import { ChangeDetectionStrategy, Component, computed, input, output, signal } from "@angular/core";
import { LimpiarFiltrosComponent } from "../shared/limpiar-filtros";
import { IconComponent } from "../shared/icon.component";
import { BtnDirective, INPUT_CLS } from "./kit";

const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export interface OpcionesLista<T> {
  /** Texto en el que busca el cuadro de búsqueda. */
  texto: (x: T) => string;
  /** Valor de cada filtro (se compara por igualdad con la opción elegida). */
  filtros?: Record<string, (x: T) => string>;
  /** Valor por el que ordena cada columna (por su nombre). */
  campos?: Record<string, (x: T) => string | number>;
  /** Fecha ISO (aaaa-mm-dd) para el filtro Desde/Hasta; sin ella no hay filtro de fechas. */
  fecha?: (x: T) => string;
  orden?: { k: string; dir: "asc" | "desc" };
  tamano?: number;
}

/**
 * Búsqueda, filtros, orden y paginación de una lista que ya está en el navegador (la actividad de un participante es corta y se
 * trae completa). Expone lo mismo que `Paginado`, así que el paginador y los encabezados ordenables de las tablas del panel sirven igual.
 */
export class ListaLocal<T> {
  readonly q = signal("");
  readonly filtros = signal<Record<string, string>>({});
  readonly desde = signal("");
  readonly hasta = signal("");
  readonly sort = signal("");
  readonly dir = signal<"asc" | "desc">("asc");
  readonly page = signal(1);
  readonly size = signal(10);
  readonly cargando = signal(false);
  readonly error = signal(false);

  constructor(private readonly fuente: () => T[], private readonly o: OpcionesLista<T>) {
    if (o.orden) { this.sort.set(o.orden.k); this.dir.set(o.orden.dir); }
    if (o.tamano) this.size.set(o.tamano);
  }

  /** Todo lo que cumple búsqueda, filtros y fechas, ya ordenado (es lo que se exporta). */
  readonly filtrados = computed(() => {
    const q = sinTildes(this.q().trim());
    const f = Object.entries(this.filtros()).filter(([, v]) => v);
    const d = this.desde();
    const h = this.hasta();
    let r = this.fuente().filter((x) => {
      if (q && !sinTildes(this.o.texto(x)).includes(q)) return false;
      for (const [k, v] of f) if (this.o.filtros?.[k]?.(x) !== v) return false;
      if ((d || h) && this.o.fecha) {
        const fx = this.o.fecha(x);
        if (d && fx < d) return false;
        if (h && fx > h) return false;
      }
      return true;
    });
    const campo = this.o.campos?.[this.sort()];
    if (campo) {
      const s = this.dir() === "asc" ? 1 : -1;
      r = [...r].sort((a, b) => (campo(a) > campo(b) ? s : campo(a) < campo(b) ? -s : 0));
    }
    return r;
  });
  readonly total = computed(() => this.filtrados().length);
  readonly paginas = computed(() => Math.max(1, Math.ceil(this.total() / this.size())));
  readonly items = computed(() => {
    const p = Math.min(this.page(), this.paginas());
    return this.filtrados().slice((p - 1) * this.size(), p * this.size());
  });
  readonly activo = computed(() => !!this.q().trim() || !!this.desde() || !!this.hasta() || Object.values(this.filtros()).some(Boolean));
  get tieneFechas(): boolean { return !!this.o.fecha; }

  /** Valores distintos que tiene la lista para un filtro (para armar sus opciones). */
  opcionesDe(k: string): string[] {
    const g = this.o.filtros?.[k];
    return g ? [...new Set(this.fuente().map(g).filter(Boolean))].sort() : [];
  }

  recargar() { /* la lista vive en el navegador: no hay nada que volver a pedir */ }
  buscar(t: string) { this.q.set(t); this.page.set(1); }
  filtrar(k: string, v: string) { this.filtros.update((f) => ({ ...f, [k]: v })); this.page.set(1); }
  fechas(desde: string, hasta: string) { this.desde.set(desde); this.hasta.set(hasta); this.page.set(1); }
  limpiar() { this.q.set(""); this.filtros.set({}); this.desde.set(""); this.hasta.set(""); this.page.set(1); }
  ir(p: number) { this.page.set(Math.min(Math.max(1, p), this.paginas())); }
  tamano(n: number) { this.size.set(n); this.page.set(1); }
  ordenar(c: string) {
    this.dir.set(this.sort() === c && this.dir() === "asc" ? "desc" : "asc");
    this.sort.set(c);
    this.page.set(1);
  }
}

export interface FiltroBarra {
  k: string;
  l: string;
  /** Opciones fijas; si se omiten, salen de los valores que tiene la lista. */
  opciones?: { v: string; l: string }[];
}

/** Barra de herramientas de una lista local: búsqueda, filtros, fechas, "limpiar" y exportar. */
@Component({
  selector: "a-barra-lista",
  imports: [IconComponent, LimpiarFiltrosComponent, BtnDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="adm-filtros">
      <div class="adm-busca">
        <app-icon name="Search" class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input type="search" [attr.aria-label]="'Buscar en ' + etiqueta()" [placeholder]="placeholder()" [class]="input + ' pl-9'" [value]="lista().q()" (input)="lista().buscar($any($event.target).value)" />
      </div>
      @for (f of filtros(); track f.k) {
        <select [attr.aria-label]="f.l" [class]="input + ' w-auto'" (change)="lista().filtrar(f.k, $any($event.target).value)">
          <option value="">{{ f.l }}: todos</option>
          @for (o of opcionesDe(f); track o.v) { <option [value]="o.v" [selected]="lista().filtros()[f.k] === o.v">{{ o.l }}</option> }
        </select>
      }
      @if (lista().tieneFechas) {
        <input type="date" aria-label="Desde" [class]="input + ' w-auto'" [value]="lista().desde()" (input)="lista().fechas($any($event.target).value, lista().hasta())" />
        <input type="date" aria-label="Hasta" [class]="input + ' w-auto'" [value]="lista().hasta()" (input)="lista().fechas(lista().desde(), $any($event.target).value)" />
      }
      <app-limpiar-filtros [activo]="lista().activo()" (limpiar)="lista().limpiar()" />
      <button aBtn variant="outline" class="ml-auto" [disabled]="!lista().total()" [attr.aria-label]="'Descargar ' + etiqueta()" (click)="exportar.emit()"><app-icon name="Download" class="h-4 w-4" /> Descargar</button>
    </div>
  `,
})
export class BarraListaComponent {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly lista = input.required<ListaLocal<any>>();
  readonly etiqueta = input.required<string>();
  readonly placeholder = input("Buscar");
  readonly filtros = input<FiltroBarra[]>([]);
  readonly exportar = output<void>();
  protected readonly input = INPUT_CLS;

  protected opcionesDe(f: FiltroBarra) {
    return f.opciones ?? this.lista().opcionesDe(f.k).map((v) => ({ v, l: v }));
  }
}
