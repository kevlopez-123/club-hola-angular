import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, model, output, signal } from "@angular/core";
import { IconComponent } from "./icon.component";

const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
let secuencia = 0;

/**
 * Lista desplegable con búsqueda (combobox con autocompletado) para listas largas: se escribe y se filtran las opciones sin importar
 * mayúsculas ni tildes. Se maneja con teclado (flechas, Enter, Escape). `value` queda vacío cuando se elige «todas».
 * Con `libre` es un campo de texto con sugerencias: lo que se escribe es el valor (no hace falta elegir de la lista).
 */
@Component({
  selector: "app-combobox",
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "relative block", "(document:click)": "fueraDeClic($event)" },
  template: `
    <div class="relative">
      <input type="text" role="combobox" autocomplete="off" [id]="inputId() ?? id" [attr.aria-label]="inputId() ? null : etiqueta()" aria-autocomplete="list"
        [attr.aria-expanded]="mostrarLista()" [attr.aria-controls]="id + '-lista'" [attr.aria-activedescendant]="mostrarLista() && activo() >= 0 ? id + '-op-' + activo() : null"
        [attr.aria-invalid]="invalido() ? true : null" [attr.aria-describedby]="describe() || null" [attr.maxlength]="maxlength()"
        [placeholder]="placeholder() ?? (libre() ? '' : todas())" [value]="texto()"
        (focus)="abrir($event)" (blur)="tocado.emit()" (input)="escribir($any($event.target).value)" (keydown)="teclas($event)"
        [class]="claseInput()" />
      @if (!libre() || opciones().length) {
        <div class="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
          @if (value() && !libre()) {
            <button type="button" aria-label="Quitar filtro" (click)="elegir('')" class="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-ink"><app-icon name="X" class="h-4 w-4" /></button>
          }
          <button type="button" tabindex="-1" aria-label="Mostrar opciones" (click)="alternar()" class="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-muted"><app-icon name="ChevronDown" [class]="'h-4 w-4 transition-transform ' + (mostrarLista() ? 'rotate-180' : '')" /></button>
        </div>
      }
    </div>
    @if (mostrarLista()) {
      <ul [id]="id + '-lista'" role="listbox" [attr.aria-label]="etiqueta()" class="absolute left-0 right-0 z-30 mt-1 max-h-64 overflow-y-auto rounded-2xl border border-border bg-card p-1 shadow-lg">
        @for (o of visibles(); track o.valor; let i = $index) {
          <li role="option" [id]="id + '-op-' + i" [attr.aria-selected]="o.valor === value()" (mousedown)="$event.preventDefault()" (click)="elegir(o.valor)"
            [class]="'cursor-pointer rounded-xl px-3 py-2 text-sm ' + (i === activo() ? 'bg-secondary text-primary' : 'text-ink') + (o.valor === value() ? ' font-bold' : '')">{{ o.texto }}</li>
        } @empty {
          <li class="px-3 py-3 text-sm text-muted-foreground" role="option" aria-disabled="true">No hay resultados para «{{ texto() }}».</li>
        }
      </ul>
    }
  `,
})
export class ComboboxComponent {
  readonly opciones = input.required<readonly string[]>();
  /** Texto de la opción que no filtra nada («Todas las marcas»). */
  readonly todas = input("Todas");
  readonly etiqueta = input("Filtro");
  /** Opción elegida; vacío = todas. */
  readonly value = model("");
  /** Campo de texto con sugerencias: lo escrito es el valor. */
  readonly libre = input(false);
  /** Id del input, para enlazarlo con un <label for>. */
  readonly inputId = input<string | null>(null);
  readonly invalido = input(false);
  readonly describe = input("");
  readonly maxlength = input<number | null>(null);
  readonly placeholder = input<string | null>(null);
  /** Clases del input (alto, bordes, tamaño de letra); por defecto el estilo de los filtros. */
  readonly claseInput = input("h-11 w-full rounded-full border border-border bg-card pl-4 pr-20 text-sm font-medium text-ink outline-none focus:ring-2 focus:ring-primary/50");
  /** El campo perdió el foco. */
  readonly tocado = output<void>();

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly id = `combo-${++secuencia}`;
  protected readonly abierto = signal(false);
  protected readonly activo = signal(-1);
  /** Lo que se está escribiendo; null = se muestra la opción elegida. */
  private readonly escrito = signal<string | null>(null);
  protected readonly texto = computed(() => (this.libre() ? this.value() : (this.escrito() ?? this.value())));
  /** La lista se muestra abierta y, en modo libre, solo si hay sugerencias que ofrecer. */
  protected readonly mostrarLista = computed(() => this.abierto() && (!this.libre() || this.visibles().length > 0));

  protected readonly visibles = computed(() => {
    if (this.libre()) {
      const t = sinTildes(this.value().trim());
      return this.opciones().filter((o) => !t || sinTildes(o).includes(t)).map((o) => ({ valor: o, texto: o }));
    }
    const q = sinTildes((this.escrito() ?? "").trim());
    const lista = this.opciones().filter((o) => !q || sinTildes(o).includes(q)).map((o) => ({ valor: o, texto: o }));
    return q ? lista : [{ valor: "", texto: this.todas() }, ...lista];
  });

  protected abrir(e?: Event) {
    this.abierto.set(true);
    this.activo.set(this.libre() ? -1 : Math.max(0, this.visibles().findIndex((o) => o.valor === this.value())));
    if (!this.libre()) (e?.target as HTMLInputElement | undefined)?.select();
  }
  protected alternar() {
    if (this.abierto()) this.cerrar();
    else { this.abrir(); this.el.nativeElement.querySelector("input")?.focus(); }
  }
  protected escribir(t: string) {
    if (this.libre()) {
      this.value.set(t);
      this.abierto.set(true);
      this.activo.set(-1);
      return;
    }
    this.escrito.set(t);
    this.abierto.set(true);
    this.activo.set(this.visibles().length ? 0 : -1);
    if (!t.trim() && this.value()) this.value.set("");
  }
  protected elegir(valor: string) {
    this.value.set(valor);
    this.escrito.set(null);
    this.cerrar();
  }
  private cerrar() {
    this.abierto.set(false);
    this.escrito.set(null);
  }
  protected teclas(e: KeyboardEvent) {
    const n = this.visibles().length;
    if (e.key === "ArrowDown") { e.preventDefault(); if (!this.abierto()) this.abrir(); else this.activo.set(n ? (this.activo() + 1) % n : -1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); if (!this.abierto()) this.abrir(); else this.activo.set(n ? ((this.activo() <= 0 ? n : this.activo()) - 1) : -1); }
    else if (e.key === "Enter") { if (this.abierto() && this.activo() >= 0) { e.preventDefault(); this.elegir(this.visibles()[this.activo()]!.valor); } }
    else if (e.key === "Escape") { if (this.abierto()) { e.preventDefault(); this.cerrar(); } }
    else if (e.key === "Tab") this.cerrar();
  }
  protected fueraDeClic(e: Event) {
    if (this.abierto() && !this.el.nativeElement.contains(e.target as Node)) this.cerrar();
  }
}
