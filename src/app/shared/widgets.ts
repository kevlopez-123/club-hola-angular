import {
  ChangeDetectionStrategy, Component, ElementRef, HostListener, computed, effect, inject, input, model, output, signal, viewChild,
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { CatIconComponent, IconComponent } from "./icon.component";
import { LimpiarFiltrosComponent } from "./limpiar-filtros";
import { BenefitCardComponent, ModalComponent, SectionTitleComponent } from "./ui";
import { CatalogService } from "../core/catalog.service";
import { BrandService } from "../core/brand.service";
import { StoreService } from "../core/store.service";
import { formatUSD } from "../core/format";
import { SesionService } from "../core/sesion.service";
import type { Categoria } from "../core/models";

export type OrdenCatalogo = "recomendado" | "precio-asc" | "precio-desc" | "az";

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
export const ordenes: { value: OrdenCatalogo; label: string }[] = [
  { value: "recomendado", label: "Recomendado" },
  { value: "precio-asc", label: "Menor precio" },
  { value: "precio-desc", label: "Mayor precio" },
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
  readonly value = model<OrdenCatalogo>("recomendado");
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
            [style.border-color]="esActual(n) ? n.color : null" [style.border-width.px]="esActual(n) ? 2 : null">
            <span class="grid h-10 w-10 place-items-center rounded-full" [style.background]="n.color + '22'">
              <app-icon name="Gem" class="h-5 w-5" [style.color]="n.color" />
            </span>
            <div class="min-w-0 flex-1">
              <p class="text-base font-extrabold text-ink">
                {{ n.nombre }}
                @if (esActual(n)) { <span class="ml-2 text-sm font-bold text-primary">Tu nivel actual</span> }
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
  /** Nivel que le asignó el banco al participante (nombre o id). */
  readonly nivelActual = input.required<string>();
  readonly closed = output<void>();
  protected esActual(n: { id: string; nombre: string }) {
    return n.id === this.nivelActual() || n.nombre === this.nivelActual();
  }
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

        <ul class="mt-4 space-y-1 text-base text-muted-foreground">
          @for (b of a.beneficios; track b) { <li class="flex gap-2"><span aria-hidden="true" class="text-primary">•</span>{{ b }}</li> }
        </ul>

        <app-niveles-modal [open]="open()" [nivelActual]="nivel()" (closed)="open.set(false)" />
      </div>
    }
  `,
})
export class NivelResumenCardComponent {
  private readonly catalog = inject(CatalogService);
  readonly nivel = input.required<string>();
  protected readonly open = signal(false);
  protected readonly actual = computed(() => this.catalog.niveles().find((n) => n.id === this.nivel() || n.nombre === this.nivel()) ?? null);
}

/* ------------------------------------------------------------------ */
/* Pasarela de pago (simulada)                                         */
/* ------------------------------------------------------------------ */
@Component({
  selector: "app-payment-gateway-modal",
  imports: [ModalComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal [open]="open()" title="Paga con tu tarjeta del banco" (closed)="closed.emit()">
      <div class="rounded-2xl bg-header-gradient p-5 text-white">
        <p class="text-xs uppercase tracking-wide opacity-80">Total a pagar</p>
        <p class="text-3xl font-extrabold">{{ usd(monto()) }}</p>
      </div>

      <fieldset class="mt-5">
        <legend class="text-sm font-medium text-ink">Elige tu tarjeta</legend>
        <p class="mt-1 text-sm text-muted-foreground">Todo pago se valida con una tarjeta del banco.</p>
        <div class="mt-3 grid gap-2">
          @for (t of tarjetas(); track t.id) {
            <label [class]="'flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-colors ' + (elegida() === t.id ? 'border-primary bg-secondary text-ink' : 'border-border text-ink hover:border-primary')">
              <input type="radio" name="tarjeta-banco" [value]="t.id" [checked]="elegida() === t.id" (change)="elegida.set(t.id)" class="h-4 w-4 accent-[var(--primary)]" />
              <app-icon name="CreditCard" class="h-4 w-4 text-primary" />
              {{ t.label }}
            </label>
          }
        </div>
      </fieldset>

      <p class="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <app-icon name="ShieldCheck" class="h-4 w-4 text-primary" /> Transacción protegida.
      </p>

      <button type="button" [disabled]="procesando() || !elegida()" (click)="pagar()"
        class="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-base font-bold uppercase tracking-wide text-primary-foreground transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60">
        <app-icon [name]="procesando() ? 'Loader2' : 'CreditCard'" [class]="'h-4 w-4 ' + (procesando() ? 'animate-spin' : '')" />
        {{ procesando() ? "Procesando pago…" : "Pagar ahora" }}
      </button>
    </app-modal>
  `,
})
export class PaymentGatewayModalComponent {
  private readonly catalog = inject(CatalogService);
  readonly open = input(false);
  readonly monto = input.required<number>();
  readonly closed = output<void>();
  /** Id de la tarjeta del banco con la que se paga. */
  readonly pagado = output<string>();
  protected readonly usd = formatUSD;
  protected readonly procesando = signal(false);
  protected readonly tarjetas = computed(() => this.catalog.config()?.tarjetas ?? []);
  protected readonly elegida = signal("");

  protected pagar() {
    if (!this.elegida()) return;
    this.procesando.set(true);
    setTimeout(() => {
      this.procesando.set(false);
      this.pagado.emit(this.elegida());
    }, 1200);
  }
}

/* ------------------------------------------------------------------ */
/* Secciones de la portada                                             */
/* ------------------------------------------------------------------ */
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
  /** Los beneficios sin nivel mínimo (los de cada nivel se ven en su propia sección). */
  protected readonly ordenados = computed(() =>
    this.catalog.beneficios().filter((b) => !b.nivelMinimo).sort((a, b) => Number(b.tipo === "compra") - Number(a.tipo === "compra")),
  );
  protected scroll(dir: number) {
    this.scroller().nativeElement.scrollBy({ left: dir * 300, behavior: "smooth" });
  }
}

@Component({
  selector: "app-nivel-benefits-section",
  imports: [IconComponent, SectionTitleComponent, BenefitCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="bg-background py-14 sm:py-16">
      <div class="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
        <app-section-title [text]="catalog.textosHome().nivelesTitulo" [highlight]="catalog.textosHome().nivelesResalte" />
        @for (n of filas(); track n.id) {
          <section [attr.aria-label]="'Beneficios nivel ' + n.nombre" class="mt-10 border-t border-border pt-8">
            <div class="flex flex-wrap items-center justify-between gap-4">
              <h2 class="flex items-center gap-2 text-2xl font-extrabold text-ink">
                <app-icon name="Gem" class="h-6 w-6" [style.color]="n.color" /> Nivel {{ n.nombre }}
                @if (sesion.logged() && esMio(n)) { <span class="text-sm font-semibold text-primary">Tu nivel</span> }
              </h2>
              <div class="flex shrink-0 gap-2">
                <button type="button" [attr.aria-label]="'Beneficios anteriores de ' + n.nombre" (click)="scroll(carril, n.id, -1)"
                  class="grid h-11 w-11 place-items-center rounded-full bg-secondary text-primary transition-colors hover:bg-primary hover:text-primary-foreground"><app-icon name="ChevronLeft" class="h-4 w-4" /></button>
                <button type="button" [attr.aria-label]="'Más beneficios de ' + n.nombre" (click)="scroll(carril, n.id, 1)"
                  class="grid h-11 w-11 place-items-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105"><app-icon name="ChevronRight" class="h-4 w-4" /></button>
              </div>
            </div>
            <div [attr.data-carril]="n.id" class="no-scrollbar scroll-gutter mt-4 flex snap-x gap-5 overflow-x-auto">
              @for (b of n.lista; track b.id) { <app-benefit-card [beneficio]="b" class="w-[240px] shrink-0 snap-start sm:w-[260px]" /> }
            </div>
          </section>
        }
      </div>
    </section>
  `,
})
export class NivelBenefitsSectionComponent {
  protected readonly catalog = inject(CatalogService);
  protected readonly sesion = inject(SesionService);
  private readonly store = inject(StoreService);
  protected readonly carril = "carril";
  /** Cada nivel con sus beneficios; los que no piden nivel se muestran en el primero (Clásico), como en el React. */
  protected readonly filas = computed(() => {
    const niveles = this.catalog.niveles();
    const todos = this.catalog.beneficios();
    return niveles
      .map((n, i) => ({ ...n, lista: todos.filter((b) => (b.nivelMinimo ? b.nivelMinimo === n.id || b.nivelMinimo === n.nombre : i === 0)) }))
      .filter((n) => n.lista.length > 0);
  });
  protected esMio(n: { id: string; nombre: string }) {
    const u = this.store.usuario().nivel;
    return n.id === u || n.nombre === u;
  }
  protected scroll(_: string, id: string, dir: number) {
    document.querySelector<HTMLElement>(`[data-carril="${id}"]`)?.scrollBy({ left: dir * 300, behavior: "smooth" });
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
      { icon: "ShoppingBag", imagen: "cat", titulo: t.ctaCatalogoTitulo, texto: t.ctaCatalogoTexto, cta: t.ctaCatalogoBoton, to: "/beneficios" },
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
          @for (c of catalog.categoriasBeneficio(); track c.slug) {
            <a [routerLink]="['/beneficios']" [queryParams]="{ categoria: c.slug }"
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
