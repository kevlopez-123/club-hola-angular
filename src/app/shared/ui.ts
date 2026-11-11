import { ChangeDetectionStrategy, Component, HostListener, computed, effect, inject, input, output, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { IconComponent } from "./icon.component";
import { StoreService } from "../core/store.service";
import { BrandService } from "../core/brand.service";
import { formatUSD } from "../core/format";
import { claseEtiqueta } from "../core/promo";
import type { Beneficio, Slide } from "../core/models";

/* ------------------------------------------------------------------ */
/* Logo                                                                */
/* ------------------------------------------------------------------ */
@Component({
  selector: "app-logo",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "inline-flex items-center" },
  template: `
    @if (src()) {
      <img [src]="src()" [alt]="brand.marca().nombre" width="310" height="82" class="h-full w-auto" />
    } @else {
      <!-- Sin logo cargado: se muestra el nombre de la marca como isotipo de texto -->
      <span [class]="'whitespace-nowrap font-extrabold leading-none tracking-tight ' + (variant() === 'light' ? 'text-primary' : 'text-white')"
        style="font-size: 0.55em; line-height: 1;">{{ brand.marca().nombre }}</span>
    }
  `,
})
export class LogoComponent {
  protected readonly brand = inject(BrandService);
  /** "color" = fondos de color/oscuros · "light" = fondos claros o blancos */
  readonly variant = input<"color" | "light">("color");
  protected readonly src = computed(() => (this.variant() === "light" ? this.brand.marca().logoClaro : this.brand.marca().logoOscuro));
}
/* ------------------------------------------------------------------ */
/* Modal                                                               */
/* ------------------------------------------------------------------ */
@Component({
  selector: "app-modal",
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-[100] flex items-center justify-center bg-ink/50 p-4">
        <div
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="title()"
          [class]="'animate-fade-up w-full ' + maxWidth() + ' max-h-[90vh] overflow-y-auto rounded-3xl bg-card shadow-2xl'"
        >
          <div class="flex items-center justify-between gap-4 bg-primary px-6 py-5">
            <h2 class="text-xl font-extrabold text-primary-foreground sm:text-2xl">{{ title() }}</h2>
            <button
              type="button"
              aria-label="Cerrar"
              (click)="closed.emit()"
              class="shrink-0 text-primary-foreground/90 transition-opacity hover:opacity-70"
            >
              <app-icon name="X" class="h-6 w-6" />
            </button>
          </div>
          <div class="p-6"><ng-content /></div>
        </div>
      </div>
    }
  `,
})
export class ModalComponent {
  readonly open = input(true);
  readonly title = input.required<string>();
  readonly maxWidth = input("max-w-lg");
  readonly closed = output<void>();

  @HostListener("document:keydown.escape")
  protected onEsc() {
    if (this.open()) this.closed.emit();
  }
}

/* ------------------------------------------------------------------ */
/* Título de sección                                                   */
/* ------------------------------------------------------------------ */
@Component({
  selector: "app-section-title",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 class="flex flex-wrap items-center justify-center gap-3 text-center font-sans text-2xl font-semibold text-ink sm:text-3xl">
      {{ text() }}
      <span class="badge-pill bg-lima px-6 py-1.5 text-ink">{{ highlight() }}</span>
    </h2>
  `,
})
export class SectionTitleComponent {
  readonly text = input.required<string>();
  readonly highlight = input.required<string>();
}

/* ------------------------------------------------------------------ */
/* Banner full-width                                                   */
/* ------------------------------------------------------------------ */
@Component({
  selector: "app-hero-slider",
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (items().length) {
      <section aria-label="Promociones destacadas" class="relative w-full overflow-hidden bg-surface" (mouseenter)="encima.set(true)" (mouseleave)="encima.set(false)" (focusin)="encima.set(true)" (focusout)="encima.set(false)">
        <div [class]="conTexto() ? 'relative h-[480px] w-full lg:h-[460px]' : 'relative w-full sm:aspect-[21/8] lg:aspect-[3/1] ' + (hayMovil() ? 'aspect-square' : 'aspect-[16/9]')">
          @for (slide of items(); track slide.id; let i = $index) {
            <div
              class="absolute inset-0 transition-opacity duration-700"
              [attr.aria-hidden]="i !== index()" [attr.inert]="i !== index() ? '' : null"
              [class.opacity-100]="i === index()"
              [class.pointer-events-none]="i !== index()"
              [class.opacity-0]="i !== index()"
            >
              @if (slide.titulo) {
                <div class="grid h-full grid-rows-[55%_45%] lg:grid-cols-[58%_42%] lg:grid-rows-1">
                  <div class="relative overflow-hidden">
                    <img [src]="slide.imagen" [alt]="slide.marca ?? slide.alt" width="1200" height="800" [attr.loading]="i === 0 ? 'eager' : 'lazy'" class="h-full w-full object-cover" />
                    <div class="absolute inset-y-0 right-0 hidden w-24 bg-surface [clip-path:polygon(100%_0,100%_100%,0_100%)] lg:block"></div>
                    @if (slide.descuento) {
                      <div class="absolute bottom-4 right-4 grid h-24 w-24 place-items-center rounded-full bg-celeste text-center text-white shadow-lg lg:bottom-auto lg:right-10 lg:top-1/2 lg:h-28 lg:w-28 lg:-translate-y-1/2">
                        <div><p class="text-2xl font-extrabold leading-none lg:text-3xl">{{ slide.descuento }}</p><p class="text-xs lg:text-sm">Dscto.</p></div>
                      </div>
                    }
                  </div>
                  <div class="flex flex-col items-center justify-center gap-3 px-6 py-8 pb-12 text-center">
                    @if (slide.marca) { <p class="border-b border-ink/20 pb-1 text-xs font-semibold tracking-[0.2em] text-ink/70">{{ slide.marca }}</p> }
                    <h2 class="text-2xl font-extrabold text-ink lg:text-4xl">{{ slide.titulo }}</h2>
                    <a [routerLink]="slide.to || '/beneficios'" class="mt-2 inline-flex min-h-11 items-center rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.03]">{{ slide.cta || 'Conoce más' }}</a>
                  </div>
                </div>
              } @else if (slide.to) {
                <a [routerLink]="slide.to" class="block h-full w-full">
                  <picture>
                    @if (slide.imagenMovil) { <source media="(max-width: 639px)" [srcset]="slide.imagenMovil" /> }
                    <img [src]="slide.imagen" [alt]="slide.alt" width="1920" height="640" [attr.loading]="i === 0 ? 'eager' : 'lazy'" class="h-full w-full object-cover" />
                  </picture>
                </a>
              } @else {
                <picture>
                  @if (slide.imagenMovil) { <source media="(max-width: 639px)" [srcset]="slide.imagenMovil" /> }
                  <img [src]="slide.imagen" [alt]="slide.alt" width="1920" height="640" [attr.loading]="i === 0 ? 'eager' : 'lazy'" class="h-full w-full object-cover" />
                </picture>
              }
            </div>
          }

          @if (items().length > 1) {
            <button type="button" aria-label="Anterior" (click)="go(-1)"
              class="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-background/80 text-ink shadow transition-colors hover:bg-background">
              <app-icon name="ChevronLeft" class="h-5 w-5" />
            </button>
            <button type="button" aria-label="Siguiente" (click)="go(1)"
              class="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-background/80 text-ink shadow transition-colors hover:bg-background">
              <app-icon name="ChevronRight" class="h-5 w-5" />
            </button>
            <div class="absolute bottom-1 left-1/2 flex -translate-x-1/2">
              @for (s of items(); track s.id; let i = $index) {
                <button type="button" data-compact [attr.aria-label]="'Ir al banner ' + (i + 1)" [attr.aria-current]="i === index() ? 'true' : null" (click)="index.set(i)" class="grid h-8 w-8 place-items-center">
                  <span [class]="'h-2.5 w-2.5 rounded-full transition-colors ' + (i === index() ? 'bg-primary' : 'bg-background/70')"></span>
                </button>
              }
            </div>
          }
        </div>
      </section>
    }
  `,
})
export class HeroSliderComponent {
  readonly items = input<Slide[]>([]);
  /** Si algún banner trae versión para móvil, en celular la caja pasa de 16:9 a cuadrada para aprovecharla. */
  /** Banners con marca, título y botón (estilo Club Hola) en lugar de solo imagen. */
  protected readonly conTexto = computed(() => this.items().some((s) => !!s.titulo));
  protected readonly hayMovil = computed(() => this.items().some((s) => !!s.imagenMovil));
  protected readonly index = signal(0);
  /** El carrusel no avanza solo si la persona pidió menos movimiento. */
  private readonly sinMovimiento = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  /** Se detiene mientras el cursor o el foco están sobre el carrusel. */
  protected readonly encima = signal(false);

  constructor() {
    effect((onCleanup) => {
      if (this.items().length < 2 || this.sinMovimiento || this.encima()) return;
      const t = setInterval(() => this.go(1), 6000);
      onCleanup(() => clearInterval(t));
    });
  }

  protected go(dir: number) {
    const n = this.items().length;
    this.index.update((i) => (i + dir + n) % n);
  }
}

/* ------------------------------------------------------------------ */
/* Tarjetas de producto y beneficio                                    */
/* ------------------------------------------------------------------ */
@Component({
  selector: "app-fav-button",
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" aria-label="Agregar a favoritos" (click)="$event.preventDefault(); store.toggleFavorito(id())"
      class="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border bg-card text-ink transition-colors hover:border-primary hover:text-primary">
      <app-icon name="Heart" class="h-4 w-4" [class.text-primary]="activo()" [fill]="activo()" />
    </button>
  `,
})
export class FavButtonComponent {
  protected readonly store = inject(StoreService);
  readonly id = input.required<string>();
  protected readonly activo = computed(() => this.store.favoritos().includes(this.id()));
}

const cardBase = "card-elevate group flex h-full flex-col overflow-hidden rounded-2xl bg-card";

@Component({
  selector: "app-benefit-card",
  imports: [RouterLink, FavButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "block h-full" },
  template: `
    <article [class]="base">
      <a [routerLink]="['/beneficios', beneficio().id]" tabindex="-1" aria-hidden="true" class="relative block overflow-hidden bg-muted">
        <img [src]="beneficio().imagen" [alt]="beneficio().marca" width="800" height="800" loading="lazy"
          class="h-48 w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <span class="absolute right-0 top-0 rounded-bl-2xl bg-celeste px-3 py-2 text-center text-xs font-bold leading-tight text-white">
          {{ beneficio().descuento }}<br />Dscto.
        </span>
        <div class="absolute left-3 top-3 flex flex-col items-start gap-1">
          @if (beneficio().promoEtiqueta) { <span class="rounded-full bg-destructive px-3 py-1 text-xs font-bold text-destructive-foreground">{{ beneficio().promoEtiqueta }}</span> }
          @if (beneficio().etiqueta) { <span [class]="'rounded-full px-3 py-1 text-xs font-bold ' + claseEtiqueta(beneficio().etiquetaColor)">{{ beneficio().etiqueta }}</span> }
        </div>
      </a>
      <div class="flex flex-1 flex-col p-4">
        <p class="text-sm uppercase tracking-wide text-muted-foreground">{{ beneficio().marca }}</p>
        <a [routerLink]="['/beneficios', beneficio().id]">
          <h3 [attr.aria-level]="nivel()" class="mt-1 line-clamp-2 min-h-12 text-base font-semibold text-ink hover:text-primary">{{ beneficio().nombre }}</h3>
        </a>
        <p class="mt-2 text-base font-extrabold text-ink">{{ titulo() }}@if (original()) { <s class="ml-2 text-sm font-medium text-muted-foreground">{{ original() }}</s> }</p>
        <p class="text-sm text-muted-foreground">{{ subtitulo() }}</p>
        @if (beneficio().nivelMinimo; as nv) { <p class="mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-secondary px-3 py-0.5 text-xs font-semibold text-secondary-foreground">Nivel {{ nv }}</p> }
        <div class="mt-auto flex items-center gap-2 pt-5">
          <a [routerLink]="['/beneficios', beneficio().id]"
            class="flex min-h-11 flex-1 items-center justify-center rounded-full bg-primary px-4 text-center text-sm font-bold uppercase tracking-wide text-primary-foreground transition-transform hover:scale-[1.03] lg:min-h-14">
            Ver detalles
          </a>
          <app-fav-button [id]="beneficio().id" />
        </div>
      </div>
    </article>
  `,
})
export class BenefitCardComponent {
  readonly beneficio = input.required<Beneficio>();
  readonly nivel = input(3);
  protected readonly base = cardBase;
  protected readonly claseEtiqueta = claseEtiqueta;
  /** Valor sin promoción, para tacharlo junto al vigente. */
  protected readonly original = computed(() => {
    const b = this.beneficio();
    return b.tipo === "compra" && b.precioOriginal ? formatUSD(b.precioOriginal) : "";
  });

  protected readonly titulo = computed(() => {
    const b = this.beneficio();
    return b.tipo === "compra" && b.precio ? formatUSD(b.precio) : "Cupón sin costo";
  });
  protected readonly subtitulo = computed(() => {
    const b = this.beneficio();
    return b.tipo === "compra" ? "Pago con tu tarjeta del banco" : b.tipo === "informativo" ? "Código de descuento" : `Categoría ${b.categoria}`;
  });
}

/* ------------------------------------------------------------------ */
/* Modal "Agregado al carrito"                                         */
/* ------------------------------------------------------------------ */
@Component({
  selector: "app-added-to-cart-modal",
  imports: [ModalComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (producto(); as p) {
      <app-modal title="AGREGADO AL CARRITO" (closed)="closed.emit()">
        <div class="flex gap-4">
          <div class="relative shrink-0">
            <img [src]="p.imagen" [alt]="p.nombre" width="160" height="160" class="h-20 w-20 rounded-xl object-cover" />
            <span class="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {{ cantidad() }}
            </span>
          </div>
          <div class="min-w-0">
            <p class="text-sm text-muted-foreground">{{ p.marca }}</p>
            <p class="truncate text-base font-extrabold text-ink">{{ p.nombre }}</p>
            <p class="text-sm text-muted-foreground">{{ usd(p.precio ?? 0) }}</p>
          </div>
        </div>

        <div class="my-5 border-t border-border"></div>

        <div class="flex items-center justify-between gap-4">
          <p class="text-base font-extrabold text-ink">Sub total ({{ store.totalItems() }} beneficios)</p>
          <p class="text-base font-extrabold text-ink">{{ usd(store.totalMonto()) }}</p>
        </div>

        <div class="mt-6 grid gap-3 sm:grid-cols-2">
          <button type="button" (click)="closed.emit()"
            class="flex min-h-12 items-center justify-center rounded-full bg-muted px-6 py-3 text-center text-sm font-bold uppercase leading-tight tracking-wide text-ink transition-colors hover:bg-secondary">
            Seguir explorando
          </button>
          <a routerLink="/carrito" (click)="closed.emit()"
            class="flex min-h-12 items-center justify-center rounded-full bg-primary px-6 py-3 text-center text-sm font-bold uppercase leading-tight tracking-wide text-primary-foreground transition-transform hover:scale-[1.02]">
            Ver carrito
          </a>
        </div>
      </app-modal>
    }
  `,
})
export class AddedToCartModalComponent {
  protected readonly store = inject(StoreService);
  readonly producto = input<Pick<Beneficio, "id" | "nombre" | "marca" | "imagen" | "precio"> | null>(null);
  readonly closed = output<void>();
  protected readonly usd = formatUSD;
  protected readonly cantidad = computed(() => {
    const p = this.producto();
    return (p && this.store.items().find((i) => i.id === p.id)?.cantidad) ?? 1;
  });
}

/** Helper compartido: agrega un beneficio de pago al carrito. */
export function agregarBeneficio(store: StoreService, b: Beneficio, cantidad = 1) {
  store.add(
    { id: b.id, tipo: "beneficio", nombre: b.nombre, marca: b.marca, imagen: b.imagen, precio: b.precio ?? 0, digital: true },
    cantidad,
  );
}
