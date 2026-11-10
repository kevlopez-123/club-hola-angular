import { colorMarca, guardarArchivo } from "../core/descargas";
import { crearXlsx, type HojaXlsx } from "../core/xlsx";
import {
  ChangeDetectionStrategy, Component, DestroyRef, Directive, afterNextRender, ElementRef, Injectable, computed, effect, inject, input, model, output, signal, untracked, viewChild,
} from "@angular/core";
import { ApiService } from "../core/api.service";
import { ActivatedRoute } from "@angular/router";
import { IconComponent } from "../shared/icon.component";
import { VistaToggleComponent } from "./vista-toggle";
import type { Observable } from "rxjs";

/* Toasts: ver shared/toast.ts */
export { ToastService, ToasterComponent } from "../shared/toast";
import { ToastService } from "../shared/toast";

/**
 * Enlaces entre módulos: si la dirección trae `?ver=ID`, abre el detalle de ese registro (se llama en el constructor de la página).
 * Así las fichas (participante, marca…) pueden llevar directo al detalle de un pedido, una compra, un producto, etc.
 */
export function abrirDesdeUrl(abrir: (id: string) => void) {
  const id = inject(ActivatedRoute).snapshot.queryParamMap.get("ver");
  if (id) queueMicrotask(() => abrir(id));
}

/** Atajo: `avisar("mensaje")` desde cualquier componente. */
export const useAvisar = () => {
  const t = inject(ToastService);
  return (msg?: string) => t.show(msg);
};

/* ------------------------------------------------------------------ */
/* Acceso a colecciones de la API del admin                            */
/* ------------------------------------------------------------------ */
/** Descargas: solo Excel o PDF (nunca CSV). `descargarTabla` pregunta el formato; ver core/descargas. */
export { descargarTabla } from "../core/descargas";

/** Descarga un libro de Excel (.xlsx) con varias hojas, con el color de la marca. */
export function descargarXlsx(nombre: string, hojas: HojaXlsx[]) {
  guardarArchivo(new Blob([crearXlsx(hojas, colorMarca()) as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), nombre);
}

@Injectable({ providedIn: "root" })
export class AdminApi {
  private readonly api = inject(ApiService);
  lista<T>(col: string): Observable<T[]> {
    return this.api.get<T[]>(`admin/c/${col}`);
  }
  guardar<T>(col: string, rows: T[]): Observable<T[]> {
    return this.api.put<T[]>(`admin/c/${col}`, rows);
  }
}

/* ------------------------------------------------------------------ */
/* Layout de página                                                    */
/* ------------------------------------------------------------------ */
@Component({
  selector: "a-header",
  imports: [VistaToggleComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Si las acciones (filtros, fechas, botones) no caben junto al título, bajan a otra fila: el título nunca se aprieta. -->
    <div class="mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div class="min-w-[min(100%,18rem)] flex-1">
        <h1 class="text-2xl font-bold text-foreground md:text-3xl">{{ title() }}</h1>
        @if (desc()) { <p class="mt-1 text-muted-foreground">{{ desc() }}</p> }
      </div>
      <div class="flex max-w-full flex-wrap items-center gap-2">@if (vista()) { <a-vista-toggle [modulo]="vista()" /> }<ng-content /></div>
    </div>
  `,
})
export class PageHeaderComponent {
  /** Identificador del módulo si su lista admite verse como tarjetas o como tabla (muestra el selector). */
  readonly vista = input("");
  readonly title = input.required<string>();
  readonly desc = input("");
}

@Component({
  selector: "a-panel",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "block min-w-0 rounded-2xl border border-border bg-card p-5 shadow-sm" },
  template: `
    @if (title()) {
      <div class="mb-4 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <h2 class="min-w-0 break-words text-lg font-semibold text-foreground">{{ title() }}</h2>
        <div class="max-w-full empty:hidden"><ng-content select="[actions]" /></div>
      </div>
    }
    <ng-content />
  `,
})
export class PanelComponent {
  readonly title = input("");
}

@Component({
  selector: "a-stat",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "block rounded-2xl border border-border bg-card p-5 shadow-sm" },
  template: `
    <div class="flex items-center justify-between text-muted-foreground">
      <span class="text-sm font-medium">{{ label() }}</span>
      @if (icon()) { <app-icon [name]="icon()" class="h-5 w-5" /> }
    </div>
    <p class="mt-2 text-2xl font-bold text-foreground">{{ value() }}</p>
    @if (hint()) { <p class="mt-1 text-sm text-muted-foreground">{{ hint() }}</p> }
  `,
  imports: [IconComponent],
})
export class StatComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly hint = input("");
  readonly icon = input("");
}

const TONOS: Record<string, string> = {
  ok: "bg-primary/15 text-foreground",
  warn: "bg-accent text-accent-foreground",
  info: "bg-secondary text-secondary-foreground",
  bad: "bg-destructive/15 text-destructive",
  muted: "bg-muted text-muted-foreground",
};

@Component({
  selector: "a-pill",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span [class]="'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ' + tonos[tone()]"><ng-content /></span>`,
})
export class PillComponent {
  readonly tone = input<"ok" | "warn" | "info" | "bad" | "muted">("muted");
  protected readonly tonos = TONOS;
}

/** <button aBtn variant="outline"> */
@Directive({
  selector: "button[aBtn]",
  host: { "[class]": "cls()" },
})
export class BtnDirective {
  readonly variant = input<"primary" | "outline" | "ghost" | "danger" | "peligro" | "peligro-ghost">("primary");
  protected readonly cls = computed(
    () =>
      "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors disabled:opacity-50 " +
      { primary: "bg-primary text-primary-foreground hover:bg-primary/90", outline: "border border-border bg-card text-foreground hover:bg-muted", ghost: "text-foreground hover:bg-muted", danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90", peligro: "border border-destructive/50 bg-card text-destructive hover:bg-destructive/10", "peligro-ghost": "text-destructive hover:bg-destructive/10" }[this.variant()],
  );
}

export const INPUT_CLS = "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";

@Component({
  selector: "a-field",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "block", "(focusout)": "tocado.set(true)" },
  template: `<label class="block"><span class="mb-1.5 block text-sm font-medium text-foreground">{{ label() }}@if (requerido()) { <span class="text-destructive" aria-hidden="true"> *</span> }</span><ng-content /></label>@if (visible()) { <p [id]="idError" role="alert" class="mt-1 text-xs font-medium text-destructive">{{ error() }}</p> }`,
})
export class FieldComponent {
  private static n = 0;
  private readonly el = inject(ElementRef<HTMLElement>);
  protected readonly idError = `a-err-${++FieldComponent.n}`;
  readonly label = input.required<string>();
  /** Mensaje de error; se muestra al salir del campo o al intentar guardar (`forzar`). */
  readonly error = input("");
  readonly forzar = input(false);
  readonly requerido = input(false);
  protected readonly tocado = signal(false);
  protected readonly visible = computed(() => !!this.error() && (this.tocado() || this.forzar()));
  constructor() {
    effect(() => {
      const v = this.visible();
      const c = (this.el.nativeElement as HTMLElement).querySelector("input,select,textarea");
      if (!c) return;
      c.setAttribute("aria-invalid", v ? "true" : "false");
      if (v) c.setAttribute("aria-describedby", this.idError);
      else c.removeAttribute("aria-describedby");
    });
  }
}

@Component({
  selector: "a-toggle",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button data-compact type="button" role="switch" [attr.aria-checked]="on()" [attr.aria-label]="label()" (click)="on.set(!on())"
      [class]="'relative h-6 w-11 shrink-0 rounded-full transition-colors hit-44 ' + (on() ? 'bg-primary' : 'bg-muted-foreground/30')">
      <span [class]="'absolute top-0.5 h-5 w-5 rounded-full bg-card shadow transition-all ' + (on() ? 'left-[22px]' : 'left-0.5')"></span>
    </button>
  `,
})
export class ToggleComponent {
  readonly on = model(false);
  readonly label = input("");
}

/** Aviso de que una pantalla no pudo cargar sus datos, con "Reintentar". */
@Component({
  selector: "a-error-carga",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div role="alert" class="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4">
      <span class="font-semibold text-destructive">No pudimos cargar los datos de esta pantalla. Revisa tu conexión e inténtalo otra vez.</span>
      <button type="button" class="inline-flex h-10 items-center rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground hover:bg-muted" (click)="reintentar.emit()">Reintentar</button>
    </div>
  `,
})
export class ErrorCargaComponent {
  readonly reintentar = output<void>();
}
/* ------------------------------------------------------------------ */
/* Modal, confirmación y drawer lateral                                */
/* ------------------------------------------------------------------ */
/** Encabezado de columna ordenable (orden en el servidor): muestra la dirección y la anuncia con aria-sort. */
@Component({
  selector: "th[aOrden]",
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { "[attr.aria-sort]": "estado()" },
  template: `<button type="button" data-compact (click)="pag().ordenar(aOrden())" class="inline-flex min-h-9 items-center gap-1 font-semibold hover:text-foreground"><ng-content />@if (pag().sort() === aOrden()) { <app-icon [name]="pag().dir() === 'asc' ? 'ArrowUp' : 'ArrowDown'" class="h-3.5 w-3.5" /> }</button>`,
})
export class OrdenColumnaComponent {
  readonly aOrden = input.required<string>();
  readonly pag = input.required<Ordenable>();
  readonly etiquetaOrden = input("esta columna");
  protected readonly estado = computed(() => (this.pag().sort() === this.aOrden() ? (this.pag().dir() === "asc" ? "ascending" : "descending") : "none"));
}

/** Fila de tabla que se muestra mientras carga la primera página (en lugar de "sin resultados"). */
@Component({
  selector: "tr[aEsqueleto]",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { "aria-hidden": "true" },
  template: `@for (c of columnas(); track c) { <td><span class="skeleton block h-4 rounded-md" [style.width.%]="40 + ((c * 17) % 50)"></span></td> }`,
})
export class FilaEsqueletoComponent {
  readonly cols = input(5);
  protected readonly columnas = computed(() => Array.from({ length: this.cols() }, (_, i) => i + 1));
}

/** Detecta si un formulario en edición cambió respecto a como se abrió (para avisar antes de descartar). */
export function usarSucio<T>(valor: () => T | null) {
  const base = signal<string | null>(null);
  effect(() => {
    const v = valor();
    untracked(() => {
      if (v === null) base.set(null);
      else if (base() === null) base.set(JSON.stringify(v));
    });
  });
  return computed(() => {
    const v = valor();
    return v !== null && base() !== null && JSON.stringify(v) !== base();
  });
}

/** Aviso "cambios sin guardar" compartido por el modal y el panel lateral. */
const AVISO_SUCIO = `
  @if (pidiendo()) {
    <div class="absolute inset-0 z-10 grid place-items-center rounded-[inherit] bg-card/95 p-6" role="alertdialog" aria-labelledby="sucio-titulo" aria-describedby="sucio-texto">
      <div class="max-w-xs text-center">
        <h3 id="sucio-titulo" class="text-lg font-bold text-foreground">¿Descartar los cambios?</h3>
        <p id="sucio-texto" class="mt-2 text-sm text-muted-foreground">Hiciste cambios que todavía no guardaste. Si cierras ahora se perderán.</p>
        <div class="mt-5 flex justify-center gap-2">
          <button type="button" (click)="pidiendo.set(false)" class="h-11 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-muted">Seguir editando</button>
          <button type="button" (click)="descartar()" class="h-11 rounded-xl bg-destructive px-4 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90">Descartar</button>
        </div>
      </div>
    </div>
  }
`;

@Component({
  selector: "a-modal",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { "(document:keydown.escape)": "alEscape($event)" },
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-[60] grid place-items-center p-4" role="dialog" aria-modal="true" [attr.aria-label]="title()">
        <button aria-label="Cerrar" class="absolute inset-0 bg-foreground/50" (click)="solicitarCierre()"></button>
        <!-- Marco común de todos los modales: encabezado con su cierre, cuerpo que se desplaza y acciones al pie. -->
        <div #caja tabindex="-1" [class]="'relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl bg-card shadow-2xl outline-none ' + (xl() ? 'max-w-6xl' : wide() ? 'max-w-3xl' : 'max-w-md')">
          <div class="flex shrink-0 items-start justify-between gap-4 border-b border-border px-6 py-4">
            <h2 class="min-w-0 break-words text-xl font-bold text-foreground">{{ title() }}</h2>
            <button type="button" aria-label="Cerrar ventana" class="-mr-2 -mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" (click)="solicitarCierre()">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
          <div class="modal-cuerpo min-h-0 flex-1 overflow-y-auto p-6"><ng-content /></div>
          ${AVISO_SUCIO}
        </div>
      </div>
    }
  `,
})
export class AdminModalComponent {
  readonly open = input(true);
  readonly title = input.required<string>();
  readonly wide = input(false);
  /** Aún más ancho (editores con vista previa al lado). */
  readonly xl = input(false);
  /** Hay cambios sin guardar: al cerrar se pide confirmación. */
  readonly sucio = input(false);
  readonly closed = output<void>();
  protected readonly pidiendo = signal(false);
  private readonly caja = viewChild<ElementRef<HTMLElement>>("caja");
  private origen: HTMLElement | null = null;

  constructor() {
    effect(() => {
      if (this.open()) {
        this.origen = document.activeElement as HTMLElement | null;
        setTimeout(() => this.caja()?.nativeElement.focus({ preventScroll: true }));
      } else {
        this.pidiendo.set(false);
        this.origen?.focus?.({ preventScroll: true }); // el foco vuelve a quien abrió el modal
        this.origen = null;
      }
    });
  }
  solicitarCierre() {
    if (this.sucio()) this.pidiendo.set(true);
    else this.closed.emit();
  }
  protected descartar() {
    this.pidiendo.set(false);
    this.closed.emit();
  }
  protected alEscape(e: Event) {
    if (!this.open()) return;
    if (this.pidiendo()) this.pidiendo.set(false);
    else this.solicitarCierre();
    e.stopPropagation();
  }
}
@Component({
  selector: "a-confirm",
  imports: [AdminModalComponent, BtnDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a-modal [open]="open()" [title]="title()" (closed)="closed.emit()">
      <div class="text-muted-foreground"><ng-content /></div>
      <div class="mt-6 flex justify-end gap-2">
        <button aBtn variant="outline" (click)="closed.emit()">Cancelar</button>
        <button aBtn [class]="danger() ? '!bg-destructive !text-destructive-foreground hover:!bg-destructive/90' : ''" (click)="confirmed.emit(); closed.emit()">{{ confirmLabel() }}</button>
      </div>
    </a-modal>
  `,
})
export class ConfirmComponent {
  readonly open = input(false);
  readonly title = input.required<string>();
  readonly confirmLabel = input("Confirmar");
  readonly danger = input(false);
  readonly confirmed = output<void>();
  readonly closed = output<void>();
}

/** Panel lateral deslizante (ficha de participante, edición de producto, etc.). */
@Component({
  selector: "a-drawer",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { "(document:keydown.escape)": "alEscape($event)" },
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-50 flex justify-end">
        <button aria-label="Cerrar" class="absolute inset-0 bg-foreground/40" (click)="solicitarCierre()"></button>
        <aside #caja tabindex="-1" role="dialog" aria-modal="true" [class]="'relative h-full w-full overflow-y-auto bg-card p-6 shadow-xl outline-none ' + maxW()">
          <ng-content />
          ${AVISO_SUCIO}
        </aside>
      </div>
    }
  `,
})
export class DrawerComponent {
  readonly open = input(false);
  readonly maxW = input("max-w-xl");
  /** Hay cambios sin guardar: al cerrar se pide confirmación. */
  readonly sucio = input(false);
  readonly closed = output<void>();
  protected readonly pidiendo = signal(false);
  private readonly caja = viewChild<ElementRef<HTMLElement>>("caja");
  private origen: HTMLElement | null = null;

  constructor() {
    effect(() => {
      if (this.open()) {
        this.origen = document.activeElement as HTMLElement | null;
        setTimeout(() => this.caja()?.nativeElement.focus({ preventScroll: true }));
      } else {
        this.pidiendo.set(false);
        this.origen?.focus?.({ preventScroll: true });
        this.origen = null;
      }
    });
  }
  solicitarCierre() {
    if (this.sucio()) this.pidiendo.set(true);
    else this.closed.emit();
  }
  protected descartar() {
    this.pidiendo.set(false);
    this.closed.emit();
  }
  protected alEscape(e: Event) {
    if (!this.open()) return;
    if (this.pidiendo()) this.pidiendo.set(false);
    else this.solicitarCierre();
    e.stopPropagation();
  }
}

@Component({
  selector: "a-drawer-title",
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-4 flex items-start justify-between">
      <div><ng-content /></div>
      <button aria-label="Cerrar" (click)="cerrar()" class="grid h-11 w-11 place-items-center rounded-xl hover:bg-muted"><app-icon name="X" class="h-5 w-5" /></button>
    </div>
  `,
})
export class DrawerTitleComponent {
  readonly closed = output<void>();
  private readonly drawer = inject(DrawerComponent, { optional: true });
  /** Si el panel tiene cambios sin guardar, pide confirmación antes de cerrar. */
  protected cerrar() {
    if (this.drawer?.sucio()) this.drawer.solicitarCierre();
    else this.closed.emit();
  }
}
/* ------------------------------------------------------------------ */
/* Subida de imágenes (solo previsualiza con object URLs)              */
/* ------------------------------------------------------------------ */
/** Lee el ancho y el alto reales de una imagen (archivo o URL). */
export const medirImagen = (src: string) =>
  new Promise<{ w: number; h: number }>((ok) => {
    const img = new Image();
    img.onload = () => ok({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => ok({ w: 0, h: 0 });
    img.src = src;
  });

/** Mensaje si la imagen mide menos que el mínimo recomendado; vacío si está bien (o si no se pudo medir, p. ej. SVG). */
export const avisoTamano = (m: { w: number; h: number }, minW: number, minH: number) =>
  m.w && m.h && (m.w < minW || m.h < minH) ? `La imagen mide ${m.w} × ${m.h} px y se recomienda al menos ${minW} × ${minH} px; puede verse borrosa.` : "";

@Component({
  selector: "a-image-upload",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      @if (value().length > 0) {
        <div class="mb-2 grid grid-cols-3 gap-2">
          @for (src of value(); track src + $index; let i = $index) {
            <div [class]="'group relative overflow-hidden rounded-xl border border-border ' + aspect()">
              <img [src]="src" alt="" class="h-full w-full object-cover" />
              @if (i === 0 && multiple()) { <span class="absolute left-1 top-1 rounded-md bg-card px-1.5 text-xs font-semibold">Principal</span> }
              <!-- No es un <button>: dentro de un <a-field> (que es un <label>) un clic cercano lo activaría y borraría la imagen. -->
              <span role="button" tabindex="0" aria-label="Quitar imagen" (click)="$event.preventDefault(); $event.stopPropagation(); quitar(i)" (keydown.enter)="quitar(i)" (keydown.space)="$event.preventDefault(); quitar(i)"
                class="absolute right-1.5 top-1.5 grid h-7 w-7 cursor-pointer place-items-center rounded-full bg-card text-base font-bold leading-none shadow hover:bg-destructive hover:text-destructive-foreground">×</span>
            </div>
          }
        </div>
      }
      <div role="button" tabindex="0" (click)="$event.preventDefault(); fichero.click()" (keydown.enter)="fichero.click()" (dragover)="$event.preventDefault()" (drop)="$event.preventDefault(); agregar($any($event).dataTransfer.files)"
        class="grid min-h-24 cursor-pointer place-items-center rounded-xl border-2 border-dashed border-border p-3 text-center text-sm text-muted-foreground hover:border-primary hover:bg-muted/40">
        <span><b class="text-foreground">Subir imagen</b> o arrastrar aquí<br />{{ hint() }}@if (minAncho() && minAlto()) { <br /><span class="font-medium text-foreground">Mínimo recomendado: {{ minAncho() }} × {{ minAlto() }} px</span> }</span>
        <input #fichero type="file" accept="image/*" [multiple]="multiple()" class="sr-only" tabindex="-1" aria-label="Subir imagen" (click)="$event.stopPropagation()" (change)="agregar($any($event.target).files); $any($event.target).value = ''" />
      </div>
      @if (aviso()) { <p role="status" class="mt-2 text-xs font-medium text-destructive">{{ aviso() }}</p> }
    </div>
  `,
})
export class ImageUploadComponent {
  private readonly toast = inject(ToastService);
  readonly value = model<string[]>([]);
  readonly hint = input("");
  readonly multiple = input(false);
  readonly aspect = input("aspect-square");
  /** Tamaño mínimo recomendado en píxeles: se muestra y avisa (sin bloquear) si la imagen subida es menor. */
  readonly minAncho = input(0);
  readonly minAlto = input(0);
  protected readonly aviso = signal("");

  protected agregar(files: FileList | null) {
    if (!files?.length) return;
    const urls = Array.from(files).filter((f) => f.type.startsWith("image/")).map((f) => URL.createObjectURL(f));
    this.aviso.set("");
    if (this.minAncho() && this.minAlto()) {
      void Promise.all(urls.map(medirImagen)).then((ms) => this.aviso.set(ms.map((m) => avisoTamano(m, this.minAncho(), this.minAlto())).find(Boolean) ?? ""));
    }
    this.value.set(this.multiple() ? [...this.value(), ...urls] : urls.slice(0, 1));
    this.toast.show(`${urls.length} imagen(es) cargada(s)`);
  }
  protected quitar(i: number) {
    this.value.set(this.value().filter((_, k) => k !== i));
  }
}

/* ------------------------------------------------------------------ */
/* Periodo y series de ejemplo                                         */
/* ------------------------------------------------------------------ */
export type Periodo = "7d" | "30d" | "90d" | "6m" | "rango";
export const periodos: { k: Periodo; l: string }[] = [
  { k: "7d", l: "7 días" }, { k: "30d", l: "30 días" }, { k: "90d", l: "90 días" }, { k: "6m", l: "6 meses" }, { k: "rango", l: "Rango" },
];
/** Factor de escala para simular cifras por periodo. */
export const factorPeriodo = (p: Periodo, desde?: string, hasta?: string) => {
  if (p === "rango" && desde && hasta) return Math.max(0.03, (new Date(hasta).getTime() - new Date(desde).getTime()) / 864e5 / 180);
  return { "7d": 0.04, "30d": 0.17, "90d": 0.5, "6m": 1, rango: 1 }[p];
};
export type Punto = { x: string; emitidos: number; canjeados: number };
/** Serie de ejemplo según periodo: días, semanas o meses. */
export function serieDe(per: Periodo, f: number, tendencia: { mes: string; emitidos: number; canjeados: number }[]): Punto[] {
  if (!tendencia.length) return [];
  const pts = per === "7d" ? 7 : per === "30d" ? 10 : per === "90d" ? 12 : per === "6m" ? tendencia.length : Math.min(12, Math.max(4, Math.round(f * 24)));
  if (per === "6m") return tendencia.map((t) => ({ x: t.mes, emitidos: t.emitidos, canjeados: t.canjeados }));
  const lbl = per === "7d" ? (i: number) => ["Mié", "Jue", "Vie", "Sáb", "Dom", "Lun", "Mar"][i]! : per === "30d" ? (i: number) => `${i * 3 + 1}/10` : (i: number) => `Sem ${i + 1}`;
  const base = tendencia[tendencia.length - 1]!;
  return Array.from({ length: pts }, (_, i) => ({
    x: lbl(i),
    emitidos: Math.round((base.emitidos / pts) * (0.8 + 0.4 * Math.abs(Math.sin(i * 1.7))) * f * 6 * 10) / 10,
    canjeados: Math.round((base.canjeados / pts) * (0.7 + 0.5 * Math.abs(Math.cos(i * 1.3))) * f * 6 * 10) / 10,
  }));
}

@Component({
  selector: "a-period-filter",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap items-center gap-2">
      <div class="inline-flex flex-wrap rounded-xl border border-border bg-card p-1" role="group" aria-label="Periodo">
        @for (p of periodos; track p.k) {
          <button [attr.aria-pressed]="per() === p.k" (click)="per.set(p.k)"
            [class]="'h-9 rounded-lg px-3 text-sm font-semibold ' + (per() === p.k ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')">{{ p.l }}</button>
        }
      </div>
      @if (per() === "rango") {
        <input aria-label="Desde" type="date" style="width:10.5rem" [class]="inputCls" [value]="desde()" (input)="desde.set($any($event.target).value)" />
        <input aria-label="Hasta" type="date" style="width:10.5rem" [class]="inputCls" [value]="hasta()" (input)="hasta.set($any($event.target).value)" />
      }
    </div>
  `,
})
export class PeriodFilterComponent {
  readonly per = model<Periodo>("30d");
  readonly desde = model("");
  readonly hasta = model("");
  protected readonly periodos = periodos;
  protected readonly inputCls = INPUT_CLS;
}

/* ------------------------------------------------------------------ */
/* Gráficos (Chart.js)                                                 */
/* ------------------------------------------------------------------ */
export type SerieChart = { label: string; data: number[]; color?: string; fill?: boolean };

/** Colores de las porciones de un gráfico de anillo: el de la marca primero y tonos distinguibles después. */
export const PALETA = ["--primary", "--foreground", "#f59e0b", "#8b5cf6", "#10b981", "#ef4444", "#64748b", "#0ea5e9"];
const cssVar = (name: string, desde: Element = document.documentElement) => getComputedStyle(desde).getPropertyValue(name).trim() || "#00bdd2";

@Component({
  selector: "a-chart",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "relative block", "[style.height]": "alto()" },
  template: `<canvas #canvas role="img" [attr.aria-label]="descripcion()"></canvas>`,
})
export class ChartComponent {
  /** Texto para lectores de pantalla (qué muestra el gráfico). */
  readonly descripcion = input("Gráfico");
  readonly type = input<"line" | "bar" | "doughnut">("line");
  readonly labels = input<string[]>([]);
  readonly series = input<SerieChart[]>([]);
  readonly horizontal = input(false);
  /** Alto del gráfico (los de anillo con leyenda al lado son más bajos). */
  readonly alto = input("18rem");
  readonly leyenda = input(true);
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>("canvas");
  private chart: any = null;

  /** Resalta una porción o barra (y muestra su detalle) desde afuera, p. ej. al pasar el mouse por su leyenda. */
  resaltar(i: number | null) {
    const c = this.chart;
    if (!c) return;
    const a = c.chartArea;
    const sel = i === null ? [] : [{ datasetIndex: 0, index: i }];
    c.setActiveElements(sel);
    c.tooltip?.setActiveElements(sel, a ? { x: (a.left + a.right) / 2, y: (a.top + a.bottom) / 2 } : { x: 0, y: 0 });
    c.update();
  }
  /** Muestra u oculta una porción del anillo (como al tocar su leyenda). */
  alternar(i: number) {
    this.chart?.toggleDataVisibility(i);
    this.chart?.update();
  }

  constructor() {
    const destroy = inject(DestroyRef);
    destroy.onDestroy(() => this.chart?.destroy());
    // El tema oscuro del panel es una clase de su contenedor (no de <html>): el gráfico se redibuja al alternarlo para tomar sus colores.
    const tema = signal(0);
    afterNextRender(() => {
      const raiz = this.canvas().nativeElement.closest("[data-admin-tema]");
      if (!raiz) return;
      const obs = new MutationObserver(() => tema.update((n) => n + 1));
      obs.observe(raiz, { attributes: true, attributeFilter: ["data-admin-tema"] });
      destroy.onDestroy(() => obs.disconnect());
    });
    effect(() => {
      tema();
      const type = this.type();
      const labels = this.labels();
      const series = this.series();
      const horizontal = this.horizontal();
      const leyenda = this.leyenda();
      const el = this.canvas().nativeElement;
      import("chart.js/auto").then(({ default: Chart }) => {
        this.chart?.destroy();
        // Los colores se leen del propio gráfico para que respeten el tema (claro u oscuro) del panel donde está.
        const color = (c: string) => (c.startsWith("--") ? cssVar(c, el) : c);
        const border = cssVar("--border", el);
        const muted = cssVar("--muted-foreground", el);
        this.chart = new Chart(el, {
          type,
          data: {
            labels,
            datasets: series.map((s) => ({
              label: s.label,
              data: s.data,
              borderColor: type === "doughnut" ? undefined : color(s.color ?? "--primary"),
              backgroundColor: type === "doughnut" ? labels.map((_, i) => color(PALETA[i % PALETA.length]!)) : s.fill ? color(s.color ?? "--primary") + "33" : color(s.color ?? "--primary"),
              fill: s.fill ?? false,
              tension: 0.35,
              borderRadius: type === "bar" ? 6 : 0,
              pointRadius: 3,
              pointHoverRadius: 6,
              hoverOffset: 8,
              hoverBorderWidth: type === "doughnut" ? 2 : 0,
              hoverBorderColor: cssVar("--card", el),
            })),
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: horizontal ? "y" : "x",
            // Todos los gráficos responden igual: el detalle sale al pasar por una columna o punto (no hace falta acertar la marca exacta),
            // los números van con separador de miles y la leyenda activa o apaga cada serie.
            interaction: type === "doughnut" ? { mode: "nearest", intersect: true } : { mode: "index", intersect: false, axis: horizontal ? "y" : "x" },
            onHover: (e: any, act: unknown[]) => { if (e.native?.target) (e.native.target as HTMLElement).style.cursor = act.length ? "pointer" : "default"; },
            plugins: {
              legend: {
                display: leyenda && (type !== "line" || series.length > 1),
                labels: { color: muted, usePointStyle: true, boxWidth: 8 },
                onHover: (e: any) => { if (e.native?.target) (e.native.target as HTMLElement).style.cursor = "pointer"; },
                onLeave: (e: any) => { if (e.native?.target) (e.native.target as HTMLElement).style.cursor = "default"; },
              },
              tooltip: {
                padding: 10,
                callbacks: {
                  label: (ctx: any) => {
                    const v = type === "doughnut" ? ctx.parsed : horizontal ? ctx.parsed.x : ctx.parsed.y;
                    if (type === "doughnut") {
                      const total = (ctx.dataset.data as number[]).reduce((s, x, k) => s + (ctx.chart.getDataVisibility(k) ? x : 0), 0);
                      return `${ctx.label}: ${v.toLocaleString("es")}${total ? ` (${((v / total) * 100).toLocaleString("es", { maximumFractionDigits: 1 })} %)` : ""}`;
                    }
                    return `${ctx.dataset.label ? ctx.dataset.label + ": " : ""}${Number(v).toLocaleString("es")}`;
                  },
                },
              },
            },
            scales: type === "doughnut" ? {} : { x: { ticks: { color: muted }, grid: { color: border } }, y: { ticks: { color: muted }, grid: { color: border } } },
          },
        });
      });
    });
  }
}

/* ------------------------------------------------------------------ */
/* Listas paginadas (consultas por página, búsqueda y filtros en la API) */
/* ------------------------------------------------------------------ */
/** Lo que el paginador y los encabezados ordenables necesitan de una lista: la consulta al servidor (`Paginado`) o una lista local (`ListaLocal`). */
export interface Paginador {
  total(): number; page(): number; size(): number; paginas(): number; cargando(): boolean; error(): boolean;
  recargar(): void; ir(p: number): void; tamano(n: number): void;
}
export interface Ordenable { sort(): string; dir(): "asc" | "desc"; ordenar(campo: string): void }

export type Pagina<T> = { items: T[]; total: number; page: number; size: number; facetas?: Record<string, Record<string, number>> };

/**
 * Estado de una tabla grande: solo se pide a la API la página visible, de modo que el panel
 * escala con cientos de miles de filas. La búsqueda lleva retardo (debounce) y descarta respuestas viejas.
 */
export class Paginado<T> {
  readonly items = signal<T[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly size = signal(25);
  readonly q = signal("");
  readonly sort = signal("");
  readonly dir = signal<"asc" | "desc">("asc");
  readonly filtros = signal<Record<string, string>>({});
  readonly cargando = signal(false);
  /** La última consulta falló (red o servidor): la tabla muestra el error con "Reintentar" en vez de "sin resultados". */
  readonly error = signal(false);
  /** Campos de los que se piden conteos globales (p. ej. "estado") y su resultado: facetas()["estado"]["Nuevo"]. */
  campos = "";
  readonly facetas = signal<Record<string, Record<string, number>>>({});
  /** Duración de la última consulta (ms), útil para medir rendimiento. */
  readonly ms = signal(0);
  readonly paginas = computed(() => Math.max(1, Math.ceil(this.total() / this.size())));
  /** Hay búsqueda o algún filtro aplicado (para mostrar "Limpiar filtros"). */
  readonly activo = computed(() => !!this.q().trim() || Object.values(this.filtros()).some(Boolean));
  private temporizador: ReturnType<typeof setTimeout> | undefined;
  private secuencia = 0;

  constructor(
    private readonly api: ApiService,
    private readonly coleccion: string,
    tamano = 25,
    /** Ruta base de la consulta; los reportes usan la suya para depender solo del permiso de Reportes. */
    private readonly base = "admin/q/",
  ) {
    this.size.set(tamano);
  }

  recargar() {
    const id = ++this.secuencia;
    this.cargando.set(true);
    this.error.set(false);
    const t0 = performance.now();
    const params: Record<string, string | number> = { page: this.page(), size: this.size() };
    if (this.q().trim()) params["q"] = this.q().trim();
    if (this.sort()) {
      params["sort"] = this.sort();
      params["dir"] = this.dir();
    }
    for (const [k, v] of Object.entries(this.filtros())) if (v) params[k] = v;
    if (this.campos) params["facetas"] = this.campos;
    this.api.get<Pagina<T>>(`${this.base}${this.coleccion}`, params).subscribe({
      next: (r) => {
        if (id !== this.secuencia) return; // llegó una respuesta más nueva
        this.items.set(r.items);
        if (r.facetas) this.facetas.set(r.facetas);
        this.total.set(r.total);
        this.page.set(r.page);
        this.ms.set(Math.round(performance.now() - t0));
        this.cargando.set(false);
      },
      error: () => {
        if (id !== this.secuencia) return;
        this.cargando.set(false);
        this.error.set(true);
      },
    });
  }
  /** Quita búsqueda y filtros y vuelve a la primera página. */
  limpiar() {
    clearTimeout(this.temporizador);
    this.q.set("");
    this.filtros.set({});
    this.page.set(1);
    this.recargar();
  }
  buscar(texto: string) {
    this.q.set(texto);
    this.page.set(1);
    clearTimeout(this.temporizador);
    this.temporizador = setTimeout(() => this.recargar(), 250);
  }
  /** `desde`/`hasta` filtran por fecha; el resto filtra por igualdad con el campo. */
  filtrar(campo: string, valor: string) {
    const k = campo === "desde" || campo === "hasta" ? campo : `f_${campo}`;
    this.filtros.update((f) => ({ ...f, [k]: valor }));
    this.page.set(1);
    this.recargar();
  }
  ir(p: number) {
    this.page.set(Math.min(Math.max(1, p), this.paginas()));
    this.recargar();
  }
  tamano(n: number) {
    this.size.set(n);
    this.page.set(1);
    this.recargar();
  }
  ordenar(campo: string) {
    this.dir.set(this.sort() === campo && this.dir() === "asc" ? "desc" : "asc");
    this.sort.set(campo);
    this.recargar();
  }
}

@Component({
  selector: "a-pager",
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { "[attr.data-error]": "p().error() ? '' : null" },
  template: `
    @if (p().error()) {
      <div role="alert" class="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
        <span class="font-semibold text-destructive">No pudimos cargar los datos. Revisa tu conexión e inténtalo otra vez.</span>
        <button type="button" class="inline-flex h-10 items-center rounded-xl border border-border bg-card px-4 font-semibold text-foreground hover:bg-muted" (click)="p().recargar()">Reintentar</button>
      </div>
    }
    <div class="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground" role="navigation" aria-label="Paginación">
      <p aria-live="polite">
        @if (p().total() === 0) { Sin resultados } @else { Mostrando <b class="text-foreground">{{ desde() }}–{{ hasta() }}</b> de <b class="text-foreground">{{ p().total().toLocaleString("es") }}</b> }
        @if (p().cargando()) { · cargando… }
      </p>
      <div class="flex max-w-full flex-wrap items-center gap-2">
        <label class="flex items-center gap-2"><span class="max-sm:sr-only">Filas</span>
          <select aria-label="Filas por página" class="h-9 rounded-lg border border-input bg-background px-2 text-foreground" (change)="p().tamano(+$any($event.target).value)">
            @for (n of tamanos; track n) { <option [value]="n" [selected]="n === p().size()">{{ n }}</option> }
          </select>
        </label>
        <button type="button" aria-label="Primera página" [disabled]="p().page() <= 1" (click)="p().ir(1)" class="h-9 rounded-lg border border-border px-2 disabled:opacity-40">«</button>
        <button type="button" aria-label="Página anterior" [disabled]="p().page() <= 1" (click)="p().ir(p().page() - 1)" class="grid h-9 w-9 place-items-center rounded-lg border border-border disabled:opacity-40"><app-icon name="ChevronLeft" class="h-4 w-4" /></button>
        <span class="min-w-0 whitespace-nowrap text-center">Página <b class="text-foreground">{{ p().page().toLocaleString("es") }}</b> de {{ p().paginas().toLocaleString("es") }}</span>
        <button type="button" aria-label="Página siguiente" [disabled]="p().page() >= p().paginas()" (click)="p().ir(p().page() + 1)" class="grid h-9 w-9 place-items-center rounded-lg border border-border disabled:opacity-40"><app-icon name="ChevronRight" class="h-4 w-4" /></button>
        <button type="button" aria-label="Última página" [disabled]="p().page() >= p().paginas()" (click)="p().ir(p().paginas())" class="h-9 rounded-lg border border-border px-2 disabled:opacity-40">»</button>
      </div>
    </div>
  `,
})
export class PagerComponent {
  readonly p = input.required<Paginador>();
  protected readonly tamanos = [10, 25, 50, 100];
  protected readonly desde = computed(() => (this.p().page() - 1) * this.p().size() + 1);
  protected readonly hasta = computed(() => Math.min(this.p().total(), this.p().page() * this.p().size()));
}
/**
 * Anillo con su leyenda al lado (nombre, cantidad y porcentaje de cada porción): aprovecha el ancho del panel
 * en vez de dejar un círculo solo rodeado de espacio vacío.
 */
@Component({
  selector: "a-dona",
  imports: [ChartComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "block" },
  template: `
    <div class="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
      <a-chart #grafico type="doughnut" class="w-44 shrink-0" alto="11rem" [leyenda]="false" [descripcion]="'Gráfico de anillo: ' + nombre()" [labels]="labels()" [series]="[{ label: nombre(), data: data() }]" />
      <ul class="min-w-[11rem] flex-1 space-y-1.5 text-sm" [attr.aria-label]="'Detalle de ' + nombre()">
        @for (l of labels(); track l; let i = $index) {
          <li>
            <button type="button" class="flex w-full items-center gap-2 rounded-md px-1 py-0.5 text-left hover:bg-muted focus-visible:bg-muted" [class.opacity-40]="ocultas().has(i)"
              [attr.aria-pressed]="!ocultas().has(i)" [attr.aria-label]="(ocultas().has(i) ? 'Mostrar ' : 'Ocultar ') + l"
              (mouseenter)="grafico.resaltar(i)" (mouseleave)="grafico.resaltar(null)" (focus)="grafico.resaltar(i)" (blur)="grafico.resaltar(null)" (click)="alternar(i, grafico)">
              <span class="h-3 w-3 shrink-0 rounded-sm" [style.background]="color(i)" aria-hidden="true"></span>
              <span class="min-w-0 flex-1 truncate" [class.line-through]="ocultas().has(i)" [title]="l">{{ l }}</span>
              <b>{{ data()[i]!.toLocaleString("es") }}</b>
              <span class="w-14 text-right text-muted-foreground">{{ porcentaje(i) }}</span>
            </button>
          </li>
        }
      </ul>
    </div>
  `,
})
export class DonaComponent {
  readonly labels = input<string[]>([]);
  readonly data = input<number[]>([]);
  readonly nombre = input("Total");
  protected readonly ocultas = signal<ReadonlySet<number>>(new Set());
  /** Total de lo que se ve: al apagar una porción, los porcentajes se recalculan sobre el resto. */
  private readonly total = computed(() => this.data().reduce((s, x, i) => s + (this.ocultas().has(i) ? 0 : x), 0));
  protected alternar(i: number, g: ChartComponent) {
    g.alternar(i);
    this.ocultas.update((s) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; });
  }
  protected color(i: number) {
    const c = PALETA[i % PALETA.length]!;
    return c.startsWith("--") ? `var(${c})` : c;
  }
  protected porcentaje(i: number) {
    const t = this.total();
    return t && !this.ocultas().has(i) ? `${(((this.data()[i] ?? 0) / t) * 100).toLocaleString("es", { maximumFractionDigits: 1 })} %` : "—";
  }
}
