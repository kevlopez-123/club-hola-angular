import {
  ChangeDetectionStrategy, Component, ElementRef, HostListener, computed, effect, inject, input, model, output, signal, viewChild,
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { CatIconComponent, IconComponent } from "./icon.component";
import { LimpiarFiltrosComponent } from "./limpiar-filtros";
import { AddedToCartModalComponent, BenefitCardComponent, ModalComponent, ProductCardComponent, SectionTitleComponent, agregarProducto } from "./ui";
import { CatalogService } from "../core/catalog.service";
import { BrandService } from "../core/brand.service";
import { StoreService } from "../core/store.service";
import { faltanParaSiguiente, formatPuntos, formatUSD, nivelPorPuntos, progresoNivel, siguienteNivel } from "../core/format";
import type { Categoria, Ciudad, Orden_Producto, Producto } from "../core/models";

/* ------------------------------------------------------------------ */
/* Franja de categorías (+ subcategorías)                              */
/* ------------------------------------------------------------------ */
@Component({
  selector: "app-category-strip",
  imports: [CatIconComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      <div class="relative flex items-center gap-2">
        <button type="button" aria-label="Categorías anteriores" (click)="scroll(-1)"
          class="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border bg-card text-ink shadow transition-colors hover:bg-secondary">
          <app-icon name="ChevronLeft" class="h-5 w-5" />
        </button>

        <div #scroller class="no-scrollbar flex flex-1 gap-2 overflow-x-auto py-2">
          @for (c of categorias(); track c.slug) {
            <button type="button" (click)="value.set(value() === c.slug ? null : c.slug); subcategoria.set(null)"
              [class]="'flex w-[110px] shrink-0 flex-col items-center gap-2 rounded-2xl px-3 py-3 text-center transition-colors ' + (value() === c.slug ? 'bg-secondary text-primary' : 'text-ink hover:bg-secondary/60')">
              <span [class]="'grid h-12 w-12 place-items-center rounded-full border transition-colors ' + (value() === c.slug ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-primary')">
                <app-cat-icon [icon]="c.icon" [imagen]="c.imagen" class="h-6 w-6" />
              </span>
              <span class="text-[11px] font-medium leading-tight">{{ c.label }}</span>
            </button>
          }
        </div>

        <button type="button" aria-label="Más categorías" (click)="scroll(1)"
          class="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border bg-card text-ink shadow transition-colors hover:bg-secondary">
          <app-icon name="ChevronRight" class="h-5 w-5" />
        </button>
      </div>

      @if (subs().length > 0 && conSubcategorias()) {
        <div class="no-scrollbar mt-1 flex gap-2 overflow-x-auto border-t border-border pt-3">
          <button type="button" (click)="subcategoria.set(null)"
            [class]="'shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition-colors ' + (!subcategoria() ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-ink hover:border-primary hover:text-primary')">
            Todo
          </button>
          @for (s of subs(); track s.slug) {
            <button type="button" (click)="subcategoria.set(subcategoria() === s.slug ? null : s.slug)"
              [class]="'shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition-colors ' + (subcategoria() === s.slug ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-ink hover:border-primary hover:text-primary')">
              {{ s.label }}
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class CategoryStripComponent {
  readonly categorias = input.required<readonly Categoria[]>();
  readonly value = model<string | null>(null);
  readonly subcategoria = model<string | null>(null);
  /** Muestra la fila de subcategorías (solo catálogo de productos). */
  readonly conSubcategorias = input(false);
  private readonly scroller = viewChild.required<ElementRef<HTMLElement>>("scroller");

  protected readonly subs = computed(() => this.categorias().find((c) => c.slug === this.value())?.subcategorias ?? []);

  protected scroll(dir: number) {
    this.scroller().nativeElement.scrollBy({ left: dir * 320, behavior: "smooth" });
  }
}

/* ------------------------------------------------------------------ */
/* Orden y barra de búsqueda/filtros                                   */
/* ------------------------------------------------------------------ */
export const ordenes: { value: Orden_Producto; label: string }[] = [
  { value: "recomendado", label: "Recomendado" },
  { value: "puntos-asc", label: "Menor cantidad de puntos" },
  { value: "puntos-desc", label: "Mayor cantidad de puntos" },
  { value: "az", label: "Nombre (A - Z)" },
];

@Component({
  selector: "app-orden-select",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="flex w-full flex-col gap-1 text-sm text-muted-foreground sm:w-auto sm:flex-row sm:items-center sm:gap-2">
      <span class="font-semibold">Ordenar por</span>
      <select [value]="value()" (change)="value.set($any($event.target).value)"
        class="select-field h-11 w-full rounded-full border border-border bg-card px-4 text-sm font-medium text-ink outline-none focus:ring-2 focus:ring-primary/50 sm:w-auto">
        @for (o of ordenes; track o.value) {
          <option [value]="o.value" [selected]="o.value === value()">{{ o.label }}</option>
        }
      </select>
    </label>
  `,
})
export class OrdenSelectComponent {
  readonly value = model<Orden_Producto>("recomendado");
  protected readonly ordenes = ordenes;
}

@Component({
  selector: "app-search-filter-bar",
  imports: [IconComponent, LimpiarFiltrosComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-2xl bg-card p-3 shadow-[var(--shadow-card)] sm:p-4">
      <div class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div class="relative min-w-0">
          <input [value]="query()" (input)="query.set($any($event.target).value)" type="search" placeholder="Buscar aquí" aria-label="Buscar"
            class="h-11 w-full rounded-full bg-muted pl-5 pr-12 text-sm text-ink outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50" />
          <app-icon name="Search" class="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink" />
        </div>
        <button type="button" (click)="abierto.set(!abierto())"
          class="flex h-11 shrink-0 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold text-ink transition-colors hover:border-primary hover:text-primary">
          <app-icon name="SlidersHorizontal" class="h-4 w-4" />
          <span class="hidden sm:inline">Filtros</span>
        </button>
      </div>

      @if (!!query() || !!marca() || extrasActivos()) {
        <div class="mt-2 flex justify-end">
          <app-limpiar-filtros [activo]="true" (limpiar)="query.set(''); marca.set(''); limpiado.emit()" />
        </div>
      }

      @if (abierto()) {
        <div class="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-3">
          <label class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Marca
            <select [value]="marca()" (change)="marca.set($any($event.target).value)"
              class="select-field mt-1 h-11 w-full rounded-full border border-border bg-card px-4 text-sm font-medium text-ink outline-none focus:ring-2 focus:ring-primary/50">
              <option value="" [selected]="!marca()">Todas las marcas</option>
              @for (m of marcas(); track m) {
                <option [value]="m" [selected]="m === marca()">{{ m }}</option>
              }
            </select>
          </label>
          <ng-content />
        </div>
      }
    </div>
  `,
})
export class SearchFilterBarComponent {
  /** La pantalla indica si tiene otros filtros activos (subcategoría, "solo lo que me alcanza"…). */
  readonly extrasActivos = input(false);
  /** Se emite al limpiar para que la pantalla restablezca sus propios filtros. */
  readonly limpiado = output<void>();
  readonly query = model("");
  readonly marca = model("");
  readonly marcas = input<string[]>([]);
  protected readonly abierto = signal(false);
}

/* ------------------------------------------------------------------ */
/* Selector de ciudad (combobox)                                       */
/* ------------------------------------------------------------------ */
let cityUid = 0;

@Component({
  selector: "app-city-combobox",
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative">
      <label [for]="id" class="block text-base font-semibold text-ink">{{ label() }}</label>
      <div class="relative mt-2">
        <app-icon name="MapPin" class="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />
        <input [id]="id" type="text" role="combobox" [attr.aria-expanded]="abierto()" [attr.aria-controls]="id + '-list'"
          aria-autocomplete="list" autocomplete="off" [placeholder]="placeholder()"
          [value]="abierto() ? query() : seleccion() ? texto(seleccion()!) : ''"
          (focus)="abrir()" (input)="onInput($event)" (keydown)="onKey($event)"
          class="h-14 w-full rounded-2xl border border-border bg-surface pl-12 pr-11 text-base text-ink outline-none focus:ring-2 focus:ring-primary/50" />
        @if (seleccion() && !abierto()) {
          <button type="button" [attr.aria-label]="'Limpiar ' + label()" (click)="limpiar()"
            class="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted">
            <app-icon name="X" class="h-4 w-4" />
          </button>
        }
      </div>

      @if (abierto()) {
        <ul [id]="id + '-list'" role="listbox"
          class="absolute z-30 mt-2 max-h-72 w-full overflow-auto rounded-2xl border border-border bg-card p-2 shadow-[var(--shadow-card)]">
          @for (c of opciones(); track c.codigo; let i = $index) {
            <li role="option" [attr.aria-selected]="c.codigo === value()">
              <button type="button" (mouseenter)="activo.set(i)" (click)="elegir(c)"
                [class]="'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left ' + (i === activo() ? 'bg-muted' : '')">
                <app-icon name="Plane" class="h-4 w-4 shrink-0 text-primary" />
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-base font-semibold text-ink">{{ c.ciudad }}</span>
                  <span class="block truncate text-sm text-muted-foreground">{{ c.pais }}</span>
                </span>
                <span class="rounded-lg bg-muted px-2 py-1 text-sm font-bold text-ink">{{ c.codigo }}</span>
              </button>
            </li>
          }
          @if (opciones().length === 0) {
            <li class="px-3 py-4 text-base text-muted-foreground">No encontramos esa ciudad.</li>
          }
        </ul>
      }
    </div>
  `,
})
export class CityComboboxComponent {
  private readonly catalog = inject(CatalogService);
  private readonly el = inject(ElementRef<HTMLElement>);
  protected readonly id = `city-${++cityUid}`;

  readonly label = input.required<string>();
  readonly value = model("");
  readonly excluir = input<string | undefined>(undefined);
  readonly placeholder = input("Ciudad o código IATA");

  protected readonly abierto = signal(false);
  protected readonly query = signal("");
  protected readonly activo = signal(0);

  protected readonly seleccion = computed(() => this.catalog.ciudades().find((c) => c.codigo === this.value()) ?? null);
  protected readonly opciones = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.catalog.ciudades()
      .filter((c) => c.codigo !== this.excluir())
      .filter((c) => !q || `${c.ciudad} ${c.codigo} ${c.pais}`.toLowerCase().includes(q))
      .slice(0, 8);
  });

  protected texto(c: Ciudad) {
    return `${c.ciudad} (${c.codigo}) · ${c.pais}`;
  }
  protected abrir() {
    this.abierto.set(true);
    this.query.set("");
    this.activo.set(0);
  }
  protected cerrar() {
    this.abierto.set(false);
    this.query.set("");
  }
  protected limpiar() {
    this.value.set("");
    this.abierto.set(true);
    this.query.set("");
  }
  protected elegir(c: Ciudad) {
    this.value.set(c.codigo);
    this.cerrar();
  }
  protected onInput(e: Event) {
    this.query.set((e.target as HTMLInputElement).value);
    this.abierto.set(true);
    this.activo.set(0);
  }
  protected onKey(e: KeyboardEvent) {
    const n = this.opciones().length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      this.abierto.set(true);
      this.activo.update((i) => Math.min(i + 1, n - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      this.activo.update((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && this.abierto() && this.opciones()[this.activo()]) {
      e.preventDefault();
      this.elegir(this.opciones()[this.activo()]!);
    } else if (e.key === "Escape") {
      this.cerrar();
    }
  }

  @HostListener("document:mousedown", ["$event"])
  protected onDoc(e: MouseEvent) {
    if (this.abierto() && !this.el.nativeElement.contains(e.target as Node)) this.cerrar();
  }
}

/* ------------------------------------------------------------------ */
/* Niveles                                                             */
/* ------------------------------------------------------------------ */
@Component({
  selector: "app-niveles-modal",
  imports: [ModalComponent, RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal [open]="open()" title="¿Cómo funcionan los niveles?" maxWidth="max-w-2xl" (closed)="closed.emit()">
      <p class="text-base text-muted-foreground">{{ catalog.introNiveles() }}</p>

      <ul class="mt-5 space-y-3">
        @for (n of catalog.niveles(); track n.id) {
          <li class="flex flex-wrap items-center gap-3 rounded-2xl border border-border p-4"
            [style.border-color]="n.id === actual().id ? n.color : null" [style.border-width.px]="n.id === actual().id ? 2 : null">
            <span class="grid h-10 w-10 place-items-center rounded-full" [style.background]="n.color + '22'">
              <app-icon name="Gem" class="h-5 w-5" [style.color]="n.color" />
            </span>
            <div class="min-w-0 flex-1">
              <p class="text-base font-extrabold text-ink">
                {{ n.nombre }}
                @if (n.id === actual().id) { <span class="ml-2 text-sm font-bold text-primary">Tu nivel actual</span> }
              </p>
              <p class="text-sm text-muted-foreground">
                {{ puntos(n.desde) }}{{ n.hasta ? ' – ' + puntos(n.hasta) : ' a más' }} puntos
              </p>
              <ul class="mt-2 space-y-1 text-sm text-muted-foreground">
                @for (b of n.beneficios; track b) { <li class="flex gap-2"><span aria-hidden="true" class="text-primary">•</span>{{ b }}</li> }
              </ul>
            </div>
          </li>
        }
      </ul>

      <ul class="mt-5 space-y-2 rounded-2xl bg-surface p-4 text-base text-muted-foreground">
        @for (r of catalog.reglasNiveles(); track r) {
          <li class="flex gap-2"><span aria-hidden="true" class="text-primary">•</span>{{ r }}</li>
        }
      </ul>

      <a routerLink="/mi-nivel" (click)="closed.emit()"
        class="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-primary px-6 text-base font-bold text-primary-foreground lg:min-h-14">
        Ver todo sobre mi nivel
      </a>
    </app-modal>
  `,
})
export class NivelesModalComponent {
  protected readonly catalog = inject(CatalogService);
  readonly open = input(false);
  readonly puntosActuales = input.required<number>();
  readonly closed = output<void>();
  protected readonly puntos = formatPuntos;
  protected readonly actual = computed(() => nivelPorPuntos(this.catalog.niveles(), this.puntosActuales()) ?? { id: "", color: "" });
}

@Component({
  selector: "app-nivel-resumen-card",
  imports: [IconComponent, NivelesModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (actual(); as a) {
      <div class="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)]">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <span class="flex items-center gap-2 text-base font-extrabold text-ink">
            <span class="grid h-9 w-9 place-items-center rounded-full" [style.background]="a.color + '22'">
              <app-icon name="Gem" class="h-5 w-5" [style.color]="a.color" />
            </span>
            Nivel {{ a.nombre }}
          </span>
          <button type="button" (click)="open.set(true)"
            class="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-base font-bold text-primary">
            <app-icon name="Info" class="h-5 w-5" />
            Cómo funcionan los niveles
          </button>
        </div>

        <div class="mt-4">
          <div class="h-3 w-full overflow-hidden rounded-full bg-surface">
            <div class="h-full rounded-full transition-all" [style.width.%]="progreso()" [style.background]="a.color"></div>
          </div>
          <p class="mt-2 text-base text-muted-foreground">
            @if (siguiente(); as s) {
              Te faltan <strong class="text-ink">{{ puntos(faltan()) }}</strong> puntos para alcanzar el nivel {{ s.nombre }}.
            } @else {
              Estás en el nivel más alto del programa. ¡Felicitaciones!
            }
          </p>
        </div>

        <app-niveles-modal [open]="open()" [puntosActuales]="puntosActuales()" (closed)="open.set(false)" />
      </div>
    }
  `,
})
export class NivelResumenCardComponent {
  private readonly catalog = inject(CatalogService);
  readonly puntosActuales = input.required<number>({ alias: "puntos" });
  protected readonly open = signal(false);
  protected readonly puntos = formatPuntos;

  protected readonly actual = computed(() => {
    const n = this.catalog.niveles();
    return n.length ? nivelPorPuntos(n, this.puntosActuales()) : null;
  });
  protected readonly siguiente = computed(() => siguienteNivel(this.catalog.niveles(), this.puntosActuales()));
  protected readonly progreso = computed(() => progresoNivel(this.catalog.niveles(), this.puntosActuales()));
  protected readonly faltan = computed(() => faltanParaSiguiente(this.catalog.niveles(), this.puntosActuales()));
}

/* ------------------------------------------------------------------ */
/* Pasarela de pago (simulada)                                         */
/* ------------------------------------------------------------------ */
@Component({
  selector: "app-payment-gateway-modal",
  imports: [ModalComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal [open]="open()" title="Pasarela de pago Nuvei" (closed)="closed.emit()">
      <div class="rounded-2xl bg-header-gradient p-5 text-white">
        <p class="text-xs uppercase tracking-wide opacity-80">Total a pagar</p>
        <p class="text-3xl font-extrabold">{{ usd(monto()) }}</p>
      </div>

      <div class="mt-5 grid gap-3">
        <label class="text-sm font-medium text-ink">
          Número de tarjeta
          <input [value]="tarjeta()" (input)="tarjeta.set($any($event.target).value)" class="mt-1 w-full rounded-xl border border-border px-4 py-2.5 text-sm" />
        </label>
        <div class="grid grid-cols-2 gap-3">
          <label class="text-sm font-medium text-ink">
            Vencimiento
            <input value="09/29" class="mt-1 w-full rounded-xl border border-border px-4 py-2.5 text-sm" />
          </label>
          <label class="text-sm font-medium text-ink">
            CVV
            <input value="•••" class="mt-1 w-full rounded-xl border border-border px-4 py-2.5 text-sm" />
          </label>
        </div>
      </div>

      <p class="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <app-icon name="ShieldCheck" class="h-4 w-4 text-primary" /> Transacción protegida.
      </p>
      <details class="mt-3 text-xs text-muted-foreground">
        <summary class="cursor-pointer font-semibold">Tarjetas de prueba (entorno de demostración)</summary>
        <ul class="mt-1 list-disc space-y-0.5 pl-5">
          <li><code>4111 1111 1111 1111</code> · aprobada</li>
          <li><code>4000 0000 0000 0002</code> · rechazada por el banco</li>
          <li><code>4000 0000 0000 9995</code> · fondos insuficientes</li>
          <li><code>4000 0000 0000 0127</code> · pendiente de confirmación</li>
        </ul>
      </details>

      <button type="button" [disabled]="procesando()" (click)="pagar()"
        class="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-base font-bold uppercase tracking-wide text-primary-foreground transition-transform hover:scale-[1.02] disabled:opacity-60">
        <app-icon [name]="procesando() ? 'Loader2' : 'CreditCard'" [class]="'h-4 w-4 ' + (procesando() ? 'animate-spin' : '')" />
        {{ procesando() ? "Procesando pago…" : "Pagar ahora" }}
      </button>
    </app-modal>
  `,
})
export class PaymentGatewayModalComponent {
  readonly open = input(false);
  readonly monto = input.required<number>();
  readonly closed = output<void>();
  /** Lo que respondió la pasarela (en producción llega del proveedor de pagos, no de la pantalla). */
  readonly resultado = output<{ resultado: "aprobado" | "rechazado" | "pendiente"; motivo?: string; referencia: string }>();
  protected readonly usd = formatUSD;
  protected readonly procesando = signal(false);
  protected readonly tarjeta = signal("4532 •••• •••• 8821");

  protected pagar() {
    this.procesando.set(true);
    const digitos = this.tarjeta().replace(/\D/g, "");
    const referencia = `NVI-${Date.now().toString(36).toUpperCase()}`;
    setTimeout(() => {
      this.procesando.set(false);
      // Tarjetas de prueba del entorno de demostración; cualquier otra se aprueba.
      if (digitos.endsWith("0002")) this.resultado.emit({ resultado: "rechazado", motivo: "El banco rechazó la tarjeta", referencia });
      else if (digitos.endsWith("9995")) this.resultado.emit({ resultado: "rechazado", motivo: "Fondos insuficientes", referencia });
      else if (digitos.endsWith("0127")) this.resultado.emit({ resultado: "pendiente", referencia });
      else this.resultado.emit({ resultado: "aprobado", referencia });
    }, 1600);
  }
}

/* ------------------------------------------------------------------ */
/* Secciones de la portada                                             */
/* ------------------------------------------------------------------ */
@Component({
  selector: "app-product-section",
  imports: [IconComponent, SectionTitleComponent, ProductCardComponent, AddedToCartModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="bg-background py-14 sm:py-16">
      <div class="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
        <app-section-title [text]="catalog.textosHome().productosTitulo" [highlight]="catalog.textosHome().productosResalte" />

        <div class="mt-7 flex justify-center">
          <div class="flex gap-1 rounded-full bg-muted p-1">
            @for (t of tabs(); track t) {
              <button type="button" (click)="tab.set(t)"
                [class]="'rounded-full px-5 py-2 text-sm font-medium transition-colors ' + (tabActiva() === t ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-ink')">
                {{ t }}
              </button>
            }
          </div>
        </div>

        <div #scroller class="no-scrollbar scroll-gutter mt-6 flex snap-x gap-5 overflow-x-auto">
          @for (p of lista(); track tabActiva() + p.id) {
            <app-product-card [producto]="p" (add)="onAdd($event)" class="w-[240px] shrink-0 snap-start sm:w-[260px]" />
          }
        </div>

        <div class="mt-6 flex justify-center gap-3">
          <button type="button" aria-label="Ver productos anteriores" (click)="scroll(-1)"
            class="grid h-11 w-11 place-items-center rounded-full bg-secondary text-primary transition-colors hover:bg-primary hover:text-primary-foreground">
            <app-icon name="ChevronLeft" class="h-4 w-4" />
          </button>
          <button type="button" aria-label="Ver más productos" (click)="scroll(1)"
            class="grid h-11 w-11 place-items-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105">
            <app-icon name="ChevronRight" class="h-4 w-4" />
          </button>
        </div>
      </div>

      <app-added-to-cart-modal [producto]="agregado()" (closed)="agregado.set(null)" />
    </section>
  `,
})
export class ProductSectionComponent {
  private readonly catalog = inject(CatalogService);
  private readonly store = inject(StoreService);
  private readonly scroller = viewChild.required<ElementRef<HTMLElement>>("scroller");

  protected readonly tab = signal<string | null>(null);
  protected readonly agregado = signal<Producto | null>(null);
  protected readonly tabs = computed(() => Object.keys(this.catalog.productosPorTab()));
  protected readonly tabActiva = computed(() => this.tab() ?? this.tabs()[0] ?? "");
  protected readonly lista = computed(() => this.catalog.productosPorTab()[this.tabActiva()] ?? []);

  protected onAdd(p: Producto) {
    agregarProducto(this.store, p);
    this.agregado.set(p);
  }
  protected scroll(dir: number) {
    this.scroller().nativeElement.scrollBy({ left: dir * 300, behavior: "smooth" });
  }
}

@Component({
  selector: "app-benefits-section",
  imports: [IconComponent, SectionTitleComponent, BenefitCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="bg-surface py-14 sm:py-16">
      <div class="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
        <app-section-title [text]="catalog.textosHome().beneficiosTitulo" [highlight]="catalog.textosHome().beneficiosResalte" />

        <div #scroller class="no-scrollbar scroll-gutter mt-6 flex snap-x gap-5 overflow-x-auto">
          @for (b of ordenados(); track b.id) {
            <app-benefit-card [beneficio]="b" class="w-[240px] shrink-0 snap-start sm:w-[260px]" />
          }
        </div>

        <div class="mt-6 flex justify-center gap-3">
          <button type="button" aria-label="Ver beneficios anteriores" (click)="scroll(-1)"
            class="grid h-11 w-11 place-items-center rounded-full bg-secondary text-primary transition-colors hover:bg-primary hover:text-primary-foreground">
            <app-icon name="ChevronLeft" class="h-4 w-4" />
          </button>
          <button type="button" aria-label="Ver más beneficios" (click)="scroll(1)"
            class="grid h-11 w-11 place-items-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105">
            <app-icon name="ChevronRight" class="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  `,
})
export class BenefitsSectionComponent {
  private readonly catalog = inject(CatalogService);
  private readonly scroller = viewChild.required<ElementRef<HTMLElement>>("scroller");
  protected readonly ordenados = computed(() =>
    [...this.catalog.beneficios()].sort((a, b) => Number(b.tipo === "compra") - Number(a.tipo === "compra")),
  );
  protected scroll(dir: number) {
    this.scroller().nativeElement.scrollBy({ left: dir * 300, behavior: "smooth" });
  }
}

@Component({
  selector: "app-cta-duo",
  imports: [IconComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="bg-background py-14 sm:py-16">
      <div class="mx-auto grid max-w-[1440px] gap-6 px-4 sm:px-6 lg:grid-cols-2 lg:px-10">
        @for (item of items(); track item.imagen) {
          <article class="card-elevate overflow-hidden rounded-2xl bg-card">
            <img [src]="item.imagen === 'cat' ? brand.imagenes().ctaCatalogo : brand.imagenes().ctaContacto" [alt]="item.titulo" width="1000" height="600" loading="lazy" class="h-44 w-full object-cover sm:h-52" />
            <div class="relative px-6 pb-7 pt-10 text-center">
              <span class="absolute -top-7 left-1/2 grid h-14 w-14 -translate-x-1/2 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg">
                <app-icon [name]="item.icon" class="h-6 w-6" />
              </span>
              <h3 class="text-lg font-bold text-ink">{{ item.titulo }}</h3>
              <p class="mt-2 text-sm text-muted-foreground">{{ item.texto }}</p>
              <a [routerLink]="item.to"
                class="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-8 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-transform hover:scale-[1.03] lg:min-h-14">
                {{ item.cta }}
              </a>
            </div>
          </article>
        }
      </div>
    </section>
  `,
})
export class CtaDuoComponent {
  protected readonly brand = inject(BrandService);
  private readonly catalog = inject(CatalogService);
  /** Textos editables en Admin → Configuración → Textos del Home. */
  protected readonly items = computed(() => {
    const t = this.catalog.textosHome();
    return [
      { icon: "ShoppingBag", imagen: "cat", titulo: t.ctaCatalogoTitulo, texto: t.ctaCatalogoTexto, cta: t.ctaCatalogoBoton, to: "/canjea" },
      { icon: "MessageCircleQuestion", imagen: "con", titulo: t.ctaContactoTitulo, texto: t.ctaContactoTexto, cta: t.ctaContactoBoton, to: "/contacto" },
    ];
  });
}

/* ------------------------------------------------------------------ */
/* Secciones opcionales de la portada (se activan en Admin → Contenido) */
/* ------------------------------------------------------------------ */
@Component({
  selector: "app-home-categories",
  imports: [CatIconComponent, RouterLink, SectionTitleComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="bg-background py-14 sm:py-16">
      <div class="page-container">
        <app-section-title [text]="catalog.textosHome().categoriasTitulo" [highlight]="catalog.textosHome().categoriasResalte" />
        <div class="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          @for (c of catalog.categoriasProducto(); track c.slug) {
            <a [routerLink]="['/canjea']" [queryParams]="{ categoria: c.slug }"
              class="card-elevate flex flex-col items-center gap-3 rounded-2xl bg-card px-3 py-5 text-center">
              <span class="grid h-14 w-14 place-items-center rounded-full bg-secondary text-primary"><app-cat-icon [icon]="c.icon" [imagen]="c.imagen" class="h-7 w-7" /></span>
              <span class="text-sm font-semibold text-ink">{{ c.label }}</span>
            </a>
          }
        </div>
      </div>
    </section>
  `,
})
export class HomeCategoriesComponent {
  protected readonly catalog = inject(CatalogService);
}

@Component({
  selector: "app-home-destinos",
  imports: [RouterLink, SectionTitleComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="bg-surface py-14 sm:py-16">
      <div class="page-container">
        <app-section-title [text]="catalog.textosHome().destinosTitulo" [highlight]="catalog.textosHome().destinosResalte" />
        <div class="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          @for (d of catalog.destinos(); track d.slug) {
            <article class="card-elevate flex h-full flex-col overflow-hidden rounded-2xl bg-card">
              <a [routerLink]="['/vuelos/destinos', d.slug]" class="block overflow-hidden">
                <img [src]="d.imagen" [alt]="d.ciudad + ', ' + d.pais" width="1024" height="768" loading="lazy" class="h-44 w-full object-cover transition-transform duration-500 hover:scale-105" />
              </a>
              <div class="flex flex-1 flex-col p-4">
                <p class="text-sm uppercase tracking-wide text-muted-foreground">{{ d.pais }}</p>
                <h3 class="mt-1 text-base font-extrabold text-ink">{{ d.ciudad }}</h3>
                <p class="mt-2 flex-1 text-sm text-muted-foreground">{{ d.resumen }}</p>
                <p class="mt-3 text-base font-bold text-primary">Desde {{ '$' + d.desdeUSD }}</p>
              </div>
            </article>
          }
        </div>
      </div>
    </section>
  `,
})
export class HomeDestinosComponent {
  protected readonly catalog = inject(CatalogService);
}

@Component({
  selector: "app-home-cta-puntos",
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (catalog.reglas().compraActiva) {
      <section class="bg-background py-14 sm:py-16">
        <div class="page-container">
          <div class="flex flex-col items-center gap-4 rounded-3xl bg-header-gradient p-8 text-center text-white sm:p-12">
            <app-icon name="Sparkles" class="h-8 w-8" />
            <h2 class="text-2xl font-extrabold sm:text-3xl">¿Te faltan puntos para tu próximo premio?</h2>
            <p class="max-w-xl text-base text-white/90">Cómpralos en segundos con tu tarjeta y se acreditan al instante.</p>
            <a routerLink="/mis-puntos/compra" class="mt-2 inline-flex min-h-12 items-center rounded-full bg-white px-8 text-sm font-bold uppercase tracking-wide text-primary transition-transform hover:scale-[1.03]">Comprar puntos</a>
          </div>
        </div>
      </section>
    }
  `,
})
export class HomeCtaPuntosComponent {
  protected readonly catalog = inject(CatalogService);
}